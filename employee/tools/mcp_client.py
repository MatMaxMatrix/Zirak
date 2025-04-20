import os
import asyncio
import json
from typing import Optional, List, Dict, Any, Union, Callable
from contextlib import AsyncExitStack
import logging

from mcp import ClientSession
from mcp.client.sse import sse_client
import mcp.types as types
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Tool-specific error suggestions
TOOL_ERROR_SUGGESTIONS = {
    "webscrapertool": "\n\nThis could be due to:\n- The URL might be invalid or inaccessible\n- The website might block web scraping\n- There might be a network issue\n\nTry with a different URL or a different tool.",
    "terminalcommandtool": "\n\nThis could be due to:\n- The command might be invalid\n- There might be permission issues\n- The command might have failed to execute\n\nTry with a simpler command or check your syntax.",
}


class MCPClient:
    """An MCP client that uses an OpenAI LLM to interact with an MCP server."""

    def __init__(self, server_url: str):
        self.server_url = server_url
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()

        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY not found in environment variables. Please set it in a .env file."
            )
        self.openai_client = AsyncOpenAI(api_key=api_key)

        # Tool storage
        self.available_tools: List[Dict[str, Any]] = []

    async def connect(self):
        """Connects to the MCP server via SSE."""
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
            logger.debug(f"Raw tools response type: {type(tools_result)}")

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

            logger.info(f"Processed {len(self.available_tools)} tools for OpenAI")
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

    async def _get_openai_response(self, user_query: str) -> str:
        """Gets a direct response from OpenAI with information about available tools."""
        try:
            # Create a system prompt that includes information about available tools
            system_prompt = "You are a helpful assistant with access to various tools."

            if self.available_tools:
                tool_descriptions = []
                for tool in self.available_tools:
                    name = tool.get("name", "Unknown")
                    desc = tool.get("description", "No description")
                    tool_descriptions.append(f"- {name}: {desc}")

                system_prompt += "\n\nAvailable tools:\n" + "\n".join(tool_descriptions)
                system_prompt += "\n\nIf the user asks about available tools, list them. Otherwise, provide helpful responses based on your knowledge."
            else:
                system_prompt += "\n\nCurrently, you don't have access to any tools. Respond based on your general knowledge."

            # Call OpenAI API
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query},
                ],
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            return f"Sorry, I encountered an error while processing your request: {e}"

    async def _get_openai_tool_call(self, user_query: str) -> Optional[Dict[str, Any]]:
        """Uses OpenAI to determine the appropriate tool and arguments for the user query."""
        if not self.available_tools:
            logger.warning("No tools available to choose from.")
            return None

        # Prepare tools for OpenAI
        openai_tools_spec = [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool["inputSchema"],
                },
            }
            for tool in self.available_tools
        ]

        # Create a system prompt that includes information about using tools
        system_prompt = (
            "You are an assistant that helps users by calling appropriate tools. "
            "If the user's query can be solved using one of the available tools, select the most appropriate one "
            "and determine the arguments needed according to the tool's input schema. "
            "If no tool seems appropriate or if the user is asking about available tools or capabilities, "
            "respond normally without calling a tool."
        )

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query},
                ],
                tools=openai_tools_spec,
                tool_choice="auto",
            )

            message = response.choices[0].message

            # Handle tool calls
            if message.tool_calls:
                tool_call = message.tool_calls[0].function
                try:
                    return {
                        "name": tool_call.name,
                        "arguments": json.loads(tool_call.arguments),
                    }
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse arguments: {e}")
                    return None

            # Handle direct text response
            elif message.content:
                return {"text_response": message.content}

            return None

        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            return None

    async def process_query(self, user_query: str) -> str:
        """Processes a user query using OpenAI and the MCP server."""
        if not self.session:
            return "Error: Not connected to the MCP server."

        # Handle case with no tools
        if not self.available_tools:
            logger.warning("No tools available. Asking OpenAI for a direct response.")
            return await self._get_openai_response(user_query)

        # Get tool decision from OpenAI
        tool_decision = await self._get_openai_tool_call(user_query)

        # No tool selected - fallback to direct response
        if not tool_decision:
            return await self._get_openai_response(user_query)

        # Handle text response
        if "text_response" in tool_decision:
            return tool_decision["text_response"]

        # Execute the selected tool
        tool_name = tool_decision.get("name")
        tool_args = tool_decision.get("arguments", {})

        if not tool_name:
            return "Sorry, I couldn't determine which tool to use."

        return await self._execute_tool(tool_name, tool_args)

    async def _execute_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> str:
        """Executes an MCP tool and formats the result."""
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
            error_msg = f"I encountered an error when trying to use the {tool_name} tool: {str(e)}"
            suggestion = TOOL_ERROR_SUGGESTIONS.get(tool_name, "")
            return error_msg + suggestion

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

    async def chat_loop(self):
        """Runs an interactive chat loop."""
        print("\nMCP Client Connected!")
        print(
            "Enter your query (e.g., 'scrape example.com' or 'take a screenshot') or type 'quit'."
        )

        while True:
            try:
                query = input("\nQuery: ").strip()
                if query.lower() == "quit":
                    break
                if not query:
                    continue

                response = await self.process_query(query)
                print(f"\nResponse:\n{response}")

            except KeyboardInterrupt:
                print("\nExiting...")
                break
            except Exception as e:
                logger.error(f"Error in chat loop: {e}")
                print(f"\nAn unexpected error occurred: {e}")

    async def cleanup(self):
        """Cleans up resources."""
        logger.info("Cleaning up resources...")
        await self.exit_stack.aclose()
        logger.info("Client shutdown complete.")


async def main():
    # Default MCP server URL
    server_sse_url = "http://localhost:3001/sse"

    client = MCPClient(server_url=server_sse_url)
    try:
        await client.connect()
        await client.chat_loop()
    except ValueError as ve:
        print(f"Configuration Error: {ve}")
    except Exception as e:
        print(f"An error occurred during client execution: {e}")
    finally:
        await client.cleanup()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nClient interrupted.")
