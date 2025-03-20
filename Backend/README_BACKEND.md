# Zirak Backend API

This is a revised version of the Zirak application designed to function as a backend service that streams internal agent conversations to a frontend application.

## Overview

The Zirak backend provides a RESTful API and WebSocket interface for:

1. Processing user chat messages through a multi-agent conversation workflow
2. Streaming real-time updates about the internal agent communications
3. Managing conversation history and workflow steps
4. Providing detailed agent interaction information

## Setup

### Prerequisites

- Python 3.9+
- Virtual environment (recommended)

### Installation

1. Clone the repository
2. Set up a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your API keys and other configuration

### Running the Server

Start the server with:

```bash
python api.py
```

The server will run on port 5001 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

### Chat API

#### `POST /api/chat`

Initiates a conversation with the Zirak agent system.

**Request Body:**
```json
{
  "message": "Your message here",
  "conversation_id": "optional-existing-conversation-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processing started",
  "conversation_id": "conversation-id",
  "workflow_steps": []
}
```

### Conversation Management

#### `GET /api/conversations`

Returns a list of all conversations.

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conversation-id",
      "title": "First user message (truncated)",
      "last_activity": "ISO timestamp",
      "message_count": 5,
      "status": "completed"
    }
  ]
}
```

#### `GET /api/conversations/{conversation_id}`

Returns details of a specific conversation.

**Response:**
```json
{
  "success": true,
  "conversation_id": "conversation-id",
  "messages": [
    {
      "role": "user",
      "content": "User message",
      "timestamp": "ISO timestamp"
    },
    {
      "role": "assistant",
      "content": "Assistant response",
      "timestamp": "ISO timestamp"
    }
  ],
  "workflow_steps": [
    {
      "timestamp": "ISO timestamp",
      "agent": "Agent name",
      "action": "Action performed",
      "message": "Log message",
      "status": "completed"
    }
  ],
  "status": "completed"
}
```

#### `DELETE /api/conversations/{conversation_id}`

Deletes a specific conversation.

**Response:**
```json
{
  "success": true,
  "message": "Conversation {conversation_id} deleted successfully"
}
```

### Health Check

#### `GET /api/health`

Checks if the API is running.

**Response:**
```json
{
  "status": "healthy",
  "message": "Zirak API is up and running",
  "test_mode": false,
  "active_conversations": 0,
  "total_conversations": 10
}
```

## WebSocket Interface

The WebSocket interface provides real-time updates about the conversation workflow.

### Connecting

```javascript
const socket = io('http://localhost:5001');
```

### Events

#### `connect`

Emitted when the client connects to the WebSocket server.

#### `connected`

Emitted by the server when the client successfully connects.

**Payload:**
```json
{
  "status": "connected",
  "client_id": "client-id"
}
```

#### `join`

Client emits this event to join a specific conversation room.

**Payload:**
```json
{
  "conversation_id": "conversation-id"
}
```

#### `joined`

Emitted by the server when the client successfully joins a conversation room.

**Payload:**
```json
{
  "status": "joined",
  "conversation_id": "conversation-id"
}
```

#### `workflow_update`

Emitted by the server when a workflow step is updated.

**Payload:**
```json
{
  "timestamp": "ISO timestamp",
  "agent": "Agent name",
  "action": "Action performed",
  "message": "Log message",
  "status": "in_progress",
  "workflow_id": "workflow-id"
}
```

#### `chat_response`

Emitted by the server when a chat response is ready.

**Payload:**
```json
{
  "success": true,
  "response": "Response from Zirak",
  "workflow_steps": [],
  "conversation_id": "conversation-id"
}
```

#### `chat_error`

Emitted by the server when an error occurs during chat processing.

**Payload:**
```json
{
  "success": false,
  "response": "Error message",
  "workflow_steps": [],
  "conversation_id": "conversation-id",
  "error": true
}
```

## Frontend Integration Example

Here's a simple example of how to integrate with the Zirak backend from a frontend React application:

```jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5001';
const socket = io(BACKEND_URL);

function ChatApp() {
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Socket connection
    socket.on('connected', (data) => {
      console.log('Connected to WebSocket:', data);
      setConnected(true);
    });

    // Join conversation room if we have a conversation ID
    if (conversationId) {
      socket.emit('join', { conversation_id: conversationId });

      socket.on('joined', (data) => {
        console.log('Joined conversation:', data);
      });
    }

    // Handle workflow updates
    socket.on('workflow_update', (step) => {
      console.log('Workflow step:', step);
      setWorkflowSteps((prevSteps) => {
        // Check if this step already exists
        const exists = prevSteps.some(s =>
          s.timestamp === step.timestamp &&
          s.agent === step.agent &&
          s.message === step.message
        );

        if (exists) {
          // Update the existing step
          return prevSteps.map(s =>
            (s.timestamp === step.timestamp &&
             s.agent === step.agent &&
             s.message === step.message) ? step : s
          );
        } else {
          // Add as a new step
          return [...prevSteps, step];
        }
      });
    });

    // Handle final chat response
    socket.on('chat_response', (data) => {
      console.log('Chat response:', data);
      setIsProcessing(false);

      // Add the response to the conversation
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: data.response }
      ]);
    });

    // Handle errors
    socket.on('chat_error', (data) => {
      console.error('Chat error:', data);
      setIsProcessing(false);

      // Add the error to the conversation
      setConversation((prev) => [
        ...prev,
        { role: 'system', content: `Error: ${data.response}` }
      ]);
    });

    return () => {
      socket.off('connected');
      socket.off('joined');
      socket.off('workflow_update');
      socket.off('chat_response');
      socket.off('chat_error');
    };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    // Add user message to conversation
    setConversation((prev) => [...prev, { role: 'user', content: message }]);

    // Reset workflow steps for new messages
    if (!conversationId) {
      setWorkflowSteps([]);
    }

    // Show processing state
    setIsProcessing(true);

    try {
      // Send message to backend
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversation_id: conversationId || undefined,
        }),
      });

      const data = await response.json();

      // Set the conversation ID if it's a new conversation
      if (!conversationId) {
        setConversationId(data.conversation_id);
        // Join the socket room for this conversation
        socket.emit('join', { conversation_id: data.conversation_id });
      }

      // Clear the input
      setMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
      setIsProcessing(false);

      // Add error to conversation
      setConversation((prev) => [
        ...prev,
        { role: 'system', content: `Error: ${error.message}` }
      ]);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {conversation.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {isProcessing && <div className="processing-indicator">Processing...</div>}
      </div>

      <div className="workflow-panel">
        <h3>Agent Workflow</h3>
        <div className="workflow-steps">
          {workflowSteps.map((step, i) => (
            <div key={i} className={`workflow-step ${step.status}`}>
              <div className="step-agent">{step.agent}</div>
              <div className="step-action">{step.action}</div>
              <div className="step-message">{step.message}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={isProcessing}
        />
        <button onClick={sendMessage} disabled={isProcessing}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatApp;
```

## Test Mode

The Zirak backend supports a test mode that returns mock responses without running the actual agent workflow. This is useful for development and testing.

To enable test mode, set the environment variable `ZIRAK_TEST_MODE=true`.

## Troubleshooting

- **WebSocket Connection Issues**: Make sure CORS is properly configured for your frontend domain.
- **High CPU Usage**: The agent workflow can be resource-intensive. Consider setting appropriate timeouts.
- **Memory Leaks**: For production use, implement a cleanup mechanism to remove old conversations.

## License

[Your License Information]
