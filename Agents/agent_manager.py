# File: /Framework/agents/agent_manager.py

import os
from autogen import GroupChat
from pydantic import BaseModel
from Agents.prompts.system_prompts import SystemPrompts
from typing import List, Dict, Any

import autogen
from .Regular_or_Tech import Regular_or_Tech
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
Regular_or_Tech = Regular_or_Tech()
LLM_agent = LLM_Agent()
Query_Agent = Query_Transformation()
Step_agent = Step_Generator()
Evaluation_agent = Evaluatoin_LLM()
CriticalAnalysisAgent = CriticalAnalysisAgent()


agents = [
    initiating_agent,
    CriticalAnalysisAgent,
    Regular_or_Tech,
    LLM_agent,
    Query_Agent,
    Step_agent,
    Evaluation_agent,
]


def state_transition(last_speaker, groupchat):
    context = groupchat.context
    messages = groupchat.messages
    if len(messages) <= 1:
        return initiating_agent
    if last_speaker is initiating_agent:
        return CriticalAnalysisAgent
    if last_speaker is CriticalAnalysisAgent:
        try:
            print(context["requires_clarification"])
            if context["requires_clarification"] == True and len(context["clarifications"])<200:
                return initiating_agent
            else:
                return Regular_or_Tech
        except json.JSONDecodeError:
            return Regular_or_Tech
    elif last_speaker is Regular_or_Tech:
        # Check if input validation passed
        console.print(f"Assistant's response: {Regular_or_Tech.last_message()}.")
        console.print(f"Assistant's response: {type(Regular_or_Tech.last_message().get('content'))}.")
        response = Regular_or_Tech.last_message().get("content")
        type_value = None

        try:
            response = json.loads(response)
            type_value = response.get("type")
        except json.JSONDecodeError:
            console.print("[red]NOT A JSON RESPONSE[/red]")
            return Regular_or_Tech
            # Decide which agent to proceed with based on the type_value
        if type_value == "Technical":
            # Proceed to Query_Agent for complex technical processing
            return Query_Agent
        elif type_value == "Simple":
            # Proceed to LLM_agent for simple processing
            return LLM_agent
        else:
            return Regular_or_Tech

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
        return Evaluation_agent
    elif last_speaker is Evaluation_agent and context.get("total_steps", 0) >= context.get("current_step", 1):
        if context.get("Evaluation_result") == "Yes":
            context["current_step"] += 1
            context["stage_prompt"] = context.get("stage_prompt", "")[context["current_step"]]
            return LLM_agent
            

group_chat = GroupChat(
    agents=agents,
    messages=[],
    max_round=30,
    speaker_selection_method=state_transition,
    allow_repeat_speaker=True,
)