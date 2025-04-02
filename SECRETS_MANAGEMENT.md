# Secrets Management Guidelines

## Overview
This document outlines our team's approach to managing secrets and credentials to avoid security risks.

## Best Practices

### 1. Environment Variables
- Store all secrets in `.env` files which are NOT committed to Git
- Use the `.env.example` file as a template (with dummy values)
- For local development, create your own `.env.local` file

### 2. Git Practices
- Never use `git add .` or `git add *` - add files individually
- Always check `git status` before committing
- Use `git diff --staged` to verify what you're about to commit

### 3. API Keys and Credentials
- Use minimal permissions for API keys
- Rotate keys regularly (at least every 90 days)
- Never share keys via Slack, email, or other messaging platforms
- Use environment-specific keys (development vs. production)

### 4. In Case of Secret Exposure
If a secret is accidentally committed:
1. Immediately revoke and rotate the exposed key
2. Contact the security team
3. Do NOT attempt to remove from Git history without guidance

## Tools and Resources
- Pre-commit hooks: Consider setting up git hooks to prevent committing secrets
- [GitGuardian](https://www.gitguardian.com/): For automated secrets scanning 