#%%
from autogen import GroupChatManager
import autogen
from .Initiating_agent import EnhancedInitiatingAgent
from dotenv import load_dotenv

load_dotenv()

initiating_agent = EnhancedInitiatingAgent()
manager_config = autogen.config_list_from_json("OAI_CONFIG_LIST",)[2]
async def conversation_workflow(group_chat):
    group_chat_manager = GroupChatManager(
        groupchat = group_chat,
        is_termination_msg=lambda x: x.get("content", "").find("TERMINATE") >= 0,
        llm_config = manager_config,
        )
    group_chat_manager.reset()
    Welcome_message = group_chat.context.get("welcome_message")
    for agent in group_chat.agents:
            agent.context = group_chat.context
    group_chat.context["requires_clarification"] = False
    group_chat.context["clarifications"] = None
    initiating_agent.initiate_chat(group_chat_manager, message=Welcome_message)
    return {True}
