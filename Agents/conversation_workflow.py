from autogen import GroupChatManager
import logging
from .agent_manager import initiating_agent


async def conversation_workflow(group_chat):
    group_chat_manager = GroupChatManager(group_chat)
    group_chat_manager.reset()
    User_input = group_chat.context.get("User_input")
    for agent in group_chat.agents:
        if agent.name == "initiating_agent" or agent.name == "RegularLLM" or agent.name == "TechLLM":
            agent.context = group_chat.context

    if not User_input:
        return {"error": "User_input is missing or empty"}
    initiating_message = f"User_input received:\n\n{User_input}"
    initiating_agent.initiate_chat(group_chat_manager, message=initiating_message)

    if group_chat.context.get("user_input_required"):
        return {
            False: (
                f"User's input is not valid because of "
                f"warning letter: {group_chat.context.get('input_validation_result_feedback', '')} "
                f"OR template: {group_chat.context.get('valid_Template_feedback', '')}"
            )
        }

    # Extract results from agent context
    for agent in group_chat.agents:
        if agent.name == "corrective_action_agent":
            corrective_action_plan = agent.context.get("corrective_action_plan", "")

    return {True: corrective_action_plan}
