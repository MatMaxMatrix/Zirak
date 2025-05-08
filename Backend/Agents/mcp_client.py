import os
import asyncio
import json
from typing import Optional, List, Dict, Any, Union, Callable
from contextlib import AsyncExitStack
import logging
from dotenv import load_dotenv

from mcp import ClientSession
from mcp.client.sse import sse_client
import mcp.types as types

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("backend_mcp_client.log")],
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class MCPToolManager:
    """A tool manager that connects to an MCP server to execute tools."""

    def __init__(self, server_url: str = "http://localhost:3002/sse"):
        self.server_url = server_url
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.available_tools = []
        self.connected = False

    async def connect(self):
        """Connects to the MCP server via SSE."""
        if self.connected:
            logger.info("Already connected to MCP server")
            return

        logger.info(f"Connecting to MCP server at {self.server_url}...")
        try:
            streams = await self.exit_stack.enter_async_context(
                sse_client(self.server_url)
            )
            self.session = await self.exit_stack.enter_async_context(
                ClientSession(streams[0], streams[1])
            )
            await self.session.initialize()
            logger.info("MCP Session initialized successfully.")
            await self._fetch_tools()
            self.connected = True
        except Exception as e:
            logger.error(f"Failed to connect or initialize MCP session: {e}")
            raise

    async def _fetch_tools(self):
        """Fetches the list of available tools from the server."""
        if not self.session:
            logger.error("Cannot fetch tools, session not connected.")
            return

        try:
            logger.info("Fetching available tools from the server...")
            tools_result = await self.session.list_tools()

            # Extract tools from result
            mcp_tools = self._extract_from_result(tools_result, "tools")
            logger.info(
                f"Found {len(mcp_tools) if isinstance(mcp_tools, list) else '?'} tools"
            )

            # Process each tool into a standardized format
            self.available_tools = []
            for tool in mcp_tools:
                try:
                    self.available_tools.append(self._process_tool(tool))
                except Exception as e:
                    logger.error(f"Error processing tool: {e}")

            logger.info(f"Processed {len(self.available_tools)} tools")
        except Exception as e:
            logger.error(f"Failed to fetch tools: {e}")
            self.available_tools = []

    def _process_tool(self, tool) -> Dict[str, Any]:
        """Converts a tool object to a standardized dictionary."""
        if isinstance(tool, tuple) and len(tool) >= 3:
            # Handle tuple format
            return {
                "name": tool[0],
                "description": tool[1],
                "inputSchema": tool[2] if len(tool) > 2 else {},
                "annotations": tool[3] if len(tool) > 3 else {},
            }
        else:
            # Handle object format
            return {
                "name": getattr(tool, "name", "Unknown"),
                "description": getattr(tool, "description", "No description available"),
                "inputSchema": getattr(tool, "inputSchema", {}),
                "annotations": (
                    getattr(tool, "annotations", {})
                    if hasattr(tool, "annotations")
                    else {}
                ),
            }

    def _extract_from_result(self, result, attr_name=None):
        """Extracts data from various result object formats."""
        if attr_name and hasattr(result, attr_name):
            return getattr(result, attr_name)
        elif isinstance(result, list):
            return result
        elif hasattr(result, "__getitem__"):
            try:
                return result
            except (IndexError, TypeError):
                pass
        return []

    async def execute_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> str:
        """Executes a tool via MCP and returns the result."""
        if not self.connected:
            await self.connect()

        if not self.session:
            raise RuntimeError("Not connected to MCP server")

        try:
            logger.info(f"Calling tool '{tool_name}' via MCP with args: {tool_args}")
            tool_result = await self.session.call_tool(
                name=tool_name, arguments=tool_args
            )

            # Extract content blocks
            content_blocks = self._extract_content_blocks(tool_result)
            formatted_results = self._format_content_blocks(content_blocks)

            if not formatted_results:
                return f"The tool '{tool_name}' was executed, but returned no displayable content."

            return "\n".join(formatted_results)

        except Exception as e:
            logger.error(f"Error calling tool '{tool_name}' via MCP: {e}")
            return f"Error executing tool '{tool_name}': {str(e)}"

    def _extract_content_blocks(self, result):
        """Extracts content blocks from various result formats."""
        for attr in ["content", "results"]:
            if hasattr(result, attr):
                return getattr(result, attr)

        if isinstance(result, list):
            return result
        elif hasattr(result, "__getitem__"):
            try:
                return result
            except (IndexError, TypeError):
                pass

        # Default fallback
        return [{"type": "text", "text": str(result)}]

    def _format_content_blocks(self, blocks) -> List[str]:
        """Formats content blocks into displayable strings."""
        formatted = []

        for block in blocks:
            # Handle attribute-based objects
            if hasattr(block, "type"):
                if hasattr(block, "text") and block.type == "text":
                    formatted.append(block.text)
                elif hasattr(block, "data") and block.type == "image":
                    formatted.append(
                        f"[Image data received, mime-type: {getattr(block, 'mimeType', 'unknown')}]"
                    )

            # Handle dictionary format
            elif isinstance(block, dict) and "type" in block:
                if block["type"] == "text" and "text" in block:
                    formatted.append(block["text"])
                elif block["type"] == "image":
                    formatted.append(
                        f"[Image data received, mime-type: {block.get('mimeType', 'unknown')}]"
                    )

            # Default fallback
            else:
                formatted.append(str(block))

        return formatted

    def get_available_tool_names(self) -> List[str]:
        """Returns a list of available tool names."""
        return [tool["name"] for tool in self.available_tools]

    def get_tool_info(self, tool_name: str) -> Dict[str, Any]:
        """Returns information about a specific tool."""
        for tool in self.available_tools:
            if tool["name"] == tool_name:
                return tool
        return {}

    async def cleanup(self):
        """Cleans up resources."""
        logger.info("Cleaning up MCP client resources...")
        await self.exit_stack.aclose()
        self.connected = False
        logger.info("MCP client shutdown complete.")


# Singleton instance of the tool manager
_mcp_tool_manager = None


def get_mcp_tool_manager(
    server_url: str = "http://localhost:3002/sse",
) -> MCPToolManager:
    """Returns a singleton instance of the MCPToolManager."""
    global _mcp_tool_manager
    if _mcp_tool_manager is None:
        _mcp_tool_manager = MCPToolManager(server_url)
    return _mcp_tool_manager


async def execute_tool(tool_name: str, tool_args: Dict[str, Any]) -> str:
    """Helper function to execute a tool via the MCP tool manager."""
    tool_manager = get_mcp_tool_manager()
    return await tool_manager.execute_tool(tool_name, tool_args)


async def main():
    """Main function for testing the MCP client."""
    tool_manager = get_mcp_tool_manager()
    try:
        await tool_manager.connect()

        # Print available tools
        print("Available tools:")
        for tool in tool_manager.available_tools:
            print(f"- {tool['name']}: {tool['description'][:100]}...")

        # Test a tool
        result = await tool_manager.execute_tool(
            "webscrapertool", {"url": "https://example.com"}
        )
        print(f"Tool result: {result}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await tool_manager.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
