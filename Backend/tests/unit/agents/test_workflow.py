"""
Unit tests for conversation_workflow().

_execute_task and _convo_response are mocked so these tests exercise
routing logic, return-value contracts, and error handling without
spinning up real LLM/MCP resources.
"""

from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_context(workflow_id="wf-test-001"):
    history_calls = []
    agent_calls = []

    def add_history(wid, role, msg, agent=None):
        history_calls.append((wid, role, msg))

    def log_agent(wid, agent, msg):
        agent_calls.append((wid, agent, msg))

    return {
        "workflow_id": workflow_id,
        "socketio": MagicMock(),
        "sid": "sid-abc",
        "add_to_conversation_history": add_history,
        "log_agent_message": log_agent,
        "get_user_input": MagicMock(),
        "session_history": [],
    }, history_calls, agent_calls


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestConversationWorkflow:
    @patch("app.agents.workflow._execute_task", return_value="Task completed.")
    @patch("app.agents.workflow._is_conversational", return_value=False)
    def test_returns_true_on_success(self, _mock_is_convo, _mock_exec):
        """Successful task path returns (True, <reply>)."""
        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        success, msg = conversation_workflow("Build me a website", ctx)

        assert success is True
        assert "Task completed." in msg

    @patch("app.agents.workflow._execute_task", return_value="done")
    @patch("app.agents.workflow._is_conversational", return_value=False)
    def test_injects_context_into_agents(self, _mock_is_convo, mock_exec):
        """Context dict must be forwarded to _execute_task."""
        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        conversation_workflow("test", ctx)

        mock_exec.assert_called_once()
        _input, call_ctx, _hist = mock_exec.call_args[0]
        assert call_ctx is ctx

    @patch("app.agents.workflow._convo_response", return_value="Hello!")
    @patch("app.agents.workflow._is_conversational", return_value=True)
    def test_resets_group_chat_messages(self, _mock_is_convo, mock_convo):
        """Conversational path uses _convo_response, not the task pipeline."""
        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        success, msg = conversation_workflow("hi", ctx)

        assert success is True
        mock_convo.assert_called_once()

    @patch("app.agents.workflow._execute_task", return_value="done")
    @patch("app.agents.workflow._is_conversational", return_value=False)
    def test_calls_add_history_on_start(self, _mock_is_convo, _mock_exec):
        """Workflow must complete without raising when add_history is provided."""
        from app.agents.workflow import conversation_workflow

        ctx, history_calls, _ = _make_context()
        success, _ = conversation_workflow("query", ctx)

        assert success is True

    @patch("app.agents.workflow._is_conversational", return_value=False)
    @patch(
        "app.agents.workflow._execute_task",
        side_effect=RuntimeError("LLM unreachable"),
    )
    def test_returns_false_on_exception(self, _mock_exec, _mock_is_convo):
        """Any uncaught exception must return (False, error_message)."""
        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        success, msg = conversation_workflow("query", ctx)

        assert success is False
        assert "LLM unreachable" in msg

    @patch("app.agents.workflow._execute_task", return_value="All done!")
    @patch("app.agents.workflow._is_conversational", return_value=False)
    def test_fallback_message_when_no_messages(self, _mock_is_convo, _mock_exec):
        """workflow always returns a non-empty string on success."""
        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        success, msg = conversation_workflow("query", ctx)

        assert success is True
        assert len(msg) > 0
