import os
import logging
import json
import asyncio
import click
from typing import Dict, List, Union, Any, Optional
from pathlib import Path
import sys

# Add parent directory to path
current_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(current_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("mcp_server.log")],
)
logger = logging.getLogger(__name__)

# Import MCP related modules
import mcp.types as types
from mcp.server.lowlevel import Server

# Import tool classes
from Backend.Agents.tools.webscrapertool import WebScraperTool
from Backend.Agents.tools.uvpackagemanager import UVPackageManager
from Backend.Agents.tools.toolcreator import ToolCreatorTool
from Backend.Agents.tools.terminalcommandtool import TerminalCommandTool
from Backend.Agents.tools.screenshottool import ScreenshotTool

# Create tool instances
tools_instances = {
    "webscrapertool": WebScraperTool(),
    "uvpackagemanager": UVPackageManager(),
    "toolcreator": ToolCreatorTool(),
    "terminalcommandtool": TerminalCommandTool(),
    "screenshottool": ScreenshotTool(),
}

# Create a single server instance
server = Server("employee-tools-mcp-server")


@server.list_tools()
async def list_tools() -> List[types.Tool]:
    """List all available tools."""
    tools = []

    for name, tool_instance in tools_instances.items():
        # Make sure the input schema has a proper JSON Schema format
        input_schema = (
            tool_instance.input_schema if hasattr(tool_instance, "input_schema") else {}
        )

        # Ensure input schema has proper structure (type: object)
        if not input_schema:
            input_schema = {"type": "object", "properties": {}}
        elif "type" not in input_schema:
            input_schema = {
                "type": "object",
                "properties": input_schema.get("properties", {}),
            }

        tool_definition = types.Tool(
            name=tool_instance.name,
            description=(
                tool_instance.description.strip()
                if hasattr(tool_instance, "description")
                else ""
            ),
            inputSchema=input_schema,
            annotations={
                "title": (
                    tool_instance.name.capitalize()
                    if hasattr(tool_instance, "name")
                    else name.capitalize()
                ),
                "readOnlyHint": name == "webscrapertool" or name == "screenshottool",
                "destructiveHint": name == "terminalcommandtool",
                "idempotentHint": False,
                "openWorldHint": name in ["webscrapertool", "terminalcommandtool"],
            },
        )
        tools.append(tool_definition)

    return tools


@server.call_tool()
async def call_tool(
    name: str, arguments: Dict
) -> List[Union[types.TextContent, types.ImageContent]]:
    """Execute the specified tool with the given arguments."""
    logger.info(f"Tool call requested: {name} with arguments: {arguments}")

    try:
        # Find the tool instance
        if name not in tools_instances:
            raise ValueError(f"Unknown tool: {name}")

        tool_instance = tools_instances[name]

        # Execute the tool
        logger.info(f"Executing tool {name} with arguments: {arguments}")
        result = tool_instance.execute(**arguments)

        # Handle special case for ScreenshotTool which returns image data
        if (
            name == "screenshottool"
            and isinstance(result, list)
            and result
            and "type" in result[0]
            and result[0]["type"] == "image"
        ):
            # Return the image directly as MCP image content
            return [
                {
                    "type": "image",
                    "data": result[0]["source"]["data"],
                    "mimeType": result[0]["source"]["media_type"],
                }
            ]

        # For text-based tools, convert the result to TextContent
        if isinstance(result, str):
            return [types.TextContent(type="text", text=result)]

        # If result is already a list but not properly formatted, convert it
        if isinstance(result, list):
            return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

        # Default case
        return [types.TextContent(type="text", text=str(result))]

    except Exception as e:
        error_msg = f"Error executing tool {name}: {str(e)}"
        logger.error(error_msg)
        return [types.TextContent(type="text", text=error_msg)]


# Standard method that MCP looks for to run the server
async def run(read_stream, write_stream, initialization_options):
    try:
        logger.info("MCP server run method called")
        await server.run(read_stream, write_stream, initialization_options)
    except Exception as e:
        logger.error(f"Error running MCP server: {str(e)}")
        raise


# This script can be run in two ways:
# 1. As a standalone server: python mcp_server.py
# 2. With the MCP CLI: mcp dev mcp_server.py (which calls the run() function)

if __name__ == "__main__":
    import uvicorn
    from starlette.applications import Starlette
    from starlette.routing import Mount, Route
    from mcp.server.sse import SseServerTransport

    # Set up SSE transport
    sse = SseServerTransport("/messages/")

    async def handle_sse(request):
        """Handle SSE connections."""
        async with sse.connect_sse(
            request.scope, request.receive, request._send
        ) as streams:
            await server.run(
                streams[0], streams[1], server.create_initialization_options()
            )

    # Create Starlette app with routes
    starlette_app = Starlette(
        debug=False,  # Set to False for production
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse.handle_post_message),
        ],
    )

    # Parse command line arguments
    @click.command()
    @click.option("--port", default=3001, help="Port to listen on")
    @click.option("--host", default="0.0.0.0", help="Host to bind to")
    def main(port, host):
        """Run the MCP server."""
        logger.info(f"Starting MCP server on {host}:{port}")
        logger.info("Available endpoints:")
        logger.info(f"- /sse (SSE connection endpoint)")
        logger.info(f"- /messages/ (Message handling endpoint)")

        uvicorn.run(
            starlette_app, host=host, port=port, log_level="info", access_log=False
        )

    # Run the server
    main()
