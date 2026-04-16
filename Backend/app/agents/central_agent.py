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

    def handle_message(self, message, sender, config):
        """Route the message to the appropriate handler based on sender."""
        try:
            sender_name = getattr(sender, "name", "")
            if sender_name == "UserProxyAgent":
                return self._process_user_input(message)
            elif sender_name == "LLM_Agent":
                return self._evaluate_implementation(message)
            return True, {
                "role": "assistant",
                "content": f"Unrecognised sender: {sender_name}",
            }
        except Exception as exc:
            logger.error(f"CentralAgent error: {exc}", exc_info=True)
            return True, {"role": "assistant", "content": f"Error: {exc}"}

    # ------------------------------------------------------------------
    # Step 1 – analyse user input
    # ------------------------------------------------------------------

    def _emit_step(self, message: str, status: str = "complete") -> None:
        """Emit a workflow panel step via context if available."""
        ctx = getattr(self, "context", None)
        if not ctx:
            return
        emit_fn = ctx.get("emit_workflow_step")
        wid = ctx.get("workflow_id", "")
        if emit_fn and wid:
            emit_fn(wid, "CentralAgent", message, status)

    def _process_user_input(self, message: dict):
        user_input = message.get("content", "")
        self.state["user_input"] = user_input

        self._emit_step("🔍 Analysing your request…", "active")
        analysis = self._analyze_input(user_input)
        self.state["analysis"] = analysis

        if analysis.get("requires_clarification", False):
            questions = analysis.get("clarifying_questions", [])
            numbered = "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
            self.state["clarifications"] = questions
            self._emit_step(f"❓ Clarification needed ({len(questions)} questions)", "complete")
            return True, {
                "role": "assistant",
                "content": f"I need some clarifications:\n\n{numbered}",
            }

        self._emit_step("📐 Transforming request into actionable spec…", "active")
        transformed = self._transform_query(user_input)
        self.state["transformed_query"] = transformed

        self._emit_step("📋 Decomposing into steps…", "active")
        step_breakdown = self._decompose_steps(transformed)
        self.state["step_breakdown"] = step_breakdown
        self.state["steps"] = step_breakdown.get("steps", {})
        self.state["current_step_index"] = 0

        steps = self.state["steps"]
        first_step = next(iter(steps.values()), transformed)
        goal = step_breakdown.get("goal", "Complete the task")
        step_summary = "\n".join(
            f"Step {i+1}: {desc[:80]}{'…' if len(desc) > 80 else ''}"
            for i, desc in enumerate(steps.values())
        )
        self.console.print(
            Panel(
                f"Goal: {goal}\n\n{step_summary}",
                title="[bold green]Implementation Plan[/bold green]",
            )
        )
        # Emit the full plan as a single step card in the UI
        plan_text = f"📋 Plan — {len(steps)} step{'s' if len(steps) != 1 else ''}: {goal}\n{step_summary}"
        self._emit_step(plan_text, "complete")
        return True, {"role": "assistant", "content": first_step}

    # ------------------------------------------------------------------
    # LLM helpers
    # ------------------------------------------------------------------

    def _analyze_input(self, user_input: str) -> Dict[str, Any]:
        prompt = f"""Analyse the user input and return a JSON object:
{{
    "identified_assumptions": [str],
    "clarifying_questions": [str],
    "requires_clarification": bool
}}

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

        self._emit_step(f"🔎 Evaluating step {idx + 1} output…", "active")
        evaluation = self._evaluate_output(implementation)
        self.state["evaluation_results"].append(
            {"step": step_keys[idx] if idx < len(step_keys) else "unknown", "evaluation": evaluation}
        )

        eval_status = evaluation.get("evaluation", {}).get("status", "PASS")
        self._emit_step(
            f"{'✅' if eval_status == 'PASS' else '⚠️'} Step {idx + 1} evaluation: {eval_status}",
            "complete",
        )

        idx += 1
        self.state["current_step_index"] = idx

        if idx >= len(step_keys):
            self._emit_step("🎉 All steps completed", "complete")
            return True, {
                "role": "assistant",
                "content": "All steps completed. Is there anything else you'd like me to help with?",
            }

        if eval_status == "FAIL":
            fb = evaluation["evaluation"].get("feedback", {})
            issues = "\n".join(f"- {i}" for i in fb.get("issues", []))
            suggestions = "\n".join(f"- {s}" for s in fb.get("suggestions", []))
            return True, {
                "role": "assistant",
                "content": f"Issues found:\n{issues}\n\nSuggestions:\n{suggestions}\n\nPlease revise.",
            }

        next_step = self.state["steps"].get(step_keys[idx], "")
        self._emit_step(f"⚙️ Executing step {idx + 1}/{len(step_keys)}: {next_step[:80]}{'…' if len(next_step) > 80 else ''}", "active")
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
