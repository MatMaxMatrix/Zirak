#%%
from autogen import GroupChatManager
import autogen
from .Initiating_agent import EnhancedInitiatingAgent
from dotenv import load_dotenv
from rich.console import Console
import traceback
import time
import asyncio
from .config import Config

load_dotenv()

initiating_agent = EnhancedInitiatingAgent()
manager_config = {
    "model": Config.Model,
    "api_key": Config.api_key,
    "base_url": Config.base_url,
}
console = Console()

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
        
        # Initialize the group chat manager with improved configuration
        group_chat_manager = GroupChatManager(
            groupchat=group_chat,
            is_termination_msg=lambda x: x.get("content", "").find("TERMINATE") >= 0,
            llm_config=manager_config,
            max_consecutive_auto_reply=getattr(Config, 'MAX_CONSECUTIVE_AUTO_REPLY', 10),
        )
        
        # Reset the group chat manager
        group_chat_manager.reset()
        console.print("[bold cyan]Group chat manager reset successfully[/bold cyan]")
        
        # Set up the context for all agents
        welcome_message = group_chat.context.get("welcome_message", "Welcome to the Claude Engine!")
        user_input = group_chat.context.get("user_input", "")
        
        # Log the context setup
        console.print(f"[bold cyan]Setting up context with user input: {user_input}[/bold cyan]")
        
        # Ensure all agents have access to the context
        for agent in group_chat.agents:
            agent.context = group_chat.context
            console.print(f"[bold cyan]Context set for agent: {agent.name}[/bold cyan]")
        
        # Initialize clarification context if not present
        if "requires_clarification" not in group_chat.context:
            group_chat.context["requires_clarification"] = False
        if "clarifications" not in group_chat.context:
            group_chat.context["clarifications"] = "Clarifications:"
        
        # Start the conversation
        console.print(f"[bold cyan]Starting conversation with message: {welcome_message}[/bold cyan]")
        
        # Use asyncio.wait_for to add a timeout to the initiate_chat method
        try:
            await asyncio.wait_for(
                initiating_agent.initiate_chat(group_chat_manager, message=welcome_message),
                timeout=getattr(Config, 'CONVERSATION_TIMEOUT', 1800)  # Default to 1800 seconds if not set
            )
            success = True
            message = "Conversation completed successfully"
        except asyncio.TimeoutError:
            success = False
            message = "Conversation timed out"
            console.print("[bold red]Conversation timed out![/bold red]")
        
        # Calculate and log the total time taken
        end_time = time.time()
        total_time = end_time - start_time
        console.print(f"[bold cyan]Total conversation time: {total_time:.2f} seconds[/bold cyan]")
        
        # Log token usage if available
        for agent in group_chat.agents:
            if hasattr(agent, 'total_tokens_used'):
                console.print(f"[bold cyan]Agent {agent.name} used {agent.total_tokens_used} tokens[/bold cyan]")
        
        return success, message
    except Exception as e:
        error_msg = f"Error in conversation workflow: {str(e)}"
        console.print(f"[bold red]{error_msg}[/bold red]")
        console.print(f"[red]{traceback.format_exc()}[/red]")
        return False, error_msg