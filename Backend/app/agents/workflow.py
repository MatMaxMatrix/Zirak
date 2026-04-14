"""
workflow.py – orchestrates the multi-agent conversation for one user request.

The function is intentionally synchronous so it integrates safely with
Flask-SocketIO's eventlet-based background tasks (eventlet and asyncio
have known conflicts when nested).
"""

import logging
import time
import traceback
import uuid

from autogen import GroupChatManager
from dotenv import load_dotenv
from rich.console import Console

from ..config import Config
from .agent_manager import UserProxyAgent, group_chat

load_dotenv()

logger = logging.getLogger(__name__)
console = Console()

_MANAGER_LLM_CONFIG = {
    "config_list": [
        {
            "model": Config.Model,
            "api_key": Config.api_key,
            "base_url": Config.base_url,
        }
    ],
    "timeout": 120,
}


def conversation_workflow(user_input: str, context: dict) -> tuple[bool, str]:
    """
    Run the multi-agent conversation for *user_input*.

    Parameters
    ----------
    user_input:
        Raw message from the user.
    context:
        Runtime dict from the SocketIO server containing:
        - ``workflow_id``                  UUID string
        - ``socketio``                     Flask-SocketIO instance
        - ``sid``                          Client session ID
        - ``log_agent_message``            callable(wid, agent, msg)
        - ``add_to_conversation_history``  callable(wid, role, msg)
        - ``get_user_input``               callable(wid, prompt)

    Returns
    -------
    (success, message)
    """
    workflow_id = context.get("workflow_id", str(uuid.uuid4()))
    add_history = context.get("add_to_conversation_history")
    start = time.time()

    try:
        logger.info(f"[{workflow_id}] Workflow started – {user_input[:80]!r}")

        if add_history:
            add_history(workflow_id, "system", "Workflow started.")

        # Inject runtime context so agents can emit WebSocket events
        for agent in group_chat.agents:
            agent.context = context

        # Reset group chat state for this conversation
        group_chat.reset()
        group_chat.messages = []

        manager = GroupChatManager(
            groupchat=group_chat,
            is_termination_msg=lambda x: "TERMINATE" in x.get("content", ""),
            llm_config=_MANAGER_LLM_CONFIG,
            max_consecutive_auto_reply=getattr(Config, "MAX_CONSECUTIVE_AUTO_REPLY", 10),
        )

        UserProxyAgent.initiate_chat(
            manager,
            message=user_input,
            clear_history=True,
            silent=False,
        )

        # Grab the last message as the final response
        final = ""
        if getattr(group_chat, "messages", None):
            last = group_chat.messages[-1]
            final = last.get("content", "") if isinstance(last, dict) else str(last)

        elapsed = time.time() - start
        logger.info(f"[{workflow_id}] Completed in {elapsed:.2f}s")
        return True, final or "Workflow completed successfully."

    except Exception as exc:
        elapsed = time.time() - start
        msg = f"Workflow error after {elapsed:.2f}s: {exc}"
        logger.error(f"[{workflow_id}] {msg}\n{traceback.format_exc()}")
        console.print(f"[bold red]{msg}[/bold red]")
        return False, msg
