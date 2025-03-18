#!/usr/bin/env python3
# api.py

import asyncio
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
from Agents.conversation_workflow import conversation_workflow
from Agents.agent_manager import group_chat
import nest_asyncio
import logging
import os
import time
import threading
from queue import Queue
from datetime import datetime
from flask_socketio import SocketIO, emit
import uuid
import functools
import inspect

# Configure proper event loop policy for asyncio
try:
    # On macOS, use the correct event loop policy
    if os.name == 'posix' and hasattr(asyncio, 'ProactorEventLoop'):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    elif hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
except Exception as e:
    print(f"Warning: Could not configure optimal event loop policy: {str(e)}")

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Use port 5001 instead of 5000 to avoid conflicts with AirPlay on macOS
PORT = int(os.environ.get('PORT', 5001))

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Configure CORS with proper origins in production
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')  # Use async mode for better performance

# In-memory storage for conversations and workflow steps
conversations = {}
workflow_steps = {}
active_conversations = {}

# Check if we're in test mode
TEST_MODE = os.environ.get('ZIRAK_TEST_MODE', 'false').lower() == 'true'
logger.info(f"API running in test mode: {TEST_MODE}")

# Create a custom handler to capture logs and stream to WebSocket clients
class WebSocketHandler(logging.Handler):
    def __init__(self, workflow_id):
        super().__init__()
        self.workflow_id = workflow_id
        # Initialize the workflow steps for this ID if not exists
        if workflow_id not in workflow_steps:
            workflow_steps[workflow_id] = []
        
    def emit(self, record):
        try:
            # Format the log message
            msg = self.format(record)
            
            # Filter only important logs about agent actions
            if any(keyword in msg for keyword in ['agent', 'Agent', 'tool', 'conversation', 'workflow']):
                # Parse the log message to identify the agent/step
                agent_info = self._parse_agent_info(msg)
                if agent_info:
                    # Create step data
                    step_data = {
                        'timestamp': datetime.now().isoformat(),
                        'agent': agent_info.get('agent', 'System'),
                        'action': agent_info.get('action', 'Processing'),
                        'message': msg,
                        'status': 'in_progress',
                        'workflow_id': self.workflow_id
                    }
                    
                    # Store the step in workflow_steps
                    workflow_steps[self.workflow_id].append(step_data)
                    
                    # Emit the step to WebSocket clients
                    socketio.emit('workflow_update', step_data, room=self.workflow_id)
        except Exception as e:
            logger.error(f"Error in WebSocket log handler: {str(e)}")
    
    def _parse_agent_info(self, msg):
        # Try to extract agent and action information from log message
        if "agent: " in msg.lower():
            parts = msg.split("agent: ")
            if len(parts) > 1:
                agent_name = parts[1].split()[0]
                return {'agent': agent_name, 'action': 'Processing'}
        
        # Look for specific agent patterns
        agent_patterns = [
            "initiating agent", "LLM Agent", "Query Agent", "Step Agent",
            "Critical Analysis", "UserProxy", "LLM_Agent", "State transition from"
        ]
        
        for pattern in agent_patterns:
            if pattern.lower() in msg.lower():
                return {'agent': pattern, 'action': 'Processing'}
        
        # Default
        return {'agent': 'System', 'action': 'Processing'}

def get_mock_workflow_steps(user_input):
    """Generate mock workflow steps for test mode."""
    workflow_id = str(hash(user_input))
    steps = []
    
    # Add initial steps
    steps.append({
        'timestamp': datetime.now().isoformat(),
        'agent': 'System',
        'action': 'Initialization',
        'message': 'Starting conversation workflow',
        'status': 'completed'
    })
    
    time.sleep(0.5)
    
    steps.append({
        'timestamp': datetime.now().isoformat(),
        'agent': 'Initiating Agent',
        'action': 'Processing',
        'message': 'Analyzing user request: ' + user_input,
        'status': 'completed'
    })
    
    time.sleep(0.5)
    
    steps.append({
        'timestamp': datetime.now().isoformat(),
        'agent': 'Critical Analysis',
        'action': 'Evaluating',
        'message': 'Performing critical analysis of the input',
        'status': 'completed'
    })
    
    time.sleep(0.5)
    
    steps.append({
        'timestamp': datetime.now().isoformat(),
        'agent': 'Query Agent',
        'action': 'Transformation',
        'message': 'Transforming query into actionable steps',
        'status': 'completed'
    })
    
    time.sleep(0.5)
    
    steps.append({
        'timestamp': datetime.now().isoformat(),
        'agent': 'LLM Agent',
        'action': 'Processing',
        'message': 'Generating response to: ' + user_input,
        'status': 'completed'
    })
    
    time.sleep(0.5)
    
    steps.append({
        'timestamp': datetime.now().isoformat(),
        'agent': 'System',
        'action': 'Completion',
        'message': 'Workflow completed successfully',
        'status': 'completed'
    })
    
    return steps

def get_mock_response(user_input):
    """Generate a mock response for test mode."""
    time.sleep(1.5)  # Simulate processing delay
    
    # Sample responses for common questions
    if "hello" in user_input.lower() or "hi" in user_input.lower():
        return "Hello! I'm Zirak, your AI assistant. How can I help you today?"
    
    if "who are you" in user_input.lower():
        return "I am Zirak, an AI assistant designed to help answer your questions and provide assistance with various tasks."
    
    if "help" in user_input.lower():
        return "I can help with a variety of tasks including answering questions, providing information, and assisting with problem-solving. Just let me know what you need help with!"
    
    # Default response
    return f"This is a test response from the Zirak API. Your message was: '{user_input}'. In a real environment, this would be processed by the Zirak backend."

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection to WebSocket."""
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'status': 'connected', 'client_id': request.sid})

@socketio.on('join')
def handle_join(data):
    """Handle client joining a specific conversation room."""
    if 'conversation_id' in data:
        conversation_id = data['conversation_id']
        logger.info(f"Client {request.sid} joining conversation {conversation_id}")
        
        # Join the room for this conversation
        socketio.server.enter_room(request.sid, conversation_id)
        
        # Send any existing workflow steps to the client
        if conversation_id in workflow_steps:
            for step in workflow_steps[conversation_id]:
                emit('workflow_update', step)
        
        emit('joined', {'status': 'joined', 'conversation_id': conversation_id})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    logger.info(f"Client disconnected: {request.sid}")

# Helper function to run async code in a thread
def run_async_in_thread(async_func, *args, **kwargs):
    """
    Run an async function in a separate thread and return its result.
    This is useful for running async code in a synchronous context like Flask.
    
    Args:
        async_func: The async function to run
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        The result of the async function
    """
    result_queue = Queue()
    error_queue = Queue()
    
    # Define a wrapper to capture the result
    def thread_target():
        try:
            # Get or create an event loop for this thread
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # Define a helper function to handle nested coroutines
            async def run_with_nested_handling():
                # Run the async function
                result = await async_func(*args, **kwargs)
                
                # Check if the result itself is a coroutine or contains coroutines
                # and ensure they are properly awaited
                if inspect.iscoroutine(result) or inspect.isawaitable(result):
                    logger.info("Result is a coroutine, awaiting it")
                    result = await result
                
                return result
            
            # Run the async function and get the result
            try:
                result = loop.run_until_complete(run_with_nested_handling())
                result_queue.put(result)
            except Exception as e:
                error_queue.put((e, traceback.format_exc()))
                logger.error(f"Error running async function: {str(e)}")
                logger.error(traceback.format_exc())
        except Exception as e:
            error_queue.put((e, traceback.format_exc()))
            logger.error(f"Error setting up async execution: {str(e)}")
            logger.error(traceback.format_exc())
    
    # Start a thread to run the async function
    thread = threading.Thread(target=thread_target)
    thread.daemon = True
    thread.start()
    thread.join()  # Wait for the thread to complete
    
    # Return the result or raise any exception that occurred
    if not error_queue.empty():
        exception, tb = error_queue.get()
        logger.error(f"Error in async thread: {str(exception)}")
        logger.error(tb)
        raise exception
    
    # Return the result
    return result_queue.get() if not result_queue.empty() else None

# API Routes for chat requests
# PATCHED FOR BETTER MONITORING
@app.route('/api/chat', methods=['POST'])
def chat():
    """
    API endpoint to handle chat requests from the frontend.
    
    Expected JSON payload:
    {
        "message": "User's message here",
        "conversation_id": "optional-existing-conversation-id"
    }
    
    Returns:
    {
        "success": true/false,
        "response": "Response from Zirak",
        "workflow_steps": [list of workflow steps],
        "conversation_id": "conversation-id"
    }
    """
    try:
        # Get the message from the request
        data = request.json
        user_input = data.get('message', '')
        conversation_id = data.get('conversation_id', str(uuid.uuid4()))
        
        logger.info(f"Received chat request with message: {user_input} for conversation {conversation_id}")
        
        if not user_input:
            logger.warning("No message provided in request")
            return jsonify({
                'success': False,
                'response': 'No message provided',
                'workflow_steps': [],
                'conversation_id': conversation_id
            }), 400
        
        # Store the conversation if it's new
        if conversation_id not in conversations:
            conversations[conversation_id] = []
        
        # Add the user message to the conversation history
        conversations[conversation_id].append({
            'role': 'user',
            'content': user_input,
            'timestamp': datetime.now().isoformat()
        })
        
                # Set up the context for the group chat
        # Make socketio available for workflow monitoring
        group_chat.socketio = socketio
        group_chat.conversation_id = conversation_id
        group_chat.context = {
            "user_input": user_input,
            "workflow_id": conversation_id
        }
        
        # Run the conversation workflow
        logger.info(f"Running conversation workflow for {conversation_id}")
        
        # Run the async workflow in a thread
        success, response = run_async_in_thread(conversation_workflow, group_chat)
        
        logger.info(f"Conversation workflow {conversation_id} completed with success={success}")
        
        # Add the assistant's response to the conversation history
        conversations[conversation_id].append({
            'role': 'assistant',
            'content': response,
            'timestamp': datetime.now().isoformat()
        })
        
        # Return the response
        return jsonify({
            'success': success,
            'response': response,
            'workflow_steps': workflow_steps.get(conversation_id, []),
            'conversation_id': conversation_id
        })
    
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'response': f"An error occurred: {str(e)}",
            'workflow_steps': [],
            'conversation_id': conversation_id if 'conversation_id' in locals() else str(uuid.uuid4())
        }), 500

# Get a list of all conversations
@app.route('/api/conversations', methods=['GET'])
def list_conversations():
    """Get a list of all conversations."""
    try:
        conversation_list = []
        for conv_id, messages in conversations.items():
            # Get the first user message as a title
            title = next((msg['content'] for msg in messages if msg['role'] == 'user'), 'Untitled conversation')
            if len(title) > 50:
                title = title[:50] + '...'
                
            # Get the status from active_conversations
            status = 'completed'
            if conv_id in active_conversations:
                status = 'active' if not active_conversations[conv_id].get('completed', False) else 'completed'
                if active_conversations[conv_id].get('error', False):
                    status = 'error'
            
            conversation_list.append({
                'id': conv_id,
                'title': title,
                'last_activity': active_conversations.get(conv_id, {}).get('last_activity', ''),
                'message_count': len(messages),
                'status': status
            })
        
        # Sort by last activity (newest first)
        conversation_list.sort(key=lambda x: x['last_activity'], reverse=True)
        
        return jsonify({
            'success': True,
            'conversations': conversation_list
        })
    except Exception as e:
        error_message = f"Error listing conversations: {str(e)}"
        logger.error(error_message)
        return jsonify({
            'success': False,
            'error': error_message
        }), 500

# Get details of a specific conversation
@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """Get details of a specific conversation."""
    try:
        if conversation_id not in conversations:
            return jsonify({
                'success': False,
                'error': 'Conversation not found'
            }), 404
            
        return jsonify({
            'success': True,
            'conversation_id': conversation_id,
            'messages': conversations[conversation_id],
            'workflow_steps': workflow_steps.get(conversation_id, []),
            'status': 'active' if not active_conversations.get(conversation_id, {}).get('completed', True) else 'completed'
        })
    except Exception as e:
        error_message = f"Error getting conversation: {str(e)}"
        logger.error(error_message)
        return jsonify({
            'success': False,
            'error': error_message
        }), 500

# Delete a specific conversation    
@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """Delete a specific conversation."""
    try:
        if conversation_id not in conversations:
            return jsonify({
                'success': False,
                'error': 'Conversation not found'
            }), 404
            
        # Remove from all storages
        if conversation_id in conversations:
            del conversations[conversation_id]
        if conversation_id in workflow_steps:
            del workflow_steps[conversation_id]
        if conversation_id in active_conversations:
            del active_conversations[conversation_id]
            
        return jsonify({
            'success': True,
            'message': f'Conversation {conversation_id} deleted successfully'
        })
    except Exception as e:
        error_message = f"Error deleting conversation: {str(e)}"
        logger.error(error_message)
        return jsonify({
            'success': False,
            'error': error_message
        }), 500

# Add a simple health check endpoint
@app.route('/api/workflow/status', methods=['GET'])
def workflow_status():
    """Get the status of a workflow"""
    conversation_id = request.args.get('conversation_id')
    if not conversation_id:
        return jsonify({"error": "conversation_id is required"}), 400
    
    # Return workflow events if any
    if conversation_id in workflow_steps:
        return jsonify({"conversation_id": conversation_id, "events": workflow_steps[conversation_id]})
    
    return jsonify({"conversation_id": conversation_id, "events": []})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Zirak API is up and running',
        'test_mode': TEST_MODE,
        'active_conversations': len(active_conversations),
        'total_conversations': len(conversations)
    })

if __name__ == '__main__':
    logger.info(f"Starting Zirak API server on port {PORT} (test mode: {TEST_MODE})")
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True) 