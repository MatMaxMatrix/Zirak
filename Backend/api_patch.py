#!/usr/bin/env python3
# api_patch.py - Script to patch Zirak API to emit more detailed workflow events

import argparse
import os
import re
import shutil

from rich.console import Console
from rich.panel import Panel

console = Console()


def backup_file(file_path):
    """Create a backup of the file before modifying it"""
    backup_path = file_path + ".bak"
    if os.path.exists(file_path):
        shutil.copy2(file_path, backup_path)
        console.print(f"[bold green]Created backup: {backup_path}[/bold green]")
        return True
    else:
        console.print(f"[bold red]Error: File {file_path} not found[/bold red]")
        return False


def restore_backup(file_path):
    """Restore the file from backup"""
    backup_path = file_path + ".bak"
    if os.path.exists(backup_path):
        shutil.copy2(backup_path, file_path)
        console.print(f"[bold green]Restored from backup: {file_path}[/bold green]")
        return True
    else:
        console.print(
            f"[bold red]Error: Backup file {backup_path} not found[/bold red]"
        )
        return False


def patch_conversation_workflow(file_path):
    """Patch the conversation_workflow.py file to emit more detailed workflow events"""
    if not os.path.exists(file_path):
        console.print(f"[bold red]Error: File {file_path} not found[/bold red]")
        return False

    # Create backup first
    if not backup_file(file_path):
        return False

    try:
        with open(file_path) as f:
            content = f.read()

        # Check if already patched
        if "# PATCHED FOR BETTER WORKFLOW MONITORING" in content:
            console.print(
                "[bold yellow]File already appears to be patched. Skipping.[/bold yellow]"
            )
            return True

        # Add imports if needed
        if "import json" not in content:
            content = re.sub(r"(import .*?\n)", r"\1import json\n", content, count=1)

        # Define our monitoring patches
        patches = [
            # Patch 1: Add a function to emit workflow events
            (
                "async def conversation_workflow(group_chat):",
                """# PATCHED FOR BETTER WORKFLOW MONITORING
async def emit_workflow_event(workflow_id, agent_name, message, socketio=None):
    \"\"\"Emit a workflow event to be captured by monitoring tools\"\"\"
    if socketio:
        timestamp = datetime.now().isoformat()
        event_data = {
            'agent': agent_name,
            'message': message,
            'timestamp': timestamp,
            'workflow_id': workflow_id
        }

        try:
            socketio.emit('workflow_update', event_data, room=workflow_id)
        except Exception as e:
            print(f"Error emitting workflow event: {str(e)}")

async def monitor_group_chat_messages(workflow_id, sender, receiver, message, socketio=None, is_incoming=True):
    \"\"\"Monitor messages between agents in the group chat\"\"\"
    direction = "received from" if is_incoming else "sending to"
    agent_type = type(receiver).__name__ if is_incoming else type(sender).__name__
    agent_name = getattr(receiver, 'name', agent_type) if is_incoming else getattr(sender, 'name', agent_type)

    # Construct monitoring message
    if isinstance(message, dict) and 'content' in message:
        content = message['content']
        content_preview = content[:150] + ("..." if len(content) > 150 else "")
        monitor_msg = f"Processing message from {sender if is_incoming else receiver}: {content_preview}"
        await emit_workflow_event(workflow_id, agent_name, monitor_msg, socketio)
    else:
        await emit_workflow_event(workflow_id, agent_name, f"Agent {agent_name} {direction} {sender if is_incoming else receiver} (message format unknown)", socketio)

async def conversation_workflow(group_chat):""",
            ),
            # Patch 2: Add monitoring in the original function to track workflow
            (
                "# Set up group chat",
                """    # Set socketio attribute if passed from API
    workflow_id = getattr(group_chat, 'conversation_id', None)
    socketio = getattr(group_chat, 'socketio', None)

    if socketio and workflow_id:
        await emit_workflow_event(workflow_id, "System", f"Starting conversation workflow with ID: {workflow_id}", socketio)

    # Set up group chat""",
            ),
            # Patch 3: Add monitoring for messages in the group chat
            (
                "def send_message_to_group_chat",
                """    # Monitor message flow in the group chat
    if hasattr(group_chat, 'socketio') and hasattr(group_chat, 'conversation_id'):
        for message in messages:
            if isinstance(message, dict) and 'content' in message:
                await monitor_group_chat_messages(
                    group_chat.conversation_id,
                    "User",
                    "GroupChat",
                    message,
                    group_chat.socketio
                )

    def send_message_to_group_chat""",
            ),
            # Patch 4: Add connection for message outputs
            (
                "message = response['message']",
                """        message = response['message']

        # Monitor agent results
        if hasattr(group_chat, 'socketio') and hasattr(group_chat, 'conversation_id'):
            agent_name = getattr(sender, 'name', type(sender).__name__)
            await emit_workflow_event(
                group_chat.conversation_id,
                agent_name,
                f"Result: {message[:200]}" + ("..." if len(message) > 200 else ""),
                group_chat.socketio
            )""",
            ),
        ]

        # Apply each patch
        for pattern, replacement in patches:
            if pattern in content:
                content = content.replace(pattern, replacement, 1)
                console.print(
                    f"[bold green]Applied patch: {pattern[:30]}...[/bold green]"
                )
            else:
                console.print(
                    f"[bold yellow]Pattern not found: {pattern[:30]}...[/bold yellow]"
                )

        # Write the patched file
        with open(file_path, "w") as f:
            f.write(content)

        console.print("[bold green]Successfully patched the file.[/bold green]")

        # Show summary of changes
        console.print(
            Panel(
                "The API has been patched to emit more detailed workflow events.\n"
                "These changes will help you monitor the conversation flow between agents.",
                title="Patch Summary",
                border_style="green",
            )
        )

        return True

    except Exception as e:
        console.print(f"[bold red]Error patching file: {str(e)}[/bold red]")
        # Restore from backup
        restore_backup(file_path)
        return False


def patch_agent_manager(file_path):
    """Patch the agent_manager.py file to emit more detailed agent events"""
    if not os.path.exists(file_path):
        console.print(f"[bold red]Error: File {file_path} not found[/bold red]")
        return False

    # Create backup first
    if not backup_file(file_path):
        return False

    try:
        with open(file_path) as f:
            content = f.read()

        # Check if already patched
        if "# PATCHED FOR BETTER AGENT MONITORING" in content:
            console.print(
                "[bold yellow]File already appears to be patched. Skipping.[/bold yellow]"
            )
            return True

        # Define our monitoring patches
        patches = [
            # Patch 1: Add a function to emit agent events
            (
                "class GroupChatManager(groupchat.GroupChat):",
                """class GroupChatManager(groupchat.GroupChat):
    # PATCHED FOR BETTER AGENT MONITORING
    def emit_agent_event(self, agent_name, message):
        \"\"\"Emit an agent event to be captured by monitoring tools\"\"\"
        if hasattr(self, 'socketio') and hasattr(self, 'conversation_id'):
            timestamp = datetime.now().isoformat()
            event_data = {
                'agent': agent_name,
                'message': message,
                'timestamp': timestamp,
                'workflow_id': getattr(self, 'conversation_id', 'unknown')
            }

            if hasattr(self, 'socketio'):
                try:
                    room_id = getattr(self, 'conversation_id', None)
                    if room_id:
                        self.socketio.emit('workflow_update', event_data, room=room_id)
                except Exception as e:
                    print(f"Error emitting agent event: {str(e)}")
""",
            ),
            # Patch 2: Add monitoring in agent selection
            (
                "def select_speaker",
                """    def monitor_agent_selection(self, agent):
        \"\"\"Monitor when an agent is selected to speak\"\"\"
        agent_name = getattr(agent, 'name', type(agent).__name__)
        self.emit_agent_event(agent_name, f"Selected as next speaker in the conversation")

    def select_speaker""",
            ),
            # Patch 3: Add monitoring when agent receives a message
            (
                "def send(",
                """    def monitor_agent_message(self, agent, message):
        \"\"\"Monitor messages sent to agents\"\"\"
        agent_name = getattr(agent, 'name', type(agent).__name__)
        if isinstance(message, dict) and 'content' in message:
            content = message['content']
            content_preview = content[:150] + ("..." if len(content) > 150 else "")
            self.emit_agent_event(agent_name, f"Received message: {content_preview}")
        else:
            self.emit_agent_event(agent_name, f"Received message (format unknown)")

    def send(""",
            ),
            # Patch 4: Call the monitoring functions at appropriate points
            (
                "agent = self.select_speaker",
                """        agent = self.select_speaker(self.agents)
        self.monitor_agent_selection(agent)""",
            ),
            (
                "agent.receive(",
                """        self.monitor_agent_message(agent, message)
        agent.receive(""",
            ),
        ]

        # Apply each patch
        for pattern, replacement in patches:
            if pattern in content:
                content = content.replace(pattern, replacement, 1)
                console.print(
                    f"[bold green]Applied patch: {pattern[:30]}...[/bold green]"
                )
            else:
                console.print(
                    f"[bold yellow]Pattern not found: {pattern[:30]}...[/bold yellow]"
                )

        # Write the patched file
        with open(file_path, "w") as f:
            f.write(content)

        console.print(
            "[bold green]Successfully patched the agent_manager.py file.[/bold green]"
        )

        return True

    except Exception as e:
        console.print(f"[bold red]Error patching file: {str(e)}[/bold red]")
        # Restore from backup
        restore_backup(file_path)
        return False


def patch_api_file(file_path):
    """Patch the api.py file to make the socketio instance available to workflow"""
    if not os.path.exists(file_path):
        console.print(f"[bold red]Error: File {file_path} not found[/bold red]")
        return False

    # Create backup first
    if not backup_file(file_path):
        return False

    try:
        with open(file_path) as f:
            content = f.read()

        # Check if already patched
        if "# PATCHED FOR BETTER MONITORING" in content:
            console.print(
                "[bold yellow]File already appears to be patched. Skipping.[/bold yellow]"
            )
            return True

        # Define our monitoring patches
        patches = [
            # Patch 1: Add comment to indicate patching
            (
                "@app.route('/api/chat', methods=['POST'])",
                "# PATCHED FOR BETTER MONITORING\n@app.route('/api/chat', methods=['POST'])",
            ),
            # Patch 2: Add socketio to group_chat
            (
                "# Set up the context for the group chat",
                """        # Set up the context for the group chat
        # Make socketio available for workflow monitoring
        group_chat.socketio = socketio
        group_chat.conversation_id = conversation_id""",
            ),
            # Patch 3: Add a workflow status endpoint
            (
                "@app.route('/api/health', methods=['GET'])",
                """@app.route('/api/workflow/status', methods=['GET'])
def workflow_status():
    \"\"\"Get the status of a workflow\"\"\"
    conversation_id = request.args.get('conversation_id')
    if not conversation_id:
        return jsonify({"error": "conversation_id is required"}), 400

    # Return workflow events if any
    if conversation_id in workflow_steps:
        return jsonify({"conversation_id": conversation_id, "events": workflow_steps[conversation_id]})

    return jsonify({"conversation_id": conversation_id, "events": []})

@app.route('/api/health', methods=['GET'])""",
            ),
        ]

        # Apply each patch
        for pattern, replacement in patches:
            if pattern in content:
                content = content.replace(pattern, replacement, 1)
                console.print(
                    f"[bold green]Applied patch: {pattern[:30]}...[/bold green]"
                )
            else:
                console.print(
                    f"[bold yellow]Pattern not found: {pattern[:30]}...[/bold yellow]"
                )

        # Write the patched file
        with open(file_path, "w") as f:
            f.write(content)

        console.print("[bold green]Successfully patched the api.py file.[/bold green]")

        return True

    except Exception as e:
        console.print(f"[bold red]Error patching file: {str(e)}[/bold red]")
        # Restore from backup
        restore_backup(file_path)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Patch Zirak API for better workflow monitoring"
    )
    parser.add_argument(
        "--workflow-path",
        default="Agents/conversation_workflow.py",
        help="Path to conversation_workflow.py",
    )
    parser.add_argument(
        "--agent-manager-path",
        default="Agents/agent_manager.py",
        help="Path to agent_manager.py",
    )
    parser.add_argument("--api-path", default="api.py", help="Path to api.py")
    parser.add_argument(
        "--restore", action="store_true", help="Restore from backup instead of patching"
    )
    args = parser.parse_args()

    # Construct absolute paths
    workflow_path = os.path.abspath(args.workflow_path)
    agent_manager_path = os.path.abspath(args.agent_manager_path)
    api_path = os.path.abspath(args.api_path)

    console.print(
        Panel(
            "[bold]Zirak API Patch Utility[/bold]\n\n"
            f"[bold]Workflow Path:[/bold] {workflow_path}\n"
            f"[bold]Agent Manager Path:[/bold] {agent_manager_path}\n"
            f"[bold]API Path:[/bold] {api_path}\n",
            title="Configuration",
            border_style="cyan",
        )
    )

    # Restore or patch
    if args.restore:
        console.print("[bold cyan]Restoring files from backup...[/bold cyan]")
        workflow_restored = restore_backup(workflow_path)
        agent_manager_restored = restore_backup(agent_manager_path)
        api_restored = restore_backup(api_path)

        if workflow_restored and agent_manager_restored and api_restored:
            console.print(
                "[bold green]All files successfully restored from backup.[/bold green]"
            )
        else:
            console.print(
                "[bold yellow]Some files could not be restored. See errors above.[/bold yellow]"
            )
    else:
        console.print("[bold cyan]Patching files for better monitoring...[/bold cyan]")
        workflow_patched = patch_conversation_workflow(workflow_path)
        agent_manager_patched = patch_agent_manager(agent_manager_path)
        api_patched = patch_api_file(api_path)

        if workflow_patched and agent_manager_patched and api_patched:
            console.print(
                Panel(
                    "[bold green]All files successfully patched![/bold green]\n\n"
                    "Now you can monitor agent conversations in detail with:\n"
                    '  python agent_monitor.py "Your query here"\n\n'
                    "Or monitor an existing conversation with:\n"
                    "  python agent_monitor.py --conversation-id YOUR_CONVERSATION_ID\n\n"
                    "To restore the original files, run:\n"
                    "  python api_patch.py --restore",
                    title="Patching Complete",
                    border_style="green",
                )
            )
        else:
            console.print(
                "[bold yellow]Some files could not be patched. See errors above.[/bold yellow]"
            )


if __name__ == "__main__":
    main()
