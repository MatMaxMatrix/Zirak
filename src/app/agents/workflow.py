"""
workflow.py — Zirak conversation engine.

Three tiers, chosen per message:

  1. Conversational  – greetings, capability questions, small-talk.
                       One direct LLM call, no tools, <1 s response.

  2. Simple task     – well-defined single-step requests.
                       LLM_Agent with full MCP tool access, no pre-planning.

  3. Complex task    – multi-step, research, or build tasks.
                       Explicit think → plan → execute with tool calls,
                       every step streamed to the UI in real time.

The function is synchronous so it integrates with Flask-SocketIO's
eventlet background tasks.  Async agent work runs in a dedicated OS
thread with its own event loop to avoid eventlet/asyncio conflicts.
"""

import asyncio
import logging
import re
import time
import traceback
import uuid

from dotenv import load_dotenv
from openai import OpenAI

from ..config import Config

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Shared LLM client (sync, for fast-path calls only)
# ---------------------------------------------------------------------------

_client = OpenAI(api_key=Config.api_key, base_url=Config.base_url)

# ---------------------------------------------------------------------------
# Tier 1 — conversational fast-path
# ---------------------------------------------------------------------------

_CONVO_RE = re.compile(
    r"^("
    r"hi+|hello+|hey+|howdy|greetings|"
    r"good\s*(morning|afternoon|evening|night|day)|"
    r"how are (you|things|it going)\??|what'?s up\??|wassup|sup\b|yo+|"
    r"thank(s| you)(\s+so\s+much|\s+a\s+lot|\s+very\s+much)?[!.]?|"
    r"(bye|goodbye|see\s+ya|later|cya)\b[!.]?|"
    r"ok(ay)?[.!]?|sure[.!]?|yes[.!]?|no[.!]?|agreed?[.!]?|"
    r"what can you (do|help (with|me with)?)\??|"
    r"who are you\??|what are you\??|what is zirak\??|"
    r"can you help( me)?\??|help\??|"
    r"(nice|great|awesome|cool|perfect|good\s+job|well\s+done|excellent)[!.]?|"
    r"tell me (about yourself|what you can do)|"
    r"what('?s| is) your (name|purpose|function)\??"
    r")\s*[!?.,]*$",
    re.IGNORECASE,
)

_ZIRAK_SYSTEM = (
    "You are Zirak, an AI-powered development platform assistant. "
    "You help users with software engineering, coding, research, data analysis, "
    "web scraping, file operations, terminal commands, and complex multi-step tasks. "
    "You have access to MCP tools: terminal, file creation/editing, web browsing, "
    "package management, code execution, DuckDuckGo search, and more. "
    "For conversational messages respond warmly and briefly (1-3 sentences). "
    "When relevant, hint at what you can help with."
)


def _is_conversational(text: str) -> bool:
    t = text.strip()
    return len(t.split()) <= 10 and bool(_CONVO_RE.match(t))


def _convo_response(user_input: str, context: dict, session_history: list) -> str:
    """Single LLM turn for conversational messages — no tools, fast."""
    wid = context.get("workflow_id", "")
    add_history = context.get("add_to_conversation_history")

    messages = [{"role": "system", "content": _ZIRAK_SYSTEM}]
    # Carry the last few turns for context
    for turn in session_history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_input})

    try:
        resp = _client.chat.completions.create(
            model=Config.Model,
            messages=messages,
            max_tokens=300,
            temperature=0.7,
        )
        reply = resp.choices[0].message.content.strip()
    except Exception as exc:
        logger.error(f"Convo response error: {exc}")
        reply = "Hey! I'm Zirak, your AI dev assistant. What can I help you build today?"

    # Do NOT emit here — _run_workflow in socket.py emits the final reply
    # via conversation_update so there is exactly one message per response.
    return reply


# ---------------------------------------------------------------------------
# Tier 2 & 3 — task execution via LLM_Agent
# ---------------------------------------------------------------------------

_COMPLEX_KEYWORDS = {
    "build", "create", "implement", "develop", "analyze", "analyse",
    "research", "scrape", "generate", "write", "fix", "debug", "deploy",
    "design", "script", "automate", "extract", "parse", "process",
    "calculate", "compare", "summarize", "summarise", "find information",
    "search for", "fetch", "install", "setup", "configure", "test",
    "optimize", "refactor", "explain in detail", "walk me through",
    "step by step", "how do i", "how to", "can you build", "can you write",
    "make me", "make a", "create a", "build a", "give me a",
}


def _is_complex(text: str) -> bool:
    """Return True when the request warrants explicit planning."""
    t = text.lower().strip()
    if len(t.split()) > 25:
        return True
    return any(kw in t for kw in _COMPLEX_KEYWORDS)


def _get_llm_agent():
    """Return the LLM_agent singleton — imported lazily to allow startup ordering."""
    from .agent_manager import LLM_agent  # already in sys.modules after startup
    return LLM_agent


async def _run_agent(user_input: str, context: dict, session_history: list) -> str:
    """Async: classify, optionally plan, then execute with LLM_Agent."""
    LLM_agent = _get_llm_agent()

    log = context.get("log_agent_message")
    wid = context.get("workflow_id", "")

    # Ensure MCP connection
    await LLM_agent.connect_to_mcp_server()

    # Inject session history so the agent has conversation context
    LLM_agent.conversation_history = [
        {"role": m["role"], "content": m["content"]}
        for m in session_history
    ]

    if _is_complex(user_input):
        # ── Thinking / planning phase ──────────────────────────────────────
        if log:
            log(wid, "Zirak", "🤔 Thinking through this…")

        try:
            plan_resp = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: _client.chat.completions.create(
                    model=Config.Model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a concise planning assistant. "
                                "Given the user's request, outline your approach "
                                "in 3-5 numbered steps. Be specific and actionable. "
                                "Start with: **Here's my plan:**"
                            ),
                        },
                        {"role": "user", "content": user_input},
                    ],
                    max_tokens=300,
                    temperature=0.2,
                ),
            )
            plan_text = plan_resp.choices[0].message.content.strip()
        except Exception as exc:
            logger.warning(f"Planning step error: {exc}")
            plan_text = None

        if log and plan_text:
            log(wid, "Zirak", plan_text)

    # ── Execution phase ────────────────────────────────────────────────────
    if log:
        log(wid, "Zirak", "⚙️ Working on it…")

    response = await LLM_agent.chat(user_input)

    # Persist updated history so the next turn has context
    context["updated_session_history"] = list(LLM_agent.conversation_history)

    return response or "I've completed the task. Let me know if you need anything else."


def _execute_task(user_input: str, context: dict, session_history: list) -> str:
    """Synchronous wrapper — submits work to the shared persistent event loop."""
    from .async_runner import run_async
    return run_async(_run_agent(user_input, context, session_history))


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def conversation_workflow(user_input: str, context: dict) -> tuple[bool, str]:
    """
    Process one user turn.

    Parameters
    ----------
    user_input : str
        The message from the user.
    context : dict
        Runtime context injected by socket.py:
          workflow_id, socketio, sid,
          log_agent_message, add_to_conversation_history,
          get_user_input, session_history
    """
    workflow_id = context.get("workflow_id", str(uuid.uuid4()))
    add_history = context.get("add_to_conversation_history")
    log_agent = context.get("log_agent_message")
    session_history: list = context.get("session_history", [])
    start = time.time()

    try:
        logger.info(f"[{workflow_id}] Message received – {user_input[:80]!r}")

        # ── Tier 1: conversational ─────────────────────────────────────────
        if _is_conversational(user_input):
            logger.info(f"[{workflow_id}] Tier-1 conversational path")
            reply = _convo_response(user_input, context, session_history)
            return True, reply

        # ── Tier 2 / 3: task execution ─────────────────────────────────────
        logger.info(
            f"[{workflow_id}] Tier-{'3 complex' if _is_complex(user_input) else '2 simple'} path"
        )

        reply = _execute_task(user_input, context, session_history)

        elapsed = time.time() - start
        logger.info(f"[{workflow_id}] Completed in {elapsed:.2f}s")
        return True, reply

    except Exception as exc:
        elapsed = time.time() - start
        msg = f"Error after {elapsed:.2f}s: {exc}"
        logger.error(f"[{workflow_id}] {msg}\n{traceback.format_exc()}")

        if add_history:
            add_history(workflow_id, "system", f"Error: {exc}", "System")

        return False, f"Something went wrong: {exc}"
