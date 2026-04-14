"""
CentralAgent – analyses, plans, and evaluates every user request.

Responsibilities
----------------
1. Analyse the raw user input for implicit assumptions and gaps.
2. Ask clarifying questions when the request is ambiguous.
3. Transform the query into a precise, actionable specification.
4. Decompose the specification into ordered steps.
5. Evaluate LLM_Agent output and decide whether to iterate or advance.
"""

import json
import logging
from typing import Any, Dict, List

from autogen import ConversableAgent
from openai import OpenAI
from rich.console import Console
from rich.panel import Panel

from ..config import Config

logger = logging.getLogger(__name__)


class CentralAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="CentralAgent",
            system_message=(
                "You are the Central Agent. Coordinate analysis, clarification, "
                "task decomposition, transformation, and evaluation of all user "
                "queries with precision and reliability."
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
                "Central manager: analyses, clarifies, decomposes, transforms, "
                "and evaluates all user queries."
            ),
        )
        self.client = OpenAI(api_key=Config.api_key, base_url=Config.base_url)
        self.register_reply(
            trigger=self._always_true_trigger,
            reply_func=self.handle_message,
            position=0,
        )
        self.console = Console()
        self.state: Dict[str, Any] = {
            "user_input": "",
            "clarifications": [],
            "analysis": None,
            "transformed_query": "",
            "step_breakdown": None,
            "steps": {},
            "current_step_index": 0,
            "step_outputs": [],
            "evaluation_results": [],
        }

    # ------------------------------------------------------------------
    # Trigger
    # ------------------------------------------------------------------

    def _always_true_trigger(self, sender) -> bool:
        return True

    # ------------------------------------------------------------------
    # Main handler
    # ------------------------------------------------------------------

    def handle_message(self, *args, messages=None, sender=None, config=None, **kwargs):
        """Route the message to the appropriate handler based on sender.

        AutoGen calls reply functions as:
            reply_func(agent, messages=messages, sender=sender, config=config)
        so we accept those keyword arguments.
        """
        try:
            # Extract the last message from the messages list
            message = (messages or [{}])[-1] if messages else {}
            # In GroupChat, sender is always the GroupChatManager.
            # Use the message's 'name' field to identify the originating agent.
            last_msg_name = message.get("name", "")

            if last_msg_name == "LLM_Agent":
                return self._evaluate_implementation(message)
            else:
                # All other messages (UserProxyAgent, GroupChatManager, etc.)
                # are treated as user input to process.
                return self._process_user_input(message)
        except Exception as exc:
            logger.error(f"CentralAgent error: {exc}", exc_info=True)
            return True, {"role": "assistant", "content": f"Error: {exc}"}

    # ------------------------------------------------------------------
    # Step 1 – analyse user input
    # ------------------------------------------------------------------

    def _process_user_input(self, message: dict):
        ctx = getattr(self, "context", {})
        log = ctx.get("log_agent_message")
        wid = ctx.get("workflow_id", "")

        user_input = message.get("content", "")
        self.state["user_input"] = user_input

        # Stream status: analysing
        if log:
            log(wid, "CentralAgent", "🔍 Analysing your request…")

        analysis = self._analyze_input(user_input)
        self.state["analysis"] = analysis

        # Only request clarification for genuinely ambiguous complex tasks —
        # never for messages that are just vague (let the LLM handle those).
        if analysis.get("requires_clarification", False):
            questions = analysis.get("clarifying_questions", [])
            if questions:
                numbered = "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
                clarification_msg = f"To make sure I help you effectively, I have a few quick questions:\n\n{numbered}"
                if log:
                    log(wid, "CentralAgent", clarification_msg)
                self.state["clarifications"] = questions
                return True, {"role": "assistant", "content": clarification_msg}

        # Stream status: transforming query
        if log:
            log(wid, "CentralAgent", "✏️ Refining the specification…")

        transformed = self._transform_query(user_input)
        self.state["transformed_query"] = transformed

        # Stream status: decomposing
        if log:
            log(wid, "CentralAgent", "📋 Breaking the task into steps…")

        step_breakdown = self._decompose_steps(transformed)
        self.state["step_breakdown"] = step_breakdown
        self.state["steps"] = step_breakdown.get("steps", {})
        self.state["current_step_index"] = 0

        steps = self.state["steps"]
        goal = step_breakdown.get("goal", "Complete the task")
        step_lines = [
            f"  **Step {i+1}:** {desc[:120]}{'…' if len(desc) > 120 else ''}"
            for i, desc in enumerate(steps.values())
        ]
        step_summary = "\n".join(step_lines)

        plan_msg = f"**Goal:** {goal}\n\n**Plan:**\n{step_summary}"
        self.console.print(
            Panel(plan_msg, title="[bold green]Implementation Plan[/bold green]")
        )

        # Emit the full plan to the UI
        if log:
            log(wid, "CentralAgent", plan_msg)

        # Inject steps into agent context so LLM_Agent can iterate them
        ctx["steps"] = self.state["steps"]

        first_step = next(iter(steps.values()), transformed)
        return True, {"role": "assistant", "content": first_step}

    # ------------------------------------------------------------------
    # LLM helpers
    # ------------------------------------------------------------------

    def _analyze_input(self, user_input: str) -> Dict[str, Any]:
        prompt = f"""You are a task analyst. Analyse the user input below.

Return a JSON object:
{{
    "identified_assumptions": [str],
    "clarifying_questions": [str],
    "requires_clarification": bool
}}

Rules:
- Set "requires_clarification" to true ONLY when the request is genuinely ambiguous AND
  proceeding without answers would produce a clearly wrong result.
- Do NOT ask for clarification on short, conversational, or vague-but-acceptable inputs.
- Most requests should have "requires_clarification": false — default to false.
- Keep clarifying_questions to at most 2 targeted questions.

Input: {user_input}"""

        resp = self.client.chat.completions.create(
            model=Config.Model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )
        try:
            return json.loads(resp.choices[0].message.content)
        except (json.JSONDecodeError, AttributeError) as exc:
            logger.warning(f"Analysis JSON parse error: {exc}")
            return {"requires_clarification": False, "clarifying_questions": [], "identified_assumptions": []}

    def _transform_query(self, query: str) -> str:
        resp = self.client.chat.completions.create(
            model=Config.Model,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Transform the following request into a comprehensive, "
                        "actionable specification. Return only the specification.\n\n"
                        f"{query}"
                    ),
                }
            ],
            temperature=0.2,
            max_tokens=1000,
        )
        return resp.choices[0].message.content.strip()

    def _decompose_steps(self, transformed_query: str) -> Dict[str, Any]:
        prompt = f"""Break down this task into a JSON step plan:
{{
    "goal": "...",
    "steps": {{
        "step1": "...",
        "step2": "..."
    }}
}}

Task: {transformed_query}"""

        for attempt in range(3):
            resp = self.client.chat.completions.create(
                model=Config.Model,
                messages=[{"role": "system", "content": prompt}],
                temperature=0.2,
                max_tokens=4000,
                response_format={"type": "json_object"},
            )
            try:
                parsed = json.loads(resp.choices[0].message.content)
                if parsed and "steps" in parsed:
                    return parsed
            except (json.JSONDecodeError, AttributeError) as exc:
                logger.warning(f"Decompose JSON parse error (attempt {attempt+1}): {exc}")

        return {"goal": transformed_query, "steps": {"step1": transformed_query}}

    # ------------------------------------------------------------------
    # Step 2 – evaluate LLM output
    # ------------------------------------------------------------------

    def _evaluate_implementation(self, message: dict):
        implementation = message.get("content", "")
        idx = self.state["current_step_index"]
        step_keys = list(self.state["steps"].keys())

        if idx < len(step_keys):
            self.state["step_outputs"].append(
                {"step": step_keys[idx], "output": implementation}
            )

        evaluation = self._evaluate_output(implementation)
        self.state["evaluation_results"].append(
            {"step": step_keys[idx] if idx < len(step_keys) else "unknown", "evaluation": evaluation}
        )

        idx += 1
        self.state["current_step_index"] = idx

        if idx >= len(step_keys):
            return True, {
                "role": "assistant",
                "content": "All steps completed. Is there anything else you'd like me to help with?",
            }

        if evaluation.get("evaluation", {}).get("status") == "FAIL":
            fb = evaluation["evaluation"].get("feedback", {})
            issues = "\n".join(f"- {i}" for i in fb.get("issues", []))
            suggestions = "\n".join(f"- {s}" for s in fb.get("suggestions", []))
            return True, {
                "role": "assistant",
                "content": f"Issues found:\n{issues}\n\nSuggestions:\n{suggestions}\n\nPlease revise.",
            }

        next_step = self.state["steps"].get(step_keys[idx], "")
        return True, {"role": "assistant", "content": next_step}

    def _evaluate_output(self, implementation: str) -> Dict[str, Any]:
        prompt = f"""Evaluate this implementation and return JSON:
{{
    "evaluation": {{
        "status": "PASS" or "FAIL",
        "feedback": {{"issues": [], "suggestions": [], "missing_requirements": []}},
        "critical_concerns": []
    }}
}}

Implementation:
```
{implementation}
```"""

        for attempt in range(2):
            resp = self.client.chat.completions.create(
                model=Config.Model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000,
                response_format={"type": "json_object"},
            )
            try:
                return json.loads(resp.choices[0].message.content)
            except (json.JSONDecodeError, AttributeError) as exc:
                logger.warning(f"Evaluation JSON parse error (attempt {attempt+1}): {exc}")

        return {"evaluation": {"status": "PASS", "feedback": {}, "critical_concerns": []}}

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def _extract_json(self, text: str) -> Dict[str, Any] | None:
        """Extract the first JSON object found in *text*."""
        try:
            text = text.strip()
            for prefix in ("```json", "```"):
                if text.startswith(prefix):
                    text = text[len(prefix):]
            if text.endswith("```"):
                text = text[:-3]
            start, end = text.find("{"), text.rfind("}")
            if start >= 0 and end > start:
                return json.loads(text[start: end + 1])
            return json.loads(text)
        except Exception:
            logger.debug("Could not parse JSON from LLM output.")
            return None
