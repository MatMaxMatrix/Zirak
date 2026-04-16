"""
Shared pytest fixtures.
"""

import os
import pytest

# ── Set env vars before any app code is imported ─────────────────────────────
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy")
os.environ.setdefault("MCP_SERVER_URL", "http://localhost:3002/sse")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ALLOWED_ORIGINS", "*")


@pytest.fixture(scope="session")
def flask_app():
    """Return a configured Flask test application."""
    from app import create_app
    from app.config import Config

    class TestConfig(Config):
        TESTING = True
        DEBUG = False
        SECRET_KEY = "test-secret"
        ALLOWED_ORIGINS = "*"

    application = create_app(config=TestConfig)
    application.config["TESTING"] = True
    return application


@pytest.fixture()
def client(flask_app):
    """Flask test client."""
    with flask_app.test_client() as c:
        yield c


@pytest.fixture()
def mock_openai(monkeypatch):
    """
    Replace openai.OpenAI with a minimal stub so tests don't hit the network.

    Usage in a test:
        def test_something(mock_openai):
            mock_openai.set_response('{"requires_clarification": false, ...}')
    """

    class _FakeMessage:
        def __init__(self, content):
            self.content = content

    class _FakeChoice:
        def __init__(self, content):
            self.message = _FakeMessage(content)

    class _FakeCompletion:
        def __init__(self, content):
            self.choices = [_FakeChoice(content)]

    class _FakeChat:
        def __init__(self, stub):
            self._stub = stub

        @property
        def completions(self):
            return self

        def create(self, **kwargs):
            return _FakeCompletion(self._stub._response)

    class _FakeClient:
        def __init__(self, **kwargs):
            pass

        @property
        def chat(self):
            return _FakeChat(self)

        def set_response(self, text: str):
            self._response = text

        _response = "{}"

    stub = _FakeClient()

    import openai

    monkeypatch.setattr(openai, "OpenAI", lambda **kw: stub)
    return stub
