"""
Zirak Flask application factory.

Usage
-----
    from app import create_app, socketio

    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5001)
"""

import logging

from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import socketio


def create_app(config: type = Config) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # ── Logging ───────────────────────────────────────────────────────────────
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL, logging.INFO),
        format="%(asctime)s  %(name)-30s  %(levelname)-8s  %(message)s",
    )

    # ── Flask config ──────────────────────────────────────────────────────────
    app.secret_key = config.SECRET_KEY

    # ── CORS ──────────────────────────────────────────────────────────────────
    raw = config.ALLOWED_ORIGINS
    origins = [o.strip() for o in raw.split(",")] if raw != "*" else "*"
    CORS(app, resources={r"/*": {"origins": origins}})

    # ── SocketIO ──────────────────────────────────────────────────────────────
    socketio.init_app(
        app,
        cors_allowed_origins=origins,
        async_mode="eventlet",
        logger=False,
        engineio_logger=False,
    )

    # ── Register HTTP blueprint ───────────────────────────────────────────────
    from .routes.http import bp as http_bp  # noqa: PLC0415

    app.register_blueprint(http_bp)

    # ── Register SocketIO event handlers (side-effectful import) ─────────────
    from .routes import socket as _socket_module  # noqa: F401, PLC0415

    # ── Eager agent initialisation ────────────────────────────────────────────
    # Import agent_manager here (at startup, in the main thread) so that:
    #   1. The heavy AutoGen / LLM imports happen before the first request.
    #   2. The MCPManager worker task is started while we are NOT inside the
    #      persistent asyncio event loop (avoids run_coroutine_threadsafe deadlock).
    try:
        from .agents import agent_manager as _am  # noqa: F401, PLC0415
        logging.getLogger(__name__).info("Agent manager initialised at startup.")
    except Exception as exc:
        logging.getLogger(__name__).warning(f"Agent manager pre-init failed: {exc}")

    return app
