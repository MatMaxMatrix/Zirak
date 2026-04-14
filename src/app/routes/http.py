"""
HTTP REST routes.

Registered as a Blueprint in app/__init__.py.
"""

import uuid

from flask import Blueprint, jsonify, request

bp = Blueprint("http", __name__)


@bp.route("/")
def index():
    return "Zirak Backend API"


@bp.route("/health")
def health():
    """Liveness probe – the frontend checks this before opening a socket."""
    return jsonify({"status": "ok"}), 200


@bp.route("/api/query", methods=["POST"])
def query():
    """
    REST entry-point: accept a message and return a workflow_id.

    The caller should then open a WebSocket connection and listen for
    real-time updates keyed on that workflow_id.
    """
    data = request.get_json(silent=True) or {}
    user_input = data.get("message", "").strip()

    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    workflow_id = str(uuid.uuid4())
    return jsonify(
        {
            "workflow_id": workflow_id,
            "message": "Query received. Connect via WebSocket for real-time updates.",
        }
    ), 200
