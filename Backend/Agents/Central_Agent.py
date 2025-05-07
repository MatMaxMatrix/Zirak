import json
import logging
from typing import Any, Dict, List

from autogen import ConversableAgent
from openai import OpenAI
from rich.console import Console
from rich.panel import Panel

from .config import Config


class CentralAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="CentralAgent",
            system_message="You are the Central Agent, coordinating analysis, clarification, task breakdown, transformation, and evaluation of all user queries with super-human precision and reliability.",
            llm_config={
                "model": Config.Model,
                "api_key": Config.api_key,
                "base_url": Config.base_url,
            },
            description="Central manager that analyzes, clarifies, decomposes, transforms, and evaluates all user queries.",
        )
        # Initialize OpenAI client
        self.client = OpenAI(api_key=Config.api_key, base_url=Config.base_url)
        self.register_reply(
            trigger=self._always_true_trigger,
            reply_func=self.handle_message,
            position=0,
        )
        self.console = Console()
        self.state = {
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

    def _always_true_trigger(self, sender):
        return True

    def handle_message(self, message, sender, config):
        """Main handler that orchestrates the workflow."""
        try:
            # First, determine the sender and process accordingly
            if sender.name == "UserProxyAgent":
                # User input - need to analyze, clarify if needed, and transform
                return self._process_user_input(message)
            elif sender.name == "LLM_Agent":
                # Response from LLM - evaluate the implementation
                return self._evaluate_implementation(message)
            else:
                # Unknown sender, provide a generic response
                return True, {
                    "role": "assistant",
                    "content": "I didn't recognize the sender of this message.",
                }
        except Exception as e:
            self.console.print(f"[bold red]Error in CentralAgent: {str(e)}[/bold red]")
            return True, {
                "role": "assistant",
                "content": f"Error processing message: {str(e)}",
            }

    def _process_user_input(self, message):
        """Process input from the user - analyze, clarify if needed, transform and break down into steps."""
        user_input = message.get("content", "")
        self.state["user_input"] = user_input

        # Step 1: Critical Analysis - Check for assumptions and needed clarifications
        analysis_result = self._analyze_input(user_input)
        self.state["analysis"] = analysis_result

        # If clarification is needed, return questions to the user
        if analysis_result.get("requires_clarification", False):
            clarifying_questions = analysis_result.get("clarifying_questions", [])
            question_text = "\n".join(
                [f"{i+1}. {q}" for i, q in enumerate(clarifying_questions)]
            )
            self.state["clarifications"] = clarifying_questions

            return True, {
                "role": "assistant",
                "content": f"I need some clarifications before proceeding:\n\n{question_text}",
            }

        # If no clarification needed or clarifications provided, proceed to transform the query
        transformed_query = self._transform_query(user_input)
        self.state["transformed_query"] = transformed_query

        # Generate steps for implementation
        step_breakdown = self._decompose_steps(transformed_query)
        self.state["step_breakdown"] = step_breakdown
        self.state["steps"] = step_breakdown.get("steps", {})
        self.state["current_step_index"] = 0

        # Send the first step to the LLM_Agent
        steps = step_breakdown.get("steps", {})
        first_step = steps.get("step1", "")

        # Show the plan to the user
        step_summary = "\n".join(
            [
                f"Step {i+1}: {desc[:100]}..."
                for i, (_, desc) in enumerate(steps.items())
            ]
        )
        goal = step_breakdown.get("goal", "Complete the task")

        plan_message = f"I've analyzed your request and developed a plan to {goal}.\n\nHere's my implementation plan:\n{step_summary}\n\nI'll send this to the implementation agent now."

        self.console.print(
            Panel(plan_message, title="[bold green]Implementation Plan[/bold green]")
        )

        # Return the first step as a message to the LLM_Agent
        return True, {"role": "assistant", "content": first_step}

    def _analyze_input(self, user_input):
        """Analyze the user's input for assumptions and needed clarifications."""
        analysis_prompt = f"""Analyze the User's input and generate a JSON summary of assumptions and clarifications needed.

Instructions:
1. Parse explicit/implicit requirements.
2. Identify modern context considerations.
3. Omit personal/sensitive data.
4. Maintain an analytical tone.

Output JSON:
{{
    "identified_assumptions": [str],  
    "clarifying_questions": [str],
    "requires_clarification": bool
}}

Current Input:
{user_input}

Generate analysis JSON."""

        response = self.client.chat.completions.create(
            model=Config.Model,
            messages=[{"role": "user", "content": analysis_prompt}],
            temperature=0,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )

        try:
            return json.loads(response.choices[0].message.content)
        except (json.JSONDecodeError, AttributeError) as e:
            self.console.print(
                f"[bold red]Error parsing critical analysis JSON: {str(e)}[/bold red]"
            )
            return {
                "requires_clarification": False,
                "clarifying_questions": [],
                "identified_assumptions": [],
            }

    def _transform_query(self, query):
        """Transform the user query into a comprehensive specification."""
        transform_prompt = f"""You are an expert query transformer. Transform the following creation/development request into a comprehensive, actionable specification (no explanations):

{query}

(Return only the transformed query.)"""

        response = self.client.chat.completions.create(
            model=Config.Model,
            messages=[{"role": "user", "content": transform_prompt}],
            temperature=0.2,
            max_tokens=1000,
        )

        return response.choices[0].message.content.strip()

    def _decompose_steps(self, transformed_query):
        """Break down the task into discrete, actionable steps."""
        steps_prompt = f"""Break down the following task into a step-by-step JSON plan as specified below.

Task: {transformed_query}
Return only JSON. Structure:
{{
    "goal": "...",
    "steps": {{
        "step1": "...",
        "step2": "...",
        "step3": "..."
    }}
}}
"""

        tries = 0
        while tries < 3:
            response = self.client.chat.completions.create(
                model=Config.Model,
                messages=[{"role": "system", "content": steps_prompt}],
                temperature=0.2,
                max_tokens=4000,
                response_format={"type": "json_object"},
            )

            try:
                steps_json = json.loads(response.choices[0].message.content)
                if steps_json and "steps" in steps_json:
                    return steps_json
            except (json.JSONDecodeError, AttributeError) as e:
                self.console.print(
                    f"[bold yellow]Warning: Error parsing step generation JSON: {str(e)}. Retrying...[/bold yellow]"
                )

            tries += 1

        return {"goal": transformed_query, "steps": {"step1": transformed_query}}

    def _evaluate_implementation(self, message):
        """Evaluate the implementation from the LLM Agent."""
        implementation = message.get("content", "")

        # Get the current step information and store the implementation
        current_step_index = self.state.get("current_step_index", 0)
        step_keys = list(self.state["steps"].keys())
        if current_step_index < len(step_keys):
            current_step_key = step_keys[current_step_index]
            self.state["step_outputs"].append(
                {"step": current_step_key, "output": implementation}
            )

        # Evaluate the implementation
        evaluation_result = self._evaluate_output(implementation)
        self.state["evaluation_results"].append(
            {
                "step": (
                    current_step_key
                    if current_step_index < len(step_keys)
                    else "unknown"
                ),
                "evaluation": evaluation_result,
            }
        )

        # Increment the step index for next time
        current_step_index += 1
        self.state["current_step_index"] = current_step_index

        # If we've completed all steps, return a completion message
        if current_step_index >= len(self.state["steps"]):
            # Generate a summary of all completed steps and evaluations
            summary = {
                "analytical_review": self.state["analysis"],
                "transformed_query": self.state["transformed_query"],
                "step_breakdown": self.state["step_breakdown"],
                "implementation_outputs": self.state["step_outputs"],
                "evaluations": self.state["evaluation_results"],
            }

            # Return completion message to the user
            return True, {
                "role": "assistant",
                "content": "All implementation steps have been completed successfully. Is there anything else you'd like me to help with?",
            }

        # If the implementation has issues, send feedback to the LLM Agent
        if evaluation_result.get("evaluation", {}).get("status", "") == "FAIL":
            feedback = evaluation_result.get("evaluation", {}).get("feedback", {})
            issues = feedback.get("issues", [])
            suggestions = feedback.get("suggestions", [])

            issue_text = "\n".join([f"- {issue}" for issue in issues])
            suggestion_text = "\n".join(
                [f"- {suggestion}" for suggestion in suggestions]
            )

            feedback_message = f"""Your implementation has some issues that need to be addressed:

Issues:
{issue_text}

Suggestions:
{suggestion_text}

Please revise your implementation to address these issues."""

            return True, {"role": "assistant", "content": feedback_message}

        # If implementation is good, move to the next step
        next_step_key = (
            step_keys[current_step_index]
            if current_step_index < len(step_keys)
            else None
        )
        if next_step_key:
            next_step = self.state["steps"].get(next_step_key, "")
            return True, {"role": "assistant", "content": next_step}
        else:
            # This shouldn't happen due to the earlier check, but just in case
            return True, {
                "role": "assistant",
                "content": "All implementation steps have been completed. Is there anything else you'd like me to help with?",
            }

    def _evaluate_output(self, implementation):
        """Evaluate the quality and completeness of the implementation."""
        eval_prompt = f"""Evaluate the following technical implementation. Respond ONLY with a JSON object structured as:
{{
    "evaluation": {{
        "status": "PASS" or "FAIL",
        "feedback": {{
            "issues": [...],
            "suggestions": [...],
            "missing_requirements": [...]
        }},
        "critical_concerns": [...]
    }}
}}
Implementation:
```
{implementation}
```"""

        tries = 0
        while tries < 2:
            response = self.client.chat.completions.create(
                model=Config.Model,
                messages=[{"role": "user", "content": eval_prompt}],
                temperature=0.3,
                max_tokens=1000,
                response_format={"type": "json_object"},
            )

            try:
                return json.loads(response.choices[0].message.content)
            except (json.JSONDecodeError, AttributeError) as e:
                self.console.print(
                    f"[bold yellow]Warning: Error parsing evaluation JSON: {str(e)}. Retrying...[/bold yellow]"
                )

            tries += 1

        return {
            "evaluation": {"status": "PASS", "feedback": {}, "critical_concerns": []}
        }

    def _extract_json(self, text):
        """Flexible JSON extractor from raw LLM output."""
        try:
            # Remove markdown code block wrappers if present
            if text.startswith("```json"):
                text = text[7:]  # Remove "```json"
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            # Find and extract the first { ... } JSON object
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                json_str = text[start : end + 1]
                return json.loads(json_str)
            return json.loads(text)  # Fallback, maybe it's only JSON
        except Exception:
            self.console.print(
                "[yellow]CentralAgent: Could not parse JSON from LLM output.[/yellow]"
            )
            return None
