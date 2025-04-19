#!/usr/bin/env python3
import os
import sys
import subprocess
import time
from pathlib import Path


def run_mcp_server():
    """Run the MCP server directly with more detailed error handling."""

    # Find the server script path
    script_dir = Path(__file__).resolve().parent
    mcp_server_path = script_dir / "mcp_server.py"

    if not mcp_server_path.exists():
        print(f"ERROR: MCP server script not found at {mcp_server_path}")
        print("Please make sure mcp_server.py is in the same directory as this script.")
        return False

    print(f"Starting MCP server from: {mcp_server_path}")

    try:
        # Run the server with detailed output
        process = subprocess.Popen(
            ["python", str(mcp_server_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # Line buffered
        )

        print("Server process started. Waiting for initialization...")
        print("\nServer output:")
        print("=" * 50)

        # Monitor output for a short time to catch startup errors
        start_time = time.time()
        timeout = 10  # 10 seconds to detect startup issues

        while time.time() - start_time < timeout:
            # Check if process is still running
            if process.poll() is not None:
                # Process exited early - likely an error
                stdout, stderr = process.communicate()
                print(f"Server exited prematurely with code {process.returncode}")
                print("\nSTDOUT:")
                print(stdout)
                print("\nSTDERR:")
                print(stderr)
                return False

            # Read any output available
            output = process.stdout.readline()
            if output:
                print(output.rstrip())
                # Look for successful startup indicators
                if "Starting MCP server" in output and "on port" in output:
                    print("\nServer started successfully!")
                    break

            # Brief pause to avoid high CPU usage
            time.sleep(0.1)

        print("=" * 50)
        print("\nMCP server is now running!")
        print("\nTo connect to this server:")
        print("1. Open a web browser and navigate to:")
        print("   http://localhost:3001/sse")
        print("\n2. Or try the MCP CLI inspector:")
        print("   uv run mcp dev Zirak/employee/tools/mcp_server.py")
        print("\n3. Or run your client script with:")
        print("   python Zirak/employee/tools/mcp_client.py")
        print("\nPress Ctrl+C to stop the server when done.")

        # Keep the server running until interrupted
        try:
            process.wait()
        except KeyboardInterrupt:
            print("\nStopping MCP server...")
            process.terminate()
            process.wait(timeout=5)
            print("Server stopped.")

        return True

    except Exception as e:
        print(f"Error starting MCP server: {str(e)}")
        return False


if __name__ == "__main__":
    run_mcp_server()
