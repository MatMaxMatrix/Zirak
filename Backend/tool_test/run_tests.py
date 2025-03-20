#!/usr/bin/env python3

import os
import sys
import unittest

# Get the absolute path to the project root directory
project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
tools_dir = os.path.join(project_dir, "Agents", "tools")

# Add the project root and tools directory to sys.path
sys.path.append(project_dir)
sys.path.append(tools_dir)
sys.path.append(os.path.dirname(__file__))  # Add the current directory

print(f"Project directory: {project_dir}")
print(f"Tools directory: {tools_dir}")
print(f"Python path: {sys.path}")

# Import the test module
import tool_tests

if __name__ == "__main__":
    # Run the tests
    unittest.main(module=tool_tests) 