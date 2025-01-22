from autogen import GroupChatManager
import autogen
from .agent_manager import initiating_agent

manager_config = {
    "timeout": 600,
    "cache_seed": 44,  # change the seed for different trials
    "config_list": autogen.config_list_from_json(
        "OAI_CONFIG_LIST",
        filter_dict={"model": ["gpt-4o"]},  # This Config is set to Text mode
    ),
    "temperature": 0,
}


async def conversation_workflow(group_chat):
    group_chat_manager = GroupChatManager(
        groupchat = group_chat,
        is_termination_msg=lambda x: x.get("content", "").find("TERMINATE") >= 0,
        llm_config = manager_config,
        )
    group_chat_manager.reset()
    User_input = group_chat.context.get("User_input")
    for agent in group_chat.agents:
        if agent.name in ["initiating_agent", "CriticalAnalysisAgent", "RegularLLM", "TechLLM"]:
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
