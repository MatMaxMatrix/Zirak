"""
SocketIO event handlers.

Session model
─────────────
Each browser connection (sid) owns a `session_histories[sid]` list that
accumulates conversation turns across many messages.  The list is passed
into workflow.py on every turn so the LLM has context, and updated with
the agent's reply on completion.
"""

import logging
import uuid
from datetime import datetime

from flask import request
from flask_socketio import emit

from ..extensions import socketio
from ..agents.workflow import conversation_workflow

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Per-session state
# ---------------------------------------------------------------------------

# sid → list of {"role": ..., "content": ..., "agent": ..., "timestamp": ...}
session_histories: dict[str, list] = {}

# Per-workflow metadata (for tracking active background tasks)
active_workflows: dict[str, dict] = {}

_MAX_HISTORY_TURNS = 50   # keep last N turns per session (to control token use)
_MAX_SESSIONS = 500


def _trim_history(history: list) -> list:
    """Keep the most recent turns within the token budget."""
    return history[-(_MAX_HISTORY_TURNS * 2):]   # each turn = 2 entries (user + assistant)


def _evict_old_sessions() -> None:
    if len(session_histories) <= _MAX_SESSIONS:
        return
    # Remove the oldest half
    old = list(session_histories.keys())[: len(session_histories) // 2]
    for sid in old:
        session_histories.pop(sid, None)


# ---------------------------------------------------------------------------
# Connection events
# ---------------------------------------------------------------------------


@socketio.on("connect")
def on_connect():
    sid = request.sid
    logger.info(f"Client connected: {sid}")
    _evict_old_sessions()
    session_histories[sid] = []           # fresh conversation per connection
    emit("connected", {"status": "connected"})


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    logger.info(f"Client disconnected: {sid}")

    # Mark any running workflows as abandoned
    for wid, meta in active_workflows.items():
        if meta.get("sid") == sid and meta.get("status") == "running":
            meta["status"] = "abandoned"

    # Keep history so a quick reconnect can resume, but cap total sessions
    # (history is cleared on next connect anyway)


# ---------------------------------------------------------------------------
# Message events
# ---------------------------------------------------------------------------


@socketio.on("message")
def on_message(data):
    user_input = data.get("message", "").strip()
    sid = request.sid

    if not user_input:
        emit("error", {"message": "No message provided"})
        return

    workflow_id = str(uuid.uuid4())
    active_workflows[workflow_id] = {"status": "running", "sid": sid}

    # Add the user turn to session history immediately
    user_turn = {
        "role": "user",
        "content": user_input,
        "agent": "user",
        "timestamp": datetime.now().isoformat(),
    }
    _add_to_session(sid, user_turn)

    emit("workflow_started", {"workflow_id": workflow_id, "message": "Processing…"})

    socketio.start_background_task(
        _run_workflow, user_input, workflow_id, sid
    )


@socketio.on("user_input_response")
def on_user_input_response(data):
    workflow_id = data.get("workflow_id")
    response = data.get("response")
    if workflow_id in active_workflows:
        active_workflows[workflow_id]["pending_input"] = response
        emit("user_input_received", {"workflow_id": workflow_id})
    else:
        emit("error", {"message": f"No active workflow {workflow_id}"})


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------


def _run_workflow(user_input: str, workflow_id: str, sid: str) -> None:
    """Runs in an eventlet greenlet.  Calls conversation_workflow synchronously."""
    session_history = list(session_histories.get(sid, []))

    context = {
        "socketio": socketio,
        "workflow_id": workflow_id,
        "sid": sid,
        "get_user_input": _request_user_input,
        "log_agent_message": _log_agent_message,
        "add_to_conversation_history": _append_to_session_and_emit,
        "user_input": user_input,
        "session_history": session_history,
    }

    try:
        success, result = conversation_workflow(user_input, context)

        # Sync agent's internal history (tool calls etc.) back to the session
        updated = context.get("updated_session_history")
        if updated:
            session_histories[sid] = _trim_history(updated)

        # Emit the final assistant reply as a conversation_update.
        # This is the single authoritative path for the final response —
        # workflow_completed carries no messages so there are no duplicates.
        if success and result:
            ts = datetime.now().isoformat()
            reply_msg = {
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "content": result,
                "timestamp": ts,
                "agent": "Zirak",
            }
            _add_to_session(sid, {
                "role": "assistant",
                "content": result,
                "agent": "Zirak",
                "timestamp": ts,
            })
            socketio.emit(
                "conversation_update",
                {"workflow_id": workflow_id, "message": reply_msg},
                room=sid,
            )

        active_workflows[workflow_id]["status"] = "completed" if success else "failed"

        # workflow_completed is a state-reset signal only — no conversation_history.
        socketio.emit(
            "workflow_completed",
            {"workflow_id": workflow_id, "result": result},
            room=sid,
        )

    except Exception as exc:
        error_msg = f"Workflow error: {exc}"
        logger.error(error_msg, exc_info=True)
        active_workflows[workflow_id]["status"] = "failed"
        socketio.emit(
            "workflow_error",
            {"workflow_id": workflow_id, "error": error_msg},
            room=sid,
        )


# ---------------------------------------------------------------------------
# Session history helpers
# ---------------------------------------------------------------------------


def _add_to_session(sid: str, turn: dict) -> None:
    if sid not in session_histories:
        session_histories[sid] = []
    session_histories[sid].append(turn)
    session_histories[sid] = _trim_history(session_histories[sid])


def _format_history_for_client(history: list) -> list:
    """Return history in the format the frontend expects."""
    result = []
    for turn in history:
        result.append({
            "id": str(uuid.uuid4()),
            "role": turn.get("role", "assistant"),
            "content": turn.get("content", ""),
            "timestamp": turn.get("timestamp", datetime.now().isoformat()),
            "agent": turn.get("agent", ""),
        })
    return result


# ---------------------------------------------------------------------------
# Helpers called from workflow / agents via context
# ---------------------------------------------------------------------------


def _append_to_session_and_emit(
    workflow_id: str,
    role: str,
    message: str,
    agent_name: str | None = None,
) -> dict | None:
    """Store a message in history and push it to the client via conversation_update."""
    sid = active_workflows.get(workflow_id, {}).get("sid")

    msg = {
        "id": str(uuid.uuid4()),
        "role": role,
        "content": message,
        "timestamp": datetime.now().isoformat(),
        "agent": agent_name or role,
    }

    if sid:
        _add_to_session(sid, {
            "role": role,
            "content": message,
            "agent": agent_name or role,
            "timestamp": msg["timestamp"],
        })
        socketio.emit(
            "conversation_update",
            {"workflow_id": workflow_id, "message": msg},
            room=sid,
        )

    return msg


def _log_agent_message(workflow_id: str, agent_name: str, message: str) -> None:
    """Broadcast an agent message to chat + workflow panel simultaneously."""
    msg = _append_to_session_and_emit(workflow_id, "assistant", message, agent_name)
    sid = active_workflows.get(workflow_id, {}).get("sid")
    if not sid or not msg:
        return

    # Push to the chat message list
    socketio.emit(
        "agent_message",
        {
            "workflow_id": workflow_id,
            "agent": agent_name,
            "message": message,
            "timestamp": msg["timestamp"],
        },
        room=sid,
    )

    # Push a workflow step so the left-panel workflow viewer updates live
    socketio.emit(
        "workflow_update",
        {
            "workflow_id": workflow_id,
            "step": {
                "id": msg["id"],
                "agent": agent_name,
                "message": message[:200] + ("…" if len(message) > 200 else ""),
                "timestamp": msg["timestamp"],
                "status": "complete",
            },
        },
        room=sid,
    )


def _request_user_input(workflow_id: str, prompt: str, timeout: int = 300):
    """Emit a user-input request and store the prompt."""
    if workflow_id not in active_workflows:
        return None
    sid = active_workflows[workflow_id]["sid"]
    active_workflows[workflow_id]["pending_input"] = None
    socketio.emit(
        "user_input_required",
        {"workflow_id": workflow_id, "prompt": prompt},
        room=sid,
    )
    return workflow_id
