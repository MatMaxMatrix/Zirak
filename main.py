#!/usr/bin/env python3
# main.py

import asyncio
from Agents.agent_manager import group_chat
from Agents.conversation_workflow import conversation_workflow
from rich.console import Console
import sys
import nest_asyncio

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()

console = Console()

async def main():
    """
    Main entry point for the application.
    """
    console.print("[bold green]Starting Claude Engineer v3...[/bold green]")
    
    # Set up the initial context
    group_chat.context = {
        "welcome_message": "Welcome to Claude Engineer v3!",
        "user_input": " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "",
        "requires_clarification": False,
        "clarifications": "Clarifications:",
    }
    
    # Run the conversation workflow
    success, message = await conversation_workflow(group_chat)
    
    if success:
        console.print(f"[bold green]{message}[/bold green]")
        return 0
    else:
        console.print(f"[bold red]{message}[/bold red]")
        return 1

if __name__ == "__main__":
    try:
        # Use asyncio.run to run the main coroutine
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        console.print("\n[bold yellow]Operation interrupted by user[/bold yellow]")
        sys.exit(130)  # Standard exit code for SIGINT
    except Exception as e:
        console.print(f"[bold red]Unhandled exception: {str(e)}[/bold red]")
        import traceback
        console.print(f"[red]{traceback.format_exc()}[/red]")
        sys.exit(1) 