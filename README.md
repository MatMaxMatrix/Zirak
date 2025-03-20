# Zirak Project

## Project Overview
Zirak is an AI agent framework built with Python, featuring a multi-agent system with tool creation capabilities. The project integrates various AI tools to enhance productivity and automate complex tasks.

## Project Structure
- **Backend/**: Core Python backend with agent system
  - **Agents/**: Contains all agent implementations
    - **tools/**: Collection of tools available to agents (browser, file manipulation, code execution, etc.)
  - **test.py**: Main test script for the agent workflow
- **my-app/**: Frontend interface (likely React/Next.js based)

## Features
- Multi-agent conversation workflow
- Interactive CLI interface
- Extensive tool collection:
  - Web browsing and scraping
  - File operations (reading, creating, editing)
  - Terminal command execution
  - Screenshot capabilities
  - DuckDuckGo search integration
  - Code execution via E2B
  - Package management with UV
  - Tool creation capabilities

## Dependencies
The project uses a wide range of dependencies managed through `pyproject.toml`, including:
- Anthropic and OpenAI for LLM integration
- Flask for web server capabilities
- Various libraries for web interaction and automation
- LangGraph and LangChain for agent coordination

## Setup Instructions

### Environment Setup
1. Ensure you have Python 3.9+ installed
2. Clone this repository
3. Set up the environment using direnv:
   ```bash
   # Install direnv if not already installed
   brew install direnv

   # Add to your shell configuration (~/.zshrc)
   eval "$(direnv hook zsh)"

   # Allow the environment
   direnv allow
   ```

### Installation
1. Install dependencies using UV:
   ```bash
   uv pip install -e .
   ```

2. Create an `api_keys.env` file with your API keys (if needed)

## Recent Changes and Fixes

### Environment Activation Issue
Fixed an issue with automatic environment activation:
- Updated `.envrc` to use absolute paths instead of relative paths for virtual environment
- This ensures proper environment activation in paths with spaces and special characters (iCloud Drive paths)

### Package Building Fix
- Created a README.md file required by the build system (hatchling)
- This resolved the error when running the application

## Running the Project
To run the agent system:
```bash
cd Backend
uv run test.py
```

## Development
The project uses UV for package management, a modern alternative to pip that provides faster and more reliable dependency resolution.

## Troubleshooting
- If environment is not being activated automatically, ensure:
  1. direnv is properly installed and hooked into your shell
  2. You have run `direnv allow` in the project directory
  3. The `.envrc` file uses absolute paths for environment variables
