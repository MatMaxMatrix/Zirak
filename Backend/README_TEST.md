# Zirak API Test Scripts

These scripts allow you to test the Zirak API and visualize the internal communications between agents.

## Installation

Install the required packages:

```bash
pip install -r requirements-test.txt
```

## Quick Start

The easiest way to run the tests is using the wrapper script:

```bash
python run_test.py "Tell me a joke"
```

This script will:
1. Check if all dependencies are installed
2. Verify the API server is running (and offer to start it if not)
3. Run the appropriate test script and display the results

## Usage Options

### Wrapper Script

The `run_test.py` script provides the easiest way to test the API:

```bash
python run_test.py "Generate a Python function to calculate Fibonacci numbers" --visualize
```

Options:
- `--visualize`: Use the advanced visualization script instead of basic test
- `--url URL`: Specify the base URL of the API (default: http://localhost:5001)
- `--conversation-id ID`: Continue an existing conversation
- `--timeout SECONDS`: Specify how long to collect data
- `--no-viz`: Skip generating the HTML visualization (only with --visualize)
- `--skip-checks`: Skip dependency and server checks

### Basic Test Script

The basic test script (`test_api.py`) can be used directly to send a query to the API and view the agent communications:

```bash
python test_api.py "Tell me a joke"
```

### Advanced Visualization Script

The advanced visualization script (`test_api_visualizer.py`) provides more detailed analysis and visualization of agent interactions:

```bash
python test_api_visualizer.py "Generate an API for user authentication"
```

### Server Check Utility

You can check if the Zirak API server is running with:

```bash
python check_server.py
```

## Understanding the Output

The scripts capture and display:

1. **Agent Communications**: All messages sent between agents
2. **Questions and Answers**: Extracted Q&A pairs from the conversation
3. **Conversation Flow**: A tree view of which agent communicated with which

The visualizer script also generates an HTML file that shows an interactive network diagram of agent interactions.

## Files Generated

- `conversation_[ID].json`: Complete conversation data in JSON format
- `visualizations/conversation_[ID]_[TIMESTAMP].html`: Interactive HTML visualization (visualizer only)

## Viewing Visualizations

Open the generated HTML file in any modern web browser to view the interactive visualization. You can:

- Drag nodes to rearrange the network
- Hover over edges to see message content
- Zoom in/out with the mouse wheel
- Pan by clicking and dragging the background

## Example

```bash
# Start the Zirak API server in one terminal
cd Zirak
python api.py

# In another terminal, run the test
python run_test.py "Explain how neural networks work" --visualize
```

This will:
1. Send your query to the API
2. Show the real-time communication between agents
3. Generate a visualization of the agent interactions
4. Save the complete conversation data to a JSON file

## Troubleshooting

If you encounter issues:

1. Use `check_server.py` to verify the API server is running
2. Make sure all dependencies are installed with `pip install -r requirements-test.txt`
3. Try running with `--no-socket` option if WebSocket connections fail
4. Check the server logs for any errors
5. Ensure your firewall allows connections to the API port (default: 5001) 