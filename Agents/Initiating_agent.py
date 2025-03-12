from autogen import ConversableAgent, UserProxyAgent
import autogen
import json
import logging
from prompt_toolkit import prompt
from prompt_toolkit.styles import Style
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TimeElapsedColumn, TextColumn
from rich.live import Live
import time
import threading
from .config import Config



class EnhancedInitiatingAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="InitiatingAgent",
            system_message="",
            llm_config={
                "model": Config.Model,
                "api_key": Config.api_key,
                "base_url": Config.base_url,
            },
        )

        self.register_reply(
            trigger=self._always_true_trigger,
            reply_func=self.handle_message,
            position=0,
        )
        self.console = Console()
        self.conversation_context = {}
        self.automated_mode = False  # Flag to indicate if we're running in automated mode
        self.input_timeout = 60  # Default timeout in seconds
        
    def _always_true_trigger(self, sender):
        return True

    def handle_message(self, *args, **kwargs):
        """Process input and gather clarifications if needed"""
        
        # Check if there's a user input in the context
        if "user_input" in self.context and self.context.get("requires_clarification", False) == False:
            user_input = self.context.get("user_input")
            self.console.print(f"[bold cyan]Processing user request: [/bold cyan]{user_input}")
            return True, {"role": "user", "content": f"I'll help you with: {user_input}\n\nLet me analyze your request and break it down into steps."}
        
        # If clarification is needed (checked from conversation context)
        elif self.context.get("requires_clarification", False) == True:
            clarifying_questions = self.context["clarifying_questions"]
            clarification_responses = {}

            # Check if we're in automated mode
            if self.automated_mode or "automated_mode" in self.context and self.context["automated_mode"]:
                self.console.print("[bold yellow]Running in automated mode - using default responses[/bold yellow]")
                # Provide default responses for automated testing
                for question in clarifying_questions:
                    clarification_responses[question] = "Default automated response"
            else:
                # Interactive mode - get user input for each question
                self.console.print(Panel(
                    "[bold blue]I need some clarifications to better assist you.[/bold blue]",
                    title="Clarification Needed",
                    border_style="blue"
                ))
                
                for i, question in enumerate(clarifying_questions):
                    try:
                        # Get user input for each clarifying question with a timeout
                        self.console.print(f"[cyan]Question {i+1}/{len(clarifying_questions)}[/cyan]")
                        response = self.get_human_input(question)
                        if response is None:  # Timeout or error occurred
                            self.console.print("[bold yellow]Timeout or error getting input - using default response[/bold yellow]")
                            response = "Default response due to timeout"
                        clarification_responses[question] = response
                    except Exception as e:
                        self.console.print(f"[bold red]Error getting input: {str(e)}[/bold red]")
                        clarification_responses[question] = "Error occurred"
                
            # Create paired question-answer strings
            qa_pairs = [f"Q: {question} A: {answer}" 
                    for question, answer in clarification_responses.items()]
            new_values = ' | '.join(qa_pairs)  # Use a separator between Q&A pairs

            # Append new values to existing ones, with a separator if needed
            if self.context["clarifications"]:
                clarification_values = self.context["clarifications"]
                self.context["clarifications"] = f"{clarification_values}\n{new_values}"
            else:
                self.context["clarifications"] = new_values
                
            
            return True, {"role": "user", "content": f"Thank you for the clarifications. Here's what I understand:\n{new_values}\n\nI'll proceed with your request now."}
        
        # Default welcome message
        else:
            welcome_message = self.context.get("welcome_message", "Welcome! How can I help you today?")
            return True, {"role": "user", "content": welcome_message}

    def get_human_input(self, question: str = ""):
        """Enhanced method to get human input with validation and timeout handling"""
        try:
            # Check if we're in automated mode
            if self.automated_mode or "automated_mode" in self.context and self.context["automated_mode"]:
                self.console.print(f"[yellow]Automated response for: {question}[/yellow]")
                return "Default automated response"
            
            # Format the question in a nice panel
            formatted_question = Text(question)
            self.console.print(Panel(
                formatted_question,
                title="Please Answer",
                border_style="green"
            ))
            
            # Set up a timeout for input
            timeout_reached = threading.Event()
            user_input = [None]  # Using a list to store the input from the thread
            
            # Create a simple message for the countdown
            self.console.print(f"[blue]You have {self.input_timeout} seconds to answer.[/blue]")
            
            # Use a completely separate approach for input and countdown
            def input_thread():
                try:
                    # Use the most basic input method to avoid any interference
                    user_input[0] = input("Your answer: ")
                except Exception as e:
                    logging.error(f"Error in input thread: {str(e)}")
                finally:
                    timeout_reached.set()  # Signal that we're done
            
            # Start the input thread
            input_thread_handle = threading.Thread(target=input_thread)
            input_thread_handle.daemon = True
            input_thread_handle.start()
            
            # Instead of a separate countdown thread, just wait with periodic status updates
            remaining = self.input_timeout
            while remaining > 0 and input_thread_handle.is_alive():
                # Sleep for a short interval
                time.sleep(1)
                remaining -= 1
                
                # Only show countdown at specific intervals
                if remaining <= 10 or remaining % 15 == 0:
                    self.console.print(f"[dim blue]Time remaining: {remaining} seconds[/dim blue]")
            
            # Signal that we're done with the countdown
            timeout_reached.set()
            
            # Check if we got input
            if input_thread_handle.is_alive():
                # Thread is still running, which means timeout occurred
                self.console.print("[bold yellow]Input timed out. Using default response.[/bold yellow]")
                return "Default response due to timeout"
            
            # We got input, validate it
            if user_input[0] and user_input[0].strip():
                return user_input[0].strip()
            
            self.console.print("[yellow]Empty response provided. Using default.[/yellow]")
            return "Default response for empty input"
                
        except Exception as e:
            logging.error(f"Error getting human input: {str(e)}")
            self.console.print("[bold red]An error occurred while processing your input.[/bold red]")
            return "Default response due to error"

