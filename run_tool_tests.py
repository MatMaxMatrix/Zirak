#!/usr/bin/env python3

import unittest
import sys
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
import time
import os

# Import the test file
import tool_tests

console = Console()

def run_tests():
    """Run all the tool tests and display the results in a nice format."""
    console.print(Panel.fit(
        "[bold cyan]Claude Engineer Tool Tests[/bold cyan]",
        subtitle="Testing all tools for functionality"
    ))
    
    # Get all test cases from the tool_tests module
    test_loader = unittest.TestLoader()
    test_suite = test_loader.loadTestsFromModule(tool_tests)
    
    # Create a test runner that will collect results
    test_runner = unittest.TextTestRunner(verbosity=0)
    
    # Dictionary to store results
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "errors": 0,
        "details": []
    }
    
    # Run each test case separately to track progress
    test_cases = []
    for suite in test_suite:
        for test_case in suite:
            test_cases.append(test_case)
    
    results["total"] = len(test_cases)
    
    # Show progress
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("[cyan]Running tests...", total=results["total"])
        
        for test_case in test_cases:
            # Update the progress description
            progress.update(task, description=f"Testing {test_case.id().split('.')[-1]}")
            
            # Run the test
            result = test_runner.run(test_case)
            
            # Update progress
            progress.advance(task)
            
            # Update results
            if result.wasSuccessful():
                results["passed"] += 1
                status = "PASS"
                color = "green"
            elif result.failures:
                results["failed"] += 1
                status = "FAIL"
                color = "red"
            else:
                results["errors"] += 1
                status = "ERROR"
                color = "yellow"
            
            # Store details
            results["details"].append({
                "name": test_case.id().split('.')[-1],
                "status": status,
                "color": color,
                "failures": result.failures,
                "errors": result.errors
            })
            
            # Small delay for visual effect
            time.sleep(0.1)
    
    # Display results in a table
    table = Table(title="Test Results")
    table.add_column("Tool Test", style="cyan")
    table.add_column("Status", justify="center")
    table.add_column("Details", justify="left")
    
    for detail in results["details"]:
        status_text = f"[{detail['color']}]{detail['status']}[/{detail['color']}]"
        
        # Get error details if any
        error_details = ""
        if detail["failures"]:
            error_details = detail["failures"][0][1]
        elif detail["errors"]:
            error_details = str(detail["errors"][0][1])
        
        # Truncate error details if too long
        if len(error_details) > 50:
            error_details = error_details[:47] + "..."
        
        table.add_row(detail["name"], status_text, error_details)
    
    console.print(table)
    
    # Print summary
    console.print("\n[bold]Summary:[/bold]")
    console.print(f"Total tests: {results['total']}")
    console.print(f"[green]Passed: {results['passed']}[/green]")
    
    if results["failed"] > 0:
        console.print(f"[red]Failed: {results['failed']}[/red]")
    else:
        console.print(f"Failed: {results['failed']}")
    
    if results["errors"] > 0:
        console.print(f"[yellow]Errors: {results['errors']}[/yellow]")
    else:
        console.print(f"Errors: {results['errors']}")
    
    # Return exit code based on test results
    return 0 if results["failed"] == 0 and results["errors"] == 0 else 1

if __name__ == "__main__":
    # Make sure we're in the right directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Run the tests
    exit_code = run_tests()
    sys.exit(exit_code) 