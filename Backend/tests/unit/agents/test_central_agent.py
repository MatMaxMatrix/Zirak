"""
Unit tests for CentralAgent.

All OpenAI calls are intercepted by the ``mock_openai`` fixture so these
tests run offline and without consuming quota.
"""

import json
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_agent(monkeypatch):
    """Return a CentralAgent with OpenAI stubbed out."""

    class _Msg:
        def __init__(self, content):
            self.content = content

    class _Choice:
        def __init__(self, content):
            self.message = _Msg(content)

    class _Resp:
        def __init__(self, content):
            self.choices = [_Choice(content)]

    class _Chat:
        _next = "{}"

        @property
        def completions(self):
            return self

        def create(self, **kwargs):
            return _Resp(self._next)

    class _Client:
        def __init__(self, **kw):
            pass

        chat = _Chat()

    import openai
    monkeypatch.setattr(openai, "OpenAI", lambda **kw: _Client())

    # Also prevent autogen from connecting to the LLM during init
    import autogen
    monkeypatch.setattr(
        autogen.ConversableAgent,
        "__init__",
        lambda self, *a, **kw: object.__setattr__(self, "_init_called", True),
    )

    from app.agents.central_agent import CentralAgent
    agent = CentralAgent.__new__(CentralAgent)
    # Manually init the non-autogen parts
    agent.client = _Client()
    agent.console = __import__("rich.console", fromlist=["Console"]).Console()
    agent.state = {
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
    return agent, _Client.chat


# ---------------------------------------------------------------------------
# _analyze_input
# ---------------------------------------------------------------------------


class TestAnalyzeInput:
    def test_returns_dict_on_valid_json(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = json.dumps(
            {
                "requires_clarification": False,
                "clarifying_questions": [],
                "identified_assumptions": ["User wants Python"],
            }
        )
        result = agent._analyze_input("Build a CLI tool in Python")

        assert isinstance(result, dict)
        assert result["requires_clarification"] is False
        assert "identified_assumptions" in result

    def test_returns_safe_default_on_bad_json(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = "NOT JSON AT ALL"

        result = agent._analyze_input("any input")

        assert result["requires_clarification"] is False
        assert isinstance(result["clarifying_questions"], list)

    def test_flags_clarification_needed(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = json.dumps(
            {
                "requires_clarification": True,
                "clarifying_questions": ["Which language?", "Target OS?"],
                "identified_assumptions": [],
            }
        )
        result = agent._analyze_input("Build something")

        assert result["requires_clarification"] is True
        assert len(result["clarifying_questions"]) == 2


# ---------------------------------------------------------------------------
# _transform_query
# ---------------------------------------------------------------------------


class TestTransformQuery:
    def test_returns_stripped_string(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = "  Build a REST API with FastAPI and PostgreSQL.  "

        result = agent._transform_query("Build an API")

        assert isinstance(result, str)
        assert result == result.strip()
        assert len(result) > 0

    def test_non_empty_on_empty_input(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = "Please clarify your request."

        result = agent._transform_query("")
        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# _decompose_steps
# ---------------------------------------------------------------------------


class TestDecomposeSteps:
    def test_returns_steps_dict(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        steps_json = {
            "goal": "Build REST API",
            "steps": {
                "step1": "Set up project structure",
                "step2": "Create database models",
                "step3": "Implement endpoints",
            },
        }
        chat._next = json.dumps(steps_json)

        result = agent._decompose_steps("Build a REST API with FastAPI")

        assert "goal" in result
        assert "steps" in result
        assert len(result["steps"]) == 3

    def test_fallback_on_invalid_json(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = "oops not json"

        result = agent._decompose_steps("some task")

        # Must always return a usable structure
        assert "steps" in result
        assert len(result["steps"]) >= 1

    def test_fallback_on_missing_steps_key(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = json.dumps({"goal": "Do something"})  # missing "steps"

        result = agent._decompose_steps("some task")
        assert "steps" in result


# ---------------------------------------------------------------------------
# _evaluate_output
# ---------------------------------------------------------------------------


class TestEvaluateOutput:
    def test_pass_evaluation(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = json.dumps(
            {
                "evaluation": {
                    "status": "PASS",
                    "feedback": {"issues": [], "suggestions": [], "missing_requirements": []},
                    "critical_concerns": [],
                }
            }
        )
        result = agent._evaluate_output("def hello(): return 'hello'")

        assert result["evaluation"]["status"] == "PASS"

    def test_fail_evaluation(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = json.dumps(
            {
                "evaluation": {
                    "status": "FAIL",
                    "feedback": {
                        "issues": ["Missing error handling"],
                        "suggestions": ["Add try/except"],
                        "missing_requirements": [],
                    },
                    "critical_concerns": [],
                }
            }
        )
        result = agent._evaluate_output("def hello(): return hello")

        assert result["evaluation"]["status"] == "FAIL"
        assert "Missing error handling" in result["evaluation"]["feedback"]["issues"]

    def test_safe_default_on_bad_json(self, monkeypatch):
        agent, chat = make_agent(monkeypatch)
        chat._next = "{ broken json"

        result = agent._evaluate_output("some code")
        # Should return a safe PASS default rather than raising
        assert "evaluation" in result
        assert result["evaluation"]["status"] == "PASS"


# ---------------------------------------------------------------------------
# _extract_json
# ---------------------------------------------------------------------------


class TestExtractJson:
    def _get_agent(self, monkeypatch):
        agent, _ = make_agent(monkeypatch)
        return agent

    def test_plain_json(self, monkeypatch):
        agent = self._get_agent(monkeypatch)
        assert agent._extract_json('{"key": "value"}') == {"key": "value"}

    def test_markdown_fenced_json(self, monkeypatch):
        agent = self._get_agent(monkeypatch)
        text = "```json\n{\"key\": \"value\"}\n```"
        result = agent._extract_json(text)
        assert result == {"key": "value"}

    def test_returns_none_on_invalid(self, monkeypatch):
        agent = self._get_agent(monkeypatch)
        assert agent._extract_json("not json at all") is None

    def test_embedded_json(self, monkeypatch):
        agent = self._get_agent(monkeypatch)
        text = 'Some preamble {"answer": 42} some postamble'
        result = agent._extract_json(text)
        assert result == {"answer": 42}
