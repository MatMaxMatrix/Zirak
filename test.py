# main.py

import asyncio
from Agents.conversation_workflow import conversation_workflow
from Agents.agent_manager import group_chat
from rich.console import Console

console = Console()

async def main():
    # Manually provide the warning letter and template
    #User_Input = console.input("Enter the User's Input: ")
    group_chat.context = {"welcome_message": "Welcome to the Claude Engine!"}

    # Run the conversation workflow
    result = await conversation_workflow(group_chat)
    console.print(f"[green]{result}.[/green]")


if __name__ == "__main__":
    asyncio.run(main())
