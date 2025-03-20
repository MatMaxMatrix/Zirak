#!/usr/bin/env python3
# agent_monitor.py - A script to monitor agent workflow messages

import argparse
import json
import sys
import time
import traceback
import uuid
from datetime import datetime

import requests
import socketio
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.text import Text

# Initialize console for rich output
console = Console()

# Initialize SocketIO client for real-time updates
sio = socketio.Client(
    logger=False, engineio_logger=False, reconnection=True, reconnection_attempts=5
)

# Track workflow steps and agent communications
workflow_steps = []
agent_communications = {}
agent_messages = {}  # To store the actual messages sent between agents
conversation_id = None
last_update_time = time.time()
initial_response_received = False
verbose_mode = False

# Track API endpoints that should be monitored
ENDPOINTS = {
    "chat": "/api/chat",
    "workflow": "/api/workflow/status",
    "health": "/health",
    "admin": "/api/admin/status",
}

# Agent color mapping for better visualization
AGENT_COLORS = {
    "InitiatingAgent": "cyan",
    "CriticalAnalysisAgent": "magenta",
    "LLM_Agent": "green",
    "Query_Transformation": "yellow",
    "Step_Generator": "blue",
    "UserProxyAgent": "red",
    "chat_manager": "bright_cyan",
    "System": "white",
    "Unknown Agent": "dim",
}


@sio.event
def connect():
    console.print("[bold green]Connected to WebSocket server[/bold green]")
    if conversation_id:
        sio.emit("join", {"conversation_id": conversation_id})
        console.print(
            f"[bold cyan]Joining conversation room: {conversation_id}[/bold cyan]"
        )


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
    agent_name = data.get("agent", "Unknown Agent")
    message = data.get("message", "")

    # Add to agent communications tracking
    if agent_name not in agent_communications:
        agent_communications[agent_name] = []

    agent_communications[agent_name].append(
        {
            "timestamp": data.get("timestamp", datetime.now().isoformat()),
            "message": message,
        }
    )

    # Format and print the update
    formatted_time = datetime.fromisoformat(
        data.get("timestamp", datetime.now().isoformat())
    ).strftime("%H:%M:%S")

    # Parse agent message patterns
    if "processing message from" in message.lower():
        parts = message.lower().split("processing message from")
        if len(parts) > 1:
            sender = parts[1].strip()
            console.print(
                Panel(
                    Text(
                        message, style=f"bold {AGENT_COLORS.get(agent_name, 'white')}"
                    ),
                    title=f"{agent_name} Processing Message from {sender} at {formatted_time}",
                    border_style="blue",
                )
            )

            # Try to extract the actual message content if available
            if "message:" in message.lower():
                content_parts = message.split("message:", 1)
                if len(content_parts) > 1:
                    msg_content = content_parts[1].strip()
                    # Store the message for relationship tracking
                    key = f"{sender}_to_{agent_name}"
                    agent_messages[key] = msg_content

    # Parse out questions and results from the message
    elif "Question:" in message or "Q:" in message:
        console.print(
            Panel(
                Text(message, style=f"bold {AGENT_COLORS.get(agent_name, 'white')}"),
                title=f"{agent_name} Question at {formatted_time}",
                border_style="yellow",
            )
        )
    elif "Result:" in message or "generated reply" in message.lower():
        console.print(
            Panel(
                Text(message, style=f"bold {AGENT_COLORS.get(agent_name, 'white')}"),
                title=f"{agent_name} Result at {formatted_time}",
                border_style="green",
            )
        )
    elif "to chat_manager" in message.lower():
        console.print(
            Panel(
                Text(message, style=f"bold {AGENT_COLORS.get(agent_name, 'white')}"),
                title=f"{agent_name} to Chat Manager at {formatted_time}",
                border_style="magenta",
            )
        )
    elif (
        "context set for agent" in message.lower()
        or "starting conversation" in message.lower()
    ):
        # Setup messages
        if verbose_mode:
            console.print(
                Panel(
                    Text(message, style="dim"),
                    title=f"System at {formatted_time}",
                    border_style="dim",
                )
            )
    else:
        console.print(
            Panel(
                Text(message),
                title=f"{agent_name} at {formatted_time}",
                border_style=AGENT_COLORS.get(agent_name, "white"),
            )
        )


def monitor_direct_api_events(base_url, conversation_id=None, interval=1):
    """Directly poll the API server for workflow events"""
    global last_update_time

    console.print("[bold cyan]Starting direct API monitoring...[/bold cyan]")

    # If we have a conversation ID, try to get its status
    if conversation_id:
        workflow_url = (
            f"{base_url}{ENDPOINTS['workflow']}?conversation_id={conversation_id}"
        )
        try:
            response = requests.get(workflow_url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                console.print(
                    f"[bold green]Retrieved workflow status: {len(data.get('events', []))} events[/bold green]"
                )

                # Process each event
                for event in data.get("events", []):
                    workflow_update(event)
                    time.sleep(0.1)  # Small delay to make output readable

                last_update_time = time.time()
                return True
        except Exception as e:
            console.print(
                f"[bold yellow]Could not retrieve workflow status: {str(e)}[/bold yellow]"
            )

    return False


def send_chat_request(message, api_url="http://localhost:5001/api/chat"):
    """Send a chat request to the API and return the response"""
    global conversation_id

    # Generate a new conversation ID if none exists
    conversation_id = conversation_id or str(uuid.uuid4())

    # Prepare the request data
    data = {"message": message, "conversation_id": conversation_id}

    # Show a spinning cursor while waiting for the response
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]Sending request to Zirak API...[/bold blue]"),
        console=console,
    ) as progress:
        progress.add_task("Waiting", total=None)

        # Send the request
        try:
            console.print(
                f"[dim]Sending POST request to {api_url} with data: {data}[/dim]"
            )

            # Use shorter timeout for initial response
            response = requests.post(api_url, json=data, timeout=10)
            response.raise_for_status()

            console.print(
                f"[dim]Received response status: {response.status_code}[/dim]"
            )
            return response.json()
        except requests.exceptions.Timeout:
            console.print(
                "[bold yellow]Initial API request timed out, but this may be normal for complex queries.[/bold yellow]"
            )
            console.print(
                "[bold yellow]Continuing to listen for WebSocket updates...[/bold yellow]"
            )
            return {"conversation_id": conversation_id, "response": "Processing..."}
        except requests.exceptions.RequestException as e:
            console.print(f"[bold red]Error sending request: {str(e)}[/bold red]")
            if hasattr(e, "response") and e.response is not None:
                console.print(
                    f"[bold red]Response status: {e.response.status_code}[/bold red]"
                )
                try:
                    console.print(
                        f"[bold red]Response body: {e.response.text}[/bold red]"
                    )
                except:
                    pass
            return None


def display_conversation_flow():
    """Display the conversation flow between agents in a visual format"""
    if not workflow_steps:
        console.print("[yellow]No workflow steps recorded yet.[/yellow]")
        return

    # Create a table for conversation flow
    table = Table(title="Detailed Conversation Flow")
    table.add_column("Time", style="cyan", width=10)
    table.add_column("From", style="green", width=20)
    table.add_column("To", style="magenta", width=20)
    table.add_column("Message Type", style="yellow", width=15)
    table.add_column("Content", style="white")

    # Process workflow steps to build conversation flow
    for step in workflow_steps:
        message = step.get("message", "")
        agent = step.get("agent", "Unknown")
        timestamp = datetime.fromisoformat(
            step.get("timestamp", datetime.now().isoformat())
        ).strftime("%H:%M:%S")

        # Determine the message type and flow
        msg_type = "Other"
        from_agent = agent
        to_agent = "System"
        content = message[:100] + "..." if len(message) > 100 else message

        if "processing message from" in message.lower():
            msg_type = "Processing"
            parts = message.lower().split("processing message from")
            if len(parts) > 1:
                to_agent = agent
                from_agent = parts[1].strip().title()
                key = f"{from_agent.lower()}_to_{to_agent.lower()}"
                if key in agent_messages:
                    content = (
                        agent_messages[key][:100] + "..."
                        if len(agent_messages[key]) > 100
                        else agent_messages[key]
                    )

        elif "to chat_manager" in message.lower():
            msg_type = "Sending"
            to_agent = "chat_manager"

        elif "generated reply" in message.lower():
            msg_type = "Reply"
            to_agent = "User"
            if "generated reply:" in message.lower():
                content = message.split("generated reply:", 1)[1].strip()
                content = content[:100] + "..." if len(content) > 100 else content

        elif "question:" in message.lower():
            msg_type = "Question"
            to_agent = "Internal"

        elif "result:" in message.lower() or "answer:" in message.lower():
            msg_type = "Result"
            to_agent = "Internal"

        # Add the row
        table.add_row(timestamp, from_agent, to_agent, msg_type, content)

    console.print(table)


def display_conversation_tree():
    """Display the conversation as a tree showing who replied to whom"""
    if not workflow_steps:
        console.print("[yellow]No workflow steps recorded yet.[/yellow]")
        return

    conversation_sequence = []
    for step in workflow_steps:
        message = step.get("message", "")
        agent = step.get("agent", "Unknown")
        formatted_time = datetime.fromisoformat(
            step.get("timestamp", datetime.now().isoformat())
        ).strftime("%H:%M:%S")

        # Check for patterns that indicate agent replies
        if "processing message from" in message.lower():
            parts = message.lower().split("processing message from")
            if len(parts) > 1:
                sender = parts[1].strip().title()
                color = AGENT_COLORS.get(agent, "white")
                sender_color = AGENT_COLORS.get(sender, "white")
                conversation_sequence.append(
                    f"[{formatted_time}] [{sender_color}]{sender}[/{sender_color}] → [{color}]{agent}[/{color}]"
                )
        elif "to chat_manager" in message.lower():
            color = AGENT_COLORS.get(agent, "white")
            conversation_sequence.append(
                f"[{formatted_time}] [{color}]{agent}[/{color}] → [bright_cyan]chat_manager[/bright_cyan]"
            )
        elif "generated reply" in message.lower():
            color = AGENT_COLORS.get(agent, "white")
            conversation_sequence.append(
                f"[{formatted_time}] [{color}]{agent}[/{color}] generated reply"
            )

    # Print the conversation sequence
    console.print(
        Panel(
            "\n".join(conversation_sequence)
            if conversation_sequence
            else "[yellow]No specific conversation flow detected yet.[/yellow]",
            title="Agent Interaction Sequence",
            border_style="green",
        )
    )


def extract_questions_and_answers():
    """Extract questions and answers from the conversation"""
    qa_pairs = []

    for agent_name, messages in agent_communications.items():
        for message_data in messages:
            message = message_data["message"]
            timestamp = message_data["timestamp"]

            # Look for question-answer patterns
            if "Question:" in message and "Answer:" in message:
                # Split the message to extract Q&A
                parts = message.split("Question:")
                for part in parts[1:]:  # Skip the first part (before "Question:")
                    if "Answer:" in part:
                        question, answer = part.split("Answer:", 1)
                        qa_pairs.append(
                            {
                                "agent": agent_name,
                                "timestamp": timestamp,
                                "question": question.strip(),
                                "answer": answer.strip(),
                            }
                        )

            # Look for Q: and A: patterns
            elif "Q:" in message and "A:" in message:
                # Split the message to extract Q&A
                parts = message.split("Q:")
                for part in parts[1:]:  # Skip the first part (before "Q:")
                    if "A:" in part:
                        question, answer = part.split("A:", 1)
                        qa_pairs.append(
                            {
                                "agent": agent_name,
                                "timestamp": timestamp,
                                "question": question.strip(),
                                "answer": answer.strip(),
                            }
                        )

    return qa_pairs


def display_questions_and_answers():
    """Display extracted questions and answers from the conversation"""
    qa_pairs = extract_questions_and_answers()

    if not qa_pairs:
        console.print(
            "[yellow]No questions and answers detected in the conversation.[/yellow]"
        )
        return

    for i, qa in enumerate(qa_pairs, 1):
        agent_name = qa["agent"]
        agent_color = AGENT_COLORS.get(agent_name, "white")
        console.print(
            f"[bold {agent_color}]Q{i} from {agent_name}:[/bold {agent_color}]"
        )
        console.print(Panel(Text(qa["question"], style="yellow")))
        console.print(f"[bold {agent_color}]A{i}:[/bold {agent_color}]")
        console.print(Panel(Text(qa["answer"], style="green")))
        console.print("")


def poll_for_updates(base_url, max_time=60, inactivity_timeout=10, poll_interval=0.5):
    """Poll for updates both via WebSocket and direct API calls"""
    global last_update_time, initial_response_received

    console.print(
        f"[bold cyan]Collecting agent communications for up to {max_time} seconds...[/bold cyan]"
    )
    console.print(
        f"[dim](Will stop early if no updates for {inactivity_timeout} seconds)[/dim]"
    )

    start_time = time.time()
    last_update_time = start_time
    last_api_poll = start_time

    with Progress(
        SpinnerColumn(),
        TextColumn(
            "[bold blue]Monitoring agent communications...[/bold blue] (Press Ctrl+C to stop manually)"
        ),
        console=console,
    ) as progress:
        task = progress.add_task("Waiting", total=max_time)

        try:
            while True:
                current_time = time.time()
                elapsed = current_time - start_time

                # If max time reached, exit
                if elapsed >= max_time:
                    console.print("[yellow]Maximum wait time reached.[/yellow]")
                    break

                # If inactive for too long after receiving at least one update, exit
                if (
                    current_time - last_update_time >= inactivity_timeout
                    and initial_response_received
                ):
                    console.print(
                        f"[yellow]No updates received for {inactivity_timeout} seconds. Stopping collection.[/yellow]"
                    )
                    break

                # If WebSocket not providing updates, try direct API polling every 5 seconds
                if current_time - last_api_poll >= 5:
                    # Only do this if we have a conversation ID
                    if conversation_id:
                        monitor_direct_api_events(base_url, conversation_id)
                    last_api_poll = current_time

                # Update progress
                progress.update(task, completed=min(int(elapsed), max_time))

                # Sleep for short interval
                time.sleep(poll_interval)

                # Reconnect WebSocket if disconnected
                if not sio.connected and initial_response_received:
                    console.print(
                        "[yellow]Lost WebSocket connection. Attempting to reconnect...[/yellow]"
                    )
                    try:
                        sio.connect(base_url, wait_timeout=5)
                        if conversation_id:
                            sio.emit("join", {"conversation_id": conversation_id})
                    except:
                        pass

        except KeyboardInterrupt:
            console.print(
                "[bold yellow]Data collection stopped manually.[/bold yellow]"
            )

    result_message = f"[bold green]Data collection complete. Collected {len(workflow_steps)} workflow steps from {len(agent_communications)} agents.[/bold green]"
    if len(workflow_steps) == 0:
        result_message = "[bold red]No workflow steps collected. The API server might be busy or not sending events.[/bold red]"

    console.print(result_message)


def monitor_existing_conversation(base_url, conversation_id, max_time=60):
    """Monitor an existing conversation without sending a new query"""
    global last_update_time

    console.print(
        Panel(
            f"[bold]Monitoring Existing Conversation[/bold]\n"
            f"[bold]Conversation ID:[/bold] {conversation_id}\n"
            f"[bold]API URL:[/bold] {base_url}\n"
            f"[bold]Max Monitor Time:[/bold] {max_time} seconds",
            title="Zirak Agent Monitor",
            border_style="cyan",
        )
    )

    try:
        # Connect to the WebSocket server
        console.print("[bold cyan]Connecting to WebSocket server...[/bold cyan]")
        try:
            sio.connect(base_url, wait_timeout=10, transports=["websocket", "polling"])
            sio.emit("join", {"conversation_id": conversation_id})
            time.sleep(1)  # Give it a moment to establish connection
        except Exception as e:
            console.print(
                f"[bold red]Failed to connect to WebSocket: {str(e)}[/bold red]"
            )
            console.print("[yellow]Will try direct API monitoring...[/yellow]")

        # Try to get current workflow state via direct API
        success = monitor_direct_api_events(base_url, conversation_id)
        if not success:
            console.print(
                "[yellow]Could not retrieve existing workflow events. Will monitor for new events.[/yellow]"
            )

        # Poll for updates
        poll_for_updates(base_url, max_time)

        # Display the results
        console.print(Panel("[bold]Conversation Analysis[/bold]", border_style="cyan"))

        # Display the conversation flow
        display_conversation_flow()

        # Display the conversation tree
        display_conversation_tree()

        # Display questions and answers
        display_questions_and_answers()

        # Save the full conversation data to a file
        output_file = f"monitor_{conversation_id}.json"
        with open(output_file, "w") as f:
            json.dump(
                {
                    "conversation_id": conversation_id,
                    "workflow_steps": workflow_steps,
                    "agent_communications": agent_communications,
                    "agent_messages": agent_messages,
                },
                f,
                indent=2,
            )

        console.print(
            f"[bold green]Full conversation data saved to {output_file}[/bold green]"
        )

    except Exception as e:
        console.print(f"[bold red]Error: {str(e)}[/bold red]")
        console.print(traceback.format_exc())

    finally:
        # Disconnect from WebSocket
        if sio.connected:
            sio.disconnect()


def start_new_conversation(base_url, query, max_time=60):
    """Start a new conversation with a query and monitor it"""
    global conversation_id, last_update_time

    chat_url = f"{base_url}{ENDPOINTS['chat']}"

    console.print(
        Panel(
            f"[bold]New Conversation[/bold]\n"
            f"[bold]Query:[/bold] {query}\n"
            f"[bold]API URL:[/bold] {chat_url}\n"
            f"[bold]Max Monitor Time:[/bold] {max_time} seconds",
            title="Zirak Agent Monitor",
            border_style="cyan",
        )
    )

    try:
        # Connect to the WebSocket server first
        console.print("[bold cyan]Connecting to WebSocket server...[/bold cyan]")
        try:
            sio.connect(base_url, wait_timeout=10, transports=["websocket", "polling"])
            time.sleep(1)  # Give it a moment to establish connection
        except Exception as e:
            console.print(
                f"[bold red]Failed to connect to WebSocket: {str(e)}[/bold red]"
            )
            console.print("[yellow]Will rely on direct API monitoring...[/yellow]")

        # Send the chat request
        console.print(f"[bold cyan]Sending query: {query}[/bold cyan]")
        response = send_chat_request(query, chat_url)

        if response:
            # Extract and display the conversation ID
            if "conversation_id" in response:
                conversation_id = response["conversation_id"]
                console.print(
                    f"[bold green]Conversation ID: {conversation_id}[/bold green]"
                )
                # Join the conversation room to get updates
                if sio.connected:
                    sio.emit("join", {"conversation_id": conversation_id})

            # Display the response
            console.print(
                Panel(
                    Text(
                        response.get("response", "No response received"), style="bold"
                    ),
                    title="Initial API Response",
                    border_style="green",
                )
            )

            # Poll for updates
            poll_for_updates(base_url, max_time)

            # Display the results
            console.print(
                Panel("[bold]Conversation Analysis[/bold]", border_style="cyan")
            )

            # Display the conversation flow
            display_conversation_flow()

            # Display the conversation tree
            display_conversation_tree()

            # Display questions and answers
            display_questions_and_answers()

            # Save the full conversation data to a file
            output_file = f"monitor_{conversation_id}.json"
            with open(output_file, "w") as f:
                json.dump(
                    {
                        "conversation_id": conversation_id,
                        "query": query,
                        "response": response,
                        "workflow_steps": workflow_steps,
                        "agent_communications": agent_communications,
                        "agent_messages": agent_messages,
                    },
                    f,
                    indent=2,
                )

            console.print(
                f"[bold green]Full conversation data saved to {output_file}[/bold green]"
            )

            if len(workflow_steps) == 0:
                console.print(
                    Panel(
                        "[bold yellow]No workflow steps were captured. Try these fixes:[/bold yellow]\n\n"
                        "1. Make sure the API server is running\n"
                        "2. Ensure the WebSocket server is properly working\n"
                        "3. Try a simpler query that completes faster\n"
                        "4. Check the server logs for any errors",
                        title="Troubleshooting",
                        border_style="yellow",
                    )
                )
        else:
            console.print("[bold red]No response received from the API.[/bold red]")

    except Exception as e:
        console.print(f"[bold red]Error: {str(e)}[/bold red]")
        console.print(traceback.format_exc())

    finally:
        # Disconnect from WebSocket
        if sio.connected:
            sio.disconnect()


def main():
    parser = argparse.ArgumentParser(
        description="Monitor agent workflow messages in real-time"
    )
    parser.add_argument(
        "query",
        nargs="?",
        help="Query to send to the API (leave empty to monitor existing conversation)",
    )
    parser.add_argument(
        "--url", default="http://localhost:5001", help="Base URL of the API"
    )
    parser.add_argument("--conversation-id", help="Existing conversation ID to monitor")
    parser.add_argument(
        "--max-time", type=int, default=60, help="Maximum time to monitor (seconds)"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show verbose output including setup messages",
    )
    args = parser.parse_args()

    global verbose_mode
    verbose_mode = args.verbose

    # Check for query vs monitor mode
    if args.conversation_id:
        # Monitor existing conversation
        monitor_existing_conversation(args.url, args.conversation_id, args.max_time)
    elif args.query:
        # Start new conversation with query
        start_new_conversation(args.url, args.query, args.max_time)
    else:
        console.print(
            "[bold red]Error: Must provide either a query or a conversation ID to monitor.[/bold red]"
        )
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
