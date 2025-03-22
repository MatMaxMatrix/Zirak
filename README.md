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

## Git and GPG Configuration

### Setting Up GPG Signing for Commits

This project uses GPG signing for Git commits to ensure commit authenticity and security. Follow these steps to set it up on your system:

1. **Install GPG Tools**:
   ```bash
   # macOS
   brew install gnupg pinentry-mac
   ```

2. **Generate a GPG Key** (if you don't already have one):
   ```bash
   gpg --full-generate-key
   # Choose RSA and RSA, 4096 bits, and follow the prompts
   ```

3. **List Your GPG Keys**:
   ```bash
   gpg --list-secret-keys --keyid-format=long
   ```
   You'll see output like:
   ```
   sec   rsa4096/7C150AF1BE052ADF 2024-12-12 [SC] [expires: 2025-06-10]
         105418BC99FF4F984357A6337C150AF1BE052ADF
   uid                 [ultimate] Your Name <your.email@example.com>
   ```
   The key ID is the part after `rsa4096/` (e.g., `7C150AF1BE052ADF`).

4. **Configure Git to Use Your GPG Key**:
   ```bash
   git config --global user.signingkey YOUR_KEY_ID
   git config --global commit.gpgsign true
   ```

5. **Configure GPG Agent for Password Prompts**:
   Create or edit `~/.gnupg/gpg-agent.conf`:
   ```
   default-cache-ttl 1
   max-cache-ttl 1
   pinentry-program /opt/homebrew/bin/pinentry-mac
   ```

6. **Restart the GPG Agent**:
   ```bash
   gpgconf --kill gpg-agent && gpg-agent --daemon
   ```

### Using GPG Signed Commits

- Git will now automatically sign all commits
- When you commit, the pinentry-mac program will prompt for your GPG key password
- You can verify a signed commit with `git log --show-signature`

### Troubleshooting

- If you don't see the password prompt, check that pinentry-mac is correctly installed and configured
- If signing fails, ensure your GPG key is not expired
- For more detailed logs, set `export GPG_TTY=$(tty)` in your shell configuration

## Pre-commit Hooks

This project uses pre-commit hooks to ensure code quality and consistency. The configuration is in `.pre-commit-config.yaml` and includes:

- Code formatting with Black
- Linting with Ruff
- Basic file hygiene (trailing whitespace, file endings)
- YAML and JSON validation

To use pre-commit:

1. **Install pre-commit**:
   ```bash
   pip install pre-commit
   ```

2. **Install the hooks**:
   ```bash
   pre-commit install
   ```

3. **Run manually** (optional):
   ```bash
   pre-commit run --all-files
   ```

# Demo Script Debug Setup

## Prerequisites
- VS Code with Python extension installed
- Virtual environment with autogen installed
- OpenAI API key

## Steps to Run in Debug Mode

1. Replace `your_api_key_here` in the `.env` file with your actual OpenAI API key

2. Open VS Code and navigate to the Run and Debug tab (Ctrl+Shift+D or Cmd+Shift+D)

3. Select "Python: demo.py" from the dropdown menu

4. Click the green play button or press F5 to start debugging

5. The script will run with a breakpoint at the `pdb.set_trace()` line, allowing you to inspect variables and step through the code

## Debugging Features
- You can add additional breakpoints by clicking in the left margin
- Use F10 to step over, F11 to step into, and Shift+F11 to step out
- Use F5 to continue execution
- The debug console allows you to evaluate expressions
