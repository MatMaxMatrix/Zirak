# main.py

import asyncio
import traceback
import signal
import sys
from Agents.conversation_workflow import conversation_workflow
from Agents.agent_manager import group_chat
from rich.console import Console

console = Console()

# Set up timeout handler
def timeout_handler(signum, frame):
    console.print("[bold red]Timeout reached! The operation is taking too long.[/bold red]")
    sys.exit(1)

async def main():
    try:
        # Set a timeout for the entire operation
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(60)  # 60-second timeout
        
        # Get user input
        user_input = console.input("[bold cyan]Enter your request: [/bold cyan]")
        
        # Set up the context with the user input
        console.print("[bold yellow]Setting up context...[/bold yellow]")
        group_chat.context = {
            "welcome_message": f"User request: {user_input}",
            "user_input": user_input
        }

        # Run the conversation workflow with detailed logging
        console.print("[bold yellow]Starting conversation workflow...[/bold yellow]")
        
        # Debug: Print the agents in the group chat
        console.print("[bold cyan]Agents in group chat:[/bold cyan]")
        for i, agent in enumerate(group_chat.agents):
            console.print(f"  {i+1}. {agent.name}")
        
        # Debug: Check if LLM_Agent is initialized properly
        from Agents.LLM_Agent import LLM_Agent
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
        
        # Run the conversation workflow with a timeout
        success, result = await asyncio.wait_for(
            conversation_workflow(group_chat),
            timeout=45  # 45-second timeout for the workflow
        )
        
        # Cancel the global timeout
        signal.alarm(0)
        
        if success:
            console.print(f"[bold green]Conversation completed: {result}[/bold green]")
        else:
            console.print(f"[bold red]Conversation failed: {result}[/bold red]")
    
    except asyncio.TimeoutError:
        console.print("[bold red]Conversation workflow timed out![/bold red]")
        return
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
