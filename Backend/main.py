"""
Zirak Backend – entry point.

Run with:
    python main.py

Or via uv:
    uv run main.py
"""

from app import create_app, socketio
from app.config import Config

app = create_app()

if __name__ == "__main__":
    import logging

    logging.getLogger(__name__).info(
        f"Starting Zirak backend on port {Config.PORT} (debug={Config.DEBUG})"
    )
    socketio.run(app, host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
