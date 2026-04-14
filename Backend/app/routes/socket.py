"""
SocketIO event handlers.

Imported (side-effectfully) by app/__init__.py after socketio is initialised.
All handlers call ``socketio`` from app.extensions to avoid circular imports.
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
# In-process workflow state  (keyed by workflow_id)
# NOTE: not suitable for multi-process deployments – use Redis if you need
#       horizontal scaling.
# ---------------------------------------------------------------------------
active_workflows: dict = {}
user_input_queue: dict = {}
conversation_history: dict = {}

_MAX_CACHED_WORKFLOWS = 200


def _evict_completed_workflows() -> None:
    """Prevent unbounded growth by evicting completed/failed workflows."""
    if len(active_workflows) <= _MAX_CACHED_WORKFLOWS:
        return
    done = [
        wid
        for wid, meta in active_workflows.items()
        if meta.get("status") in ("completed", "failed", "abandoned")
    ]
    for wid in done[: len(done) // 2]:
        active_workflows.pop(wid, None)
        conversation_history.pop(wid, None)


# ---------------------------------------------------------------------------
# Connection events
# ---------------------------------------------------------------------------


@socketio.on("connect")
def on_connect():
    logger.info(f"Client connected: {request.sid}")
    emit("connected", {"status": "connected"})


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    logger.info(f"Client disconnected: {sid}")

    stale = [
        wid
        for wid, meta in active_workflows.items()
        if meta.get("sid") == sid and meta.get("status") == "running"
    ]
    for wid in stale:
        active_workflows[wid]["status"] = "abandoned"
        user_input_queue.pop(wid, None)


# ---------------------------------------------------------------------------
# Message / workflow events
# ---------------------------------------------------------------------------


@socketio.on("message")
def on_message(data):
    user_input = data.get("message", "").strip()
    workflow_id = data.get("workflow_id") or str(uuid.uuid4())
    sid = request.sid

    if not user_input:
        emit("error", {"message": "No message provided"})
        return

    _evict_completed_workflows()

    active_workflows[workflow_id] = {"status": "running", "sid": sid, "steps": []}
    conversation_history[workflow_id] = []
    _append_history(workflow_id, "user", user_input)

    socketio.start_background_task(_run_workflow, user_input, workflow_id, sid)
    emit("workflow_started", {"workflow_id": workflow_id, "message": "Workflow started"})


@socketio.on("user_input_response")
def on_user_input_response(data):
    workflow_id = data.get("workflow_id")
    response = data.get("response")

    if workflow_id in user_input_queue:
        user_input_queue[workflow_id].update(response=response, provided=True)
        emit("user_input_received", {"workflow_id": workflow_id})
    else:
        emit("error", {"message": f"No pending input for workflow {workflow_id}"})


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------


def _run_workflow(user_input: str, workflow_id: str, sid: str) -> None:
    """Background greenlet: run workflow and emit results."""
    context = {
        "socketio": socketio,
        "workflow_id": workflow_id,
        "sid": sid,
        "get_user_input": _request_user_input,
        "log_agent_message": _log_agent_message,
        "add_to_conversation_history": _append_history,
        "user_input": user_input,
    }
    try:
        success, result = conversation_workflow(user_input, context)

        active_workflows[workflow_id]["status"] = "completed" if success else "failed"
        user_input_queue.pop(workflow_id, None)

        socketio.emit(
            "workflow_completed",
            {
                "workflow_id": workflow_id,
                "result": result,
                "conversation_history": conversation_history.get(workflow_id, []),
            },
            room=sid,
        )
    except Exception as exc:
        error_msg = f"Workflow execution error: {exc}"
        logger.error(error_msg, exc_info=True)
        _append_history(workflow_id, "system", f"Error: {error_msg}")
        active_workflows[workflow_id]["status"] = "failed"
        user_input_queue.pop(workflow_id, None)
        socketio.emit(
            "workflow_error",
            {"workflow_id": workflow_id, "error": error_msg},
            room=sid,
        )


# ---------------------------------------------------------------------------
# Helper functions shared with agents via context dict
# ---------------------------------------------------------------------------


def _request_user_input(workflow_id: str, prompt: str, timeout: int = 300):
    """Emit a user-input request and return the workflow_id for tracking."""
    if workflow_id not in active_workflows:
        return None

    sid = active_workflows[workflow_id]["sid"]
    user_input_queue[workflow_id] = {"prompt": prompt, "response": None, "provided": False}
    _append_history(workflow_id, "system", prompt)

    socketio.emit(
        "user_input_required",
        {"workflow_id": workflow_id, "prompt": prompt},
        room=sid,
    )
    return workflow_id


def _append_history(
    workflow_id: str,
    role: str,
    message: str,
    agent_name: str | None = None,
) -> dict | None:
    """Append a message to in-memory history and push it to the client."""
    if workflow_id not in conversation_history:
        conversation_history[workflow_id] = []

    msg = {
        "id": str(uuid.uuid4()),
        "role": role,
        "content": message,
        "timestamp": datetime.now().isoformat(),
        "agent": agent_name or role,
    }
    conversation_history[workflow_id].append(msg)

    sid = active_workflows.get(workflow_id, {}).get("sid")
    if sid:
        socketio.emit(
            "conversation_update",
            {"workflow_id": workflow_id, "message": msg},
            room=sid,
        )
    return msg


def _log_agent_message(workflow_id: str, agent_name: str, message: str) -> None:
    """Broadcast an agent message to the client (also stored in history)."""
    msg = _append_history(workflow_id, "assistant", message, agent_name)
    sid = active_workflows.get(workflow_id, {}).get("sid")
    if sid and msg:
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
