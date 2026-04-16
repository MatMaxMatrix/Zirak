"""
Flask extension singletons.

Defined here (not in __init__.py) so that routes and other modules can
import them without creating circular dependencies.
"""

from flask_socketio import SocketIO

# Unbound instance - call socketio.init_app(app) inside create_app()
socketio = SocketIO()
