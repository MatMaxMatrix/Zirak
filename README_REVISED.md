# Claude Engineer - Revised Workflow

This repository contains a revised workflow for the Claude Engineer project, with improved testing capabilities and better error handling.

## Overview

The Claude Engineer project is an AI-powered system that uses multiple agents to process user queries and generate responses. The workflow has been revised to follow the same processing steps that Cursor AI is already doing, with improved error handling, logging, and testing capabilities.

## Components

The system consists of the following main components:

1. **Agent Manager**: Manages the different agents and their state transitions.
2. **Conversation Workflow**: Handles the conversation flow between agents.
3. **LLM Agent**: The main agent responsible for generating responses using a large language model.
4. **Query Transformation Agent**: Transforms user queries into a format suitable for processing.
5. **Step Generator Agent**: Generates steps for complex tasks.
6. **Critical Analysis Agent**: Analyzes user queries to determine if clarification is needed.
7. **Initiating Agent**: Initiates the conversation and handles user input.

## Testing Tools

The repository includes several testing tools to evaluate the performance of the system:

1. **test.py**: A comprehensive testing script that can test the full workflow or just the LLM Agent.
2. **llm_agent_test.py**: A dedicated testing script for the LLM Agent, bypassing the initial agents.

## Usage

### Testing the Full Workflow

To test the full workflow with all agents:

```bash
python test.py --mode full --timeout 60 --input "Your query here"
```

If you don't provide the `--input` parameter, you will be prompted to enter your query.

### Testing Only the LLM Agent

To test only the LLM Agent, bypassing the initial agents:

```bash
python test.py --mode llm_only --input "Your query here"
```

### Using the Dedicated LLM Agent Tester

The `llm_agent_test.py` script provides more detailed testing options for the LLM Agent:

```bash
python llm_agent_test.py
```

This script offers three testing modes:
1. Direct chat test: Test the LLM Agent's chat function directly.
2. Tool execution test: Test a specific tool execution.
3. Multi-turn conversation test: Test a multi-turn conversation with the LLM Agent.

## Configuration

The system can be configured through the `Agents/config.py` file. Key configuration options include:

- `MAX_CONVERSATION_ROUNDS`: Maximum number of conversation rounds (default: 30)
- `CONVERSATION_TIMEOUT`: Timeout for the conversation workflow in seconds (default: 60)
- `MAX_CONSECUTIVE_AUTO_REPLY`: Maximum number of consecutive auto-replies (default: 10)
- `ENABLE_THINKING`: Whether to enable thinking output (default: False)
- `DEFAULT_TEMPERATURE`: Temperature for the LLM (default: 0.7)
- `AUTO_TOOL_SELECTION`: Whether to enable automatic tool selection (default: True)
- `MAX_AUTO_TOOL_CALLS`: Maximum number of automatic tool calls (default: 5)

## Workflow Process

1. The user submits a query.
2. The Initiating Agent processes the query and determines if clarification is needed.
3. If clarification is needed, the query is sent to the Query Transformation Agent.
4. The Critical Analysis Agent analyzes the query to determine the next steps.
5. The Query Transformation Agent transforms the query into a format suitable for processing.
6. The Step Generator Agent generates steps for complex tasks.
7. The LLM Agent processes each step and generates a response.
8. The response is returned to the user.

## Error Handling

The revised workflow includes improved error handling with detailed logging. Errors are caught and logged at each step of the process, and the system attempts to recover from errors when possible.

## Performance Metrics

The testing tools provide performance metrics for the system, including:

- Response time
- Token usage
- Success/failure status
- Error messages (if any)

These metrics can be used to evaluate the performance of the system and identify areas for improvement.

## Contributing

To contribute to the project, please follow these steps:

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 