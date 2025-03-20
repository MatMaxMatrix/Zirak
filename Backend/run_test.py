#!/usr/bin/env python3
# run_test.py - Wrapper script to run Zirak API tests

import argparse
import os
import subprocess
import sys
import time

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()


def check_dependencies():
    """Check if all required packages are installed"""
    console.print("[bold cyan]Checking dependencies...[/bold cyan]")

    try:
        # Try to import key packages

        console.print("[bold green]✓ All required packages found.[/bold green]")
        return True
    except ImportError as e:
        console.print(f"[bold red]x Missing dependency: {str(e)}[/bold red]")

        # Ask to install requirements
        console.print(
            Panel(
                "Some required packages are missing. Would you like to install them?",
                title="Missing Dependencies",
                border_style="yellow",
            )
        )

        choice = input("Install dependencies? (y/n): ").strip().lower()
        if choice == "y" or choice == "yes":
            try:
                console.print("[bold cyan]Installing dependencies...[/bold cyan]")
                subprocess.run(
                    [
                        sys.executable,
                        "-m",
                        "pip",
                        "install",
                        "-r",
                        "requirements-test.txt",
                    ],
                    check=True,
                )
                console.print(
                    "[bold green]✓ Dependencies installed successfully.[/bold green]"
                )
                return True
            except subprocess.CalledProcessError as e:
                console.print(
                    f"[bold red]x Failed to install dependencies: {str(e)}[/bold red]"
                )
                return False
        else:
            console.print("[yellow]Skipping dependency installation.[/yellow]")
            return False


def check_server_running(url):
    """Check if the Zirak API server is running"""
    console.print("[bold cyan]Checking if Zirak API server is running...[/bold cyan]")

    try:
        result = subprocess.run(
            [sys.executable, "check_server.py", "--url", url],
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            return True
        else:
            # Server is not running
            console.print(result.stdout)

            # Ask to start the server
            console.print(
                Panel(
                    "The Zirak API server appears to be offline. Would you like to start it?",
                    title="Server Offline",
                    border_style="yellow",
                )
            )

            choice = input("Start server? (y/n): ").strip().lower()
            if choice == "y" or choice == "yes":
                try:
                    # Start the server in a new terminal/window
                    if sys.platform == "darwin":  # macOS
                        subprocess.Popen(
                            [
                                "osascript",
                                "-e",
                                f'tell app "Terminal" to do script "cd {os.getcwd()} && python api.py"',
                            ]
                        )
                    elif sys.platform == "win32":  # Windows
                        subprocess.Popen(
                            ["start", "cmd", "/k", "python", "api.py"], shell=True
                        )
                    else:  # Linux and others
                        subprocess.Popen(
                            [
                                "x-terminal-emulator",
                                "-e",
                                f"cd {os.getcwd()} && python api.py",
                            ]
                        )

                    # Give it some time to start
                    console.print("[bold cyan]Starting server...[/bold cyan]")

                    with Progress(
                        SpinnerColumn(),
                        TextColumn(
                            "[bold blue]Waiting for server to start...[/bold blue]"
                        ),
                        console=console,
                    ) as progress:
                        task = progress.add_task("Waiting", total=10)
                        for i in range(10):
                            progress.update(task, completed=i + 1)
                            time.sleep(1)

                    # Check if it's running now
                    return check_server_running(url)
                except Exception as e:
                    console.print(
                        f"[bold red]x Failed to start server: {str(e)}[/bold red]"
                    )
                    return False
            else:
                console.print("[yellow]Skipping server start.[/yellow]")
                return False
    except Exception as e:
        console.print(f"[bold red]x Error checking server: {str(e)}[/bold red]")
        return False


def run_test(args):
    """Run the appropriate test script with the provided arguments"""
    script = "test_api_visualizer.py" if args.visualize else "test_api.py"

    # Construct the command
    cmd = [sys.executable, script, args.query]

    # Add optional arguments
    if args.url:
        cmd.extend(["--url", args.url])
    if args.conversation_id:
        cmd.extend(["--conversation-id", args.conversation_id])
    if args.timeout:
        cmd.extend(["--timeout" if args.visualize else "--max-wait", str(args.timeout)])
    if args.no_viz and args.visualize:
        cmd.append("--no-viz")

    console.print(f"[bold cyan]Running test script: {' '.join(cmd)}[/bold cyan]")

    # Run the test script
    try:
        subprocess.run(cmd)
    except Exception as e:
        console.print(f"[bold red]x Error running test: {str(e)}[/bold red]")


def main():
    parser = argparse.ArgumentParser(description="Run tests against the Zirak API")
    parser.add_argument(
        "query", nargs="?", default="Tell me a joke", help="Query to send to the API"
    )
    parser.add_argument(
        "--url", default="http://localhost:5001", help="Base URL of the API"
    )
    parser.add_argument(
        "--conversation-id", help="Existing conversation ID to continue"
    )
    parser.add_argument(
        "--timeout", type=int, help="How long to collect data (seconds)"
    )
    parser.add_argument(
        "--visualize",
        action="store_true",
        help="Use the visualizer script instead of the basic test",
    )
    parser.add_argument(
        "--no-viz",
        action="store_true",
        help="Skip generating HTML visualization (only with --visualize)",
    )
    parser.add_argument(
        "--skip-checks", action="store_true", help="Skip dependency and server checks"
    )
    args = parser.parse_args()

    # Print header
    console.print(
        Panel(
            f"[bold]Zirak API Test Runner[/bold]\n\n"
            f"Query: {args.query}\n"
            f"API URL: {args.url}\n"
            f"Using: {'Visualizer' if args.visualize else 'Basic Test'}",
            border_style="cyan",
        )
    )

    # Check dependencies and server unless skipped
    if not args.skip_checks:
        if not check_dependencies():
            console.print(
                "[bold red]x Cannot proceed due to missing dependencies.[/bold red]"
            )
            return

        if not check_server_running(args.url):
            console.print(
                "[bold red]x Cannot proceed as server is not running.[/bold red]"
            )
            return

    # Run the test
    run_test(args)


if __name__ == "__main__":
    main()
