import os
import json
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from Agents.conversation_workflow import conversation_workflow
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

active_workflows = {}
user_input_queue = {}
conversation_history = {}  # Store conversation history for each workflow


# return a simple string to indicate the server is running.
@app.route("/")
def index():
    return "Zirak Backend API"


# Defines the /api/query endpoint for POST requests. It receives a JSON object with a "message" field and returns a JSON object with a "workflow_id" field.
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


# Defines the socketio connection event handler. It prints a message to the console when a client connects and emits a "connected" event to the client.
@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit("connected", {"status": "connected"})


# Defines the socketio disconnection event handler. It prints a message to the console when a client disconnects.
@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")


# Defines the socketio message event handler. It prints a message to the console when a client sends a message and emits a "user_input_received" event to the client.
# It also adds the workflow to the active workflows dictionary and starts the conversation workflow in a separate thread.
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

    # Initialize conversation history for this workflow
    conversation_history[workflow_id] = []

    # Add user message to conversation history
    add_to_conversation_history(workflow_id, "user", user_input)

    # Start conversation workflow in a separate thread
    socketio.start_background_task(run_workflow, user_input, workflow_id, request.sid)

    emit(
        "workflow_started", {"workflow_id": workflow_id, "message": "Workflow started"}
    )


# It handles the user input response event. It updates the user input queue and emits a "user_input_received" event to the client.
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


# It defines the get_user_input function. It returns the user input for the given workflow ID.
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

    # Add agent's request to conversation history
    add_to_conversation_history(workflow_id, "system", prompt)

    # Emit event to request input
    socketio.emit(
        "user_input_required", {"workflow_id": workflow_id, "prompt": prompt}, room=sid
    )

    # Wait for input (this would be handled by the UserProxyAgent)
    # The actual waiting logic is in the UserProxyAgent

    return workflow_id  # Return the ID to be used by the agent


# Function to add a message to the conversation history and emit it to the client
def add_to_conversation_history(workflow_id, role, message, agent_name=None):
    if workflow_id not in conversation_history:
        conversation_history[workflow_id] = []

    timestamp = datetime.now().isoformat()

    # Create message object
    message_obj = {
        "id": str(uuid.uuid4()),
        "role": role,
        "content": message,
        "timestamp": timestamp,
        "agent": agent_name or role,
    }

    # Add to history
    conversation_history[workflow_id].append(message_obj)

    # Get the session ID for this workflow
    sid = active_workflows.get(workflow_id, {}).get("sid")
    if not sid:
        print(f"Warning: No session ID found for workflow {workflow_id}")
        return

    # Emit to client
    socketio.emit(
        "conversation_update",
        {"workflow_id": workflow_id, "message": message_obj},
        room=sid,
    )

    return message_obj


# Function to log agent messages
def log_agent_message(workflow_id, agent_name, message):
    # Add to conversation history
    message_obj = add_to_conversation_history(
        workflow_id, "assistant", message, agent_name
    )

    # Get the session ID for this workflow
    sid = active_workflows.get(workflow_id, {}).get("sid")
    if not sid:
        print(f"Warning: No session ID found for workflow {workflow_id}")
        return

    # Also emit as an agent message for more specific handling
    socketio.emit(
        "agent_message",
        {
            "workflow_id": workflow_id,
            "agent": agent_name,
            "message": message,
            "timestamp": message_obj["timestamp"],
        },
        room=sid,
    )


# It defines the run_workflow function. It runs the conversation workflow with the given user input and context.
def run_workflow(user_input, workflow_id, sid):
    try:
        # Set up context with socketio and workflow information
        context = {
            "socketio": socketio,
            "workflow_id": workflow_id,
            "sid": sid,
            "get_user_input": get_user_input,
            "log_agent_message": log_agent_message,
            "user_input": user_input,
            "add_to_conversation_history": add_to_conversation_history,
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
            {
                "workflow_id": workflow_id,
                "result": "Workflow completed successfully",
                "conversation_history": conversation_history.get(workflow_id, []),
            },
            room=sid,
        )

    except Exception as e:
        error_message = f"Error in workflow execution: {str(e)}"
        print(error_message)

        # Log the error
        if workflow_id in conversation_history:
            add_to_conversation_history(
                workflow_id, "system", f"Error: {error_message}"
            )

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


# It runs the Flask application.
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    socketio.run(app, host="0.0.0.0", port=port, debug=True)
