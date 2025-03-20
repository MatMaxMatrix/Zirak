# Claude Engineer

Claude Engineer is an AutoGen-based project that uses multiple agents to break down complex tasks into steps and execute them. It leverages the power of LLMs to generate and execute code, create files and folders, and perform other tasks.

## Features

- Multi-agent architecture for complex task decomposition
- Step-by-step execution of tasks
- File and folder creation capabilities
- Tool-based approach for various operations
- Interactive CLI interface

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up your environment variables in `.env`:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

## Usage

Run the main script:

```bash
python test.py
```

This will start an interactive session where you can enter your request. The system will:

1. Analyze your request using the Critical Analysis Agent
2. Transform your query using the Query Transformation Agent
3. Generate steps using the Step Generator Agent
4. Execute each step using the LLM Agent

## Available Tools

The system includes several tools:

- `filecreatortool`: Creates files with specified content
- `createfolderstool`: Creates folders and nested directories
- `fileedittool`: Edits existing files
- `filecontentreadertool`: Reads content from files
- `webscrapertool`: Extracts content from web pages
- `uvpackagemanager`: Manages Python packages
- And more...

## Project Structure

- `Agents/`: Contains all agent implementations
  - `LLM_Agent.py`: Main agent for executing tasks
  - `Step_Generator.py`: Breaks down tasks into steps
  - `Query_Transformation.py`: Transforms user queries
  - `Critical_Analysis_Agent.py`: Analyzes requests
  - `tools/`: Contains all tool implementations
- `ce3.py`: Base functionality for the Claude Engineer
- `test.py`: Main entry point for the application

## Troubleshooting

If you encounter issues with file or folder creation:
- Check that the paths are valid
- Ensure you have the necessary permissions
- Verify that the parent directories exist

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
# Test comment
