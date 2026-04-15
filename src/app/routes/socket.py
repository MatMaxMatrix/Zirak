"""
SocketIO event handlers.

Session model
─────────────
Each browser tab supplies a stable `session_key` (UUID stored in
localStorage).  Conversation history is keyed by session_key, NOT by the
socket sid, so reconnects and page refreshes resume the same conversation.

  session_key → list of {"role", "content", "agent", "timestamp"}

The mapping sid → session_key is held in `sid_to_session_key` and is
rebuilt whenever a client calls `join_session`.
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

# session_key → conversation history list
session_histories: dict[str, list] = {}

# sid → session_key  (reset on reconnect)
sid_to_session_key: dict[str, str] = {}

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
    for key in old:
        session_histories.pop(key, None)


def _session_key_for_sid(sid: str) -> str:
    """Return the session_key for this socket, falling back to the sid itself."""
    return sid_to_session_key.get(sid, sid)


# ---------------------------------------------------------------------------
# Connection events
# ---------------------------------------------------------------------------


@socketio.on("connect")
def on_connect():
    sid = request.sid
    logger.info(f"Client connected: {sid}")
    _evict_old_sessions()
    # History is NOT pre-created here — it's created when the client calls
    # join_session with its stable session_key.
    emit("connected", {"status": "connected"})


@socketio.on("join_session")
def on_join_session(data):
    """
    Called by the frontend immediately after connect.

    data = {"session_key": "<uuid from localStorage>"}

    Maps this sid to the supplied session_key so history survives reconnects.
    Responds with the existing conversation history (if any) so the frontend
    can restore the chat after a page refresh.
    """
    sid = request.sid
    session_key = (data or {}).get("session_key") or sid
    sid_to_session_key[sid] = session_key

    if session_key not in session_histories:
        session_histories[session_key] = []
        logger.info(f"New session: {session_key} (sid={sid})")
    else:
        logger.info(f"Resumed session: {session_key} (sid={sid}), "
                    f"{len(session_histories[session_key])} turns")

    # Return existing history so the frontend can repopulate the chat
    history = session_histories[session_key]
    emit("session_history", {
        "session_key": session_key,
        "history": _format_history_for_client(history),
    })


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    logger.info(f"Client disconnected: {sid}")

    # Mark any running workflows as abandoned
    for wid, meta in active_workflows.items():
        if meta.get("sid") == sid and meta.get("status") == "running":
            meta["status"] = "abandoned"

    # Remove sid mapping; history (keyed by session_key) is kept intact
    sid_to_session_key.pop(sid, None)


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

    # Emit a "working" indicator from the eventlet greenlet (NOT from the
    # asyncio thread) — cross-thread socketio.emit() under eventlet adds ~1.7s
    # per call due to lock contention with the eventlet hub.
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
    session_key = _session_key_for_sid(sid)
    session_history = list(session_histories.get(session_key, []))

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
        # Emit a "working" step from THIS eventlet greenlet (NOT from the asyncio
        # thread) — cross-thread socketio.emit() under eventlet is slow (~1.7 s/call).
        from ..agents.workflow import _is_conversational
        if not _is_conversational(user_input):
            socketio.emit(
                "workflow_update",
                {
                    "workflow_id": workflow_id,
                    "step": {
                        "id": f"{workflow_id}-processing",
                        "agent": "Zirak",
                        "message": "⚙️ Processing your request…",
                        "timestamp": datetime.now().isoformat(),
                        "status": "active",
                    },
                },
                room=sid,
            )

        success, result = conversation_workflow(user_input, context)
        logger.info(f"[{workflow_id}] conversation_workflow returned success={success}, result_len={len(result) if result else 0}, result_preview={repr(result[:120]) if result else None}")

        # Sync agent's internal history (tool calls etc.) back to the session
        updated = context.get("updated_session_history")
        if updated:
            session_histories[session_key] = _trim_history(updated)

        # Emit the final assistant reply as a conversation_update.
        # This is the single authoritative path for the final response —
        # workflow_completed carries no messages so there are no duplicates.
        if result:
            ts = datetime.now().isoformat()
            role = "assistant" if success else "system"
            reply_msg = {
                "id": str(uuid.uuid4()),
                "role": role,
                "content": result,
                "timestamp": ts,
                "agent": "Zirak",
            }
            _add_to_session(sid, {
                "role": role,
                "content": result,
                "agent": "Zirak",
                "timestamp": ts,
            })
            logger.info(f"[{workflow_id}] Emitting conversation_update to sid={sid}")
            socketio.emit(
                "conversation_update",
                {"workflow_id": workflow_id, "message": reply_msg},
                room=sid,
            )
            logger.info(f"[{workflow_id}] conversation_update emitted OK")

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
    key = _session_key_for_sid(sid)
    if key not in session_histories:
        session_histories[key] = []
    session_histories[key].append(turn)
    session_histories[key] = _trim_history(session_histories[key])


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
