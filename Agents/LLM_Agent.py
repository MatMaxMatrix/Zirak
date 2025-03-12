# File: /Framework/agents/corrective_action_agent.py
#%%
from autogen import ConversableAgent
import os
import logging
from openai import OpenAI
import anthropic
from rich.console import Console
from rich.markdown import Markdown
from rich.live import Live
from rich.spinner import Spinner
from rich.panel import Panel
from typing import List, Dict, Any
import importlib
import inspect
import pkgutil
import os
import json
import sys
from pathlib import Path
from .config import Config
from .tools.base import BaseTool
from prompt_toolkit import prompt
from prompt_toolkit.styles import Style
#from .prompts.system_prompts import SystemPrompts
from .prompts.revised_prompt import SystemPrompts
import autogen
import re


#%%

class LLM_Agent(ConversableAgent):
    def __init__(self):

        # Initialize OpenAI client
        self.client = OpenAI(api_key=Config.api_key, base_url=Config.base_url)
        self.conversation_history: List[Dict[str, Any]] = []
        self.console = Console()
        self.console.print(f"[red]LLM_Agent start from here.[/red]")

        self.thinking_enabled = getattr(Config, 'ENABLE_THINKING', False)
        self.temperature = getattr(Config, 'DEFAULT_TEMPERATURE', 0.7)
        self.total_tokens_used = 0
        self.current_step_index = 0 
        
        # Context tracking for agentic behavior
        self.context_manager = ContextManager()
        self.auto_tool_selection = False
        self.max_auto_tool_calls = getattr(Config, 'MAX_AUTO_TOOL_CALLS', 5)
        self.current_auto_tool_calls = 0
        
        # Cache for processed tools
        self._processed_tools_cache = None
        self._last_tools_hash = None

        # Initialize the tool manager
        self.tool_manager = ToolManager(console=self.console)
        
        # Generate dynamic tool information for the system prompt
        tool_info = self.tool_manager.generate_tool_info()
        
        # Enhanced system prompt with agentic capabilities
        #system_prompt = f"{SystemPrompts.DEFAULT}\n\n{SystemPrompts.TOOL_USAGE}\n\n{tool_info}\n\n{SystemPrompts.AGENTIC_BEHAVIOR}"
        system_prompt = f"{SystemPrompts.REVISED_PROMPT}"
        self.conversation_history.append({
            "role": "system",
            "content": system_prompt
        })
        
        # Call super().__init__ after setting up our attributes
        super().__init__(
            name="LLM_Agent",
            system_message="",
            llm_config={
                "config_list": [{"model": Config.Model, "api_key": Config.api_key, "base_url": Config.base_url}],
                "timeout": 120,
            },
        )
        self.register_reply(
            trigger=self._always_true_trigger,
            reply_func=self.main,
            position=0,
        )

    def _always_true_trigger(self, sender):
        return True

    def _execute_uv_install(self, package_name: str) -> bool:
        """
        Execute the uvpackagemanager tool directly to install the missing package.
        Returns True if installation seems successful (no errors in output), otherwise False.
        """
        # Use the tool manager's method
        return self.tool_manager._execute_uv_install(package_name)

    @property
    def tools(self):
        """
        Get the list of available tools.
        """
        return self.tool_manager.get_tools()

    def refresh_tools(self):
        """
        Refresh the list of available tools by reloading them from the tools directory.
        This is useful when new tools are added or existing tools are modified.
        """
        self.tool_manager.refresh_tools()
        # Clear the processed tools cache when refreshing tools
        self._processed_tools_cache = None
        self._last_tools_hash = None
        self.display_available_tools()

    def display_available_tools(self):
        """
        Display all available tools with their descriptions.
        """
        self.tool_manager.display_available_tools()

    def _execute_tool(self, tool_use):
        """
        Execute a tool with the given parameters.
        
        Args:
            tool_use: An object with 'name' and 'input' attributes
        
        Returns:
            str: The result of the tool execution
        """
        tool_name = tool_use.name
        tool_input = tool_use.input
        
        # Create a more visually appealing tool execution header
        tool_header = Panel(
            f"[bold cyan]Tool:[/bold cyan] {tool_name}\n[bold cyan]Parameters:[/bold cyan]\n{json.dumps(self._clean_data_for_display(tool_input), indent=2)}",
            title="[bold]Tool Execution Details[/bold]",
            border_style="cyan",
            padding=(1, 2)
        )
        self.console.print(tool_header)
        
        # Special handling for common tools
        if tool_name.lower() == "createfolderstool":
            self.console.print(f"[cyan]Special handling for createfolderstool[/cyan]")
            # Ensure the tool_input has the correct parameter name
            if "paths" in tool_input and "folder_paths" not in tool_input:
                tool_input["folder_paths"] = tool_input["paths"]
                self.console.print(f"[cyan]Converted 'paths' parameter to 'folder_paths' for compatibility[/cyan]")
        elif tool_name.lower() == "filecreatortool":
            self.console.print(f"[cyan]Special handling for filecreatortool[/cyan]")
            # Ensure parent directories exist
            if isinstance(tool_input.get('files'), dict):
                path = Path(tool_input['files']['path'])
                try:
                    path.parent.mkdir(parents=True, exist_ok=True)
                    self.console.print(f"[green]Created parent directory: {path.parent}[/green]")
                except Exception as e:
                    self.console.print(f"[red]Error creating parent directory: {str(e)}[/red]")
            elif isinstance(tool_input.get('files'), list):
                for file_spec in tool_input['files']:
                    path = Path(file_spec['path'])
                    try:
                        path.parent.mkdir(parents=True, exist_ok=True)
                        self.console.print(f"[green]Created parent directory: {path.parent}[/green]")
                    except Exception as e:
                        self.console.print(f"[red]Error creating parent directory: {str(e)}[/red]")
        
        # Try both import paths for each module
        import_paths = [
            lambda name: f"Agents.tools.{name}",
            lambda name: f"tools.{name}"
        ]
        
        # Get tools directory path
        tools_path = getattr(Config, 'TOOLS_DIR', None)
        if tools_path is None:
            tools_path = Path(__file__).parent / "tools"
        
        # Ensure tools_path is a Path object
        if not isinstance(tools_path, Path):
            tools_path = Path(tools_path)
        
        result = None
        
        # Search for the tool in all modules in the tools directory
        for module_info in pkgutil.iter_modules([str(tools_path)]):
            module_name = module_info.name
            if module_name == 'base':
                continue
                
            module = None
            for import_path_func in import_paths:
                try:
                    full_module_name = import_path_func(module_name)
                    self.console.print(f"[cyan]Trying to import module: {full_module_name}[/cyan]")
                    module = importlib.import_module(full_module_name)
                    self.console.print(f"[green]Successfully imported module: {full_module_name}[/green]")
                    break
                except ImportError as e:
                    self.console.print(f"[yellow]Failed to import {import_path_func(module_name)}: {str(e)}[/yellow]")
            
            if not module:
                self.console.print(f"[red]Could not import module {module_name} using any import path[/red]")
                continue
                
            try:
                # Try to find a tool instance with the matching name
                tool_instance = self._find_tool_instance_in_module(module, tool_name)
                if tool_instance:
                    self.console.print(f"[green]Found tool '{tool_name}' in module '{module_name}'[/green]")
                    
                    # Execute the tool
                    try:
                        self.console.print(f"[cyan]Executing tool with parameters: {json.dumps(tool_input, indent=2)}[/cyan]")
                        result = tool_instance.execute(**tool_input)
                        self.console.print(f"[green]Tool execution successful[/green]")
                        break
                    except Exception as exec_err:
                        self.console.print(f"[red]Error executing tool: {str(exec_err)}[/red]")
                        import traceback
                        self.console.print(f"[red]{traceback.format_exc()}[/red]")
                        result = f"Error executing tool '{tool_name}': {str(exec_err)}"
                        break
            except Exception as e:
                self.console.print(f"[red]Error processing module {module_name}: {str(e)}[/red]")
                import traceback
                self.console.print(f"[red]{traceback.format_exc()}[/red]")
        
        if result is None:
            result = f"Error: Tool '{tool_name}' not found or failed to execute"
        
        self.console.print(f"[cyan]Result:[/cyan] {self._clean_parsed_data(result)}")
        
        # Display tool usage in a formatted way
        if getattr(Config, 'SHOW_TOOL_USAGE', True):
            self._display_tool_usage(tool_name, tool_input, result)
        
        return result

    def _find_tool_instance_in_module(self, module, tool_name: str):
        """
        Search a given module for a tool class matching tool_name and return an instance of it.
        
        Args:
            module: The module to search in
            tool_name: The name of the tool to find
            
        Returns:
            An instance of the tool class if found, None otherwise
        """
        try:
            self.console.print(f"[cyan]Searching for tool '{tool_name}' in module '{module.__name__}'[/cyan]")
            
            # Normalize the tool name for case-insensitive comparison
            normalized_tool_name = tool_name.lower()
            
            # First, try to find a class with a matching name attribute
            tool_candidates = []
            
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and hasattr(obj, '__mro__')):
                    # Check if BaseTool is in the class's MRO (Method Resolution Order)
                    is_tool_class = False
                    for base in obj.__mro__:
                        if base.__name__ == 'BaseTool':
                            is_tool_class = True
                            break
                    
                    if is_tool_class and obj.__name__ != 'BaseTool':
                        try:
                            candidate_tool = obj()
                            if hasattr(candidate_tool, 'name'):
                                tool_name_value = candidate_tool.name.lower()
                                self.console.print(f"[cyan]Found tool class '{name}' with name '{candidate_tool.name}'[/cyan]")
                                
                                # Exact match
                                if tool_name_value == normalized_tool_name:
                                    self.console.print(f"[green]Found exact match: tool class '{name}' with name '{candidate_tool.name}'[/green]")
                                    return candidate_tool
                                
                                # Add to candidates for fuzzy matching later
                                similarity_score = 0
                                # Exact substring match
                                if normalized_tool_name in tool_name_value or tool_name_value in normalized_tool_name:
                                    similarity_score += 2
                                # Class name contains tool name
                                if normalized_tool_name in name.lower():
                                    similarity_score += 1
                                
                                if similarity_score > 0:
                                    tool_candidates.append((candidate_tool, similarity_score))
                        except Exception as e:
                            self.console.print(f"[yellow]Error instantiating tool class '{name}': {str(e)}[/yellow]")
            
            # If no exact match found, return the best candidate based on similarity score
            if tool_candidates:
                # Sort by similarity score (highest first)
                tool_candidates.sort(key=lambda x: x[1], reverse=True)
                best_candidate, score = tool_candidates[0]
                self.console.print(f"[green]Found best matching tool: '{best_candidate.name}' with similarity score {score}[/green]")
                return best_candidate
            
            self.console.print(f"[yellow]No tool with name '{tool_name}' found in module '{module.__name__}'[/yellow]")
            return None
        except Exception as e:
            self.console.print(f"[red]Error searching for tool in module '{module.__name__}': {str(e)}[/red]")
            import traceback
            self.console.print(f"[red]{traceback.format_exc()}[/red]")
            return None

    def _display_tool_usage(self, tool_name: str, input_data: Dict, result: str):
        """
        If SHOW_TOOL_USAGE is enabled, display the input and result of a tool execution.
        Handles special cases like image data and large outputs for cleaner display.
        """
        if not getattr(Config, 'SHOW_TOOL_USAGE', False):
            return

        # Clean up input data by removing any large binary/base64 content
        cleaned_input = self._clean_data_for_display(input_data)
        
        # Clean up result data
        cleaned_result = self._clean_data_for_display(result)
        
        # Determine if the result was successful based on improved heuristics
        success = True
        
        # Try to parse the result as JSON if it's a string
        parsed_result = None
        if isinstance(result, str):
            try:
                parsed_result = json.loads(result)
            except json.JSONDecodeError:
                parsed_result = None
        else:
            parsed_result = result
            
        # Check for explicit failure indicators
        if parsed_result and isinstance(parsed_result, dict):
            # For dictionary results, check specific failure indicators
            if parsed_result.get('error') or parsed_result.get('failed') == True:
                success = False
            # For file operations, check if there were any failed files
            elif 'failed_files' in parsed_result and parsed_result['failed_files'] > 0:
                success = False
            # For results with a success field, use that directly
            elif 'success' in parsed_result and parsed_result['success'] == False:
                success = False
        elif isinstance(result, str) and ("error" in result.lower() or "exception" in result.lower()):
            # For string results, check for error keywords but avoid false positives
            # Don't check for "failed" as it might appear in successful results like "failed_files": 0
            success = False
        
        # Create a more visually appealing result display
        status_icon = "✅" if success else "❌"
        status_color = "green" if success else "red"
        
        # Format the result for better readability
        if isinstance(cleaned_result, str) and len(cleaned_result) > 500:
            # For long text results, show a preview
            preview = cleaned_result[:500] + "... (truncated)"
            result_display = f"[{status_color}]{status_icon} Result:[/{status_color}]\n{preview}"
        else:
            # For shorter results, show everything
            result_display = f"[{status_color}]{status_icon} Result:[/{status_color}]\n{cleaned_result}"
        
        # Create a more detailed panel with input and result
        tool_info = f"""[bold cyan]📥 Input Parameters:[/bold cyan]
{json.dumps(cleaned_input, indent=2)}

{result_display}"""
        
        panel = Panel(
            tool_info,
            title=f"[bold]{tool_name} - Execution Summary[/bold]",
            title_align="center",
            border_style=status_color,
            padding=(1, 2)
        )
        self.console.print(panel)

    def _clean_data_for_display(self, data):
        """
        Helper method to clean data for display by handling various data types
        and removing/replacing large content like base64 strings.
        """
        if isinstance(data, str):
            try:
                # Try to parse as JSON first
                parsed_data = json.loads(data)
                return self._clean_parsed_data(parsed_data)
            except json.JSONDecodeError:
                # If it's a long string, check for base64 patterns
                if len(data) > 1000 and ';base64,' in data:
                    return "[base64 data omitted]"
                return data
        elif isinstance(data, dict):
            return self._clean_parsed_data(data)
        else:
            return data

    def _clean_parsed_data(self, data):
        """
        Recursively clean parsed JSON/dict data, handling nested structures
        and replacing large data with placeholders.
        """
        if isinstance(data, dict):
            cleaned = {}
            for key, value in data.items():
                # Handle image data in various formats
                if key in ['data', 'image', 'source'] and isinstance(value, str):
                    if len(value) > 1000 and (';base64,' in value or value.startswith('data:')):
                        cleaned[key] = "[base64 data omitted]"
                    else:
                        cleaned[key] = value
                else:
                    cleaned[key] = self._clean_parsed_data(value)
            return cleaned
        elif isinstance(data, list):
            return [self._clean_parsed_data(item) for item in data]
        elif isinstance(data, str) and len(data) > 1000 and ';base64,' in data:
            return "[base64 data omitted]"
        return data

    def _display_token_usage(self, usage):
        """
        Display a visual representation of token usage and remaining tokens.
        Uses only the tracked total_tokens_used.
        """
        used_percentage = (self.total_tokens_used / Config.MAX_CONVERSATION_TOKENS) * 100
        remaining_tokens = max(0, Config.MAX_CONVERSATION_TOKENS - self.total_tokens_used)

        self.console.print(f"\nTotal used: {self.total_tokens_used:,} / {Config.MAX_CONVERSATION_TOKENS:,}")

        bar_width = 40
        filled = int(used_percentage / 100 * bar_width)
        bar = "█" * filled + "░" * (bar_width - filled)

        color = "green"
        if used_percentage > 75:
            color = "yellow"
        if used_percentage > 90:
            color = "red"

        self.console.print(f"[{color}][{bar}] {used_percentage:.1f}%[/{color}]")

        if remaining_tokens < 20000:
            self.console.print(f"[bold red]Warning: Only {remaining_tokens:,} tokens remaining![/bold red]")

        self.console.print("---")

    def _process_tools(self):
        """
        Process the tools to ensure they have the required properties and truncate long descriptions.
        This is extracted to a separate method to allow for caching.
        """
        updated_tools = []
        for tool in self.tools:
            # Create a copy of the tool to avoid modifying the original
            updated_tool = tool.copy()
            
            # Ensure the required type is provided
            if "type" not in updated_tool:
                updated_tool["type"] = "function"
            
            # Format the tool properly for OpenAI API
            if "function" not in updated_tool:
                updated_tool["function"] = {
                    "name": updated_tool.get("name", ""),
                    "description": updated_tool.get("description", ""),
                    "parameters": updated_tool.get("input_schema", {})
                }
            
            # Process all descriptions at once to avoid redundant checks in each loop
            # Truncate main description if too long
            if "description" in updated_tool["function"] and len(updated_tool["function"]["description"]) > 1000:
                updated_tool["function"]["description"] = updated_tool["function"]["description"][:997] + "..."
            
            # Truncate parameter-level description if too long
            if "parameters" in updated_tool["function"]:
                # Check top-level parameters description
                if "description" in updated_tool["function"]["parameters"] and len(updated_tool["function"]["parameters"]["description"]) > 1000:
                    updated_tool["function"]["parameters"]["description"] = updated_tool["function"]["parameters"]["description"][:997] + "..."
                
                # Check property-level descriptions
                if "properties" in updated_tool["function"]["parameters"]:
                    for prop_name, prop in updated_tool["function"]["parameters"]["properties"].items():
                        if "description" in prop and len(prop["description"]) > 1000:
                            prop["description"] = prop["description"][:997] + "..."
            
            updated_tools.append(updated_tool)
        
        return updated_tools
    
    def _get_tools_hash(self):
        """
        Generate a hash of the current tools to detect changes.
        """
        import hashlib
        import json
        
        # Create a string representation of the tools
        tools_str = json.dumps(self.tools, sort_keys=True)
        
        # Generate a hash
        return hashlib.md5(tools_str.encode()).hexdigest()
    
    def _get_processed_tools(self):
        """
        Get the processed tools, using cache if available and tools haven't changed.
        """
        current_hash = self._get_tools_hash()
        
        # If tools haven't changed, return cached processed tools
        if self._processed_tools_cache is not None and current_hash == self._last_tools_hash:
            return self._processed_tools_cache
        
        # Process tools and update cache
        processed_tools = self._process_tools()
        self._processed_tools_cache = processed_tools
        self._last_tools_hash = current_hash
        
        return processed_tools

    def _get_completion(self):
        """
        Get a completion from the Anthropic API.
        Handles both text-only and multimodal messages.
        """
        from openai import OpenAI
        self.client = OpenAI(api_key=Config.api_key, base_url = Config.base_url)
        
        try:
            # Get processed tools with caching
            updated_tools = self._get_processed_tools()
            self.console.print(f"\n[yellow]updated_tools: {updated_tools}[/yellow]")
            # Get relevant context from the context manager
            context_info = self.context_manager.get_relevant_context()
            self.console.print(f"\n[yellow]context_info: {context_info}[/yellow]")
            # Add context information as a system message if there's relevant context
            if (context_info["current_files"] or context_info["current_directories"]) and getattr(Config, 'AUTO_CONTEXT_GATHERING', True):
                context_message = "Current context:\n"
                
                if context_info["current_files"]:
                    context_message += "Files in current context:\n"
                    for file in context_info["current_files"]:
                        context_message += f"- {file}\n"
                
                if context_info["current_directories"]:
                    context_message += "Directories in current context:\n"
                    for directory in context_info["current_directories"]:
                        context_message += f"- {directory}\n"
                
                # Add context message to conversation history
                self.conversation_history.append({
                    "role": "system",
                    "content": context_message
                })

            # Prepend the system prompt to the conversation history
            messages = [
                *self.conversation_history,
            ]
            
            # Create the completion
            response = self.client.chat.completions.create(
                model=Config.Model,
                messages=messages,
                max_tokens=min(Config.MAX_TOKENS, Config.MAX_CONVERSATION_TOKENS - self.total_tokens_used),
                temperature=self.temperature,
                tools=updated_tools,  # Use the updated tools with truncated descriptions
            )

            # Update token usage based on response usage
            if hasattr(response, 'usage') and response.usage:
                message_tokens = response.usage.prompt_tokens + response.usage.completion_tokens
                self.total_tokens_used += message_tokens
                self._display_token_usage(response.usage)

            if self.total_tokens_used >= Config.MAX_CONVERSATION_TOKENS:
                self.console.print("\n[bold red]Token limit reached! Please reset the conversation.[/bold red]")
                return "Token limit reached! Please type 'reset' to start a new conversation."

            # Handle tool use
            if hasattr(response.choices[0].message, 'tool_calls') and response.choices[0].message.tool_calls:
                self.console.print("\n[bold yellow]Starting workflow execution...[/bold yellow]\n")
                
                # Get all tool calls from the response
                tool_calls = response.choices[0].message.tool_calls
                
                # Add the AI's overall plan to the conversation history
                plan_summary = "I'll execute the following workflow:\n\n"
                
                # Create a more visually appealing workflow plan
                workflow_steps = []
                for i, tool_call in enumerate(tool_calls):
                    tool_name = tool_call.function.name
                    tool_input = json.loads(tool_call.function.arguments)
                    step_num = i + 1
                    
                    # Create a human-readable description of the tool action
                    action_desc = self._get_action_description(tool_name, tool_input)
                    plan_summary += f"Step {step_num}: {action_desc}\n"
                    
                    # Add to our workflow steps for display
                    workflow_steps.append({
                        "number": step_num,
                        "tool": tool_name,
                        "description": action_desc,
                        "input": tool_input
                    })
                
                # Display the workflow plan with a more structured format
                self.console.print("\n[bold green]Workflow Plan:[/bold green]")
                self.console.print(f"\n[yellow]workflow_steps: {workflow_steps}[/yellow]")
                
                for step in workflow_steps:
                    step_panel = Panel(
                        f"[cyan]Tool:[/cyan] {step['tool']}\n[cyan]Action:[/cyan] {step['description']}",
                        title=f"[bold]Step {step['number']}/{len(workflow_steps)}[/bold]",
                        border_style="blue",
                        padding=(1, 2)
                    )
                    self.console.print(step_panel)
                
                # Add the plan to conversation history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": plan_summary
                })
                self.console.print(f"\n[yellow]conversation: {self.conversation_history}[/yellow]")
                # Execute each tool one by one with clear explanations
                for i, tool_call in enumerate(tool_calls):
                    tool_name = tool_call.function.name
                    tool_input = json.loads(tool_call.function.arguments)
                    step_num = i + 1
                    
                    # Create a human-readable description of what will be done
                    action_desc = self._get_action_description(tool_name, tool_input)
                    
                    # Display step information with a more prominent header
                    self.console.print("\n")
                    step_header = f"[bold white on blue] STEP {step_num}/{len(tool_calls)} [/bold white on blue] [bold cyan]{action_desc}[/bold cyan]"
                    self.console.print(step_header)
                    
                    # Show a spinner while the step is executing
                    with Live(Spinner("dots", text="[cyan]Executing...[/cyan]"), refresh_per_second=10) as live:
                        # Update context manager with file and directory information from tool calls
                        if tool_name == "filecontentreadertool" and "file_paths" in tool_input:
                            for file_path in tool_input["file_paths"]:
                                if os.path.isfile(file_path):
                                    self.context_manager.current_files.add(file_path)
                                elif os.path.isdir(file_path):
                                    self.context_manager.current_directories.add(file_path)
                        elif tool_name == "list_directory" and "directory_path" in tool_input:
                            directory_path = tool_input["directory_path"]
                            if os.path.isdir(directory_path):
                                self.context_manager.current_directories.add(directory_path)
                        
                        # Create a mock tool use object
                        class ToolUseMock:
                            def __init__(self, name, input_data):
                                self.name = name
                                self.input = input_data
                        
                        # Execute the tool
                        tool_use = ToolUseMock(tool_name, tool_input)
                        result = self._execute_tool(tool_use)
                    
                    # Display completion status with a checkmark
                    self.console.print(f"[bold green]✓ Step {step_num} completed[/bold green]")
                    
                    # Add the tool call to conversation history
                    tool_call_message = {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [{
                            "id": tool_call.id,
                            "type": "function",
                            "function": {
                                "name": tool_name,
                                "arguments": json.dumps(tool_input)
                            }
                        }]
                    }
                    self.conversation_history.append(tool_call_message)
                    
                    self.conversation_history.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_name,
                        "content": str(result)
                    })
                    
                    # Check if the result indicates an empty directory
                    if tool_name == "list_directory" and "No files found" in str(result):
                        self.console.print(f"[yellow]Directory {tool_input.get('directory_path', '')} appears to be empty.[/yellow]")
                
                # After all tools are executed, show a completion message
                self.console.print("\n[bold green on white] WORKFLOW COMPLETED [/bold green on white] All steps executed successfully.\n")
                
                # Get a final response that summarizes what was done
                return self._get_completion()

            # Final assistant response
            if response.choices and len(response.choices) > 0:
                final_content = response.choices[0].message.content
                
                # Add the assistant's response to the conversation history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": final_content
                })
                self.console.print(f"\n[yellow]conversation: {self.conversation_history}[/yellow]")
                
                return final_content
            else:
                return "No response generated."
                
        except Exception as e:
            logging.error(f"Error in _get_completion: {str(e)}")
            import traceback
            logging.error(traceback.format_exc())
            # Check if this is a tag mismatch error
            if "closing tag" in str(e) and "doesn't match any open tag" in str(e):
                # Log more detailed information for debugging
                logging.error("XML tag mismatch detected. This might be due to malformed tags in templates or responses.")
                # Try to extract the problematic tag from the error message
                import re
                tag_match = re.search(r"closing tag '([^']+)'", str(e))
                if tag_match:
                    problematic_tag = tag_match.group(1)
                    logging.error(f"Problematic tag: {problematic_tag}")
                # Return a more user-friendly error message
                return f"Error: There's an issue with the formatting of the response. Please check the template tags in your agent definitions."
            # Fix: Create the error message first, then escape brackets
            error_msg = f"Error: {str(e)}"
            # Replace brackets outside of the f-string
            error_msg = error_msg.replace('[', r'\[').replace(']', r'\]')
            return error_msg
        
    def _get_action_description(self, tool_name: str, tool_input: dict) -> str:
        """
        Create a human-readable description of a tool action.
        
        Args:
            tool_name: The name of the tool
            tool_input: The parameters for the tool
            
        Returns:
            A human-readable description of what the tool will do
        """
        try:
            # File creation
            if tool_name.lower() == "filecreatortool":
                if isinstance(tool_input.get('files'), dict):
                    path = tool_input['files'].get('path', 'unknown')
                    content_preview = tool_input['files'].get('content', '')
                    if len(content_preview) > 30:
                        content_preview = content_preview[:30] + "..."
                    return f"Creating file '{path}' with content starting with '{content_preview}'"
                elif isinstance(tool_input.get('files'), list) and len(tool_input['files']) > 0:
                    if len(tool_input['files']) == 1:
                        path = tool_input['files'][0].get('path', 'unknown')
                        content_preview = tool_input['files'][0].get('content', '')
                        if len(content_preview) > 30:
                            content_preview = content_preview[:30] + "..."
                        return f"Creating file '{path}' with content starting with '{content_preview}'"
                    else:
                        file_names = [f"'{f.get('path', 'unknown')}'" for f in tool_input['files']]
                        return f"Creating {len(file_names)} files: {', '.join(file_names[:3])}{'...' if len(file_names) > 3 else ''}"
                return "Creating file(s)"
                
            # Directory creation
            elif tool_name.lower() == "createfolderstool":
                folder_paths = tool_input.get('folder_paths', tool_input.get('paths', []))
                if isinstance(folder_paths, list) and len(folder_paths) > 0:
                    if len(folder_paths) == 1:
                        return f"Creating directory '{folder_paths[0]}'"
                    else:
                        dir_names = [f"'{path}'" for path in folder_paths]
                        return f"Creating {len(dir_names)} directories: {', '.join(dir_names[:3])}{'...' if len(dir_names) > 3 else ''}"
                return "Creating directories"
                
            # File reading
            elif tool_name.lower() == "filecontentreadertool":
                file_paths = tool_input.get('file_paths', [])
                if isinstance(file_paths, list) and len(file_paths) > 0:
                    if len(file_paths) == 1:
                        return f"Reading content of file '{file_paths[0]}'"
                    else:
                        file_names = [f"'{path}'" for path in file_paths]
                        return f"Reading {len(file_names)} files: {', '.join(file_names[:3])}{'...' if len(file_names) > 3 else ''}"
                return "Reading file content(s)"
                
            # Directory listing
            elif tool_name.lower() == "list_directory":
                directory_path = tool_input.get('directory_path', '')
                return f"Listing contents of directory '{directory_path}'"
                
            # File editing/updating
            elif tool_name.lower() == "fileupdatertool":
                if 'file_path' in tool_input:
                    content_preview = tool_input.get('content', '')
                    if content_preview and len(content_preview) > 30:
                        content_preview = content_preview[:30] + "..."
                        return f"Updating file '{tool_input['file_path']}' with content starting with '{content_preview}'"
                    return f"Updating file '{tool_input['file_path']}'"
                return "Updating file content"
                
            # Install package
            elif tool_name.lower() == "uvpackagemanager":
                packages = tool_input.get('packages', [])
                command = tool_input.get('command', 'install')
                if isinstance(packages, list) and len(packages) > 0:
                    if len(packages) == 1:
                        return f"{command.capitalize()}ing package '{packages[0]}'"
                    else:
                        package_names = [f"'{pkg}'" for pkg in packages]
                        return f"{command.capitalize()}ing {len(package_names)} packages: {', '.join(package_names[:3])}{'...' if len(package_names) > 3 else ''}"
                return f"{command.capitalize()}ing packages"
                
            # Web search
            elif tool_name.lower() == "websearchtool":
                query = tool_input.get('query', '')
                return f"Searching the web for '{query}'"
                
            # Code search
            elif tool_name.lower() == "codesearchtool":
                query = tool_input.get('query', '')
                return f"Searching codebase for '{query}'"
                
            # Default description with more details
            param_preview = ", ".join([f"{k}={str(v)[:20]}" for k, v in tool_input.items()][:3])
            if len(tool_input) > 3:
                param_preview += "..."
            return f"Using {tool_name} with parameters: {param_preview}"
            
        except Exception as e:
            logging.error(f"Error creating action description: {str(e)}")
            return f"Using {tool_name}"

    def chat(self, user_input):
        """
        Process a chat message from the user.
        user_input can be either a string (text-only) or a list (multimodal message)
        """
        # Handle special commands only for text-only messages
        if isinstance(user_input, str):
            if user_input.lower() == 'refresh':
                self.refresh_tools()
                return "Tools refreshed successfully!"
            elif user_input.lower() == 'reset':
                self.reset()
                return "Conversation reset!"
            elif user_input.lower() == 'quit':
                return "Goodbye!"

        try:
            self.console.print(f"here is conversation history: {self.conversation_history}")
            # Add user message to conversation history
            self.conversation_history.append({
                "role": "user",
                "content": user_input  # This can be either string or list
            })
            
            # Reset auto tool call counter for new user input
            self.current_auto_tool_calls = 0
            
            # Update context manager with user input for context tracking
            if isinstance(user_input, str):
                self.context_manager.analyze_user_input(user_input)
            
            # Show thinking indicator if enabled
            if self.thinking_enabled:
                self.console.print("[cyan]Thinking...[/cyan]")
                response = self._get_completion()
            else:
                response = self._get_completion()
                
            # After getting a response, ensure all directories in context are properly explored
            self._ensure_directories_explored()
            
            # Check if any files were mentioned but not read
            self._check_mentioned_files()

            return response

        except Exception as e:
            logging.error(f"Error in chat: {str(e)}")
            import traceback
            logging.error(traceback.format_exc())
            # Check if this is a tag mismatch error
            if "closing tag" in str(e) and "doesn't match any open tag" in str(e):
                # Log more detailed information for debugging
                logging.error("XML tag mismatch detected. This might be due to malformed tags in templates or responses.")
                # Try to extract the problematic tag from the error message
                import re
                tag_match = re.search(r"closing tag '([^']+)'", str(e))
                if tag_match:
                    problematic_tag = tag_match.group(1)
                    logging.error(f"Problematic tag: {problematic_tag}")
                # Return a more user-friendly error message
                return f"Error: There's an issue with the formatting of the response. Please check the template tags in your agent definitions."
            # Fix: Create the error message first, then escape brackets
            error_msg = f"Error: {str(e)}"
            # Replace brackets outside of the f-string
            error_msg = error_msg.replace('[', r'\[').replace(']', r'\]')
            return error_msg
            
    def _check_mentioned_files(self):
        """
        Check if any files were mentioned in the conversation but not read.
        This helps ensure that all relevant files are explored within a step.
        """
        # Extract file paths mentioned in the conversation
        mentioned_files = set()
        for message in self.conversation_history:
            if message.get("role") == "assistant" and message.get("content"):
                content = message.get("content", "")
                if isinstance(content, str):
                    # Simple regex to find potential file paths
                    file_matches = re.findall(r'`[^`]*`|\b[\w\-\.\/]+\.(py|js|ts|jsx|tsx|html|css|json|md|txt)\b', content)
                    for match in file_matches:
                        # Clean up the match
                        file_path = match.strip('`')
                        if os.path.exists(file_path) and os.path.isfile(file_path):
                            mentioned_files.add(file_path)
        
        # Check which mentioned files haven't been read
        unread_files = mentioned_files - self.context_manager.current_files
        
        # Read unread files that were mentioned
        for file_path in unread_files:
            self.console.print(f"[yellow]File {file_path} was mentioned but not read. Reading...[/yellow]")
            
            # Create a mock tool use object for reading the file
            class ToolUseMock:
                def __init__(self, name, input_data):
                    self.name = name
                    self.input = input_data
            
            tool_use = ToolUseMock("filecontentreadertool", {"file_paths": [file_path]})
            result = self._execute_tool(tool_use)
            
            # Add the tool call to conversation history
            tool_call_id = f"auto_read_{file_path}"
            tool_call_message = {
                "role": "assistant",
                "content": None,
                "tool_calls": [{
                    "id": tool_call_id,
                    "type": "function",
                    "function": {
                        "name": "filecontentreadertool",
                        "arguments": json.dumps({"file_paths": [file_path]})
                    }
                }]
            }
            self.conversation_history.append(tool_call_message)
            
            self.conversation_history.append({
                "role": "tool",
                "tool_call_id": tool_call_id,
                "name": "filecontentreadertool",
                "content": str(result)
            })
            
            self.console.print(f"[green]File {file_path} read.[/green]")
            
            # Add the file to current_files
            self.context_manager.current_files.add(file_path)

    def reset(self):
        """
        Reset the conversation history and token count.
        """
        self.console.print("\n[bold yellow]Resetting conversation...[/bold yellow]")
        
        # Save the system prompt
        system_prompt = None
        for message in self.conversation_history:
            if message["role"] == "system" and len(self.conversation_history) > 0:
                system_prompt = message["content"]
                break
        
        # Clear conversation history
        self.conversation_history = []
        
        # Reset token count
        self.total_tokens_used = 0
        
        # Reset context manager
        self.context_manager = ContextManager()
        self.current_auto_tool_calls = 0
        
        # Re-add the system prompt
        if system_prompt:
            self.conversation_history.append({
                "role": "system",
                "content": system_prompt
            })
        else:
            # Generate a new system prompt if the original one wasn't found
            tool_info = self.tool_manager.generate_tool_info()
            system_prompt = f"{SystemPrompts.DEFAULT}\n\n{SystemPrompts.TOOL_USAGE}\n\n{tool_info}\n\n{SystemPrompts.AGENTIC_BEHAVIOR}"
            self.conversation_history.append({
                "role": "system",
                "content": system_prompt
            })
        
        self.console.print("[bold green]Conversation reset successfully![/bold green]")
        
        # Display welcome message and available tools
        welcome_text = """
# Claude Engineer v3. A self-improving assistant framework with tool creation

Type 'refresh' to reload available tools
Type 'reset' to clear conversation history
Type 'quit' to exit

Available tools:
"""
        self.console.print(Markdown(welcome_text))
        self.display_available_tools()


    def main(self, *args, **kwargs):
        """
        Main entry point for the agent. This method is called by the AutoGen framework.
        
        Args:
            *args: Variable length argument list
            **kwargs: Arbitrary keyword arguments
            
        Returns:
            A tuple (final, reply) where final is a boolean indicating if the conversation should end,
            and reply is the response message.
        """
        try:
            # Check if we're being called from the AutoGen framework
            if args or kwargs:
                messages = kwargs.get('messages', [])
                if messages:
                    last_message = messages[-1]
                    sender_name = last_message.get('name', '')
                    content = last_message.get('content', '')
                    
                    # Check if the message is from the UserProxyAgent
                    if sender_name == "UserProxyAgent":
                        self.console.print(f"[cyan]Received request from UserProxyAgent: {content}[/cyan]")
                        
                        # Process the user query directly
                        response = self.chat(content)
                        return False, {"role": "assistant", "content": response}
                    
                    # Handle normal message processing
                    self.console.print(f"[cyan]Processing message from {sender_name}: {content}[/cyan]")
                    
                    # Check if we have steps to process
                    if hasattr(self, 'context') and 'steps' in self.context:
                        step_keys = sorted([k for k in self.context['steps'].keys() if k.startswith('step')])
                        
                        while self.current_step_index < len(step_keys):
                            current_step_key = step_keys[self.current_step_index]
                            current_step = self.context['steps'][current_step_key]
                            
                            # Check if current_step is a string or a dictionary
                            if isinstance(current_step, dict) and 'description' in current_step:
                                step_description = current_step['description']
                                step_details = current_step.get('details', '')
                                self.console.print(f"[bold cyan]Processing step {self.current_step_index + 1}/{len(step_keys)}: {step_description}[/bold cyan]")
                                
                                # Increment the step index for the next call
                                self.current_step_index += 1
                                
                                # Process the step
                                response = self.chat(f"Execute step: {step_description}\n\nDetails: {step_details}")
                            else:
                                # If current_step is a string, use it directly
                                self.console.print(f"[bold cyan]Processing step {self.current_step_index + 1}/{len(step_keys)}[/bold cyan]")
                                
                                # Increment the step index for the next call
                                self.current_step_index += 1
                                
                                # Process the step
                                response = self.chat(f"Execute step: {current_step}")
                        self.console.print("[bold yellow]All steps completed.[/bold yellow]")
                        return False, {"role": "assistant", "content": response}
                    
                    # If no steps are defined, just process the message
                    response = self.chat(content)
                    return False, {"role": "assistant", "content": response}
            
            # If we're not being called from the AutoGen framework, prompt for user input
            user_input = self.context.get('user_input', '')
            if user_input.lower() == 'quit':
                self.console.print("\n[bold blue]👋 Goodbye![/bold blue]")
                return True, {"role": "assistant", "content": "Execution completed successfully"}
            elif user_input.lower() == 'reset':
                self.reset()
                return self.main(*args, **kwargs)
            
            response = self.chat(user_input)
            self.console.print("\n[bold purple]Claude Engineer:[/bold purple]")
            
            if isinstance(response, str):
                safe_response = response.replace('[', '\\[').replace(']', '\\]')
                self.console.print(f"\n{safe_response}")
            else:
                self.console.print(f"\n{str(response)}")
            
            return False, {"role": "assistant", "content": response}
                
        except KeyboardInterrupt:
            self.console.print("\n[bold yellow]Operation interrupted by user[/bold yellow]")
            return True, {"role": "assistant", "content": "Operation interrupted by user"}

    def _is_step_fully_processed(self):
        """
        Check if the current step has been fully processed by examining the conversation history.
        A step is considered fully processed if:
        1. The last message is from the assistant (not a tool call)
        2. There are no unexplored directories in the context
        3. There are no unread files mentioned in the conversation
        
        Returns:
            bool: True if the step is fully processed, False otherwise
        """
        # Check if the last message is from the assistant
        if not self.conversation_history:
            return False
            
        last_message = self.conversation_history[-1]
        if last_message.get("role") != "assistant" or not last_message.get("content"):
            return False
            
        # Check if there are unexplored directories
        for directory in self.context_manager.current_directories:
            directory_explored = False
            for file in self.context_manager.current_files:
                if file.startswith(directory):
                    directory_explored = True
                    break
            if not directory_explored:
                return False
                
        # Check if there are unread files mentioned in the conversation
        mentioned_files = set()
        for message in self.conversation_history:
            if message.get("role") == "assistant" and message.get("content"):
                content = message.get("content", "")
                if isinstance(content, str):
                    # Simple regex to find potential file paths
                    file_matches = re.findall(r'`[^`]*`|\b[\w\-\.\/]+\.(py|js|ts|jsx|tsx|html|css|json|md|txt)\b', content)
                    for match in file_matches:
                        # Clean up the match
                        file_path = match.strip('`')
                        if os.path.exists(file_path) and os.path.isfile(file_path):
                            mentioned_files.add(file_path)
        
        unread_files = mentioned_files - self.context_manager.current_files
        if unread_files:
            return False
            
        return True

    def _generate_tool_info(self) -> str:
        """
        Generate a formatted string with information about all available tools.
        This is used to enhance the system prompt with dynamic tool information.
        """
        if not self.tools:
            return "No tools are currently available."
            
        tool_info = "# Available Tools\n\n"
        
        # Sort tools by name for consistent display
        sorted_tools = sorted(self.tools, key=lambda x: x['name'])
        
        for tool_info_dict in sorted_tools:
            name = tool_info_dict['name']
            description = tool_info_dict['description'].strip()
            
            # Add tool name and description
            tool_info += f"## {name}\n{description}\n\n"
            
            # Add input schema if available
            if 'input_schema' in tool_info_dict and tool_info_dict['input_schema']:
                try:
                    # Extract required parameters
                    required_params = tool_info_dict['input_schema'].get('required', [])
                    properties = tool_info_dict['input_schema'].get('properties', {})
                    
                    if properties:
                        tool_info += "### Parameters:\n"
                        for param_name, param_info in properties.items():
                            param_type = param_info.get('type', 'any')
                            param_desc = param_info.get('description', '')
                            required_mark = "*" if param_name in required_params else ""
                            tool_info += f"- {param_name}{required_mark} ({param_type}): {param_desc}\n"
                except Exception:
                    pass
            
            tool_info += "\n"
            
        return tool_info

    def _ensure_directories_explored(self):
        """
        Ensure that all directories in the current context are explored for file content.
        This method checks if directories have been properly explored and contain files.
        If a directory appears to be empty or unexplored, it will trigger a list_directory
        tool call to explore it.
        """
        if not hasattr(self, 'context_manager') or not hasattr(self.context_manager, 'current_directories'):
            return
            
        for directory in list(self.context_manager.current_directories):
            if not os.path.exists(directory):
                self.console.print(f"[yellow]Directory {directory} does not exist. Removing from context.[/yellow]")
                self.context_manager.current_directories.remove(directory)
                continue
                
            try:
                # Check if directory is empty
                contents = os.listdir(directory)
                if not contents:
                    self.console.print(f"[yellow]Directory {directory} is empty.[/yellow]")
                    continue
                    
                # Check if we have explored this directory (if any files from this directory are in current_files)
                directory_explored = False
                for file in self.context_manager.current_files:
                    if file.startswith(directory):
                        directory_explored = True
                        break
                        
                if not directory_explored:
                    self.console.print(f"[yellow]Directory {directory} has not been explored. Exploring...[/yellow]")
                    
                    # Create a mock tool use object for list_directory
                    class ToolUseMock:
                        def __init__(self, name, input_data):
                            self.name = name
                            self.input = input_data
                    
                    tool_use = ToolUseMock("list_directory", {"directory_path": directory})
                    result = self._execute_tool(tool_use)
                    
                    # Add the tool call and result to conversation history
                    tool_call_id = f"auto_list_{directory}"
                    self.conversation_history.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [{
                            "id": tool_call_id,
                            "type": "function",
                            "function": {
                                "name": "list_directory",
                                "arguments": json.dumps({"directory_path": directory})
                            }
                        }]
                    })
                    
                    self.conversation_history.append({
                        "role": "tool",
                        "tool_call_id": tool_call_id,
                        "name": "list_directory",
                        "content": str(result)
                    })
                    
                    self.console.print(f"[green]Directory {directory} explored.[/green]")
                    
                    # Check if the directory needs deeper exploration
                    self._explore_directory_deeper(directory, contents)
            except Exception as e:
                self.console.print(f"[red]Error exploring directory {directory}: {str(e)}[/red]")
                
    def _explore_directory_deeper(self, directory, contents):
        """
        Explore a directory more deeply by examining its contents.
        This helps ensure that important files and subdirectories are not missed.
        
        Args:
            directory: The directory to explore
            contents: List of items in the directory
        """
        # Check for important files that should be read
        important_extensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.html', '.css']
        important_filenames = ['README', 'requirements.txt', 'package.json', 'setup.py', 'config.json', '.env']
        
        # Find important files to read
        important_files = []
        for item in contents:
            item_path = os.path.join(directory, item)
            if os.path.isfile(item_path):
                # Check if it's an important file by extension or name
                file_ext = os.path.splitext(item)[1].lower()
                if file_ext in important_extensions or any(name.lower() in item.lower() for name in important_filenames):
                    important_files.append(item_path)
            elif os.path.isdir(item_path):
                # Add subdirectory to current_directories
                self.context_manager.current_directories.add(item_path)
        
        # Read important files (limit to 3 to avoid overwhelming)
        for file_path in important_files[:3]:
            if file_path not in self.context_manager.current_files:
                self.console.print(f"[yellow]Reading important file: {file_path}[/yellow]")
                
                # Create a mock tool use object for reading the file
                class ToolUseMock:
                    def __init__(self, name, input_data):
                        self.name = name
                        self.input = input_data
                
                tool_use = ToolUseMock("filecontentreadertool", {"file_paths": [file_path]})
                result = self._execute_tool(tool_use)
                
                # Add the tool call and result to conversation history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [{
                        "id": f"auto_read_{file_path}",
                        "type": "function",
                        "function": {
                            "name": "filecontentreadertool",
                            "arguments": json.dumps({"file_paths": [file_path]})
                        }
                    }]
                })
                
                self.conversation_history.append({
                    "role": "tool",
                    "tool_call_id": f"auto_read_{file_path}",
                    "name": "filecontentreadertool",
                    "content": str(result)
                })
                
                self.context_manager.current_files.add(file_path)
                self.console.print(f"[green]File {file_path} read.[/green]")

class ToolManager:
    """
    A class to manage tools for the LLM_Agent.
    This class is responsible for loading, storing, and providing access to tools.
    """
    
    def __init__(self, console=None):
        """
        Initialize the ToolManager.
        
        Args:
            console: A rich.console.Console instance for output
        """
        self.console = console or Console()
        self._tools = []
        self._load_tools()
    
    def _load_tools(self) -> List[Dict[str, Any]]:
        """
        Dynamically load all tool classes from the tools directory.
        If a dependency is missing, prompt the user to install it via uvpackagemanager.
        
        Returns:
            A list of tools (dicts) containing their 'name', 'description', and 'input_schema'.
        """
        self.console.print("\n[bold cyan]Loading tools...[/bold cyan]")
        tools_list = []
        
        # Ensure TOOLS_DIR is set and exists
        tools_path = getattr(Config, 'TOOLS_DIR', None)
        if tools_path is None:
            self.console.print("[red]TOOLS_DIR not set in Config[/red]")
            # Set a default path if not configured
            tools_path = Path(__file__).parent / "tools"
            self.console.print(f"[yellow]Using default tools path: {tools_path}[/yellow]")
        
        # Ensure tools_path is a Path object
        if not isinstance(tools_path, Path):
            tools_path = Path(tools_path)
        
        self.console.print(f"[cyan]Tools path: {tools_path}[/cyan]")
        
        # Ensure the tools directory exists
        if not tools_path.exists():
            self.console.print(f"[red]Tools directory does not exist: {tools_path}[/red]")
            try:
                tools_path.mkdir(parents=True, exist_ok=True)
                self.console.print(f"[green]Created tools directory: {tools_path}[/green]")
            except Exception as e:
                self.console.print(f"[red]Error creating tools directory: {str(e)}[/red]")
                return tools_list
        
        # Add the parent directory to sys.path to ensure imports work correctly
        parent_dir = str(tools_path.parent)
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
            self.console.print(f"[cyan]Added {parent_dir} to sys.path[/cyan]")
        
        # Add the tools directory itself to sys.path
        if str(tools_path) not in sys.path:
            sys.path.insert(0, str(tools_path))
            self.console.print(f"[cyan]Added {tools_path} to sys.path[/cyan]")

        # Clear cached tool modules for fresh import
        for module_name in list(sys.modules.keys()):
            if module_name.startswith('tools.') or module_name.startswith('Agents.tools.'):
                if module_name != 'tools.base' and module_name != 'Agents.tools.base':
                    del sys.modules[module_name]
                    self.console.print(f"[cyan]Cleared cached module: {module_name}[/cyan]")

        try:
            for module_info in pkgutil.iter_modules([str(tools_path)]):
                if module_info.name == 'base':
                    self.console.print(f"[yellow]Skipping base module as it's not a tool[/yellow]")    
                    continue
                
                # Attempt loading the tool module
                try:
                    # Try both import paths
                    module = None
                    import_errors = []
                    
                    try:
                        module_name = f'Agents.tools.{module_info.name}'
                        module = importlib.import_module(module_name)
                        #self.console.print(f"[green]Loaded module using path: {module_name}[/green]")
                    except ImportError as e1:
                        import_errors.append(f"Error with 'Agents.tools.{module_info.name}': {str(e1)}")
                        try:
                            module_name = f'tools.{module_info.name}'
                            module = importlib.import_module(module_name)
                            self.console.print(f"[green]Loaded module using path: {module_name}[/green]")
                        except ImportError as e2:
                            import_errors.append(f"Error with 'tools.{module_info.name}': {str(e2)}")
                    
                    if module:
                        # Extract tools from the module and add them to the tools list
                        module_tools = []
                        self._extract_tools_from_module(module, module_tools)
                        
                        if module_tools:
                            tools_list.extend(module_tools)
                            self.console.print(f"[green]Loaded tool: {module_info.name}[/green]")
                        else:
                            self.console.print(f"[yellow]No tools found in module: {module_info.name}[/yellow]")
                    else:
                        self.console.print(f"[red]Failed to import module {module_info.name}:[/red]")
                        for err in import_errors:
                            self.console.print(f"[red]{err}[/red]")
                        
                        # Handle missing dependencies
                        missing_module = self._parse_missing_dependency(import_errors[-1])
                        self.console.print(f"\n[yellow]Missing dependency:[/yellow] {missing_module} for tool {module_info.name}")
                        user_response = input(f"Would you like to install {missing_module}? (y/n): ").lower()

                        if user_response == 'y':
                            success = self._execute_uv_install(missing_module)
                            if success:
                                # Retry loading the module after installation
                                try:
                                    # Try both import paths again
                                    try:
                                        module = importlib.import_module(f'Agents.tools.{module_info.name}')
                                    except ImportError:
                                        module = importlib.import_module(f'tools.{module_info.name}')
                                    
                                    module_tools = []
                                    self._extract_tools_from_module(module, module_tools)
                                    
                                    if module_tools:
                                        tools_list.extend(module_tools)
                                        self.console.print(f"[green]Loaded tool after installing dependency: {module_info.name}[/green]")
                                    else:
                                        self.console.print(f"[yellow]No tools found in module after installing dependency: {module_info.name}[/yellow]")
                                except Exception as retry_err:
                                    self.console.print(f"[red]Failed to load tool after installation: {str(retry_err)}[/red]")
                            else:
                                self.console.print(f"[red]Installation of {missing_module} failed. Skipping this tool.[/red]")
                        else:
                            self.console.print(f"[yellow]Skipping tool {module_info.name} due to missing dependency[/yellow]")
                except Exception as mod_err:
                    self.console.print(f"[red]Error loading module {module_info.name}:[/red] {str(mod_err)}")
                    import traceback
                    self.console.print(f"[red]{traceback.format_exc()}[/red]")
        except Exception as overall_err:
            self.console.print(f"[red]Error in tool loading process:[/red] {str(overall_err)}")
            import traceback
            self.console.print(f"[red]{traceback.format_exc()}[/red]")

        self.console.print(f"[green]Successfully loaded {len(tools_list)} tools[/green]")
        self._tools = tools_list
        return tools_list
    
    def _parse_missing_dependency(self, error_str: str) -> str:
        """
        Parse the missing dependency name from an ImportError string.
        """
        if "No module named" in error_str:
            parts = error_str.split("No module named")
            missing_module = parts[-1].strip(" '\"")
        else:
            missing_module = error_str
        return missing_module
    
    def _extract_tools_from_module(self, module, tools: List[Dict[str, Any]]) -> None:
        """
        Given a tool module, find and instantiate all tool classes (subclasses of BaseTool).
        Append them to the 'tools' list.
        """
        found_tools = False
        for name, obj in inspect.getmembers(module):
            if (inspect.isclass(obj) and hasattr(obj, '__mro__')):
                # Check if BaseTool is in the class's MRO (Method Resolution Order)
                is_tool_class = False
                for base in obj.__mro__:
                    if base.__name__ == 'BaseTool':
                        is_tool_class = True
                        break
                
                if is_tool_class and obj.__name__ != 'BaseTool':
                    try:
                        tool_instance = obj()
                        
                        # Verify the tool has all required attributes
                        if not hasattr(tool_instance, 'name') or not tool_instance.name:
                            self.console.print(f"[yellow]Warning: Tool {name} has no name attribute, skipping[/yellow]")
                            continue
                        
                        if not hasattr(tool_instance, 'description') or not tool_instance.description:
                            self.console.print(f"[yellow]Warning: Tool {tool_instance.name} has no description, skipping[/yellow]")
                            continue
                        
                        if not hasattr(tool_instance, 'input_schema') or not tool_instance.input_schema:
                            self.console.print(f"[yellow]Warning: Tool {tool_instance.name} has no input_schema, skipping[/yellow]")
                            continue
                        
                        # Check if tool with same name already exists
                        if any(t['name'] == tool_instance.name for t in tools):
                            self.console.print(f"[yellow]Tool with name {tool_instance.name} already exists, skipping duplicate[/yellow]")
                            continue
                        
                        # Add the tool to the list
                        tools.append({
                            "name": tool_instance.name,
                            "description": tool_instance.description,
                            "input_schema": tool_instance.input_schema
                        })
                        
                        self.console.print(f"[green]Added tool: {tool_instance.name}[/green]")
                        found_tools = True
                    except Exception as tool_init_err:
                        self.console.print(f"[yellow]Error instantiating tool class {name}: {str(tool_init_err)}[/yellow]")
        
        if not found_tools:
            self.console.print(f"[yellow]No tools found in module {module.__name__}[/yellow]")
    
    def _execute_uv_install(self, package_name: str) -> bool:
        """
        Execute the uvpackagemanager tool directly to install the missing package.
        Returns True if installation seems successful (no errors in output), otherwise False.
        """
        # Find the uvpackagemanager tool
        uvpackagemanager_tool = None
        for tool in self._tools:
            if tool['name'].lower() == 'uvpackagemanager':
                uvpackagemanager_tool = tool
                break
        
        if not uvpackagemanager_tool:
            self.console.print("[yellow]UVPackageManager tool not found, cannot install dependencies[/yellow]")
            return False
        
        # Try to find the tool module
        try:
            module = importlib.import_module('Agents.tools.uvpackagemanager')
        except ImportError:
            try:
                module = importlib.import_module('tools.uvpackagemanager')
            except ImportError:
                self.console.print("[red]Failed to import UVPackageManager module[/red]")
                return False
        
        # Find the tool class
        tool_class = None
        for name, obj in inspect.getmembers(module):
            if (inspect.isclass(obj) and hasattr(obj, '__mro__')):
                is_tool_class = False
                for base in obj.__mro__:
                    if base.__name__ == 'BaseTool':
                        is_tool_class = True
                        break
        
        if not tool_class:
            self.console.print("[red]UVPackageManager tool class not found[/red]")
            return False
        
        # Create an instance and execute it
        try:
            tool_instance = tool_class()
            result = tool_instance.execute(command="install", packages=[package_name])
            
            if "Error" not in result and "failed" not in result.lower():
                self.console.print("[green]The package was installed successfully.[/green]")
                return True
            else:
                self.console.print(f"[red]Failed to install {package_name}. Output:[/red] {result}")
                return False
        except Exception as e:
            self.console.print(f"[red]Error executing UVPackageManager: {str(e)}[/red]")
            return False
    
    def refresh_tools(self):
        """
        Refresh the list of available tools by reloading them from the tools directory.
        This is useful when new tools are added or existing tools are modified.
        """
        self.console.print("\n[bold cyan]Refreshing tools...[/bold cyan]")
        self._load_tools()
        self.console.print(f"[green]Successfully refreshed {len(self._tools)} tools[/green]")
    
    def display_available_tools(self):
        """
        Display all available tools with their descriptions.
        """
        if not self._tools:
            self.console.print("\n[yellow]No tools available[/yellow]")
            return
            
        self.console.print("\n[bold cyan]Available Tools:[/bold cyan]")
        
        # Sort tools by name for consistent display
        sorted_tools = sorted(self._tools, key=lambda x: x['name'])
        
        if not sorted_tools:
            self.console.print("[yellow]No tools available after sorting[/yellow]")
            return
            
        self.console.print(f"[green]Found {len(sorted_tools)} tools[/green]")
        
        for tool_info in sorted_tools:
            name = tool_info['name']
            description = tool_info.get('description', '').strip()
            
            # Display tool name and description
            #self.console.print(f"🔧 [cyan]{name}[/cyan]:")
            
            if description:
                description_lines = description.split('\n')
                formatted_description = '\n    '.join(line.strip() for line in description_lines)
                #self.console.print(f"    {formatted_description}")
            else:
                #self.console.print("    [yellow]No description available[/yellow]")
                pass
            
            # Display input schema if available
            if 'input_schema' in tool_info and tool_info['input_schema']:
                try:
                    # Extract required parameters
                    required_params = tool_info['input_schema'].get('required', [])
                    properties = tool_info['input_schema'].get('properties', {})
                    
                    if properties:
                        self.console.print("    [bold]Parameters:[/bold]")
                        for param_name, param_info in properties.items():
                            param_type = param_info.get('type', 'any')
                            param_desc = param_info.get('description', '')
                            required_mark = "[red]*[/red]" if param_name in required_params else ""
                            #self.console.print(f"      - {param_name}{required_mark} ({param_type}): {param_desc}")
                except Exception as e:
                    self.console.print(f"    [yellow]Error displaying schema: {str(e)}[/yellow]")
            
            self.console.print("")  # Add a blank line between tools
    
    def get_tools(self):
        """
        Get the list of available tools.
        
        Returns:
            A list of tools (dicts) containing their 'name', 'description', and 'input_schema'.
        """
        return self._tools
    
    def find_tool(self, tool_name: str):
        """
        Find a tool by name.
        
        Args:
            tool_name: The name of the tool to find
            
        Returns:
            The tool dict if found, None otherwise
        """
        for tool in self._tools:
            if tool['name'].lower() == tool_name.lower():
                return tool
        return None
    
    def generate_tool_info(self) -> str:
        """
        Generate a formatted string with information about all available tools.
        This is used to enhance the system prompt with dynamic tool information.
        """
        if not self._tools:
            return "No tools are currently available."
            
        tool_info = "# Available Tools\n\n"
        
        # Sort tools by name for consistent display
        sorted_tools = sorted(self._tools, key=lambda x: x['name'])
        
        for tool_info_dict in sorted_tools:
            name = tool_info_dict['name']
            description = tool_info_dict['description'].strip()
            
            # Add tool name and description
            tool_info += f"## {name}\n{description}\n\n"
            
            # Add input schema if available
            if 'input_schema' in tool_info_dict and tool_info_dict['input_schema']:
                try:
                    # Extract required parameters
                    required_params = tool_info_dict['input_schema'].get('required', [])
                    properties = tool_info_dict['input_schema'].get('properties', {})
                    
                    if properties:
                        tool_info += "### Parameters:\n"
                        for param_name, param_info in properties.items():
                            param_type = param_info.get('type', 'any')
                            param_desc = param_info.get('description', '')
                            required_mark = "*" if param_name in required_params else ""
                            tool_info += f"- {param_name}{required_mark} ({param_type}): {param_desc}\n"
                except Exception:
                    pass
            
            tool_info += "\n"
            
        return tool_info

class ContextManager:
    """
    Manages context for the LLM_Agent, tracking information about the current
    conversation, files being discussed, and other relevant context.
    """
    
    def __init__(self):
        self.current_files = set()
        self.current_directories = set()
        self.recent_topics = []
        self.workspace_root = os.getcwd()
    
    def analyze_user_input(self, user_input: str) -> None:
        """
        Analyze user input to extract context like file paths, directories, etc.
        """
        import re
        
        # Extract potential file paths
        file_patterns = [
            r'["\']?([\/\w\.-]+\.\w+)["\']?',  # Matches file paths with extensions
            r'["\']?([\w\.-]+\.\w+)["\']?'     # Matches filenames with extensions
        ]
        
        # Extract potential directory paths
        dir_patterns = [
            r'["\']?([\/\w\.-]+\/)["\']?',     # Matches directory paths ending with /
            r'directory\s+["\']?([\w\.-\/]+)["\']?',  # Matches "directory X"
            r'folder\s+["\']?([\w\.-\/]+)["\']?'      # Matches "folder X"
        ]
        
        # Extract file paths
        for pattern in file_patterns:
            matches = re.findall(pattern, user_input)
            for match in matches:
                if os.path.isfile(match):
                    self.current_files.add(match)
                elif os.path.isfile(os.path.join(self.workspace_root, match)):
                    self.current_files.add(os.path.join(self.workspace_root, match))
        
        # Extract directory paths
        for pattern in dir_patterns:
            matches = re.findall(pattern, user_input)
            for match in matches:
                if os.path.isdir(match):
                    self.current_directories.add(match)
                elif os.path.isdir(os.path.join(self.workspace_root, match)):
                    self.current_directories.add(os.path.join(self.workspace_root, match))
    
    def get_relevant_context(self) -> Dict[str, Any]:
        """
        Get relevant context information for the current conversation.
        """
        return {
            "current_files": list(self.current_files),
            "current_directories": list(self.current_directories),
            "workspace_root": self.workspace_root,
            "recent_topics": self.recent_topics
        }

# %%
