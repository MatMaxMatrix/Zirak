from autogen import ConversableAgent, UserProxyAgent
import autogen
import json
import logging
from prompt_toolkit import prompt
from prompt_toolkit.styles import Style
from rich.console import Console




class EnhancedInitiatingAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="InitiatingAgent",
            system_message="",
            llm_config=autogen.config_list_from_json("OAI_CONFIG_LIST",)[3],
        )

        self.register_reply(
            trigger=self._always_true_trigger,
            reply_func=self.handle_message,
            position=0,
        )
        self.console = Console()
        self.conversation_context = {}
    def _always_true_trigger(self, sender):
        return True

    def handle_message(self, *args, **kwargs):
        """Process input and gather clarifications if needed"""
        
        # Check if there's a user input in the context
        if "user_input" in self.context:
            user_input = self.context.get("user_input")
            self.console.print(f"[bold cyan]Processing user request: [/bold cyan]{user_input}")
            return True, {"role": "user", "content": f"I'll help you with: {user_input}\n\nLet me analyze your request and break it down into steps."}
        
        # If clarification is needed (checked from conversation context)
        elif self.context.get("requires_clarification", False):
            clarifying_questions = self.context["clarifying_questions"]
            clarification_responses = {}

            for question in clarifying_questions:
                # Get user input for each clarifying question
                response = self.get_human_input(question)
                clarification_responses[question] = response
                
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
                
            # Reset the flag
            self.context["requires_clarification"] = False
            
            return True, {"role": "user", "content": f"Thank you for the clarifications. Here's what I understand:\n{new_values}\n\nI'll proceed with your request now."}
        
        # Default welcome message
        else:
            welcome_message = self.context.get("welcome_message", "Welcome! How can I help you today?")
            return True, {"role": "user", "content": welcome_message}

    def get_human_input(self, Question: str = ""):
        """Enhanced method to get human input with validation"""
        style = Style.from_dict({'prompt': 'purple'})

        try:
            prompt_text = f"You, {Question}: " if Question else "You: "
            user_input = self.console.input(f"[yellow]{prompt_text}[/yellow]").strip()
            if user_input.strip():  # Basic validation
                return user_input
            print("Please provide a non-empty response.")
        except Exception as e:
            logging.error(f"Error getting human input: {str(e)}")
            print("An error occurred. Please try again.")

