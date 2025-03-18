# Agent Monitoring Tools for Zirak

This package includes several tools to monitor the internal workings of the Zirak agent system in real-time, specifically designed to track and visualize conversations between agents.

## 1. Agent Monitor

The `agent_monitor.py` script provides detailed monitoring of agent communications in real-time, showing exactly how agents interact with each other.

### Features

- Real-time monitoring of agent-to-agent communications
- Detailed display of conversation flow
- Extraction and display of questions and answers
- Color-coded agent interactions
- Output available as both terminal display and JSON file

### Basic Usage

```bash
# Start a new conversation and monitor it
python agent_monitor.py "Tell me a joke"

# Monitor an existing conversation
python agent_monitor.py --conversation-id YOUR_CONVERSATION_ID

# Monitor with increased timeout
python agent_monitor.py "Generate a Python API" --max-time 120
```

### Command Line Options

- `query` - The query to send to the API (optional if monitoring existing conversation)
- `--url` - Base URL of the API (default: http://localhost:5001)
- `--conversation-id` - ID of an existing conversation to monitor
- `--max-time` - Maximum time to monitor in seconds (default: 60)
- `--verbose` - Show verbose output including setup messages

## 2. API Patch Utility

The `api_patch.py` script patches the Zirak API to emit more detailed workflow events, making the monitoring much more effective.

### What It Patches

1. `conversation_workflow.py` - Adds event emission for workflow steps
2. `agent_manager.py` - Adds monitoring for agent selection and message passing
3. `api.py` - Makes the socketio instance available to the workflow

### Usage

```bash
# Patch the API files (creates backups first)
python api_patch.py

# Restore from backups
python api_patch.py --restore

# Use custom file paths
python api_patch.py --workflow-path /path/to/conversation_workflow.py --agent-manager-path /path/to/agent_manager.py --api-path /path/to/api.py
```

### Command Line Options

- `--workflow-path` - Path to conversation_workflow.py (default: Agents/conversation_workflow.py)
- `--agent-manager-path` - Path to agent_manager.py (default: Agents/agent_manager.py)
- `--api-path` - Path to api.py (default: api.py)
- `--restore` - Restore from backup instead of patching

## Installation

No additional installation is required beyond what's already in `requirements-test.txt`.

## Workflow

For best results, follow this workflow:

1. First patch the API:
   ```bash
   python api_patch.py
   ```

2. Restart the Zirak API server:
   ```bash
   # Stop the current server and start it again
   python api.py
   ```

3. Run the agent monitor with your query:
   ```bash
   python agent_monitor.py "Your query here"
   ```

4. Review the output to see detailed agent interactions

5. When finished, restore the original files (optional):
   ```bash
   python api_patch.py --restore
   ```

## Understanding the Output

The monitor script provides several views of the conversation:

1. **Real-time Updates**: Color-coded panels showing messages as they occur
2. **Detailed Conversation Flow**: Table showing who communicated with whom and what was said
3. **Agent Interaction Sequence**: Timeline of agent communications
4. **Questions and Answers**: Extracted Q&A pairs from the conversation

## Example JSON Output

The script generates a JSON file named `monitor_[CONVERSATION_ID].json` containing:

- Conversation ID
- Query (if new conversation)
- All workflow steps
- Agent communications organized by agent
- Actual message content where available

This data can be used for further analysis or visualization.

## Troubleshooting

If you're not seeing detailed agent communications:

1. Make sure you've patched the API and restarted the server
2. Check that the WebSocket connection is working
3. Try increasing the `--max-time` parameter
4. Use the `--verbose` flag to see more details

If you encounter errors after patching, you can restore the original files:

```bash
python api_patch.py --restore
``` 