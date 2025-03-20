import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Config:
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

    # Reduced max tokens to be compatible with OpenAI models
    MAX_TOKENS = 4000  # Changed from 8000 to 4000 for OpenAI compatibility
    MAX_CONVERSATION_TOKENS = (
        325000  # Reduced from 200000 to be more compatible with OpenAI models
    )

    # Paths
    BASE_DIR = Path(__file__).parent
    TOOLS_DIR = BASE_DIR / "tools"
    PROMPTS_DIR = BASE_DIR / "prompts"

    # Assistant Configuration
    ENABLE_THINKING = True
    SHOW_TOOL_USAGE = True
    DEFAULT_TEMPERATURE = 0
    deepseek_api_key = os.getenv("deepseek_api_key")
    DeepSeek_Model = "deepseek-chat"
    DeepSeek_base_url = "https://api.deepseek.com"

    openai_api_key = os.getenv("openai_api_key")
    # Update to a valid OpenAI model name
    OpenAI_Model = "gpt-4o"  # Changed from gpt-4o-mini to a more widely available model
    OpenAI_base_url = "https://api.openai.com/v1"  # Added /v1 to the base URL

    # Use the latest OpenAI client configuration
    api_key = openai_api_key
    base_url = OpenAI_base_url
    Model = OpenAI_Model

    # Agentic Behavior Configuration
    AUTO_TOOL_SELECTION = True  # Enable automatic tool selection and execution
    MAX_AUTO_TOOL_CALLS = 10  # Maximum number of automatic tool calls per user input
    AUTO_CONTEXT_GATHERING = True  # Enable automatic context gathering
    REMEMBER_FILES = True  # Remember files mentioned in conversation
    REMEMBER_DIRECTORIES = True  # Remember directories mentioned in conversation
    AUTO_EXPLORE_CODEBASE = (
        True  # Automatically explore codebase structure when relevant
    )
    RECENT_MESSAGE_COUNT = (
        3  # Number of recent non-system messages to include in API calls
    )

    # Workflow Configuration
    MAX_CONVERSATION_ROUNDS = 30  # Maximum number of conversation rounds
    CONVERSATION_TIMEOUT = 1800  # Timeout for the conversation workflow in seconds (increased from 600 to 1800)
    MAX_CONSECUTIVE_AUTO_REPLY = 10  # Maximum number of consecutive auto-replies

    # Logging Configuration
    LOG_LEVEL = "INFO"  # Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    DETAILED_LOGGING = True  # Enable detailed logging
    LOG_TOKEN_USAGE = True  # Log token usage

    # Performance Metrics
    TRACK_RESPONSE_TIME = True  # Track response time
    TRACK_TOKEN_USAGE = True  # Track token usage

    # Testing Configuration
    TEST_MODE = False  # Enable test mode
    TEST_TIMEOUT = 1800  # Timeout for tests in seconds (increased from 600 to 1800)
