# File: /Framework/agents/agent_manager.py

from typing import Any
from autogen import GroupChat
from rich.console import Console
from .config import Config
from .User_Proxy_Agent import UserProxyAgent
from .LLM_Agent import LLM_Agent
from .Central_Agent import CentralAgent

console = Console()

# Initialize all agents
UserProxyAgent = UserProxyAgent()
LLM_agent = LLM_Agent()
CentralAgent = CentralAgent()

# Define the agent list for the group chat
agents = [
    UserProxyAgent,
    CentralAgent,
    LLM_agent,
]

allowed_speaker_transitions_dict = {
    UserProxyAgent: [CentralAgent],
    CentralAgent: [LLM_agent, UserProxyAgent],
    LLM_agent: [CentralAgent, UserProxyAgent],
}

# Initialize the group chat with the agents and state transition function
group_chat = GroupChat(
    agents=agents,
    messages=[],
    max_round=getattr(Config, "MAX_CONVERSATION_ROUNDS", 30),
    speaker_selection_method="auto",  # Changed to a string
    allowed_or_disallowed_speaker_transitions=allowed_speaker_transitions_dict,
    speaker_transitions_type="allowed",
    allow_repeat_speaker=None,
)
