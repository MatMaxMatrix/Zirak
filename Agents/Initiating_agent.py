from autogen import ConversableAgent, UserProxyAgent
import autogen
import json
import logging
from prompt_toolkit import prompt
from prompt_toolkit.styles import Style
from rich.console import Console
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
                for question in clarifying_questions:
                    try:
                        # Get user input for each clarifying question with a timeout
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

    def get_human_input(self, Question: str = ""):
        """Enhanced method to get human input with validation and timeout handling"""
        style = Style.from_dict({'prompt': 'purple'})

        try:
            # Check if we're in automated mode
            if self.automated_mode or "automated_mode" in self.context and self.context["automated_mode"]:
                self.console.print(f"[yellow]Automated response for: {Question}[/yellow]")
                return "Default automated response"
                
            prompt_text = f"You, {Question}: " if Question else "You: "
            
            # Set up a timeout for input
            import signal
            
            def input_timeout_handler(signum, frame):
                raise TimeoutError("Input timed out")
            
            # Set a 10-second timeout for input
            signal.signal(signal.SIGALRM, input_timeout_handler)
            signal.alarm(10)
            
            try:
                user_input = self.console.input(f"[yellow]{prompt_text}[/yellow]").strip()
                # Cancel the timeout
                signal.alarm(0)
                
                if user_input.strip():  # Basic validation
                    return user_input
                self.console.print("[yellow]Please provide a non-empty response. Using default.[/yellow]")
                return "Default response"
            except TimeoutError:
                # Timeout occurred
                signal.alarm(0)  # Cancel the alarm
                self.console.print("[yellow]Input timed out. Using default response.[/yellow]")
                return "Default response due to timeout"
                
        except Exception as e:
            logging.error(f"Error getting human input: {str(e)}")
            self.console.print("[red]An error occurred. Using default response.[/red]")
            return "Default response due to error"

