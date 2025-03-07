#%%
from autogen import GroupChatManager
import autogen
from .Initiating_agent import EnhancedInitiatingAgent
from dotenv import load_dotenv
from rich.console import Console
import traceback

load_dotenv()

initiating_agent = EnhancedInitiatingAgent()
manager_config = autogen.config_list_from_json("OAI_CONFIG_LIST",)[3]
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
        group_chat_manager = GroupChatManager(
            groupchat = group_chat,
            is_termination_msg=lambda x: x.get("content", "").find("TERMINATE") >= 0,
            llm_config = manager_config,
        )
        
        # Reset the group chat manager
        group_chat_manager.reset()
        
        # Set up the context for all agents
        Welcome_message = group_chat.context.get("welcome_message", "Welcome to the Claude Engine!")
        for agent in group_chat.agents:
            agent.context = group_chat.context
        
        # Initialize clarification context if not present
        if "requires_clarification" not in group_chat.context:
            group_chat.context["requires_clarification"] = False
        if "clarifications" not in group_chat.context:
            group_chat.context["clarifications"] = "Clarifications:"
        
        # Start the conversation
        console.print(f"[bold cyan]Starting conversation with message: {Welcome_message}[/bold cyan]")
        # The initiate_chat method is returning more than 2 values, so we don't unpack it directly
        initiating_agent.initiate_chat(group_chat_manager, message=Welcome_message)
        
        # Check if the conversation completed successfully
        # Since we're not using the result from initiate_chat, we'll assume success if no exceptions
        return True, "Conversation completed successfully"
    except Exception as e:
        error_msg = f"Error in conversation workflow: {str(e)}"
        console.print(f"[bold red]{error_msg}[/bold red]")
        console.print(f"[red]{traceback.format_exc()}[/red]")
        return False, error_msg
