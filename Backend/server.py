import os
import json
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from Agents.conversation_workflow import conversation_workflow

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

active_workflows = {}
user_input_queue = {}


@app.route("/")
def index():
    return "Zirak Backend API"


@app.route("/api/query", methods=["POST"])
def query():
    data = request.json
    user_input = data.get("message", "")

    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    workflow_id = str(uuid.uuid4())
    response = {
        "workflow_id": workflow_id,
        "message": "Query received. Check WebSocket for real-time updates.",
    }

    return jsonify(response), 200


@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit("connected", {"status": "connected"})


@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")


@socketio.on("message")
def handle_message(data):
    print(f"Received message: {data}")

    user_input = data.get("message", "")
    workflow_id = data.get("workflow_id", str(uuid.uuid4()))

    if not user_input:
        emit("error", {"message": "No message provided"})
        return

    # Add workflow to active workflows
    active_workflows[workflow_id] = {
        "status": "running",
        "sid": request.sid,
        "steps": [],
    }

    # Start conversation workflow in a separate thread
    socketio.start_background_task(run_workflow, user_input, workflow_id, request.sid)

    emit(
        "workflow_started", {"workflow_id": workflow_id, "message": "Workflow started"}
    )


@socketio.on("user_input_response")
def handle_user_input_response(data):
    workflow_id = data.get("workflow_id")
    user_response = data.get("response")

    if workflow_id in user_input_queue:
        user_input_queue[workflow_id]["response"] = user_response
        user_input_queue[workflow_id]["provided"] = True

        emit(
            "user_input_received",
            {"workflow_id": workflow_id, "message": "User input received"},
        )
    else:
        emit(
            "error", {"message": f"No active input request for workflow {workflow_id}"}
        )


def get_user_input(workflow_id, prompt, timeout=300):
    """Function for agents to request user input via WebSocket"""
    if workflow_id not in active_workflows:
        return None

    sid = active_workflows[workflow_id]["sid"]

    # Create queue entry for this request
    user_input_queue[workflow_id] = {
        "prompt": prompt,
        "response": None,
        "provided": False,
    }

    # Emit event to request input
    socketio.emit(
        "user_input_required", {"workflow_id": workflow_id, "prompt": prompt}, room=sid
    )

    # Wait for input (this would be handled by the UserProxyAgent)
    # The actual waiting logic is in the UserProxyAgent

    return workflow_id  # Return the ID to be used by the agent


def run_workflow(user_input, workflow_id, sid):
    try:
        # Set up context with socketio and workflow information
        context = {
            "socketio": socketio,
            "workflow_id": workflow_id,
            "sid": sid,
            "get_user_input": get_user_input,
        }

        # Run the conversation workflow with the context
        result = conversation_workflow(user_input, context)

        # Mark workflow as completed
        if workflow_id in active_workflows:
            active_workflows[workflow_id]["status"] = "completed"

        # Cleanup
        if workflow_id in user_input_queue:
            del user_input_queue[workflow_id]

        # Emit completion event
        socketio.emit(
            "workflow_completed",
            {"workflow_id": workflow_id, "result": "Workflow completed successfully"},
            room=sid,
        )

    except Exception as e:
        error_message = f"Error in workflow execution: {str(e)}"
        print(error_message)

        # Mark workflow as failed
        if workflow_id in active_workflows:
            active_workflows[workflow_id]["status"] = "failed"

        # Emit error event
        socketio.emit(
            "workflow_error",
            {"workflow_id": workflow_id, "error": error_message},
            room=sid,
        )

        # Cleanup
        if workflow_id in user_input_queue:
            del user_input_queue[workflow_id]


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    socketio.run(app, host="0.0.0.0", port=port, debug=True)
