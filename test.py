# main.py

import asyncio
import traceback
from Agents.conversation_workflow import conversation_workflow
from Agents.agent_manager import group_chat
from rich.console import Console

console = Console()

async def main():
    try:
        # Get user input
        user_input = console.input("[bold cyan]Enter your request: [/bold cyan]")
        
        # Set up the context with the user input
        group_chat.context = {
            "welcome_message": f"User request: {user_input}",
            "user_input": user_input
        }

        # Run the conversation workflow
        console.print("[bold yellow]Starting conversation workflow...[/bold yellow]")
        success, result = await conversation_workflow(group_chat)
        
        if success:
            console.print(f"[bold green]Conversation completed: {result}[/bold green]")
        else:
            console.print(f"[bold red]Conversation failed: {result}[/bold red]")
    
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
