"""
Centralised application configuration.

All values fall back to sensible defaults so the app can start without a
.env file (useful in CI and unit tests).  Production deployments must
provide OPENAI_API_KEY and SECRET_KEY at minimum.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── LLM providers ────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")

    DEEPSEEK_API_KEY: str | None = os.getenv("DEEPSEEK_API_KEY")
    DEEPSEEK_MODEL = "deepseek-chat"
    DEEPSEEK_BASE_URL = "https://api.deepseek.com"

    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = "gpt-4o"
    OPENAI_BASE_URL = "https://api.openai.com/v1"

    # Active provider (change these three to switch to DeepSeek / Anthropic)
    api_key = OPENAI_API_KEY
    base_url = OPENAI_BASE_URL
    Model = OPENAI_MODEL

    # ── MCP ──────────────────────────────────────────────────────────────────
    MCP_SERVER_URL: str = os.getenv("MCP_SERVER_URL", "http://localhost:3002/sse")

    # ── Paths ─────────────────────────────────────────────────────────────────
    # Use .resolve() so these are always absolute even if __file__ is relative
    BASE_DIR: Path = Path(__file__).resolve().parent
    TOOLS_DIR: Path = BASE_DIR / "agents" / "tools"
    PROMPTS_DIR: Path = BASE_DIR / "agents" / "prompts"
    # Workspace: where the agent creates/edits project files.
    # Override with WORKSPACE_DIR env var for production deployments.
    WORKSPACE_DIR: Path = Path(
        os.getenv("WORKSPACE_DIR", str(Path(__file__).resolve().parent.parent / "workspace"))
    ).resolve()

    # ── Model behaviour ───────────────────────────────────────────────────────
    MAX_TOKENS = 16000
    MAX_CONVERSATION_TOKENS = 325_000
    ENABLE_THINKING = True
    DEFAULT_TEMPERATURE = 0

    # ── Agentic behaviour ─────────────────────────────────────────────────────
    AUTO_TOOL_SELECTION = True
    MAX_AUTO_TOOL_CALLS = 10
    AUTO_CONTEXT_GATHERING = True
    REMEMBER_FILES = True
    REMEMBER_DIRECTORIES = True
    AUTO_EXPLORE_CODEBASE = True
    RECENT_MESSAGE_COUNT = 3

    # ── Workflow ──────────────────────────────────────────────────────────────
    MAX_CONVERSATION_ROUNDS = 30
    CONVERSATION_TIMEOUT = 1800       # seconds
    MAX_CONSECUTIVE_AUTO_REPLY = 10

    # ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    DETAILED_LOGGING = True
    LOG_TOKEN_USAGE = True

    # ── Server ────────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", os.urandom(24).hex())
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")
    PORT: int = int(os.getenv("PORT", 5001))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # ── Testing ───────────────────────────────────────────────────────────────
    TEST_MODE = False
    TEST_TIMEOUT = 1800
