#!/usr/bin/env python3
"""
Debug script for LLM_Agent initialization
"""

import sys
import traceback
from rich.console import Console

console = Console()

def main():
    try:
        console.print("[bold yellow]Starting LLM_Agent debug...[/bold yellow]")
        
        # Import with verbose logging
        console.print("[bold cyan]Importing LLM_Agent...[/bold cyan]")
        from Agents.LLM_Agent import LLM_Agent
        
        # Initialize with timeout
        console.print("[bold cyan]Initializing LLM_Agent...[/bold cyan]")
        import signal
        
        def timeout_handler(signum, frame):
            raise TimeoutError("LLM_Agent initialization timed out")
        
        # Set 30-second timeout
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(30)
        
        try:
            agent = LLM_Agent()
            signal.alarm(0)  # Cancel the timeout
            console.print("[bold green]LLM_Agent initialized successfully![/bold green]")
            
            # Test basic functionality
            console.print("[bold cyan]Testing tool listing...[/bold cyan]")
            agent.display_available_tools()
            
            console.print("[bold green]Debug completed successfully![/bold green]")
        except TimeoutError as e:
            console.print(f"[bold red]Timeout: {str(e)}[/bold red]")
        
    except Exception as e:
        console.print(f"[bold red]Error: {str(e)}[/bold red]")
        console.print(f"[red]{traceback.format_exc()}[/red]")

if __name__ == "__main__":
    main() 