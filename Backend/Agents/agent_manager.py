# File: /Framework/agents/agent_manager.py

from typing import Any
from autogen import GroupChat
from rich.console import Console
from .config import Config
from .Critical_Analysis_Agent import CriticalAnalysisAgent
from .Evaluatoin_LLM import Evaluatoin_LLM
from .User_Proxy_Agent import UserProxyAgent
from .LLM_Agent import LLM_Agent
from .Query_Transformation import Query_Transformation
from .Step_Generator import Step_Generator

console = Console()


# Initialize all agents
UserProxyAgent = UserProxyAgent()
LLM_agent = LLM_Agent()
Query_Agent = Query_Transformation()
Step_agent = Step_Generator()
Evaluation_agent = Evaluatoin_LLM()
CriticalAnalysisAgent = CriticalAnalysisAgent()
# Define the agent list for the group chat
agents = [
    UserProxyAgent,
    CriticalAnalysisAgent,
    LLM_agent,
    Query_Agent,
    Step_agent,
]


allowed_speaker_transitions_dict = {
    UserProxyAgent: [CriticalAnalysisAgent, LLM_agent, Query_Agent, Step_agent],
    CriticalAnalysisAgent: [Query_Agent, UserProxyAgent],
    Query_Agent: [Step_agent, LLM_agent],
    Step_agent: [LLM_agent, UserProxyAgent],
    LLM_agent: [UserProxyAgent],
}
# Initialize the group chat with the agents and state transition function
group_chat = GroupChat(
    agents=agents,
    messages=[],
    max_round=getattr(Config, "MAX_CONVERSATION_ROUNDS", 30),
    speaker_selection_method=allowed_speaker_transitions_dict,
    allow_repeat_speaker=True,
)
