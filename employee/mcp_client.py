import asyncio
import json
from typing import Dict, List, Optional, Any

import httpx
import mcp.types as types
from mcp.client.sse import SseClientTransport
from mcp.client.session import ClientSession


class MCPToolClient:
    """Client for interacting with the MCP Tool Server."""

    def __init__(self, server_url: str = "http://localhost:8000"):
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
    client = MCPToolClient()

    try:
        # Connect to the server
        await client.connect()
        print("Connected to MCP server")

        # List available tools
        tools = await client.list_tools()
        print("\nAvailable tools:")
        for tool in tools:
            print(f"- {tool.name}: {tool.description.split('.')[0]}")

        # Example tool calls
        print("\nExample tool calls:")

        # Example 1: Web scraper
        print("\n1. Web Scraper Tool Example:")
        result = await client.call_tool(
            "webscrapertool", {"url": "https://example.com"}
        )
        print(f"Result from web scraper: {result[0].text[:200]}...")

        # Example 2: UV Package Manager (list packages)
        print("\n2. UV Package Manager Example:")
        result = await client.call_tool("uvpackagemanager", {"command": "list"})
        print(f"Result from UV Package Manager: {result[0].text[:200]}...")

        # Example 3: Terminal Command Tool
        print("\n3. Terminal Command Tool Example:")
        result = await client.call_tool(
            "terminalcommandtool", {"command": "echo 'Hello from MCP!'"}
        )
        print(f"Result from Terminal Command: {result[0].text}")

    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        # Disconnect from the server
        await client.disconnect()
        print("\nDisconnected from MCP server")


if __name__ == "__main__":
    asyncio.run(main())
