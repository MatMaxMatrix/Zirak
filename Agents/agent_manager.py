# File: /Framework/agents/agent_manager.py

import os
from autogen import GroupChat
from pydantic import BaseModel
from Agents.prompts.system_prompts import SystemPrompts
from typing import List, Dict, Any

import autogen

from .LLM_Agent import LLM_Agent
from .Query_Transformation import Query_Transformation
from .Step_Generator import Step_Generator
from .Evaluatoin_LLM import Evaluatoin_LLM
from .Initiating_agent import EnhancedInitiatingAgent
from .Critical_Analysis_Agent import CriticalAnalysisAgent
import json
from rich.console import Console

console = Console()


import logging

class Conversation(BaseModel):
    conversation_history: List[Dict[str, Any]] = []
    conversation_history.append({
                        "role": "system",
                        "content": f"{SystemPrompts.DEFAULT}\n\n{SystemPrompts.TOOL_USAGE}"
                    })

initiating_agent = EnhancedInitiatingAgent()

LLM_agent = LLM_Agent()
Query_Agent = Query_Transformation()
Step_agent = Step_Generator()
Evaluation_agent = Evaluatoin_LLM()
CriticalAnalysisAgent = CriticalAnalysisAgent()


agents = [
    initiating_agent,
    CriticalAnalysisAgent,
    # Regular_or_Tech,
    LLM_agent,
    Query_Agent,
    Step_agent,
    # Evaluation_agent,
]


def state_transition(last_speaker, groupchat):
    context = groupchat.context
    messages = groupchat.messages
    if len(messages) <= 1:
        return initiating_agent
    if last_speaker is initiating_agent and context["requires_clarification"] == False:
        return CriticalAnalysisAgent
    elif last_speaker is initiating_agent and context["requires_clarification"] == True:
        return Query_Agent
    if last_speaker is CriticalAnalysisAgent:
        try:
            print(context["requires_clarification"])
            if context["requires_clarification"] == True and len(context["clarifications"])<200:
                return initiating_agent
            else:
                return Query_Agent
        except json.JSONDecodeError:
            return Query_Agent
    # elif last_speaker is Regular_or_Tech:
    #     # Check if input validation passed
    #     console.print(f"Assistant's response: {Regular_or_Tech.last_message()}.")
    #     console.print(f"Assistant's response: {type(Regular_or_Tech.last_message().get('content'))}.")
    #     response = Regular_or_Tech.last_message().get("content")
    #     type_value = None

    #     try:
    #         response = json.loads(response)
    #         type_value = response.get("type")
    #     except json.JSONDecodeError:
    #         console.print("[red]NOT A JSON RESPONSE[/red]")
    #         return Regular_or_Tech
    #         # Decide which agent to proceed with based on the type_value
    #     if type_value == "Technical":
    #         # Proceed to Query_Agent for complex technical processing
    #         return Query_Agent
    #     elif type_value == "Simple":
    #         # Proceed to LLM_agent for simple processing
    #         return LLM_agent
    #     else:
    #         return Regular_or_Tech

    elif last_speaker is Query_Agent:
        console.print(f"Query_Agent's response: {Query_Agent.last_message()}.")
        return Step_agent

    elif last_speaker is Step_agent:
        try:
            step_response = json.loads(Step_agent.last_message().get("content"))
            context["steps"] = step_response.get("steps")
            return LLM_agent
        except (ValueError, KeyError, json.JSONDecodeError, TypeError) as e:
            print(f"Error exception: {str(e)}")
            return Step_agent
    
    elif last_speaker is LLM_agent:
        # Check if there are more steps to process
        if hasattr(LLM_agent, 'current_step_index') and 'steps' in context:
            step_keys = sorted([k for k in context['steps'].keys() if k.startswith('step')])
            if LLM_agent.current_step_index < len(step_keys):
                # There are more steps to process, continue with LLM_agent
                return LLM_agent
        # All steps completed or no steps to process
        return initiating_agent
    
    # Default case - return to initiating agent
    return initiating_agent

group_chat = GroupChat(
    agents=agents,
    messages=[],
    max_round=30,
    speaker_selection_method=state_transition,
    allow_repeat_speaker=True,
)