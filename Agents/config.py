from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
    MODEL = "gpt-4o"
    MAX_TOKENS = 8000
    MAX_CONVERSATION_TOKENS = 200000  # Maximum tokens per conversation

    # Paths
    BASE_DIR = Path(__file__).parent
    TOOLS_DIR = BASE_DIR / "tools"
    PROMPTS_DIR = BASE_DIR / "prompts"

    # Assistant Configuration
    ENABLE_THINKING = True
    SHOW_TOOL_USAGE = True
    DEFAULT_TEMPERATURE = 0.7
    deepseek_api_key = os.getenv('deepseek_api_key')
    DeepSeek_Model = "deepseek-chat"
    
    # Agentic Behavior Configuration
    AUTO_TOOL_SELECTION = True  # Enable automatic tool selection and execution
    MAX_AUTO_TOOL_CALLS = 5     # Maximum number of automatic tool calls per user input
    AUTO_CONTEXT_GATHERING = True  # Enable automatic context gathering
    REMEMBER_FILES = True       # Remember files mentioned in conversation
    REMEMBER_DIRECTORIES = True # Remember directories mentioned in conversation
    AUTO_EXPLORE_CODEBASE = True  # Automatically explore codebase structure when relevant

