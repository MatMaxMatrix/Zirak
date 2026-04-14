"""
UserProxyAgent – user-facing proxy for the AutoGen group chat.

Collects user input (via WebSocket in production, or stdin locally),
surfaces clarification questions, and injects responses back into the
conversation.
"""

import logging
import traceback
from datetime import datetime

from autogen import UserProxyAgent as _AutoGenUserProxy
from rich.console import Console
from rich.panel import Panel

from ..config import Config

logger = logging.getLogger(__name__)


class UserProxyAgent(_AutoGenUserProxy):
    """Extended UserProxyAgent with WebSocket-aware human input."""

    def __init__(self):
        super().__init__(
            name="UserProxyAgent",
            human_input_mode="NEVER",
            system_message=(
                "You are a user proxy that collects user queries and passes them "
                "to the CentralAgent for analysis and task decomposition."
            ),
            # No LLM — this agent is a pure pass-through; it never generates AI
            # responses autonomously.  Giving it an LLM causes infinite back-and-forth
            # loops with CentralAgent when human_input_mode="NEVER".
            llm_config=False,
            description=(
                "User proxy: collects queries, surfaces clarification questions, "
                "and routes responses back into the conversation."
            ),
            code_execution_config=False,
        )
        self.console = Console()
        self.automated_mode = False
        self.input_timeout = 300  # seconds

        self.register_reply(
            trigger=self._needs_clarification,
            reply_func=self._handle_clarification,
            position=0,
        )

    # ------------------------------------------------------------------
    # Trigger
    # ------------------------------------------------------------------

    def _needs_clarification(self, sender) -> bool:
        ctx = getattr(self, "context", {})
        return bool(ctx.get("requires_clarification", False))

    # ------------------------------------------------------------------
    # Human input (WebSocket-aware)
    # ------------------------------------------------------------------

    def get_human_input(self, prompt: str = "") -> str:
        """
        Return human input.

        In web/WebSocket mode (context has 'get_user_input') this is not
        called during normal workflow runs (human_input_mode="NEVER").
        It is only reached if AutoGen explicitly requests input.
        """
        ctx = getattr(self, "context", {})
        get_user_input = ctx.get("get_user_input")
        socketio_instance = ctx.get("socketio")
        workflow_id = ctx.get("workflow_id")
        sid = ctx.get("sid")

        # WebSocket path: emit user_input_required and wait via eventlet
        if get_user_input and workflow_id:
            import eventlet
            logger.info(f"Requesting user input via WebSocket: {prompt}")
            get_user_input(workflow_id, prompt)

            # Poll for response (eventlet-friendly, won't block other greenlets)
            deadline = eventlet.getcurrent() and 300  # 5 minute timeout
            elapsed = 0
            poll_interval = 0.5
            while elapsed < 300:
                eventlet.sleep(poll_interval)
                elapsed += poll_interval
                # The user_input_queue is managed by socket.py; check via context
                user_response = ctx.get("_pending_user_input")
                if user_response is not None:
                    ctx["_pending_user_input"] = None
                    return user_response

            logger.warning("Timed out waiting for user input via WebSocket.")
            return "Continue with the current task."

        # Fallback: automated / non-web mode
        logger.info("No WebSocket context – returning default automated reply.")
        return "Continue with the task."

    def _get_input_via_websocket(
        self, prompt: str, handler, socketio, workflow_id: str | None
    ) -> str:
        import asyncio

        if hasattr(handler, "user_input_event"):
            handler.user_input_event.clear()

        handler.request_user_input(prompt)

        if socketio and workflow_id:
            socketio.emit(
                "user_input_required",
                {"workflow_id": workflow_id, "prompt": prompt, "timestamp": datetime.now().isoformat()},
            )

        loop = asyncio.get_event_loop()
        future = asyncio.run_coroutine_threadsafe(
            handler.wait_for_user_input(prompt), loop
        )
        try:
            return future.result(timeout=self.input_timeout)
        except Exception as exc:
            logger.error(f"WebSocket input error: {exc}")
            return "Timed out waiting for input. Please try again."

    # ------------------------------------------------------------------
    # Clarification handler
    # ------------------------------------------------------------------

    def _handle_clarification(self, *args, messages=None, sender=None, config=None, **kwargs):
        ctx = getattr(self, "context", {})
        questions = ctx.get("clarifying_questions", [])

        if not questions:
            return False, None

        self.console.print(
            Panel(
                "[bold blue]Clarification needed before I can proceed.[/bold blue]",
                title="Clarification",
                border_style="blue",
            )
        )

        qa_pairs = []
        for i, question in enumerate(questions, 1):
            self.console.print(f"[cyan]Question {i}/{len(questions)}[/cyan]")
            try:
                answer = self.get_human_input(question) or "No answer provided."
            except Exception as exc:
                logger.error(f"Clarification input error: {exc}")
                answer = "Error getting input."
            qa_pairs.append(f"Q: {question}  A: {answer}")

        summary = " | ".join(qa_pairs)
        existing = ctx.get("clarifications", "")
        ctx["clarifications"] = f"{existing}\n{summary}".strip() if existing else summary
        self.context = ctx

        return True, {
            "role": "user",
            "content": f"Clarifications:\n{summary}\n\nPlease proceed.",
        }
