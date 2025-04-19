# MCP Browser Tool

This is a simple implementation of an MCP (Model Context Protocol) server and client for opening URLs in your default web browser. The implementation follows the MCP protocol specification.

## System Requirements

* Python 3.7 or higher
* An OpenAI API key

## Setup

1. Install the required dependencies:

```bash
pip install mcp openai validators python-dotenv
```

2. Add your OpenAI API key to the `.env` file:

```
OPENAI_API_KEY=<your key here>
```

## Running the Server and Client

1. First, ensure the server is executable:

```bash
chmod +x tools/browsertool.py
```

2. Run the client, pointing to the server:

```bash
python client.py tools/browsertool.py
```

3. Once connected, you can interact with the browsertool by typing queries like:
   - "Open the Google website"
   - "Please open github.com and stackoverflow.com in my browser"

4. Type `quit` to exit the client.

## How It Works

This implementation follows the MCP (Model Context Protocol) architecture:

1. The `browsertool.py` MCP server provides a tool that can open URLs in the default web browser.
2. The `client.py` connects to this server over stdio and lists available tools.
3. When you enter a query, it's sent to GPT-4o (OpenAI's LLM) along with the tool descriptions.
4. GPT-4o decides if it needs to use the tool and sends back tool call instructions.
5. The client executes the tool call through the server and returns the result to GPT-4o.
6. GPT-4o provides a final natural language response.

## Troubleshooting

- If you see `Error: OPENAI_API_KEY environment variable not found`, check that your `.env` file is properly configured.
- If the connection fails, make sure the server path is correct.
- For Windows users, you may need to adjust the command in `connect_to_server()`.

## License

This project is for educational purposes only.
