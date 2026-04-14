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
            human_input_mode="ALWAYS",
            system_message=(
                "You are a user proxy that collects user queries and passes them "
                "to the CentralAgent for analysis and task decomposition."
            ),
            llm_config={
                "config_list": [
                    {
                        "model": Config.Model,
                        "api_key": Config.api_key,
                        "base_url": Config.base_url,
                    }
                ],
                "timeout": 120,
            },
            description=(
                "User proxy: collects queries, surfaces clarification questions, "
                "and routes responses back into the conversation."
            ),
            code_execution_config={"use_docker": False, "work_dir": None},
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

        Priority:
        1. WebSocket handler stored in ``self.context``
        2. Automated mode (CI / testing)
        3. Console stdin (local dev)
        """
        ctx = getattr(self, "context", {})
        websocket_handler = ctx.get("websocket_handler")
        socketio = ctx.get("socketio")
        workflow_id = ctx.get("workflow_id")

        if websocket_handler and hasattr(websocket_handler, "request_user_input"):
            return self._get_input_via_websocket(
                prompt, websocket_handler, socketio, workflow_id
            )

        if self.automated_mode:
            logger.info("Automated mode: skipping human input.")
            return "Continue with the task."

        if prompt:
            self.console.print(f"[bold cyan]{prompt}[/bold cyan]")

        line = ""
        while not line:
            try:
                line = input("> ").strip()
            except EOFError:
                logger.warning("EOFError on stdin – returning empty string.")
                return ""
        return line

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

    def _handle_clarification(self, message, sender, config):
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
