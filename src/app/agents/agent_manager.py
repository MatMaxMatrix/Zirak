"""
Agent manager — creates singletons and wires up the MCPManager.

Imported eagerly at app startup (src/app/__init__.py) so that:
  • Heavy imports happen before the first request arrives.
  • MCPManager is started in the main thread (not inside the persistent
    event loop) which avoids run_coroutine_threadsafe deadlocks.
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

# ── Start the persistent event loop and MCP connection ───────────────────────
# This runs in the main thread at startup — safe to use run_coroutine_threadsafe.
from .async_runner import start_mcp_manager  # noqa: E402

try:
    start_mcp_manager(Config.MCP_SERVER_URL)
    logger.info("MCPManager worker task scheduled.")
except Exception as exc:
    logger.warning(f"MCPManager scheduling failed: {exc}")

# ── Agent singletons ─────────────────────────────────────────────────────────
try:
    UserProxyAgent = UserProxyAgentClass()
    LLM_agent = LLM_Agent(mcp_server_url=Config.MCP_SERVER_URL)
    CentralAgent = CentralAgentClass()
except Exception as exc:
    logger.error(f"Failed to initialise agents: {exc}", exc_info=True)
    raise

# ── AutoGen group chat (used only if GroupChat routing is needed) ─────────────
agents = [UserProxyAgent, CentralAgent, LLM_agent]

allowed_speaker_transitions_dict = {
    UserProxyAgent: [CentralAgent],
    CentralAgent: [LLM_agent],
    LLM_agent: [CentralAgent, UserProxyAgent],
}

group_chat = GroupChat(
    agents=agents,
    messages=[],
    max_round=getattr(Config, "MAX_CONVERSATION_ROUNDS", 30),
    speaker_selection_method="auto",
    allowed_or_disallowed_speaker_transitions=allowed_speaker_transitions_dict,
    speaker_transitions_type="allowed",
    allow_repeat_speaker=None,
)
