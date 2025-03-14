from Agents.tools.base import BaseTool
import subprocess
import json
import os
import shlex
import signal
import sys
import re
from typing import Dict, List, Optional, Union
from pathlib import Path

class TerminalCommandTool(BaseTool):
    name = "terminalcommandtool"
    description = '''
    Executes terminal commands in a sandboxed environment within the project directory.
    This tool allows running shell commands with options for timeout, working directory, and environment variables.
    Commands can be run in the background if needed for long-running processes.
    Handles command execution errors gracefully and provides detailed output including stdout, stderr, and exit code.
    
    SECURITY NOTICE: Commands are restricted to run only within the specified project directory.
    Commands that attempt to access or modify files outside the project directory will be blocked.
    '''
    
    # List of potentially dangerous commands that should be used with caution
    DANGEROUS_COMMANDS = {
        'rm', 'rmdir', 'dd', 'mkfs', 'format', 'del', 'fdisk', 'shutdown', 'reboot',
        'halt', 'poweroff', 'init', 'sudo', 'su', 'chmod', 'chown', ':(){:|:&};:'
    }
    
    # List of commands that are completely blocked
    BLOCKED_COMMANDS = {
        'ssh', 'scp', 'ftp', 'telnet', 'nc', 'netcat', 'curl', 'wget', 'rsync',
        'dd', 'mkfs', 'fdisk', 'shutdown', 'reboot', 'halt', 'poweroff', 'init'
    }
    
    # Maximum allowed timeout in seconds
    MAX_TIMEOUT = 300  # 5 minutes
    
    input_schema = {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "The terminal command to execute (will be restricted to project directory)"
            },
            "project_root": {
                "type": "string",
                "description": "The root directory of the project (commands will be restricted to this directory)"
            },
            "working_directory": {
                "type": "string",
                "description": "The working directory for the command (must be within project_root)"
            },
            "timeout": {
                "type": "integer",
                "description": f"Maximum execution time in seconds (max {MAX_TIMEOUT})"
            },
            "run_in_background": {
                "type": "boolean",
                "description": "Whether to run the command in the background (for long-running processes)"
            },
            "env_vars": {
                "type": "object",
                "description": "Additional environment variables to set for the command"
            },
            "interactive": {
                "type": "boolean",
                "description": "Whether the command requires user interaction (will use direct terminal access)"
            }
        },
        "required": ["command", "project_root"]
    }
    
    def _is_path_in_project(self, path: str, project_root: str) -> bool:
        """Check if a path is within the project directory."""
        try:
            # Convert both paths to absolute paths
            abs_path = os.path.abspath(path)
            abs_project_root = os.path.abspath(project_root)
            
            # Check if the path is within the project root
            return abs_path.startswith(abs_project_root)
        except Exception:
            return False
    
    def _is_dangerous_command(self, command: str) -> bool:
        """Check if the command contains potentially dangerous operations."""
        command_parts = command.split()
        if not command_parts:
            return False
            
        base_cmd = command_parts[0]
        
        # Check against dangerous commands list
        if base_cmd in self.DANGEROUS_COMMANDS:
            return True
            
        # Check for rm -rf or similar destructive patterns
        if base_cmd == 'rm' and '-rf' in command_parts:
            return True
            
        return False
    
    def _is_blocked_command(self, command: str) -> bool:
        """Check if the command is completely blocked."""
        command_parts = command.split()
        if not command_parts:
            return False
            
        base_cmd = command_parts[0]
        
        # Check against blocked commands list
        if base_cmd in self.BLOCKED_COMMANDS:
            return True
            
        return False
    
    def _validate_command(self, command: str, project_root: str) -> Dict[str, Union[bool, str]]:
        """
        Validate that a command is safe to run within the project directory.
        
        Returns:
            Dict with 'valid' (bool) and 'reason' (str) if invalid
        """
        # Check if command is empty
        if not command.strip():
            return {"valid": False, "reason": "Empty command"}
        
        # Check if command is in the blocked list
        if self._is_blocked_command(command):
            return {"valid": False, "reason": "Command is blocked for security reasons"}
        
        # Check for commands that might access files outside the project
        command_parts = shlex.split(command)
        base_cmd = command_parts[0]
        
        # Check for path traversal attempts
        if '..' in command or '~' in command:
            # Look for patterns that might be trying to escape the directory
            if re.search(r'(^|[^\w])\.\./', command) or re.search(r'(^|[^\w])~/', command):
                return {"valid": False, "reason": "Path traversal attempts are not allowed"}
        
        # Check for absolute paths in file operations
        file_operation_cmds = {'cat', 'less', 'more', 'head', 'tail', 'cp', 'mv', 'rm', 'touch', 'mkdir', 'rmdir'}
        if base_cmd in file_operation_cmds:
            for part in command_parts[1:]:
                if part.startswith('/') and not self._is_path_in_project(part, project_root):
                    return {"valid": False, "reason": f"Cannot access path outside project: {part}"}
        
        # Check for redirection to external files
        if '>' in command or '>>' in command:
            # Simple check for redirections to absolute paths
            redirect_match = re.search(r'[>]{1,2}\s*(/[^\s]+)', command)
            if redirect_match:
                redirect_path = redirect_match.group(1)
                if not self._is_path_in_project(redirect_path, project_root):
                    return {"valid": False, "reason": f"Cannot write to path outside project: {redirect_path}"}
        
        return {"valid": True}
    
    def _run_command_interactive(self, command: str, project_root: str, cwd: Optional[str] = None, 
                    timeout: Optional[int] = None, 
                    env_vars: Optional[Dict[str, str]] = None,
                    interactive: bool = False) -> Dict[str, Union[str, int]]:
        """Run a command interactively in the same terminal and return its output."""
        try:
            # Validate the command
            validation = self._validate_command(command, project_root)
            if not validation["valid"]:
                return {
                    "stdout": "",
                    "stderr": f"Command validation failed: {validation['reason']}",
                    "exit_code": -1,
                    "success": False,
                    "error": validation["reason"]
                }
            
            # Ensure working directory is within project root
            if cwd:
                if not self._is_path_in_project(cwd, project_root):
                    return {
                        "stdout": "",
                        "stderr": f"Working directory must be within project root: {project_root}",
                        "exit_code": -1,
                        "success": False,
                        "error": "Invalid working directory"
                    }
            else:
                # Default to project root if no working directory specified
                cwd = project_root
            
            # Prepare environment variables
            env = os.environ.copy()
            if env_vars:
                env.update(env_vars)
                
            # Apply timeout limit
            if timeout is not None:
                timeout = min(timeout, self.MAX_TIMEOUT)
            else:
                timeout = self.MAX_TIMEOUT
            
            # Print command to be executed
            print(f"\n\033[1;36mExecuting command: {command}\033[0m")
            print(f"\033[1;36mProject root: {project_root}\033[0m")
            print(f"\033[1;36mWorking directory: {cwd}\033[0m")
            print("-" * 80)
            
            # For interactive commands, use subprocess.run with direct terminal access
            if interactive:
                try:
                    # Use subprocess.run with direct terminal access
                    result = subprocess.run(
                        command,
                        shell=True,
                        cwd=cwd,
                        env=env,
                        timeout=timeout,
                        check=False,  # Don't raise exception on non-zero exit
                        text=True
                    )
                    
                    print("-" * 80)
                    print("\033[1;32mCommand completed.\033[0m")
                    
                    return {
                        "stdout": "Interactive command executed. Check terminal for output.",
                        "stderr": "",
                        "exit_code": result.returncode,
                        "success": result.returncode == 0,
                        "message": "Interactive command completed"
                    }
                except subprocess.TimeoutExpired:
                    print("\n\033[1;31mCommand timed out and was terminated\033[0m")
                    return {
                        "stdout": "Interactive command timed out.",
                        "stderr": "",
                        "exit_code": -1,
                        "success": False,
                        "error": f"Command timed out after {timeout} seconds"
                    }
            
            # For non-interactive commands, use the existing implementation with real-time output
            # Execute the command with real-time output
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=cwd,
                env=env,
                text=True,
                bufsize=1  # Line buffered
            )
            
            # Capture output while displaying it
            stdout_lines = []
            stderr_lines = []
            
            # Function to read and display output from a pipe
            def read_and_display(pipe, lines_list, prefix=""):
                for line in iter(pipe.readline, ''):
                    lines_list.append(line)
                    print(f"{prefix}{line}", end='')
                    sys.stdout.flush()
            
            # Create a timeout handler
            def timeout_handler():
                nonlocal process
                if process.poll() is None:  # If process is still running
                    process.kill()
                    print("\n\033[1;31mCommand timed out and was terminated\033[0m")
                    return True
                return False
            
            import threading
            import time
            
            # Start threads to read stdout and stderr
            stdout_thread = threading.Thread(
                target=read_and_display, 
                args=(process.stdout, stdout_lines)
            )
            stderr_thread = threading.Thread(
                target=read_and_display, 
                args=(process.stderr, stderr_lines, "\033[1;31m")  # Red color for stderr
            )
            
            stdout_thread.daemon = True
            stderr_thread.daemon = True
            stdout_thread.start()
            stderr_thread.start()
            
            # Wait for process to complete or timeout
            timed_out = False
            start_time = time.time()
            while process.poll() is None:
                if timeout and (time.time() - start_time) > timeout:
                    timed_out = timeout_handler()
                    break
                time.sleep(0.1)
            
            # Wait for output threads to finish
            stdout_thread.join(1)
            stderr_thread.join(1)
            
            # Get any remaining output
            remaining_stdout, remaining_stderr = process.communicate()
            if remaining_stdout:
                stdout_lines.append(remaining_stdout)
                print(remaining_stdout, end='')
            if remaining_stderr:
                stderr_lines.append(remaining_stderr)
                print(f"\033[1;31m{remaining_stderr}\033[0m", end='')
            
            # Combine captured output
            stdout = ''.join(stdout_lines)
            stderr = ''.join(stderr_lines)
            
            print("-" * 80)
            
            if timed_out:
                return {
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": -1,
                    "success": False,
                    "error": f"Command timed out after {timeout} seconds"
                }
            else:
                return {
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": process.returncode,
                    "success": process.returncode == 0
                }
                
        except Exception as e:
            error_msg = str(e)
            # Replace brackets to avoid rich text formatting issues
            error_msg = error_msg.replace('[', r'\[').replace(']', r'\]')
            print(f"\033[1;31mError executing command: {error_msg}\033[0m")
            return {
                "stdout": "",
                "stderr": error_msg,
                "exit_code": -1,
                "success": False,
                "error": error_msg
            }
    
    def _run_background_command_interactive(self, command: str, project_root: str, cwd: Optional[str] = None,
                               env_vars: Optional[Dict[str, str]] = None) -> Dict[str, Union[str, int]]:
        """Run a command in the background and return its process ID."""
        try:
            # Validate the command
            validation = self._validate_command(command, project_root)
            if not validation["valid"]:
                return {
                    "stdout": "",
                    "stderr": f"Command validation failed: {validation['reason']}",
                    "exit_code": -1,
                    "success": False,
                    "error": validation["reason"]
                }
            
            # Ensure working directory is within project root
            if cwd:
                if not self._is_path_in_project(cwd, project_root):
                    return {
                        "stdout": "",
                        "stderr": f"Working directory must be within project root: {project_root}",
                        "exit_code": -1,
                        "success": False,
                        "error": "Invalid working directory"
                    }
            else:
                # Default to project root if no working directory specified
                cwd = project_root
            
            # Prepare environment variables
            env = os.environ.copy()
            if env_vars:
                env.update(env_vars)
            
            # Print command to be executed
            print(f"\n\033[1;36mExecuting background command: {command}\033[0m")
            print(f"\033[1;36mProject root: {project_root}\033[0m")
            print(f"\033[1;36mWorking directory: {cwd}\033[0m")
            print("-" * 80)
                
            # Modify command to run in background with nohup
            bg_command = f"nohup {command} > nohup.out 2>&1 & echo $!"
            
            # Execute the command
            process = subprocess.Popen(
                bg_command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=cwd,
                env=env,
                text=True
            )
            
            stdout, stderr = process.communicate()
            
            # Display output
            if stdout:
                print(stdout)
            if stderr:
                print(f"\033[1;31m{stderr}\033[0m")
                
            print("-" * 80)
            
            # Extract the process ID from stdout
            try:
                pid = int(stdout.strip())
                return {
                    "stdout": f"Command started in background with PID: {pid}",
                    "stderr": stderr,
                    "exit_code": 0,
                    "success": True,
                    "pid": pid
                }
            except ValueError:
                return {
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": -1,
                    "success": False,
                    "error": "Failed to get process ID for background command"
                }
                
        except Exception as e:
            error_msg = str(e)
            # Replace brackets to avoid rich text formatting issues
            error_msg = error_msg.replace('[', r'\[').replace(']', r'\]')
            print(f"\033[1;31mError executing background command: {error_msg}\033[0m")
            return {
                "stdout": "",
                "stderr": error_msg,
                "exit_code": -1,
                "success": False,
                "error": error_msg
            }
    
    def execute(self, **kwargs) -> str:
        command = kwargs.get('command', '')
        project_root = kwargs.get('project_root', '')
        working_directory = kwargs.get('working_directory')
        timeout = kwargs.get('timeout')
        run_in_background = kwargs.get('run_in_background', False)
        env_vars = kwargs.get('env_vars', {})
        interactive = kwargs.get('interactive', False)
        
        # Validate command and project_root
        if not command:
            return json.dumps({"error": "No command provided"}, indent=2)
            
        if not project_root:
            return json.dumps({"error": "No project root directory provided"}, indent=2)
            
        # Ensure project_root exists
        if not os.path.isdir(project_root):
            return json.dumps({
                "error": f"Project root directory does not exist: {project_root}",
                "success": False
            }, indent=2)
        
        # If working_directory is not provided, use project_root
        if not working_directory:
            working_directory = project_root
        
        # Check if working_directory is within project_root
        if not self._is_path_in_project(working_directory, project_root):
            return json.dumps({
                "error": f"Working directory must be within project root: {project_root}",
                "success": False
            }, indent=2)
            
        # Check for dangerous commands
        if self._is_dangerous_command(command):
            warning = f"Warning: The command '{command}' is potentially dangerous. Proceeding with caution."
            print(f"\033[1;33m{warning}\033[0m")
            result = {
                "warning": warning,
                "command": command
            }
        else:
            result = {"command": command}
            
        # Execute the command
        try:
            if run_in_background:
                cmd_result = self._run_background_command_interactive(command, project_root, working_directory, env_vars)
            else:
                cmd_result = self._run_command_interactive(command, project_root, working_directory, timeout, env_vars, interactive)
                
            result.update(cmd_result)
            
            # Format the result for better readability
            if result.get("success", False):
                result["message"] = "Command executed successfully"
            else:
                result["message"] = "Command execution failed"
                
            return json.dumps(result, indent=2)
            
        except Exception as e:
            error_msg = str(e)
            # Replace brackets to avoid rich text formatting issues
            error_msg = error_msg.replace('[', r'\[').replace(']', r'\]')
            return json.dumps({
                "command": command,
                "error": error_msg,
                "success": False
            }, indent=2) 