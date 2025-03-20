#!/usr/bin/env python3
# test_api_visualizer.py

import argparse
import json
import os
import re
import time
import traceback
import uuid
from collections import defaultdict
from datetime import datetime

import requests
import socketio
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.rule import Rule
from rich.syntax import Syntax
from rich.table import Table
from rich.text import Text

# Initialize console for rich output
console = Console()

# Initialize SocketIO client for real-time updates
sio = socketio.Client(logger=True, engineio_logger=True)

# Track workflow steps and agent communications
workflow_steps = []
agent_communications = {}
conversation_id = None
agent_colors = {
    "InitiatingAgent": "cyan",
    "CriticalAnalysisAgent": "magenta",
    "LLM_Agent": "green",
    "Query_Transformation": "yellow",
    "Step_Generator": "blue",
    "UserProxyAgent": "red",
    "System": "white",
    "Unknown Agent": "dim",
}

# Track the conversation flow for visualization
conversation_flow = []
message_contents = {}
questions_and_answers = []
agent_message_counts = defaultdict(int)


@sio.event
def connect():
    console.print("[bold green]Connected to WebSocket server[/bold green]")
    if conversation_id:
        sio.emit("join", {"conversation_id": conversation_id})


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


def parse_questions_and_answers(text):
    """Extract questions and answers from text"""
    qa_pairs = []
    # Match patterns like "Q: ... A: ..." or "Question: ... Answer: ..."
    q_patterns = ["Q:", "Question:"]
    a_patterns = ["A:", "Answer:"]

    for q_pattern in q_patterns:
        for a_pattern in a_patterns:
            # Find all occurrences where we have a question followed by an answer
            regex = rf"{q_pattern}\s*(.*?)\s*{a_pattern}\s*(.*?)(?=$|{q_pattern})"
            matches = re.findall(regex, text, re.DOTALL)
            for match in matches:
                if len(match) >= 2:
                    qa_pairs.append(
                        {"question": match[0].strip(), "answer": match[1].strip()}
                    )

    return qa_pairs


@sio.event
def workflow_update(data):
    """Handle real-time workflow updates from WebSocket"""
    workflow_steps.append(data)

    # Extract agent information
    agent_name = data.get("agent", "Unknown Agent")
    message = data.get("message", "")
    agent_message_counts[agent_name] += 1

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

    # Track message content for visualization
    if "to chat_manager" in message:
        # Extract content from the message
        content_match = re.search(r"(.*?)(?:\r\n|\n)*(.*)", message, re.DOTALL)
        if content_match and len(content_match.groups()) >= 2:
            sender = agent_name
            content = content_match.group(2).strip()
            message_id = f"{sender}_{formatted_time}"
            message_contents[message_id] = content
            conversation_flow.append(
                {
                    "from": sender,
                    "to": "chat_manager",
                    "message_id": message_id,
                    "time": formatted_time,
                }
            )

            # Check for questions and answers
            qa_pairs = parse_questions_and_answers(content)
            for qa in qa_pairs:
                questions_and_answers.append(
                    {
                        "agent": sender,
                        "time": formatted_time,
                        "question": qa["question"],
                        "answer": qa["answer"],
                    }
                )

    elif "processing message from" in message.lower():
        # Extract who is processing a message from whom
        match = re.search(r"agent (.*?) processing message from (.*)", message.lower())
        if match and len(match.groups()) >= 2:
            receiver = agent_name
            sender = match.group(2).strip()
            conversation_flow.append(
                {"from": sender, "to": receiver, "time": formatted_time}
            )

    elif "generated reply" in message.lower():
        # Extract the generated reply content
        content_match = re.search(r"generated reply: (.*)", message)
        if content_match:
            content = content_match.group(1).strip()
            message_id = f"{agent_name}_reply_{formatted_time}"
            message_contents[message_id] = content
            conversation_flow.append(
                {
                    "from": agent_name,
                    "to": "response",
                    "message_id": message_id,
                    "time": formatted_time,
                }
            )

    # Parse and display the update with appropriate styling
    if "Question:" in message or "Q:" in message:
        console.print(
            Panel(
                Text(message, style=f"bold {agent_colors.get(agent_name, 'white')}"),
                title=f"{agent_name} Question at {formatted_time}",
                border_style="yellow",
            )
        )
    elif "Result:" in message or "generated reply" in message.lower():
        console.print(
            Panel(
                Text(message, style=f"bold {agent_colors.get(agent_name, 'white')}"),
                title=f"{agent_name} Result at {formatted_time}",
                border_style="green",
            )
        )
    else:
        console.print(
            Panel(
                Text(message, style=agent_colors.get(agent_name, "white")),
                title=f"{agent_name} at {formatted_time}",
                border_style="blue",
            )
        )


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
            response = requests.post(api_url, json=data, timeout=30)
            response.raise_for_status()  # Raise an exception for HTTP errors
            console.print(f"[dim]Received response: {response.status_code}[/dim]")
            return response.json()
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

        first_msg = messages[0]["message"]
        last_msg = messages[-1]["message"]

        # Truncate long messages
        if len(first_msg) > 50:
            first_msg = first_msg[:47] + "..."
        if len(last_msg) > 50:
            last_msg = last_msg[:47] + "..."

        table.add_row(agent_name, str(len(messages)), first_msg, last_msg)

    console.print(table)


def display_agent_conversation_tree():
    """Display the conversation as a tree showing who replied to whom"""
    if not workflow_steps:
        console.print("[yellow]No workflow steps recorded yet.[/yellow]")
        return

    # Create a tree-like representation
    tree_lines = []
    for step in conversation_flow:
        from_agent = step.get("from", "Unknown")
        to_agent = step.get("to", "Unknown")
        time = step.get("time", "")
        message_id = step.get("message_id", "")

        # Color the agent names
        from_color = agent_colors.get(from_agent, "white")
        to_color = agent_colors.get(to_agent, "white")

        # Create the tree line
        line = f"[{from_color}]{from_agent}[/{from_color}] → [{to_color}]{to_agent}[/{to_color}] ({time})"

        # Add a preview of the message content if available
        if message_id and message_id in message_contents:
            content = message_contents[message_id]
            if len(content) > 50:
                content = content[:47] + "..."
            line += f": {content}"

        tree_lines.append(line)

    # Print the conversation tree
    console.print(
        Panel("\n".join(tree_lines), title="Conversation Flow", border_style="green")
    )


def display_questions_and_answers():
    """Display extracted questions and answers from the conversation"""
    if not questions_and_answers:
        console.print(
            "[yellow]No questions and answers detected in the conversation.[/yellow]"
        )
        return

    console.print(Rule(title="Questions and Answers", style="yellow"))

    for i, qa in enumerate(questions_and_answers, 1):
        agent = qa.get("agent", "Unknown")
        time = qa.get("time", "")
        question = qa.get("question", "")
        answer = qa.get("answer", "")

        agent_color = agent_colors.get(agent, "white")

        console.print(
            f"[bold {agent_color}]Q{i} from {agent} at {time}:[/bold {agent_color}]"
        )
        console.print(Panel(Text(question, style="yellow")))
        console.print(f"[bold {agent_color}]A{i}:[/bold {agent_color}]")
        console.print(Panel(Text(answer, style="green")))
        console.print("")


def generate_html_visualization():
    """Generate an HTML file visualizing the agent interactions"""
    if not conversation_flow:
        console.print("[yellow]No conversation flow to visualize.[/yellow]")
        return None

    # Create a directory for visualizations if it doesn't exist
    vis_dir = "visualizations"
    if not os.path.exists(vis_dir):
        os.makedirs(vis_dir)

    # Generate a filename based on the conversation ID and timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{vis_dir}/conversation_{conversation_id}_{timestamp}.html"

    # Prepare data for visualization
    nodes = []
    edges = []
    nodes_set = set()

    # Add nodes for each unique agent
    for agent_name in agent_communications.keys():
        if agent_name not in nodes_set:
            color = agent_colors.get(agent_name, "#cccccc")
            nodes.append(
                {
                    "id": agent_name,
                    "label": agent_name,
                    "color": color,
                    "size": agent_message_counts[agent_name]
                    * 5,  # Size based on message count
                }
            )
            nodes_set.add(agent_name)

    # Add 'chat_manager' and 'response' nodes if they're in the conversation
    for special_node in ["chat_manager", "response"]:
        if special_node not in nodes_set:
            nodes.append(
                {
                    "id": special_node,
                    "label": special_node,
                    "color": "#aaaaaa",
                    "size": 15,
                }
            )
            nodes_set.add(special_node)

    # Add edges for each interaction
    for i, flow in enumerate(conversation_flow):
        from_agent = flow.get("from", "Unknown")
        to_agent = flow.get("to", "Unknown")

        # Make sure both nodes exist
        if from_agent not in nodes_set:
            nodes.append(
                {
                    "id": from_agent,
                    "label": from_agent,
                    "color": agent_colors.get(from_agent, "#cccccc"),
                    "size": 10,
                }
            )
            nodes_set.add(from_agent)

        if to_agent not in nodes_set:
            nodes.append(
                {
                    "id": to_agent,
                    "label": to_agent,
                    "color": agent_colors.get(to_agent, "#cccccc"),
                    "size": 10,
                }
            )
            nodes_set.add(to_agent)

        # Add the edge
        message_id = flow.get("message_id", "")
        label = flow.get("time", "")

        if message_id and message_id in message_contents:
            tooltip = message_contents[message_id]
            if len(tooltip) > 100:
                tooltip = tooltip[:97] + "..."
        else:
            tooltip = "Message at " + label

        edges.append(
            {
                "id": f"e{i}",
                "source": from_agent,
                "target": to_agent,
                "label": label,
                "title": tooltip,
                "arrows": "to",
            }
        )

    # Create the HTML content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Zirak Agent Conversation Visualization</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f0f0f0;
            }}
            .container {{
                display: flex;
                flex-direction: column;
                gap: 20px;
            }}
            .header {{
                background-color: #2c3e50;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
            }}
            #visualization {{
                width: 100%;
                height: 600px;
                border: 1px solid #ddd;
                background-color: white;
            }}
            .info-box {{
                padding: 15px;
                background-color: white;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .qa-container {{
                margin-top: 20px;
                background-color: white;
                border-radius: 5px;
                padding: 15px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .qa-item {{
                margin-bottom: 15px;
                border-bottom: 1px solid #eee;
                padding-bottom: 15px;
            }}
            .question {{
                background-color: #f8f9fa;
                padding: 10px;
                border-left: 4px solid #ffc107;
                margin-bottom: 10px;
            }}
            .answer {{
                background-color: #f0f8ff;
                padding: 10px;
                border-left: 4px solid #28a745;
            }}
            .agent-name {{
                font-weight: bold;
                color: #2c3e50;
            }}
            .timestamp {{
                color: #6c757d;
                font-size: 0.9em;
            }}
        </style>
        <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Zirak Agent Conversation Visualization</h1>
                <p>Conversation ID: {conversation_id}</p>
                <p>Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
            </div>

            <div class="info-box">
                <h2>Conversation Summary</h2>
                <p><strong>Agents Involved:</strong> {", ".join(agent_communications.keys())}</p>
                <p><strong>Total Messages:</strong> {sum(agent_message_counts.values())}</p>
                <p><strong>Questions and Answers:</strong> {len(questions_and_answers)}</p>
            </div>

            <h2>Agent Interaction Visualization</h2>
            <div id="visualization"></div>

            <div class="qa-container">
                <h2>Questions and Answers</h2>
                {"".join([f'''
                <div class="qa-item">
                    <p><span class="agent-name">{qa.get('agent', 'Unknown')}</span> <span class="timestamp">at {qa.get('time', '')}</span></p>
                    <div class="question">{qa.get('question', '')}</div>
                    <div class="answer">{qa.get('answer', '')}</div>
                </div>
                ''' for qa in questions_and_answers]) if questions_and_answers else "<p>No questions and answers detected.</p>"}
            </div>
        </div>

        <script type="text/javascript">
            // Create visualization
            const container = document.getElementById('visualization');

            const data = {{
                nodes: new vis.DataSet({json.dumps(nodes)}),
                edges: new vis.DataSet({json.dumps(edges)})
            }};

            const options = {{
                nodes: {{
                    shape: 'dot',
                    font: {{
                        size: 14,
                        face: 'Arial'
                    }},
                    borderWidth: 2,
                    shadow: true
                }},
                edges: {{
                    width: 2,
                    shadow: true,
                    smooth: {{
                        type: 'dynamic'
                    }},
                    font: {{
                        size: 12,
                        align: 'middle'
                    }}
                }},
                physics: {{
                    stabilization: true,
                    barnesHut: {{
                        gravitationalConstant: -5000,
                        springConstant: 0.04,
                        springLength: 95
                    }}
                }},
                interaction: {{
                    tooltipDelay: 200,
                    hideEdgesOnDrag: true,
                    hover: true
                }}
            }};

            const network = new vis.Network(container, data, options);
        </script>
    </body>
    </html>
    """

    # Write the HTML file
    with open(filename, "w") as f:
        f.write(html_content)

    return filename


def main():
    parser = argparse.ArgumentParser(
        description="Test the Zirak API with a simple query and visualize agent interactions"
    )
    parser.add_argument(
        "query", nargs="?", default="Tell me a joke", help="Query to send to the API"
    )
    parser.add_argument(
        "--url", default="http://localhost:5001", help="Base URL of the API"
    )
    parser.add_argument(
        "--conversation-id", help="Existing conversation ID to continue"
    )
    parser.add_argument(
        "--timeout", type=int, default=30, help="How long to collect data (seconds)"
    )
    parser.add_argument(
        "--no-viz", action="store_true", help="Skip generating HTML visualization"
    )
    parser.add_argument(
        "--no-socket",
        action="store_true",
        help="Skip WebSocket connection and only use HTTP",
    )
    args = parser.parse_args()

    global conversation_id
    conversation_id = args.conversation_id

    # Connect to WebSocket for real-time updates
    socket_url = args.url
    api_url = f"{args.url}/api/chat"

    console.print(
        Panel(
            f"[bold]Query:[/bold] {args.query}\n"
            f"[bold]API URL:[/bold] {api_url}\n"
            f"[bold]WebSocket URL:[/bold] {socket_url}\n"
            f"[bold]Conversation ID:[/bold] {conversation_id or 'Will be generated'}\n"
            f"[bold]Data Collection Timeout:[/bold] {args.timeout} seconds",
            title="Zirak API Test and Visualization",
            border_style="cyan",
        )
    )

    try:
        # Connect to the WebSocket server
        if not args.no_socket:
            console.print("[bold cyan]Connecting to WebSocket server...[/bold cyan]")
            try:
                sio.connect(socket_url, wait_timeout=10)
            except Exception as e:
                console.print(
                    f"[bold red]Failed to connect to WebSocket: {str(e)}[/bold red]"
                )
                console.print(
                    "[yellow]Continuing without real-time updates...[/yellow]"
                )

        # Send the chat request
        console.print(f"[bold cyan]Sending query: {args.query}[/bold cyan]")
        response = send_chat_request(args.query, api_url)

        if response:
            # Extract and display the conversation ID
            if not conversation_id and "conversation_id" in response:
                conversation_id = response["conversation_id"]
                console.print(
                    f"[bold green]Conversation ID: {conversation_id}[/bold green]"
                )
                # Join the conversation room to get updates
                if not args.no_socket and sio.connected:
                    sio.emit("join", {"conversation_id": conversation_id})

            # Display the response
            console.print(
                Panel(
                    Text(
                        response.get("response", "No response received"), style="bold"
                    ),
                    title="API Response",
                    border_style="green",
                )
            )

            # Wait to collect WebSocket updates
            if not args.no_socket and sio.connected:
                console.print(
                    f"[bold cyan]Collecting agent communications for {args.timeout} seconds...[/bold cyan]"
                )
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[bold blue]Collecting data...[/bold blue]"),
                    console=console,
                ) as progress:
                    task = progress.add_task("Waiting", total=args.timeout)
                    for i in range(args.timeout):
                        progress.update(task, completed=i + 1)
                        time.sleep(1)  # Wait for 1 second
            else:
                console.print(
                    "[yellow]Skipping data collection as WebSocket is not connected.[/yellow]"
                )

            # Display the conversation summary
            console.print(Rule(title="Conversation Summary", style="cyan"))
            display_conversation_summary()

            # Display the conversation tree
            console.print(Rule(title="Conversation Flow", style="green"))
            display_agent_conversation_tree()

            # Display extracted questions and answers
            display_questions_and_answers()

            # Generate HTML visualization
            if not args.no_viz:
                console.print(Rule(title="Visualization", style="magenta"))
                console.print("[bold cyan]Generating HTML visualization...[/bold cyan]")
                html_file = generate_html_visualization()
                if html_file:
                    console.print(
                        f"[bold green]HTML visualization saved to: {html_file}[/bold green]"
                    )
                    console.print(
                        "[bold yellow]Open this file in a web browser to see the interactive visualization[/bold yellow]"
                    )

            # Save the full conversation data to a JSON file
            json_file = f"conversation_{conversation_id}.json"
            with open(json_file, "w") as f:
                json.dump(
                    {
                        "conversation_id": conversation_id,
                        "query": args.query,
                        "response": response,
                        "workflow_steps": workflow_steps,
                        "agent_communications": agent_communications,
                        "conversation_flow": conversation_flow,
                        "questions_and_answers": questions_and_answers,
                    },
                    f,
                    indent=2,
                )

            console.print(
                f"[bold green]Full conversation data saved to {json_file}[/bold green]"
            )
        else:
            console.print("[bold red]No response received from the API.[/bold red]")

    except Exception as e:
        console.print(f"[bold red]Error: {str(e)}[/bold red]")
        console.print(Syntax(traceback.format_exc(), "python"))
    finally:
        # Disconnect from WebSocket
        if not args.no_socket and sio.connected:
            sio.disconnect()


if __name__ == "__main__":
    main()
