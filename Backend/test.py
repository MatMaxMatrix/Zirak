# main.py

import argparse
import asyncio
import signal
import sys
import traceback

from Agents.agent_manager import group_chat
from Agents.conversation_workflow import conversation_workflow
from Agents.LLM_Agent import LLM_Agent
from rich.console import Console
from rich.prompt import Prompt

console = Console()


# Set up timeout handler
def timeout_handler(signum, frame):
    console.print(
        "[bold red]Timeout reached! The operation is taking too long.[/bold red]"
    )
    sys.exit(1)


async def test_full_workflow(user_input, timeout=1800):
    """
    Test the full conversation workflow with all agents.

    Args:
        user_input: The user's input query
        timeout: Maximum time in seconds for the workflow to complete (default: 1800)
    """
    try:
        # Set up the context with the user input
        console.print("[bold yellow]Setting up context...[/bold yellow]")
        group_chat.context = {
            "welcome_message": f"User request: {user_input}",
            "user_input": user_input,
        }

        # Run the conversation workflow with detailed logging
        console.print("[bold yellow]Starting conversation workflow...[/bold yellow]")

        # Debug: Print the agents in the group chat
        console.print("[bold cyan]Agents in group chat:[/bold cyan]")
        for i, agent in enumerate(group_chat.agents):
            console.print(f"  {i+1}. {agent.name}")

        # Debug: Check if LLM_Agent is initialized properly
        llm_agent = None
        for agent in group_chat.agents:
            if isinstance(agent, LLM_Agent):
                llm_agent = agent
                break

        if llm_agent:
            console.print("[bold green]LLM_Agent found in group chat[/bold green]")
            console.print("[bold cyan]Available tools:[/bold cyan]")
            llm_agent.display_available_tools()
        else:
            console.print("[bold red]LLM_Agent not found in group chat![/bold red]")
            return

        # Run the conversation workflow with a timeout
        success, result = await asyncio.wait_for(
            conversation_workflow(group_chat.context["user_input"], group_chat.context),
            timeout=timeout,
        )

        if success:
            console.print(f"[bold green]Conversation completed: {result}[/bold green]")
        else:
            console.print(f"[bold red]Conversation failed: {result}[/bold red]")

    except asyncio.TimeoutError:
        console.print("[bold red]Conversation workflow timed out![/bold red]")
    except Exception as e:
        console.print(f"[bold red]Error in workflow test: {str(e)}[/bold red]")
        console.print(f"[red]{traceback.format_exc()}[/red]")


async def main():
    try:
        # Parse command line arguments
        parser = argparse.ArgumentParser(
            description="Test the Claude Engine conversation workflow"
        )
        parser.add_argument(
            "--timeout",
            type=int,
            default=1800,
            help="Timeout in seconds for the workflow (default: 1800)",
        )
        parser.add_argument(
            "--input", type=str, help="User input query (if not provided, will prompt)"
        )

        args = parser.parse_args()

        # Set a timeout for the entire operation
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(args.timeout + 10)  # Add 10 seconds buffer to the timeout

        # Get user input if not provided as argument
        user_input = args.input
        if not user_input:
            user_input = Prompt.ask("[bold cyan]Enter your request")

        # Run the full workflow test
        console.print("[bold yellow]Running full workflow test...[/bold yellow]")
        await test_full_workflow(user_input, args.timeout)

        # Cancel the global timeout
        signal.alarm(0)

    except KeyboardInterrupt:
        console.print("\n[bold yellow]Operation interrupted by user[/bold yellow]")
    except Exception as e:
        console.print(f"[bold red]Error in main: {str(e)}[/bold red]")
        console.print(f"[red]{traceback.format_exc()}[/red]")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[bold yellow]Operation interrupted by user[/bold yellow]")
    except Exception as e:
        console.print(f"[bold red]Unhandled error: {str(e)}[/bold red]")
        console.print(f"[red]{traceback.format_exc()}[/red]")
