"""
Agent manager: constructs the AutoGen group chat used by the workflow.

All agents are created once at import time (module-level singletons).
For per-request isolation, instantiate inside workflow.py instead.
"""

import logging

from autogen import GroupChat
from rich.console import Console

from ..config import Config
from .user_proxy_agent import UserProxyAgent as UserProxyAgentClass
from .llm_agent import LLM_Agent
from .central_agent import CentralAgent as CentralAgentClass

logger = logging.getLogger(__name__)
console = Console()

# ---------------------------------------------------------------------------
# Agent instances
# ---------------------------------------------------------------------------
try:
    UserProxyAgent = UserProxyAgentClass()
    LLM_agent = LLM_Agent(mcp_server_url=Config.MCP_SERVER_URL)
    CentralAgent = CentralAgentClass()
except Exception as exc:
    logger.error(f"Failed to initialise agents: {exc}", exc_info=True)
    raise

agents = [UserProxyAgent, CentralAgent, LLM_agent]

allowed_speaker_transitions_dict = {
    UserProxyAgent: [CentralAgent],
    CentralAgent: [LLM_agent, UserProxyAgent],
    LLM_agent: [CentralAgent, UserProxyAgent],
}

# ---------------------------------------------------------------------------
# Group chat
# ---------------------------------------------------------------------------
group_chat = GroupChat(
    agents=agents,
    messages=[],
    max_round=getattr(Config, "MAX_CONVERSATION_ROUNDS", 30),
    speaker_selection_method="auto",
    allowed_or_disallowed_speaker_transitions=allowed_speaker_transitions_dict,
    speaker_transitions_type="allowed",
    allow_repeat_speaker=None,
)
