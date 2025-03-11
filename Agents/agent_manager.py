# File: /Framework/agents/agent_manager.py

import os
from autogen import GroupChat
from pydantic import BaseModel
from Agents.prompts.system_prompts import SystemPrompts
from typing import List, Dict, Any, Optional
import json
import autogen
from .LLM_Agent import LLM_Agent
from .Query_Transformation import Query_Transformation
from .Step_Generator import Step_Generator
from .Evaluatoin_LLM import Evaluatoin_LLM
from .Initiating_agent import EnhancedInitiatingAgent
from .Critical_Analysis_Agent import CriticalAnalysisAgent
from .UserProxy_agent import EnhancedUserProxyAgent
from rich.console import Console
from .config import Config
import asyncio

console = Console()

class Conversation(BaseModel):
    """Model for tracking conversation history"""
    conversation_history: List[Dict[str, Any]] = []
    
    def __init__(self, **data):
        super().__init__(**data)
        self.conversation_history.append({
            "role": "system",
            "content": f"{SystemPrompts.DEFAULT}\n\n{SystemPrompts.TOOL_USAGE}"
        })

# Initialize all agents
initiating_agent = EnhancedInitiatingAgent()
LLM_agent = LLM_Agent()
Query_Agent = Query_Transformation()
Step_agent = Step_Generator()
Evaluation_agent = Evaluatoin_LLM()
CriticalAnalysisAgent = CriticalAnalysisAgent()
UserProxy_agent = EnhancedUserProxyAgent()

# Define the agent list for the group chat
agents = [
    initiating_agent,
    CriticalAnalysisAgent,
    LLM_agent,
    Query_Agent,
    Step_agent,
    UserProxy_agent,
]

def state_transition(last_speaker, groupchat):
    """
    Determines the next speaker in the conversation based on the current state.
    
    Args:
        last_speaker: The agent who spoke last
        groupchat: The group chat object containing context and messages
        
    Returns:
        The next agent to speak
    """
    try:
        context = groupchat.context
        messages = groupchat.messages
        
        # Log the current state transition
        console.print(f"[bold cyan]State transition from: {last_speaker.name}[/bold cyan]")
        
        # Initial message handling
        if len(messages) <= 1:
            console.print("[bold cyan]Initial message - selecting initiating agent[/bold cyan]")
            return initiating_agent
        
        # UserProxy agent transitions
        if last_speaker is UserProxy_agent:
            console.print("[bold cyan]User proxy agent finished - proceeding to LLM Agent[/bold cyan]")
            return LLM_agent
        
        # Initiating agent transitions
        if last_speaker is initiating_agent:
            requires_clarification = context.get("requires_clarification", False)
            console.print(f"[bold cyan]Initiating agent finished, requires_clarification: {requires_clarification}[/bold cyan]")
            
            if requires_clarification:
                return Query_Agent
            else:
                return CriticalAnalysisAgent
        
        # Critical Analysis Agent transitions
        if last_speaker is CriticalAnalysisAgent:
            try:
                requires_clarification = context.get("requires_clarification", False)
                clarifications = context.get("clarifications", "")
                
                console.print(f"[bold cyan]Critical Analysis finished, requires_clarification: {requires_clarification}[/bold cyan]")
                
                if requires_clarification and len(clarifications) < 200:
                    console.print("[bold cyan]Needs clarification - returning to initiating agent[/bold cyan]")
                    return initiating_agent
                else:
                    console.print("[bold cyan]No clarification needed - proceeding to Query Agent[/bold cyan]")
                    return Query_Agent
            except json.JSONDecodeError as e:
                console.print(f"[bold red]JSON decode error in Critical Analysis transition: {str(e)}[/bold red]")
                return Query_Agent
        
        # Query Agent transitions
        elif last_speaker is Query_Agent:
            console.print("[bold cyan]Query Agent finished - proceeding to Step Generator[/bold cyan]")
            return Step_agent
        
        # Step Generator transitions
        elif last_speaker is Step_agent:
            try:
                # Parse the step response and store in context
                step_response = json.loads(Step_agent.last_message().get("content", "{}"))
                context["steps"] = step_response.get("steps", {})
                console.print(f"[bold cyan]Step Generator finished - found {len(context['steps'])} steps[/bold cyan]")
                
                # Reset the current step index in LLM_agent
                LLM_agent.current_step_index = 0
                
                return LLM_agent
            except (ValueError, KeyError, json.JSONDecodeError, TypeError) as e:
                console.print(f"[bold red]Error parsing Step Generator response: {str(e)}[/bold red]")
                return Step_agent
        
        # LLM Agent transitions
        elif last_speaker is LLM_agent:
            # Check if there are more steps to process
            if hasattr(LLM_agent, 'current_step_index') and 'steps' in context:
                step_keys = sorted([k for k in context['steps'].keys() if k.startswith('step')])
                
                if LLM_agent.current_step_index < len(step_keys):
                    # There are more steps to process
                    console.print(f"[bold cyan]LLM Agent continuing with step {LLM_agent.current_step_index + 1}/{len(step_keys)}[/bold cyan]")
                    return LLM_agent
                else:
                    # All steps completed - return to user proxy agent
                    console.print("[bold cyan]All steps completed - returning to user proxy agent[/bold cyan]")
                    return UserProxy_agent
            else:
                console.print("[bold cyan]No steps defined - returning to user proxy agent[/bold cyan]")
                return UserProxy_agent
        elif last_speaker is UserProxy_agent:
            console.print("[bold cyan]User proxy agent finished - proceeding to LLM Agent[/bold cyan]")
            return LLM_agent
        
        # Default case - return to initiating agent
        console.print("[bold cyan]Default transition - returning to initiating agent[/bold cyan]")
        return initiating_agent
        
    except Exception as e:
        # Log any errors in the state transition logic
        console.print(f"[bold red]Error in state transition: {str(e)}[/bold red]")
        # Default to initiating agent in case of errors
        return initiating_agent

# Initialize the group chat with the agents and state transition function
group_chat = GroupChat(
    agents=agents,
    messages=[],
    max_round=getattr(Config, 'MAX_CONVERSATION_ROUNDS', 30),
    speaker_selection_method=state_transition,
    allow_repeat_speaker=True,
)