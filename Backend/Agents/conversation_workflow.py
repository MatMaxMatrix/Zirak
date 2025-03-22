# %%
import asyncio
import inspect
import json
import logging
import time
import traceback
import uuid
from datetime import datetime  # Add missing import for timestamp

from autogen import GroupChatManager
from dotenv import load_dotenv
from rich.console import Console

from .config import Config
from .User_Proxy_Agent import UserProxyAgent

load_dotenv()

initiating_agent = UserProxyAgent()
manager_config = {
    "model": Config.Model,
    "api_key": Config.api_key,
    "base_url": Config.base_url,
}
console = Console()
logger = logging.getLogger(__name__)


# Create a custom console implementation that logs messages for WebSocket streaming
class StreamingConsole(Console):
    def __init__(self, workflow_id=None, socketio=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.workflow_id = workflow_id or str(uuid.uuid4())
        self.log_messages = []
        self.socketio = socketio

    def print(self, *args, **kwargs):
        # Call the original print method
        super().print(*args, **kwargs)

        # Capture the message for logging
        message = " ".join(str(arg) for arg in args)

        # Add to log messages
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "message": message,
            "workflow_id": self.workflow_id,
        }
        self.log_messages.append(log_entry)

        # Log to the logger so it gets captured by WebSocketHandler
        if message:
            logger.info(f"[Workflow {self.workflow_id}] {message}")

            # If socketio is available, emit the message in real-time
            if self.socketio:
                try:
                    self.socketio.emit(
                        "workflow_update",
                        {
                            "workflow_id": self.workflow_id,
                            "agent": "System",
                            "message": message,
                            "timestamp": timestamp,
                            "status": "in_progress",
                        },
                    )
                except Exception as e:
                    logger.error(f"Error emitting workflow update: {str(e)}")


async def ensure_awaited(maybe_coro):
    """
    Ensures that a coroutine is properly awaited.

    Args:
        maybe_coro: Object that might be a coroutine

    Returns:
        The awaited result if it was a coroutine, or the original object
    """
    if inspect.iscoroutine(maybe_coro) or inspect.isawaitable(maybe_coro):
        # It's a coroutine or awaitable, make sure it's awaited
        try:
            return await maybe_coro
        except Exception as e:
            logger.error(f"Error awaiting coroutine: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    else:
        # Not a coroutine, return as is
        return maybe_coro


async def emit_workflow_event(workflow_id, agent_name, message, socketio=None):
    """
    Emit a workflow event to be captured by monitoring tools

    Args:
        workflow_id: Unique identifier for the workflow
        agent_name: Name of the agent sending the event
        message: Message content to emit
        socketio: Socket.IO instance for real-time communication
    """
    if socketio:
        timestamp = datetime.now().isoformat()
        event_data = {
            "agent": agent_name,
            "message": message,
            "timestamp": timestamp,
            "workflow_id": workflow_id,
        }

        try:
            socketio.emit("workflow_update", event_data, room=workflow_id)
        except Exception as e:
            logger.error(f"Error emitting workflow event: {str(e)}")


async def monitor_group_chat_messages(
    workflow_id, sender, receiver, message, socketio=None, is_incoming=True
):
    """
    Monitor messages between agents in the group chat

    Args:
        workflow_id: Unique identifier for the workflow
        sender: The agent sending the message
        receiver: The agent receiving the message
        message: The message content
        socketio: Socket.IO instance for real-time communication
        is_incoming: Whether the message is being received (True) or sent (False)
    """
    direction = "received from" if is_incoming else "sending to"
    agent_type = type(receiver).__name__ if is_incoming else type(sender).__name__
    agent_name = (
        getattr(receiver, "name", agent_type)
        if is_incoming
        else getattr(sender, "name", agent_type)
    )

    # Construct monitoring message
    if isinstance(message, dict) and "content" in message:
        content = message["content"]
        content_preview = content[:150] + ("..." if len(content) > 150 else "")
        monitor_msg = f"Processing message from {sender if is_incoming else receiver}: {content_preview}"
        await emit_workflow_event(workflow_id, agent_name, monitor_msg, socketio)
    else:
        await emit_workflow_event(
            workflow_id,
            agent_name,
            f"Agent {agent_name} {direction} {sender if is_incoming else receiver} (message format unknown)",
            socketio,
        )


async def conversation_workflow(group_chat):
    """
    Manages the conversation workflow between agents.

    Args:
        group_chat: The group chat object containing the agents

    Returns:
        A tuple (success, message) indicating whether the conversation completed successfully
    """
    try:
        # Start timing the workflow
        start_time = time.time()

        # Get the workflow ID from the context or generate a new one
        workflow_id = group_chat.context.get("workflow_id", str(uuid.uuid4()))

        # Get socketio instance from context if available
        socketio = group_chat.context.get("socketio")
        websocket_handler = group_chat.context.get("websocket_handler")

        # Set up a streaming console for this workflow
        streaming_console = StreamingConsole(workflow_id=workflow_id, socketio=socketio)

        # Initialize the group chat manager with improved configuration
        group_chat_manager = GroupChatManager(
            groupchat=group_chat,
            is_termination_msg=lambda x: x.get("content", "").find("TERMINATE") >= 0,
            llm_config=manager_config,
            max_consecutive_auto_reply=getattr(
                Config, "MAX_CONSECUTIVE_AUTO_REPLY", 10
            ),
        )

        # Add streaming information to context
        group_chat.context["streaming_enabled"] = True
        group_chat.context["workflow_id"] = workflow_id
        group_chat.context["streaming_console"] = streaming_console

        # Reset the group chat manager
        group_chat_manager.reset()
        streaming_console.print(
            "[bold cyan]Group chat manager reset successfully[/bold cyan]"
        )

        # Set up the context for all agents
        welcome_message = group_chat.context.get(
            "welcome_message", "Welcome to the Claude Engine!"
        )
        user_input = group_chat.context.get("user_input", "")

        # Log the context setup
        streaming_console.print(
            f"[bold cyan]Setting up context with user input: {user_input}[/bold cyan]"
        )

        # Collect workflow steps
        workflow_steps = []

        # Add initial workflow step for user input
        workflow_steps.append(
            {
                "timestamp": datetime.now().isoformat(),
                "agent": "System",
                "action": "User Input",
                "message": f"Processing user request: {user_input}",
                "status": "completed",
            }
        )

        # Store workflow steps in context
        group_chat.context["workflow_steps"] = workflow_steps

        # Emit initial workflow step if socketio available
        if socketio:
            socketio.emit(
                "workflow_update",
                {
                    "workflow_id": workflow_id,
                    "agent": "System",
                    "message": f"Processing user request: {user_input}",
                    "timestamp": datetime.now().isoformat(),
                    "status": "completed",
                },
            )

        # Monkey patch message methods to capture the workflow
        if socketio:
            # Patch the receive method to capture messages
            original_receive = group_chat_manager.receive

            async def patched_receive(
                message, sender, request_reply=True, silent=False
            ):
                # Call the original receive method
                response = await original_receive(
                    message, sender, request_reply, silent
                )

                # Monitor this message for WebSocket streaming
                if not silent:
                    try:
                        # Extract message content
                        content = (
                            message.get("content", "")
                            if isinstance(message, dict)
                            else str(message)
                        )
                        sender_name = getattr(sender, "name", type(sender).__name__)

                        # Create a new workflow step
                        step = {
                            "timestamp": datetime.now().isoformat(),
                            "agent": sender_name,
                            "action": "Message",
                            "message": content[:100]
                            + ("..." if len(content) > 100 else ""),
                            "status": "completed",
                        }

                        # Add to workflow steps
                        workflow_steps.append(step)
                        group_chat.context["workflow_steps"] = workflow_steps

                        # Emit through socketio
                        socketio.emit(
                            "agent_message",
                            {
                                "workflow_id": workflow_id,
                                "agent": sender_name,
                                "message": content,
                                "timestamp": datetime.now().isoformat(),
                            },
                        )

                        # Also emit as workflow update
                        socketio.emit(
                            "workflow_update",
                            {
                                "workflow_id": workflow_id,
                                "agent": sender_name,
                                "message": content[:100]
                                + ("..." if len(content) > 100 else ""),
                                "timestamp": datetime.now().isoformat(),
                                "status": "completed",
                            },
                        )
                    except Exception as e:
                        logger.error(f"Error in patched receive: {str(e)}")

                return response

            # Apply the patch
            group_chat_manager.receive = patched_receive

            # Also patch each agent's reply function to track workflow steps
            for agent in group_chat.agents:
                agent_name = getattr(agent, "name", type(agent).__name__)

                if hasattr(agent, "generate_reply"):
                    original_reply = agent.generate_reply

                    async def make_patched_reply(original_fn, agent_name):
                        async def patched_reply(
                            messages=None, sender=None, config=None
                        ):
                            # Emit starting workflow step
                            step = {
                                "timestamp": datetime.now().isoformat(),
                                "agent": agent_name,
                                "action": "Processing",
                                "message": "Working on the task",
                                "status": "in_progress",
                            }

                            # Add to workflow steps
                            workflow_steps.append(step)
                            group_chat.context["workflow_steps"] = workflow_steps

                            # Emit through socketio
                            socketio.emit(
                                "workflow_update",
                                {
                                    "workflow_id": workflow_id,
                                    "agent": agent_name,
                                    "message": "Working on the task",
                                    "timestamp": datetime.now().isoformat(),
                                    "status": "in_progress",
                                },
                            )

                            # Call the original function
                            response = await original_fn(messages, sender, config)

                            # Update workflow step to completed
                            step["status"] = "completed"
                            step["message"] = "Completed task"
                            group_chat.context["workflow_steps"] = workflow_steps

                            # Emit completion
                            socketio.emit(
                                "workflow_update",
                                {
                                    "workflow_id": workflow_id,
                                    "agent": agent_name,
                                    "message": "Completed task",
                                    "timestamp": datetime.now().isoformat(),
                                    "status": "completed",
                                },
                            )

                            return response

                        return patched_reply

                    # Apply the patch
                    agent.generate_reply = await make_patched_reply(
                        original_reply, agent_name
                    )

        # Add instrumentation to all agents to capture their interactions
        for agent in group_chat.agents:
            agent.context = group_chat.context
            streaming_console.print(
                f"[bold cyan]Context set for agent: {agent.name}[/bold cyan]"
            )

        # Initialize clarification context if not present
        if "requires_clarification" not in group_chat.context:
            group_chat.context["requires_clarification"] = False
        if "clarifications" not in group_chat.context:
            group_chat.context["clarifications"] = (
                "Clarifications: Nothing to clarify yet."
            )

        # Use asyncio.wait_for to add a timeout to the chat process
        try:
            conversation_completed = False

            # Start a timeout timer
            timeout = getattr(Config, "CONVERSATION_TIMEOUT", 1800)
            start_time_conv = time.time()

            # Initiate the chat with the non-async method
            try:
                # For now, prefer the synchronous version which seems more stable
                streaming_console.print(
                    "[bold cyan]Using synchronous initiate_chat method[/bold cyan]"
                )
                try:
                    await asyncio.wait_for(
                        initiating_agent.initiate_chat(
                            group_chat_manager,
                            message=welcome_message,
                            clear_history=True,
                            silent=False,
                            request_reply=True,
                        ),
                        timeout=getattr(
                            Config, "CONVERSATION_TIMEOUT", 1800
                        ),  # Default to 1800 seconds if not set
                    )

                    # If the synchronous method returns a coroutine, await it
                    chat_result = await ensure_awaited(chat_result)
                except Exception as sync_e:
                    # If synchronous version fails, try async version
                    streaming_console.print(
                        f"[bold yellow]Sync version failed, trying async: {str(sync_e)}[/bold yellow]"
                    )
                    if hasattr(
                        initiating_agent, "a_initiate_chat"
                    ) and inspect.iscoroutinefunction(initiating_agent.a_initiate_chat):
                        # If we have an async version, use it
                        streaming_console.print(
                            "[bold cyan]Using async initiate_chat method[/bold cyan]"
                        )
                        chat_result = await initiating_agent.a_initiate_chat(
                            group_chat_manager,
                            message=welcome_message,
                            clear_history=True,
                            silent=False,
                        )

                        # Make sure any returned coroutines are properly awaited
                        chat_result = await ensure_awaited(chat_result)
                    else:
                        # As a last resort, use a direct approach to start the conversation
                        streaming_console.print(
                            "[bold yellow]Both methods failed, using manual conversation start[/bold yellow]"
                        )

                        # Reset the chat state
                        group_chat_manager.reset()

                        # Manually add the first message
                        if not hasattr(group_chat, "messages"):
                            group_chat.messages = []

                        # Add the initial message
                        initial_msg = {"role": "user", "content": welcome_message}
                        group_chat.messages.append(initial_msg)

                        # Return a basic result
                        chat_result = {
                            "role": "assistant",
                            "content": "Conversation started manually",
                        }

                streaming_console.print(
                    f"[bold cyan]Initiate chat returned: {chat_result}[/bold cyan]"
                )
            except Exception as e:
                error_msg = f"Error initiating chat: {str(e)}"
                streaming_console.print(f"[bold red]{error_msg}[/bold red]")
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                raise

            # Wait until the group chat is complete or we timeout
            while (
                not conversation_completed and (time.time() - start_time_conv) < timeout
            ):
                # Check for conversation completion using multiple methods

                # Method 1: Check _terminated flag (most reliable)
                if (
                    hasattr(group_chat_manager, "_terminated")
                    and group_chat_manager._terminated
                ):
                    conversation_completed = True
                    streaming_console.print(
                        "[bold green]Conversation completed (_terminated flag)[/bold green]"
                    )
                    break

                # Method 2: Check is_terminated method
                if hasattr(group_chat_manager, "is_terminated") and callable(
                    group_chat_manager.is_terminated
                ):
                    try:
                        if group_chat_manager.is_terminated():
                            conversation_completed = True
                            streaming_console.print(
                                "[bold green]Conversation completed (terminated flag)[/bold green]"
                            )
                            break
                    except Exception as e:
                        streaming_console.print(
                            f"[yellow]Error checking termination: {str(e)}[/yellow]"
                        )

                # Method 3: Check for TERMINATE message in history
                try:
                    messages = []
                    # Try different attributes for messages
                    if hasattr(group_chat, "messages"):
                        messages = group_chat.messages
                    elif hasattr(group_chat_manager, "messages"):
                        messages = group_chat_manager.messages

                    # Check for TERMINATE in message content
                    if messages and any(
                        "TERMINATE" in str(msg.get("content", "")) for msg in messages
                    ):
                        conversation_completed = True
                        streaming_console.print(
                            "[bold green]Conversation completed (TERMINATE found)[/bold green]"
                        )
                        break

                    # Check for conversation stuck in a loop (same speaker twice)
                    if len(messages) > 3:
                        last_two_messages = messages[-2:]
                        if len(last_two_messages) >= 2:
                            last_speaker = last_two_messages[-1].get("role", "")
                            previous_speaker = last_two_messages[-2].get("role", "")
                            if last_speaker == previous_speaker:
                                streaming_console.print(
                                    "[bold yellow]Warning: Same speaker spoke twice in a row, potential conversation loop[/bold yellow]"
                                )

                        # Check for substantial final message
                        last_message = messages[-1]
                        if (
                            last_message.get("content", "")
                            and len(last_message.get("content", "").split()) > 20
                        ):
                            streaming_console.print(
                                "[bold yellow]Substantial message found, may be complete[/bold yellow]"
                            )

                            # If no activity for 5+ seconds after substantial message
                            if time.time() - start_time_conv > 5:
                                streaming_console.print(
                                    "[bold green]No activity for 5+ seconds after substantial message, considering complete[/bold green]"
                                )
                                conversation_completed = True
                                break
                except Exception as e:
                    streaming_console.print(
                        f"[yellow]Error checking message history: {str(e)}[/yellow]"
                    )

                # Sleep briefly to avoid busy-waiting
                await asyncio.sleep(0.2)

                # Log periodically
                elapsed = time.time() - start_time_conv
                if elapsed % 5 < 0.2:  # Log roughly every 5 seconds
                    streaming_console.print(
                        f"[dim]Waiting for conversation to complete... ({elapsed:.1f}s elapsed)[/dim]"
                    )

            # Handle timeout
            if (
                not conversation_completed
                and (time.time() - start_time_conv) >= timeout
            ):
                streaming_console.print(
                    "[bold yellow]Conversation timed out[/bold yellow]"
                )
                raise asyncio.TimeoutError("Conversation timed out")

            # Process successful conversation completion
            success = True

            # Get the final response from the last message
            final_response = ""
            if (
                hasattr(group_chat, "messages")
                and group_chat.messages
                and len(group_chat.messages) > 0
            ):
                final_response = group_chat.messages[-1].get("content", "")
            else:
                final_response = "Conversation completed successfully, but no final message was generated."

            message = final_response
        except asyncio.TimeoutError:
            success = False
            message = "Conversation timed out"
            streaming_console.print("[bold red]Conversation timed out![/bold red]")
        except Exception as e:
            success = False
            message = f"Error during conversation: {str(e)}"
            streaming_console.print(
                f"[bold red]Error during conversation: {str(e)}[/bold red]"
            )
            logger.error(f"Error during conversation: {str(e)}")
            logger.error(traceback.format_exc())

        # Calculate and log the total time taken
        end_time = time.time()
        total_time = end_time - start_time
        streaming_console.print(
            f"[bold cyan]Total conversation time: {total_time:.2f} seconds[/bold cyan]"
        )

        # Log token usage if available
        token_usage = {}
        for agent in group_chat.agents:
            if hasattr(agent, "total_tokens_used"):
                token_usage[agent.name] = agent.total_tokens_used
                streaming_console.print(
                    f"[bold cyan]Agent {agent.name} used {agent.total_tokens_used} tokens[/bold cyan]"
                )

        # Log detailed information
        logger.info(
            f"Workflow {workflow_id} completed | Success: {success} | Time: {total_time:.2f}s | Token Usage: {json.dumps(token_usage)}"
        )

        return success, message
    except Exception as e:
        error_msg = f"Error in conversation workflow: {str(e)}"
        console.print(f"[bold red]{error_msg}[/bold red]")
        console.print(f"[red]{traceback.format_exc()}[/red]")

        # Log the error for streaming
        logger.error(f"Workflow error: {error_msg}")

        return False, error_msg
