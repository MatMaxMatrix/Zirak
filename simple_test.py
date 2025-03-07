#!/usr/bin/env python3
"""
Simple test script to verify that the LLM_Agent can access all tools in the tools directory.
This script bypasses the autogen inheritance to focus on the core functionality.
"""

import os
import sys
from pathlib import Path
import builtins
import json
import inspect

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Create a mock input function to automatically answer 'n' to installation prompts
original_input = builtins.input

def mock_input(prompt):
    """Mock input function that automatically answers 'n' to installation prompts."""
    print(f"Auto-answering: {prompt}")
    if "install" in prompt.lower():
        print("Automatically answering: n")
        return "n"
    return original_input(prompt)

# Replace the built-in input function with our mock
builtins.input = mock_input

# Import necessary components
from Agents.config import Config
from Agents.tools.base import BaseTool
from rich.console import Console
from typing import List, Dict, Any
import importlib
import pkgutil

class SimpleLLMAgent:
    """
    A simplified version of the LLM_Agent that focuses on tool loading and management.
    """
    
    def __init__(self):
        self.console = Console()
        self.console.print("[bold cyan]Initializing SimpleLLMAgent...[/bold cyan]")
        
        # Initialize tools list
        self._tools = []
        
        # Load tools
        self._tools = self._load_tools()
        self.console.print(f"[green]Loaded {len(self._tools)} tools[/green]")
    
    def _load_tools(self) -> List[Dict[str, Any]]:
        """
        Dynamically load all tool classes from the tools directory.
        """
        self.console.print("\n[bold cyan]Loading tools...[/bold cyan]")
        tools_list = []
        
        # Get tools directory path
        tools_path = getattr(Config, 'TOOLS_DIR', None)
        if tools_path is None:
            self.console.print("[red]TOOLS_DIR not set in Config[/red]")
            tools_path = Path(__file__).parent / "Agents" / "tools"
            self.console.print(f"[yellow]Using default tools path: {tools_path}[/yellow]")
        
        # Ensure tools_path is a Path object
        if not isinstance(tools_path, Path):
            tools_path = Path(tools_path)
        
        self.console.print(f"[cyan]Tools path: {tools_path}[/cyan]")
        
        # Add the parent directory to sys.path to ensure imports work correctly
        parent_dir = str(tools_path.parent)
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
            self.console.print(f"[cyan]Added {parent_dir} to sys.path[/cyan]")
        
        # Add the tools directory itself to sys.path
        if str(tools_path) not in sys.path:
            sys.path.insert(0, str(tools_path))
            self.console.print(f"[cyan]Added {tools_path} to sys.path[/cyan]")
        
        # Iterate through all modules in the tools directory
        for module_info in pkgutil.iter_modules([str(tools_path)]):
            if module_info.name == 'base':
                self.console.print(f"[yellow]Skipping base module as it's not a tool[/yellow]")    
                continue
            
            # Try to import the module
            try:
                # Try both import paths
                module = None
                
                try:
                    module_name = f'Agents.tools.{module_info.name}'
                    module = importlib.import_module(module_name)
                    self.console.print(f"[green]Loaded module using path: {module_name}[/green]")
                except ImportError as e1:
                    try:
                        module_name = f'tools.{module_info.name}'
                        module = importlib.import_module(module_name)
                        self.console.print(f"[green]Loaded module using path: {module_name}[/green]")
                    except ImportError as e2:
                        self.console.print(f"[red]Failed to import module {module_info.name}[/red]")
                        continue
                
                # Extract tools from the module
                if module:
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
                                    if any(t['name'] == tool_instance.name for t in tools_list):
                                        self.console.print(f"[yellow]Tool with name {tool_instance.name} already exists, skipping duplicate[/yellow]")
                                        continue
                                    
                                    # Add the tool to the list
                                    tools_list.append({
                                        "name": tool_instance.name,
                                        "description": tool_instance.description,
                                        "input_schema": tool_instance.input_schema
                                    })
                                    
                                    self.console.print(f"[green]Added tool: {tool_instance.name}[/green]")
                                except Exception as e:
                                    self.console.print(f"[red]Error instantiating tool class {name}: {str(e)}[/red]")
            except Exception as e:
                self.console.print(f"[red]Error processing module {module_info.name}: {str(e)}[/red]")
        
        self.console.print(f"[green]Successfully loaded {len(tools_list)} tools[/green]")
        return tools_list
    
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
            self.console.print(f"🔧 [cyan]{name}[/cyan]:")
            
            if description:
                description_lines = description.split('\n')
                formatted_description = '\n    '.join(line.strip() for line in description_lines)
                self.console.print(f"    {formatted_description}")
            else:
                self.console.print("    [yellow]No description available[/yellow]")
            
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
                            self.console.print(f"      - {param_name}{required_mark} ({param_type}): {param_desc}")
                except Exception as e:
                    self.console.print(f"    [yellow]Error displaying schema: {str(e)}[/yellow]")
            
            self.console.print("")  # Add a blank line between tools

def main():
    """
    Main function to test the SimpleLLMAgent's ability to access tools.
    """
    try:
        print("\n" + "="*80)
        print("Testing SimpleLLMAgent's ability to access tools")
        print("="*80 + "\n")
        
        # Create an instance of the SimpleLLMAgent
        agent = SimpleLLMAgent()
        
        # Debug: Print the raw tools list
        print("\n" + "="*80)
        print("DEBUG: Raw tools list")
        print("="*80)
        print(f"Number of tools: {len(agent._tools)}")
        if len(agent._tools) > 0:
            print(f"First tool: {agent._tools[0]}")
        
        # Display available tools
        print("\n" + "="*80)
        print("Displaying available tools")
        print("="*80)
        agent.display_available_tools()
        
        print("\n" + "="*80)
        print("Test completed successfully!")
        print("="*80 + "\n")
    finally:
        # Restore the original input function
        builtins.input = original_input

if __name__ == "__main__":
    main() 