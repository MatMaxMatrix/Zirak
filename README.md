# Zirak AI Assistant with Real-time Communication

This project integrates a Backend Agentic Workflow system with a React Frontend using WebSockets for real-time communication. The system allows for live monitoring of the agentic workflow, handling of user input requests, and visualization of the conversation flow.

## Project Structure

The project consists of two main components:

1. **Backend**: Python-based agentic workflow system using AutoGen
2. **Frontend**: React-based UI with WebSocket communication

## Setup and Installation

### Backend Setup

1. Navigate to the Backend directory:
   ```
   cd Backend
   ```

2. Create a virtual environment (if not already created):
   ```
   python -m venv .venv
   ```

3. Activate the virtual environment:
   - Windows: `.venv\Scripts\activate`
   - macOS/Linux: `source .venv/bin/activate`

4. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Make sure you have set up your `.env` file with the necessary API keys (see `.env.example`).

### Frontend Setup

1. Navigate to the my-app directory:
   ```
   cd my-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Running the Application

### Start the Backend Server

1. Ensure your virtual environment is activated
2. From the Backend directory, run:
   ```
   python server.py
   ```
   This will start the Flask server with SocketIO on port 5001.

### Start the Frontend Development Server

1. From the my-app directory, run:
   ```
   npm run dev
   ```
   This will start the Next.js development server.

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Secrets Management

We follow strict security practices to protect sensitive information:

1. **Environment Variables**:
   - Never commit `.env` files to the repository
   - Use `.env.example` as a template with dummy values
   - Store actual secrets in `.env.local` or other gitignored files

2. **Git Hooks**:
   - Run `./install-hooks.sh` to install pre-commit hooks that scan for secrets
   - These hooks prevent accidental commits of sensitive information

3. **Best Practices**:
   - Never use `git add .` or `git add *` - add files individually
   - Always check what you're committing with `git diff --staged`
   - Rotate API keys regularly
   - Use minimal permissions for all API keys

For more detailed information, see `SECRETS_MANAGEMENT.md`.

## How It Works

1. The frontend connects to the backend via WebSockets.
2. When a user sends a message, it's transmitted to the backend via WebSocket.
3. The backend initiates the agentic workflow and streams real-time updates back to the frontend.
4. If the workflow requires user input (from UserProxyAgent), the frontend will display an input prompt.
5. The workflow continues once the user provides the requested input.

## Key Features

- Real-time streaming of agent messages and workflow steps
- Interactive user input when required by the workflow
- Visual representation of the agent workflow
- File and terminal output display

## Troubleshooting

- If you encounter connection issues, ensure both servers are running and check browser console for errors
- For backend issues, check the terminal running the server for error logs
- Make sure your `.env` file contains valid API keys

## Development Notes

- The backend uses Flask-SocketIO for WebSocket communication
- The frontend implements WebSocket using socket.io-client
- User input is handled using asynchronous event-based communication
- The agentic workflow is modified to track and stream its progress in real-time
