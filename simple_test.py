#!/usr/bin/env python3
# simple_test.py

import asyncio
from autogen import UserProxyAgent, ConversableAgent, GroupChat, GroupChatManager
from rich.console import Console
import nest_asyncio
from Agents.config import Config

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()

console = Console()

# Define a simple LLM agent
class SimpleLLMAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="SimpleLLMAgent",
            system_message="You are a helpful assistant.",
            llm_config={
                "config_list": [{"model": Config.Model, "api_key": Config.api_key, "base_url": Config.base_url}],
                "timeout": 120,
            },
        )
        
        # Register our custom reply function
        self.register_reply(
            trigger=lambda x: True,  # Always trigger this reply
            reply_func=self._custom_reply,
            position=0,
        )
    
    def _custom_reply(self, self_agent, messages=None, sender=None, config=None):
        # Simple reply function
        if messages and len(messages) > 0:
            last_message = messages[-1]
            if isinstance(last_message, dict) and "content" in last_message:
                return False, {"role": "assistant", "content": "I received your message: " + last_message["content"]}
        
        return False, {"role": "assistant", "content": "I didn't receive a valid message."}

# Define a simple user proxy agent
class SimpleUserProxyAgent(UserProxyAgent):
    def __init__(self):
        super().__init__(
            name="SimpleUserProxyAgent",
            human_input_mode="ALWAYS",
            system_message="You are a user proxy agent.",
            code_execution_config=False,
        )
        
        # Register our custom reply function
        self.register_reply(
            trigger=lambda x: True,  # Always trigger this reply
            reply_func=self._custom_reply,
            position=0,
        )
    
    def _custom_reply(self, self_agent, messages=None, sender=None, config=None):
        # Display the last message
        if messages and len(messages) > 0:
            last_message = messages[-1]
            if isinstance(last_message, dict) and "content" in last_message:
                console.print(f"\nReceived: {last_message['content']}")
        
        # Get user input
        user_input = input("\nEnter your message (or 'quit' to exit): ")
        
        if user_input.lower() == "quit":
            return True, {"role": "user", "content": "TERMINATE"}
        
        return False, {"role": "user", "content": user_input}

async def main():
    # Create agents
    llm_agent = SimpleLLMAgent()
    user_proxy = SimpleUserProxyAgent()
    
    # Create group chat
    group_chat = GroupChat(
        agents=[user_proxy, llm_agent],
        messages=[],
        max_round=10,
        speaker_selection_method=lambda last_speaker, _: llm_agent if last_speaker == user_proxy else user_proxy,
        allow_repeat_speaker=False,
    )
    
    # Create group chat manager
    manager = GroupChatManager(
        groupchat=group_chat,
        is_termination_msg=lambda x: x.get("content", "").find("TERMINATE") >= 0,
    )
    
    # Start the conversation
    console.print("[bold green]Starting simple test conversation...[/bold green]")
    
    # Initiate the chat with a welcome message
    await user_proxy.initiate_chat(
        manager,
        message="Hello, I'm the user proxy agent.",
    )
    
    console.print("[bold green]Conversation completed.[/bold green]")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[bold yellow]Operation interrupted by user[/bold yellow]")
    except Exception as e:
        console.print(f"[bold red]Unhandled exception: {str(e)}[/bold red]")
        import traceback
        console.print(f"[red]{traceback.format_exc()}[/red]") 