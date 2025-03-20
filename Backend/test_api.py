import requests
import json
import time
import uuid
import argparse
import socketio
import traceback
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.live import Live
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from datetime import datetime
import sys

# Initialize console for rich output
console = Console()

# Initialize SocketIO client for real-time updates
sio = socketio.Client(logger=False, engineio_logger=False, reconnection=True, reconnection_attempts=5)

# Track workflow steps and agent communications
workflow_steps = []
agent_communications = {}
conversation_id = None
last_update_time = time.time()
initial_response_received = False
verbose_mode = False

@sio.event
def connect():
    console.print("[bold green]Connected to WebSocket server[/bold green]")
    if conversation_id:
        sio.emit('join', {'conversation_id': conversation_id})
        console.print(f"[bold cyan]Joining conversation room: {conversation_id}[/bold cyan]")

@sio.event
def connect_error(data):
    console.print(f"[bold red]Connection error: {data}[/bold red]")

@sio.event
def disconnect():
    console.print("[bold red]Disconnected from WebSocket server[/bold red]")

@sio.event
def connected(data):
    console.print(f"[bold cyan]Connection acknowledged: {data}[/bold cyan]")

@sio.event
def joined(data):
    console.print(f"[bold cyan]Joined conversation room: {data}[/bold cyan]")

@sio.event
def workflow_update(data):
    """Handle real-time workflow updates from WebSocket"""
    global last_update_time, initial_response_received
    last_update_time = time.time()
    initial_response_received = True
    workflow_steps.append(data)
    
    # Extract agent information
    agent_name = data.get('agent', 'Unknown Agent')
    message = data.get('message', '')
    
    # Add to agent communications tracking
    if agent_name not in agent_communications:
        agent_communications[agent_name] = []
    
    agent_communications[agent_name].append({
        'timestamp': data.get('timestamp', datetime.now().isoformat()),
        'message': message
    })
    
    # Format and print the update
    formatted_time = datetime.fromisoformat(data.get('timestamp', datetime.now().isoformat())).strftime('%H:%M:%S')
    
    # Parse out questions and results from the message
    if "Question:" in message or "Q:" in message:
        console.print(Panel(
            Text(message, style="bold yellow"),
            title=f"{agent_name} Question at {formatted_time}",
            border_style="yellow"
        ))
    elif "Result:" in message or "generated reply" in message.lower():
        console.print(Panel(
            Text(message, style="bold green"),
            title=f"{agent_name} Result at {formatted_time}",
            border_style="green"
        ))
    elif "processing message from" in message.lower():
        # Agent processing a message from another agent
        console.print(Panel(
            Text(message, style="bold blue"),
            title=f"{agent_name} at {formatted_time}",
            border_style="blue"
        ))
    elif "to chat_manager" in message.lower():
        # Agent sending a message to chat manager
        console.print(Panel(
            Text(message, style="bold magenta"),
            title=f"{agent_name} at {formatted_time}",
            border_style="magenta"
        ))
    elif "context set for agent" in message.lower():
        # Setup messages
        if verbose_mode:
            console.print(Panel(
                Text(message, style="dim"),
                title=f"{agent_name} at {formatted_time}",
                border_style="dim"
            ))
    else:
        console.print(Panel(
            Text(message),
            title=f"{agent_name} at {formatted_time}",
            border_style="cyan"
        ))

def send_chat_request(message, api_url="http://localhost:5001/api/chat"):
    """Send a chat request to the API and return the response"""
    global conversation_id
    
    # Generate a new conversation ID if none exists
    conversation_id = conversation_id or str(uuid.uuid4())
    
    # Prepare the request data
    data = {
        "message": message,
        "conversation_id": conversation_id
    }
    
    # Show a spinning cursor while waiting for the response
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]Sending request to Zirak API...[/bold blue]"),
        console=console
    ) as progress:
        task = progress.add_task("Waiting", total=None)
        
        # Send the request
        try:
            console.print(f"[dim]Sending POST request to {api_url} with data: {data}[/dim]")
            
            # Use shorter timeout for initial response
            response = requests.post(api_url, json=data, timeout=10)
            response.raise_for_status()
            
            console.print(f"[dim]Received response status: {response.status_code}[/dim]")
            return response.json()
        except requests.exceptions.Timeout:
            console.print("[bold yellow]Initial API request timed out, but this may be normal for complex queries.[/bold yellow]")
            console.print("[bold yellow]Continuing to listen for WebSocket updates...[/bold yellow]")
            return {"conversation_id": conversation_id, "response": "Processing..."}
        except requests.exceptions.RequestException as e:
            console.print(f"[bold red]Error sending request: {str(e)}[/bold red]")
            if hasattr(e, 'response') and e.response is not None:
                console.print(f"[bold red]Response status: {e.response.status_code}[/bold red]")
                try:
                    console.print(f"[bold red]Response body: {e.response.text}[/bold red]")
                except:
                    pass
            return None

def display_conversation_summary():
    """Display a summary of the conversation and agent communications"""
    if not workflow_steps:
        console.print("[yellow]No workflow steps recorded yet.[/yellow]")
        return
    
    # Create a table for summary
    table = Table(title="Conversation Summary")
    table.add_column("Agent", style="cyan")
    table.add_column("Messages", style="green")
    table.add_column("First Action", style="yellow")
    table.add_column("Last Action", style="magenta")
    
    # Populate the table with agent data
    for agent_name, messages in agent_communications.items():
        if not messages:
            continue
            
        first_msg = messages[0]['message']
        last_msg = messages[-1]['message']
        
        # Truncate long messages
        if len(first_msg) > 50:
            first_msg = first_msg[:47] + "..."
        if len(last_msg) > 50:
            last_msg = last_msg[:47] + "..."
            
        table.add_row(
            agent_name, 
            str(len(messages)),
            first_msg,
            last_msg
        )
    
    console.print(table)

def display_agent_conversation_tree():
    """Display the conversation as a tree showing who replied to whom"""
    if not workflow_steps:
        console.print("[yellow]No workflow steps recorded yet.[/yellow]")
        return
    
    conversation_sequence = []
    for step in workflow_steps:
        message = step.get('message', '')
        agent = step.get('agent', 'Unknown')
        
        # Check for patterns that indicate agent replies
        if "processing message from" in message.lower():
            parts = message.lower().split("processing message from")
            if len(parts) > 1:
                sender = parts[1].strip()
                conversation_sequence.append(f"[bold blue]{agent} ← {sender}[/bold blue]")
        elif "to chat_manager" in message.lower():
            conversation_sequence.append(f"[bold magenta]{agent} → chat_manager[/bold magenta]")
        elif "generated reply" in message.lower():
            conversation_sequence.append(f"[bold green]{agent} generated reply[/bold green]")
        elif "context set for" in message.lower():
            if verbose_mode:
                conversation_sequence.append(f"[dim]{message}[/dim]")
    
    # Print the conversation sequence
    console.print(Panel(
        "\n".join(conversation_sequence) if conversation_sequence else "[yellow]No specific conversation flow detected yet.[/yellow]",
        title="Conversation Flow",
        border_style="green"
    ))

def extract_questions_and_answers():
    """Extract questions and answers from the conversation"""
    qa_pairs = []
    
    for agent_name, messages in agent_communications.items():
        for message_data in messages:
            message = message_data['message']
            timestamp = message_data['timestamp']
            
            # Look for question-answer patterns
            if "Question:" in message and "Answer:" in message:
                # Split the message to extract Q&A
                parts = message.split("Question:")
                for part in parts[1:]:  # Skip the first part (before "Question:")
                    if "Answer:" in part:
                        question, answer = part.split("Answer:", 1)
                        qa_pairs.append({
                            "agent": agent_name,
                            "timestamp": timestamp,
                            "question": question.strip(),
                            "answer": answer.strip()
                        })
            
            # Look for Q: and A: patterns
            elif "Q:" in message and "A:" in message:
                # Split the message to extract Q&A
                parts = message.split("Q:")
                for part in parts[1:]:  # Skip the first part (before "Q:")
                    if "A:" in part:
                        question, answer = part.split("A:", 1)
                        qa_pairs.append({
                            "agent": agent_name,
                            "timestamp": timestamp,
                            "question": question.strip(),
                            "answer": answer.strip()
                        })
    
    return qa_pairs

def display_questions_and_answers():
    """Display extracted questions and answers from the conversation"""
    qa_pairs = extract_questions_and_answers()
    
    if not qa_pairs:
        console.print("[yellow]No questions and answers detected in the conversation.[/yellow]")
        return
    
    for i, qa in enumerate(qa_pairs, 1):
        console.print(f"[bold]Q{i} from {qa['agent']}:[/bold]")
        console.print(Panel(Text(qa['question'], style="yellow")))
        console.print(f"[bold]A{i}:[/bold]")
        console.print(Panel(Text(qa['answer'], style="green")))
        console.print("")

def poll_for_updates(max_time=60, inactivity_timeout=10, poll_interval=0.5):
    """Poll for updates with a more dynamic approach"""
    global last_update_time, initial_response_received
    
    console.print(f"[bold cyan]Waiting for agent communications for up to {max_time} seconds...[/bold cyan]")
    console.print(f"[dim](Will stop early if no updates for {inactivity_timeout} seconds)[/dim]")
    
    start_time = time.time()
    last_update_time = start_time
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]Collecting data...[/bold blue] (Press Ctrl+C to stop manually)"),
        console=console
    ) as progress:
        task = progress.add_task("Waiting", total=max_time)
        
        try:
            while True:
                current_time = time.time()
                elapsed = current_time - start_time
                
                if elapsed >= max_time:
                    console.print("[yellow]Maximum wait time reached.[/yellow]")
                    break
                
                # If we've been inactive for too long and we've gotten at least one update
                if current_time - last_update_time >= inactivity_timeout and initial_response_received:
                    console.print(f"[yellow]No updates received for {inactivity_timeout} seconds. Stopping collection.[/yellow]")
                    break
                
                # Update progress
                progress.update(task, completed=min(int(elapsed), max_time))
                
                # Shorter sleep time for more responsive updates
                time.sleep(poll_interval)
                
                # Make sure the WebSocket connection is maintained
                if not sio.connected and initial_response_received:
                    console.print("[yellow]Lost WebSocket connection. Attempting to reconnect...[/yellow]")
                    try:
                        sio.connect(socket_url, wait_timeout=5)
                        if conversation_id:
                            sio.emit('join', {'conversation_id': conversation_id})
                    except:
                        pass
        
        except KeyboardInterrupt:
            console.print("[bold yellow]Data collection stopped manually.[/bold yellow]")
    
    result_message = f"[bold green]Data collection complete. Collected {len(workflow_steps)} workflow steps from {len(agent_communications)} agents.[/bold green]"
    if len(workflow_steps) == 0:
        result_message = "[bold red]No workflow steps collected. The API server might be busy or not sending events.[/bold red]"
    
    console.print(result_message)

def main():
    parser = argparse.ArgumentParser(description="Test the Zirak API with a simple query")
    parser.add_argument("query", nargs="?", default="Tell me a joke", help="Query to send to the API")
    parser.add_argument("--url", default="http://localhost:5001", help="Base URL of the API")
    parser.add_argument("--conversation-id", help="Existing conversation ID to continue")
    parser.add_argument("--max-wait", type=int, default=60, help="Maximum time to wait for updates (seconds)")
    parser.add_argument("--inactivity-timeout", type=int, default=5, help="Stop collecting after this many seconds of inactivity")
    parser.add_argument("--no-wait", action="store_true", help="Skip waiting for updates after initial response")
    parser.add_argument("--verbose", action="store_true", help="Show verbose output including setup messages")
    args = parser.parse_args()
    
    global conversation_id, verbose_mode, socket_url, api_url
    conversation_id = args.conversation_id
    verbose_mode = args.verbose
    
    # Connect to WebSocket for real-time updates
    socket_url = args.url
    api_url = f"{args.url}/api/chat"
    
    console.print(Panel(
        f"[bold]Query:[/bold] {args.query}\n"
        f"[bold]API URL:[/bold] {api_url}\n"
        f"[bold]WebSocket URL:[/bold] {socket_url}\n"
        f"[bold]Conversation ID:[/bold] {conversation_id or 'Will be generated'}\n"
        f"[bold]Max Wait Time:[/bold] {args.max_wait} seconds\n"
        f"[bold]Inactivity Timeout:[/bold] {args.inactivity_timeout} seconds", 
        title="Zirak API Test", 
        border_style="cyan"
    ))
    
    try:
        # Connect to the WebSocket server first
        console.print("[bold cyan]Connecting to WebSocket server...[/bold cyan]")
        try:
            sio.connect(socket_url, wait_timeout=10, transports=['websocket', 'polling'])
            time.sleep(1)  # Give it a moment to establish connection
        except Exception as e:
            console.print(f"[bold red]Failed to connect to WebSocket: {str(e)}[/bold red]")
            console.print("[yellow]Continuing without real-time updates...[/yellow]")
        
        # Send the chat request
        console.print(f"[bold cyan]Sending query: {args.query}[/bold cyan]")
        response = send_chat_request(args.query, api_url)
        
        if response:
            # Extract and display the conversation ID
            if not conversation_id and 'conversation_id' in response:
                conversation_id = response['conversation_id']
                console.print(f"[bold green]Conversation ID: {conversation_id}[/bold green]")
                # Join the conversation room to get updates
                if sio.connected:
                    sio.emit('join', {'conversation_id': conversation_id})
            
            # Display the response
            console.print(Panel(
                Text(response.get('response', 'No response received'), style="bold"),
                title="Initial API Response",
                border_style="green"
            ))
            
            # Poll for updates
            if not args.no_wait:
                poll_for_updates(args.max_wait, args.inactivity_timeout)
            
            # Display the conversation summary
            console.print(Panel(
                "[bold]Conversation Analysis[/bold]", 
                border_style="cyan"
            ))
            
            display_conversation_summary()
            
            # Display the conversation tree
            display_agent_conversation_tree()
            
            # Display questions and answers
            display_questions_and_answers()
            
            # Save the full conversation data to a file for later analysis
            with open(f"conversation_{conversation_id}.json", "w") as f:
                json.dump({
                    "conversation_id": conversation_id,
                    "query": args.query,
                    "response": response,
                    "workflow_steps": workflow_steps,
                    "agent_communications": agent_communications
                }, f, indent=2)
            
            console.print(f"[bold green]Full conversation data saved to conversation_{conversation_id}.json[/bold green]")
            
            if len(workflow_steps) == 0:
                console.print(Panel(
                    "[bold yellow]No workflow steps were captured. Try these fixes:[/bold yellow]\n\n"
                    "1. Make sure the API server is running\n"
                    "2. Ensure the WebSocket server is properly working\n"
                    "3. Increase the --max-wait time\n"
                    "4. Decrease the --inactivity-timeout value\n"
                    "5. Try a simpler query that completes faster",
                    title="Troubleshooting",
                    border_style="yellow"
                ))
        else:
            console.print("[bold red]No response received from the API.[/bold red]")
        
    except Exception as e:
        console.print(f"[bold red]Error: {str(e)}[/bold red]")
        console.print(traceback.format_exc())
    finally:
        # Disconnect from WebSocket
        if sio.connected:
            sio.disconnect()

if __name__ == "__main__":
    main()