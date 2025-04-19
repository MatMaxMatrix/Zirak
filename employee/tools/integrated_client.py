import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from contextlib import asynccontextmanager, AsyncExitStack

# Add parent directory to path
current_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(current_dir))

from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.session import ClientSession


class MCPIntegratedClient:
    """A client that integrates directly with the MCP server script."""

    def __init__(self):
        self.exit_stack = AsyncExitStack()
        self.session = None
        self.tools = []

    async def connect_to_server(self, server_script_path):
        """Connect to the MCP server by launching it with uv run."""
        print(f"Connecting to MCP server: {server_script_path}")

        # Check if the server script exists
        server_path = Path(server_script_path).resolve()
        if not server_path.exists():
            raise FileNotFoundError(f"Server script not found: {server_path}")

        # Configure the params for stdio connection
        stdio_params = StdioServerParameters(
            command="uv", args=["run", "python", str(server_path)]
        )

        # Connect to the server
        read_stream, write_stream = await self.exit_stack.enter_async_context(
            stdio_client(stdio_params)
        )

        # Create and initialize the session
        self.session = ClientSession(read_stream, write_stream)
        await self.session.initialize()

        # List available tools
        self.tools = await self.session.list_tools()
        print(f"\nConnected to server! Found {len(self.tools)} tools:")
        for tool in self.tools:
            print(f"- {tool.name}: {tool.description}")

        return self.session

    async def call_tool(self, tool_name, arguments):
        """Call a tool by name with the given arguments."""
        if not self.session:
            raise RuntimeError("Not connected to a server")

        # Find the tool by name
        tool = next((t for t in self.tools if t.name == tool_name), None)
        if not tool:
            raise ValueError(f"Tool not found: {tool_name}")

        print(
            f"Calling tool: {tool_name} with arguments: {json.dumps(arguments, indent=2)}"
        )

        # Call the tool
        result = await self.session.call_tool(tool_name, arguments)
        return result

    async def interactive_loop(self):
        """Start an interactive loop for tool selection and execution."""
        if not self.session:
            raise RuntimeError("Not connected to a server")

        print("\n===== MCP Tool Client =====")
        print("Select a tool to use or 'q' to quit")

        while True:
            # Display available tools
            print("\nAvailable Tools:")
            for i, tool in enumerate(self.tools):
                print(f"{i+1}. {tool.name}")
            print("q. Quit")

            # Get user choice
            choice = input("\nEnter choice: ").strip()
            if choice.lower() == "q":
                break

            try:
                idx = int(choice) - 1
                if idx < 0 or idx >= len(self.tools):
                    print("Invalid selection")
                    continue

                selected_tool = self.tools[idx]
                print(f"\nSelected: {selected_tool.name}")
                print(f"Description: {selected_tool.description}")

                # Get arguments based on the tool's input schema
                arguments = {}
                if (
                    selected_tool.inputSchema
                    and "properties" in selected_tool.inputSchema
                ):
                    for arg_name, arg_info in selected_tool.inputSchema[
                        "properties"
                    ].items():
                        description = arg_info.get("description", "")
                        prompt = (
                            f"Enter {arg_name}"
                            + (f" ({description})" if description else "")
                            + ": "
                        )
                        value = input(prompt)

                        # Try to convert to appropriate type
                        if "type" in arg_info:
                            if arg_info["type"] == "integer":
                                try:
                                    value = int(value)
                                except ValueError:
                                    print(
                                        f"Warning: Could not convert to integer, using as string"
                                    )
                            elif arg_info["type"] == "boolean":
                                value = value.lower() in ("true", "yes", "y", "1")

                        arguments[arg_name] = value

                # Call the tool
                try:
                    result = await self.call_tool(selected_tool.name, arguments)

                    # Display the result
                    print("\nResult:")
                    for item in result:
                        if hasattr(item, "text"):
                            print(item.text)
                        elif hasattr(item, "type") and item.type == "image":
                            # Handle image type
                            print("Received image. Saving to file...")
                            import base64

                            # Create output directory if it doesn't exist
                            output_dir = Path("screenshots")
                            output_dir.mkdir(exist_ok=True)

                            # Save image to file
                            image_path = (
                                output_dir
                                / f"screenshot_{int(asyncio.get_event_loop().time())}.png"
                            )
                            with open(image_path, "wb") as f:
                                f.write(base64.b64decode(item.data))
                            print(f"Image saved to {image_path}")
                        else:
                            print(item)

                except Exception as e:
                    print(f"Error executing tool: {str(e)}")

            except ValueError:
                print("Please enter a valid number or 'q'")

    async def cleanup(self):
        """Clean up resources."""
        await self.exit_stack.aclose()


async def main():
    """Main entry point."""
    # Determine the server script path - either from arguments or use default
    if len(sys.argv) > 1:
        server_script_path = sys.argv[1]
    else:
        # Use the mcp_server.py in the same directory as this script
        server_script_path = Path(__file__).resolve().parent / "mcp_server.py"

    print(f"Using server script: {server_script_path}")

    client = MCPIntegratedClient()
    try:
        await client.connect_to_server(server_script_path)
        await client.interactive_loop()
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        await client.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
