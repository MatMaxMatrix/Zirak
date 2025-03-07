#!/usr/bin/env python3
"""
Test script to verify that the LLM_Agent can access all tools in the tools directory.
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

# Import the LLM_Agent
from Agents.LLM_Agent import LLM_Agent

def main():
    """
    Main function to test the LLM_Agent's ability to access tools.
    """
    try:
        print("\n" + "="*80)
        print("Testing LLM_Agent's ability to access tools")
        print("="*80 + "\n")
        
        # Create an instance of the LLM_Agent
        agent = LLM_Agent()
        
        # Debug: Print the raw tools list
        print("\n" + "="*80)
        print("DEBUG: Raw tools list")
        print("="*80)
        print(f"Number of tools: {len(agent.tools)}")
        if len(agent.tools) > 0:
            print(f"First tool: {agent.tools[0]}")
        
        # Debug: Print all attributes of the agent
        print("\n" + "="*80)
        print("DEBUG: Agent attributes")
        print("="*80)
        for attr_name in dir(agent):
            if not attr_name.startswith('__') and not callable(getattr(agent, attr_name)):
                attr_value = getattr(agent, attr_name)
                if attr_name == 'tool_manager':
                    print(f"{attr_name}: {type(attr_value)}")
                    print(f"Number of tools in tool_manager: {len(attr_value._tools)}")
                    if len(attr_value._tools) > 0:
                        print(f"First tool in tool_manager: {attr_value._tools[0]['name']}")
                elif attr_name == 'tools':
                    print(f"{attr_name}: {type(attr_value)}")
                    print(f"Number of tools: {len(attr_value)}")
                    if len(attr_value) > 0:
                        print(f"First tool: {attr_value[0]['name']}")
                else:
                    print(f"{attr_name}: {type(attr_value)}")
        
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