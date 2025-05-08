#!/usr/bin/env python
import os
import sys
import re
import autopep8


def fix_indentation_issues(file_path):
    print(f"Fixing indentation issues in {file_path}...")

    # Read the file
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix specific indentation issues by using autopep8
    fixed_content = autopep8.fix_code(
        content, options={"aggressive": 3, "max_line_length": 100, "indent_size": 4}
    )

    # Write the fixed content back
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(fixed_content)

    print(f"Fixed indentation issues in {file_path}")


if __name__ == "__main__":
    # Path to the LLM_Agent.py file
    file_path = os.path.join("Agents", "LLM_Agent.py")

    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found")
        sys.exit(1)

    fix_indentation_issues(file_path)
    print("Done!")
