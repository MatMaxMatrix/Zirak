from autogen import UserProxyAgent
from rich.console import Console
from prompt_toolkit import prompt
from prompt_toolkit.styles import Style
from .config import Config
import asyncio

class EnhancedUserProxyAgent(UserProxyAgent):
    def __init__(self):
        super().__init__(
            name="UserProxyAgent",
            human_input_mode="ALWAYS",
            system_message="You are a user proxy agent that collects user queries and passes them to the LLM agent for processing.",
            code_execution_config=False,  # Disable code execution for safety
        )
        
        self.console = Console()
        self.conversation_context = {}
        
    def get_user_input(self):
        """
        Get input from the user and return it.
        This is a synchronous method that should be called from synchronous code.
        """
        user_input = prompt("\n[purple]You:[/purple] ", style=Style.from_dict({'prompt': 'purple'}))
        
        if user_input.lower() == 'quit':
            self.console.print("\n[bold blue]👋 Goodbye![/bold blue]")
            return "TERMINATE"
        elif user_input.lower() == 'reset':
            self.console.print("\n[bold yellow]Conversation reset![/bold yellow]")
            return "RESET"
        
        return user_input
    
    async def get_user_input_async(self):
        """
        Get input from the user asynchronously.
        This is an async method that should be called from async code.
        """
        # Use a thread to run the synchronous prompt function
        loop = asyncio.get_event_loop()
        user_input = await loop.run_in_executor(None, self.get_user_input)
        return user_input
    
    def handle_message(self, sender, message):
        """
        Handle incoming messages from other agents.
        
        Returns:
            A tuple (final, reply) where final is a boolean indicating if the conversation should end,
            and reply is the response message.
        """
        # Display the message to the user
        self.console.print("\n[bold purple]Response:[/bold purple]")
        
        if isinstance(message, str):
            safe_message = message.replace('[', '\\[').replace(']', '\\]')
            self.console.print(f"\n{safe_message}")
        else:
            content = message.get("content", "")
            if content:
                safe_content = content.replace('[', '\\[').replace(']', '\\]')
                self.console.print(f"\n{safe_content}")
        
        # Get the next user input
        user_input = self.get_user_input()
        
        # Check for special commands
        if user_input == "TERMINATE":
            return True, {"role": "user", "content": "TERMINATE"}
        elif user_input == "RESET":
            return True, {"role": "user", "content": "RESET"}
        
        # Return the user input as the response
        return False, {"role": "user", "content": user_input}
    
    async def handle_message_async(self, sender, message):
        """
        Handle incoming messages from other agents asynchronously.
        
        Returns:
            A tuple (final, reply) where final is a boolean indicating if the conversation should end,
            and reply is the response message.
        """
        # Display the message to the user
        self.console.print("\n[bold purple]Response:[/bold purple]")
        
        if isinstance(message, str):
            safe_message = message.replace('[', '\\[').replace(']', '\\]')
            self.console.print(f"\n{safe_message}")
        else:
            content = message.get("content", "")
            if content:
                safe_content = content.replace('[', '\\[').replace(']', '\\]')
                self.console.print(f"\n{safe_content}")
        
        # Get the next user input asynchronously
        user_input = await self.get_user_input_async()
        
        # Check for special commands
        if user_input == "TERMINATE":
            return True, {"role": "user", "content": "TERMINATE"}
        elif user_input == "RESET":
            return True, {"role": "user", "content": "RESET"}
        
        # Return the user input as the response
        return False, {"role": "user", "content": user_input} 