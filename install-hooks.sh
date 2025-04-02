#!/bin/bash

# Script to install git hooks

echo "Installing git hooks..."

# Create the hooks directory if it doesn't exist
mkdir -p .git-hooks

# Make sure our pre-commit hook is executable
chmod +x .git-hooks/pre-commit

# Configure git to use our hooks
git config core.hooksPath .git-hooks

echo "✅ Git hooks installed successfully!"
echo "The pre-commit hook will now scan for potential secrets before each commit." 