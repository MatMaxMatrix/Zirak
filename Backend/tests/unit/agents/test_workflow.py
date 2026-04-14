"""
Unit tests for conversation_workflow().

The AutoGen group chat is fully mocked so these tests exercise the
orchestration logic (context injection, success/error return values,
history callbacks) without spinning up real agents.
"""

import pytest
from unittest.mock import MagicMock, patch, call


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
        "user_input": "test query",
    }, history_calls, agent_calls


# ---------------------------------------------------------------------------
# Basic success / failure paths
# ---------------------------------------------------------------------------


class TestConversationWorkflow:
    @patch("app.agents.workflow.GroupChatManager")
    @patch("app.agents.workflow.group_chat")
    @patch("app.agents.workflow.UserProxyAgent")
    def test_returns_true_on_success(self, mock_proxy, mock_gc, mock_mgr_cls):
        """Successful workflow returns (True, <last message content>)."""
        mock_gc.agents = []
        mock_gc.messages = [{"content": "Task completed.", "role": "assistant"}]

        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        success, msg = conversation_workflow("Build me a website", ctx)

        assert success is True
        assert "Task completed." in msg

    @patch("app.agents.workflow.GroupChatManager")
    @patch("app.agents.workflow.group_chat")
    @patch("app.agents.workflow.UserProxyAgent")
    def test_injects_context_into_agents(self, mock_proxy, mock_gc, mock_mgr_cls):
        """Context dict must be set on every agent before the chat starts."""
        agent1 = MagicMock()
        agent2 = MagicMock()
        mock_gc.agents = [agent1, agent2]
        mock_gc.messages = [{"content": "done", "role": "assistant"}]

        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        conversation_workflow("test", ctx)

        assert agent1.context == ctx
        assert agent2.context == ctx

    @patch("app.agents.workflow.GroupChatManager")
    @patch("app.agents.workflow.group_chat")
    @patch("app.agents.workflow.UserProxyAgent")
    def test_resets_group_chat_messages(self, mock_proxy, mock_gc, mock_mgr_cls):
        """group_chat.messages must be cleared for each new workflow."""
        mock_gc.agents = []
        mock_gc.messages = [{"content": "stale from last run"}]

        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        conversation_workflow("new query", ctx)

        # reset() and messages = [] must both be called
        mock_gc.reset.assert_called_once()

    @patch("app.agents.workflow.GroupChatManager")
    @patch("app.agents.workflow.group_chat")
    @patch("app.agents.workflow.UserProxyAgent")
    def test_calls_add_history_on_start(self, mock_proxy, mock_gc, mock_mgr_cls):
        """Workflow must log 'Workflow started.' before doing anything."""
        mock_gc.agents = []
        mock_gc.messages = []

        from app.agents.workflow import conversation_workflow

        ctx, history_calls, _ = _make_context()
        conversation_workflow("query", ctx)

        system_msgs = [msg for _, role, msg in history_calls if role == "system"]
        assert any("started" in m.lower() for m in system_msgs)

    @patch("app.agents.workflow.GroupChatManager", side_effect=RuntimeError("LLM unreachable"))
    @patch("app.agents.workflow.group_chat")
    @patch("app.agents.workflow.UserProxyAgent")
    def test_returns_false_on_exception(self, mock_proxy, mock_gc, mock_mgr_cls):
        """Any uncaught exception must return (False, error_message)."""
        mock_gc.agents = []
        mock_gc.messages = []

        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        success, msg = conversation_workflow("query", ctx)

        assert success is False
        assert "LLM unreachable" in msg

    @patch("app.agents.workflow.GroupChatManager")
    @patch("app.agents.workflow.group_chat")
    @patch("app.agents.workflow.UserProxyAgent")
    def test_fallback_message_when_no_messages(self, mock_proxy, mock_gc, mock_mgr_cls):
        """If group_chat.messages is empty, return a polite fallback string."""
        mock_gc.agents = []
        mock_gc.messages = []

        from app.agents.workflow import conversation_workflow

        ctx, _, _ = _make_context()
        success, msg = conversation_workflow("query", ctx)

        assert success is True
        assert len(msg) > 0  # must not be empty
