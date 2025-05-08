import asyncio
import logging
import os
import sys
from dotenv import load_dotenv
from rich.console import Console

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import necessary modules
from mcp_client import get_mcp_tool_manager
from Agents.LLM_Agent_MCP import initialize_agent

console = Console()


async def test_mcp_connection():
    """Test the connection to the MCP server."""
    console.print("[bold cyan]Testing MCP server connection...[/bold cyan]")

    try:
        # Get the MCP tool manager
        tool_manager = get_mcp_tool_manager()
        await tool_manager.connect()

        # Print available tools
        console.print("[green]Successfully connected to MCP server![/green]")
        console.print("[bold]Available tools:[/bold]")

        for tool in tool_manager.available_tools:
            name = tool["name"]
            description = (
                tool["description"][:100] + "..."
                if len(tool["description"]) > 100
                else tool["description"]
            )
            console.print(f"- [cyan]{name}[/cyan]: {description}")

        return True
    except Exception as e:
        console.print(f"[bold red]Failed to connect to MCP server: {str(e)}[/bold red]")
        return False
    finally:
        await tool_manager.cleanup()


async def test_tool_execution():
    """Test the execution of a sample tool via MCP."""
    console.print("\n[bold cyan]Testing tool execution...[/bold cyan]")

    try:
        # Get the MCP tool manager
        tool_manager = get_mcp_tool_manager()
        await tool_manager.connect()

        # Execute the webscraper tool
        console.print("[bold]Executing webscrapertool...[/bold]")
        result = await tool_manager.execute_tool(
            "webscrapertool", {"url": "https://example.com"}
        )

        console.print("[green]Tool execution successful![/green]")
        console.print(f"[bold]Result:[/bold]\n{result[:500]}...")

        return True
    except Exception as e:
        console.print(f"[bold red]Failed to execute tool: {str(e)}[/bold red]")
        return False
    finally:
        await tool_manager.cleanup()


async def test_llm_agent_mcp():
    """Test the LLM_Agent_MCP with a simple query."""
    console.print("\n[bold cyan]Testing LLM_Agent_MCP...[/bold cyan]")

    try:
        # Initialize the agent
        console.print("[bold]Initializing LLM_Agent_MCP...[/bold]")
        agent = await initialize_agent()

        # Process a sample query
        console.print("[bold]Processing sample query...[/bold]")
        response = await agent.process_message(
            "What is the current weather in New York?"
        )

        console.print("[green]Query processing successful![/green]")
        console.print(f"[bold]Response:[/bold]\n{response}")

        return True
    except Exception as e:
        console.print(
            f"[bold red]Failed to process query with LLM_Agent_MCP: {str(e)}[/bold red]"
        )
        return False


async def test_tool_call_extraction():
    """Test the tool call extraction functionality."""
    console.print("\n[bold cyan]Testing tool call extraction...[/bold cyan]")

    try:
        # Initialize the agent
        console.print("[bold]Initializing LLM_Agent_MCP...[/bold]")
        agent = await initialize_agent()

        # Test sample tool call text
        sample_text = """
        To answer this question, I'll use the webscrapertool to get information about the weather in New York.

        Tool: webscrapertool
        Parameters: {
            "url": "https://weather.com/weather/today/l/New+York+NY"
        }

        Let me check the current weather conditions in New York for you.
        """

        tool_calls = agent._extract_tool_calls(sample_text)

        if tool_calls:
            console.print("[green]Tool call extraction successful![/green]")
            for tool_call in tool_calls:
                console.print(f"[bold]Extracted tool call:[/bold] {tool_call['name']}")
                console.print(f"[bold]Arguments:[/bold] {tool_call['arguments']}")
            return True
        else:
            console.print("[yellow]No tool calls extracted from sample text.[/yellow]")
            return False
    except Exception as e:
        console.print(f"[bold red]Failed to extract tool calls: {str(e)}[/bold red]")
        return False


async def run_all_tests():
    """Run all MCP tests."""
    console.print("[bold magenta]Running MCP Integration Tests[/bold magenta]")

    # Start MCP server first
    # This assumes the server is already running separately

    # Run tests
    connection_result = await test_mcp_connection()
    tool_result = await test_tool_execution() if connection_result else False
    extraction_result = await test_tool_call_extraction()
    agent_result = await test_llm_agent_mcp() if connection_result else False

    # Summarize results
    console.print("\n[bold magenta]Test Summary[/bold magenta]")
    console.print(
        f"- MCP Server Connection: [{'green' if connection_result else 'red'}]{'✓' if connection_result else '✗'}[/]"
    )
    console.print(
        f"- Tool Execution: [{'green' if tool_result else 'red'}]{'✓' if tool_result else '✗'}[/]"
    )
    console.print(
        f"- Tool Call Extraction: [{'green' if extraction_result else 'red'}]{'✓' if extraction_result else '✗'}[/]"
    )
    console.print(
        f"- LLM Agent MCP: [{'green' if agent_result else 'red'}]{'✓' if agent_result else '✗'}[/]"
    )

    return all([connection_result, tool_result, extraction_result, agent_result])


if __name__ == "__main__":
    console.print("[bold]Starting MCP Integration Tests[/bold]")

    # Check if MCP_SERVER_URL environment variable is set
    mcp_server_url = os.getenv("MCP_SERVER_URL", "http://localhost:3002/sse")
    console.print(f"Using MCP server URL: {mcp_server_url}")

    # Run tests
    success = asyncio.run(run_all_tests())

    # Exit with appropriate code
    sys.exit(0 if success else 1)
