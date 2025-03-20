#!/usr/bin/env python3
# check_server.py - Script to check if the Zirak API server is running

import requests
import argparse
import json
import sys
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

console = Console()

def check_server(url="http://localhost:5001"):
    """Check if the Zirak API server is running and return its status"""
    
    endpoints = [
        "/",          # Root endpoint
        "/health",    # Health check endpoint (if available)
        "/api/health" # API health endpoint (if available)
    ]
    
    console.print(Panel(
        f"[bold]Checking Zirak API Server:[/bold] {url}",
        title="Server Check",
        border_style="cyan"
    ))
    
    # Try different endpoints
    for endpoint in endpoints:
        full_url = f"{url}{endpoint}"
        try:
            console.print(f"[dim]Trying {full_url}...[/dim]")
            response = requests.get(full_url, timeout=5)
            if response.status_code < 400:  # Any successful response
                console.print(f"[bold green]✓ Server is running! Status code: {response.status_code}[/bold green]")
                try:
                    if response.headers.get('Content-Type', '').startswith('application/json'):
                        console.print(f"[dim]Response body: {json.dumps(response.json(), indent=2)}[/dim]")
                    else:
                        console.print(f"[dim]Response: {response.text[:200]}{'...' if len(response.text) > 200 else ''}[/dim]")
                except:
                    pass
                return True
        except requests.exceptions.RequestException as e:
            console.print(f"[dim]Error connecting to {full_url}: {str(e)}[/dim]")
    
    # Also try a WebSocket connection check
    console.print(f"[dim]Checking WebSocket connection...[/dim]")
    try:
        import socketio
        sio = socketio.Client()
        connected = False
        
        @sio.event
        def connect():
            nonlocal connected
            connected = True
            console.print("[bold green]✓ WebSocket connected successfully![/bold green]")
            sio.disconnect()
        
        @sio.event
        def connect_error(data):
            console.print(f"[bold red]× WebSocket connection error: {data}[/bold red]")
        
        # Try to connect with a short timeout
        sio.connect(url, wait_timeout=3)
        sio.wait(seconds=2)
        if connected:
            return True
    except Exception as e:
        console.print(f"[bold red]× WebSocket connection failed: {str(e)}[/bold red]")
    
    # If we get here, all connection attempts failed
    console.print(Panel(
        "[bold red]× Server appears to be offline or not responding![/bold red]\n\n"
        "Make sure the Zirak API server is running with:\n"
        "  python api.py\n\n"
        "Check for error messages in the server console.",
        title="Connection Failed",
        border_style="red"
    ))
    return False

def main():
    parser = argparse.ArgumentParser(description="Check if the Zirak API server is running")
    parser.add_argument("--url", default="http://localhost:5001", help="Base URL of the API")
    args = parser.parse_args()
    
    server_running = check_server(args.url)
    
    # Exit with appropriate status code
    sys.exit(0 if server_running else 1)

if __name__ == "__main__":
    main() 