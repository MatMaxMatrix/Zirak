"""
HTTP REST routes.

Registered as a Blueprint in app/__init__.py.
"""

import uuid
from pathlib import Path

from flask import Blueprint, jsonify, request

from ..config import Config

bp = Blueprint("http", __name__)


@bp.route("/")
def index():
    return "Zirak Backend API"


@bp.route("/health")
def health():
    """Liveness probe – the frontend checks this before opening a socket."""
    return jsonify({"status": "ok"}), 200


@bp.route("/api/workspace/files", methods=["GET"])
def workspace_files():
    """
    Return a recursive listing of the agent workspace as a FileSystem[] tree.

    The response shape matches the TypeScript FileSystem interface:
      { fileSystem: FileSystem[] }
    """
    workspace: Path = Config.WORKSPACE_DIR
    workspace.mkdir(parents=True, exist_ok=True)

    def _build_tree(directory: Path, base: Path) -> list:
        items = []
        try:
            entries = sorted(directory.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
        except PermissionError:
            return items
        for entry in entries:
            rel = "/" + str(entry.relative_to(base)).replace("\\", "/")
            if entry.is_dir():
                items.append({
                    "name": entry.name,
                    "type": "directory",
                    "path": rel,
                    "expanded": True,
                    "children": _build_tree(entry, base),
                })
            else:
                try:
                    content = entry.read_text(encoding="utf-8", errors="replace")
                except Exception:
                    content = ""
                items.append({
                    "name": entry.name,
                    "type": "file",
                    "path": rel,
                    "content": content,
                })
        return items

    tree = _build_tree(workspace, workspace)
    return jsonify({"fileSystem": tree}), 200


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
