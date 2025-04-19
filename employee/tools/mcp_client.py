import asyncio
import json
from typing import Dict, List, Optional, Any

import httpx
import mcp.types as types
from mcp.client.sse import SseClientTransport
from mcp.client.session import ClientSession


class MCPToolClient:
    """Client for interacting with the MCP Tool Server."""

    def __init__(self, server_url: str = "http://localhost:3001"):
        """Initialize the client with the server URL.

        Args:
            server_url: Base URL of the MCP server
        """
        self.server_url = server_url
        self.sse_endpoint = f"{server_url}/sse"
        self.message_endpoint = f"{server_url}/messages/"
        self.transport = None
        self.session = None

    async def connect(self):
        """Connect to the MCP server."""
        self.transport = SseClientTransport(self.sse_endpoint, self.message_endpoint)
        client_id = await self.transport.connect()

        # Create streams
        reader, writer = await self.transport.create_streams(client_id)

        # Create client session
        self.session = ClientSession(reader, writer)
        await self.session.initialize()

        return self.session

    async def disconnect(self):
        """Disconnect from the MCP server."""
        if self.transport:
            await self.transport.close()

    async def list_tools(self) -> List[types.Tool]:
        """List all available tools on the server."""
        if not self.session:
            raise RuntimeError("Client not connected to server")

        tools = await self.session.list_tools()
        return tools

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict:
        """Call a tool on the server.

        Args:
            name: Name of the tool to call
            arguments: Arguments to pass to the tool

        Returns:
            The result of the tool execution
        """
        if not self.session:
            raise RuntimeError("Client not connected to server")

        result = await self.session.call_tool(name, arguments)
        return result


async def main():
    """Example of using the MCP Tool Client."""
    client = MCPToolClient(
        server_url="http://localhost:3001"
    )  # Explicitly set to port 3001

    try:
        # Connect to the server
        await client.connect()
        print("Connected to MCP server")

        # List available tools
        tools = await client.list_tools()
        print("\nAvailable tools:")
        for tool in tools:
            print(f"- {tool.name}: {tool.description.split('.')[0]}")

        # Menu for tool selection
        while True:
            print("\nSelect a tool to use (or 'q' to quit):")
            for i, tool in enumerate(tools):
                print(f"{i+1}. {tool.name}")
            print("q. Quit")

            choice = input("Enter your choice: ")

            if choice.lower() == "q":
                break

            try:
                idx = int(choice) - 1
                if idx < 0 or idx >= len(tools):
                    print("Invalid selection. Please try again.")
                    continue

                selected_tool = tools[idx]
                print(f"\nSelected tool: {selected_tool.name}")
                print(f"Description: {selected_tool.description}")

                # Get required arguments
                arguments = {}
                if (
                    selected_tool.inputSchema
                    and "properties" in selected_tool.inputSchema
                ):
                    for arg_name, arg_details in selected_tool.inputSchema[
                        "properties"
                    ].items():
                        description = arg_details.get("description", "")
                        prompt = (
                            f"Enter {arg_name}"
                            + (f" ({description})" if description else "")
                            + ": "
                        )
                        value = input(prompt)

                        # Try to convert to appropriate type if specified
                        if "type" in arg_details:
                            if arg_details["type"] == "integer":
                                try:
                                    value = int(value)
                                except ValueError:
                                    print(
                                        f"Warning: Could not convert '{value}' to integer, using as string"
                                    )
                            elif arg_details["type"] == "boolean":
                                value = value.lower() in ("true", "yes", "y", "1")

                        arguments[arg_name] = value

                # Call the tool
                print(
                    f"\nCalling {selected_tool.name} with arguments: {json.dumps(arguments, indent=2)}"
                )
                result = await client.call_tool(selected_tool.name, arguments)

                # Print the result
                print("\nResult:")
                if isinstance(result, list):
                    for item in result:
                        if hasattr(item, "text"):
                            print(item.text)
                        elif hasattr(item, "type") and item.type == "image":
                            # Handle image type
                            print("Received image data. Saving to file...")
                            import base64
                            from pathlib import Path

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
                else:
                    print(result)

            except ValueError:
                print("Please enter a valid number")
            except Exception as e:
                print(f"Error executing tool: {str(e)}")

    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        # Disconnect from the server
        await client.disconnect()
        print("\nDisconnected from MCP server")


if __name__ == "__main__":
    asyncio.run(main())
