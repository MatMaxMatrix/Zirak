# File: /Framework/agents/agent_manager.py

import os
from autogen import GroupChat
from pydantic import BaseModel
from Agents.prompts.system_prompts import SystemPrompts
from typing import List, Dict, Any

import autogen
from .input_validation_agent import Validation_input
from .LLM_Agent import LLM_Agent
from .Query_Transformation import Query_Transformation
from .Step_Generator import Step_Generator
from .Evaluatoin_LLM import Evaluatoin_LLM
from .Initiating_agent import EnhancedInitiatingAgent
from .Critical_Analysis_Agent import CriticalAnalysisAgent
import json


import logging

class Conversation(BaseModel):
    conversation_history: List[Dict[str, Any]] = []
    conversation_history.append({
                        "role": "system",
                        "content": f"{SystemPrompts.DEFAULT}\n\n{SystemPrompts.TOOL_USAGE}"
                    })

initiating_agent = EnhancedInitiatingAgent()
Regular_or_Tech = Validation_input()
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
    print(f"messages{messages}")
    context["requires_clarification"] = False
    if len(messages) <= 1:
        print("%%%%%%%%%%%%%%%%%%")
        return initiating_agent
    if last_speaker is initiating_agent:
        print("%%%333333%%%%%%%%%%%")
        print(f"Last_message{initiating_agent.last_message()}")
        print(f"messages{messages}")
        print(f"context{context}")
        return CriticalAnalysisAgent
    if last_speaker is CriticalAnalysisAgent:
        try:
            if context["requires_clarification"] == True:
                return initiating_agent
            else:
                return Regular_or_Tech
        except json.JSONDecodeError:
            return Regular_or_Tech
    elif last_speaker is Regular_or_Tech:
        # Check if input validation passed
        response = Regular_or_Tech.handle_message()
        print(f"Regular_or_Tech : {response}")
        selector = context.get("Reular_or_Tech")
        if selector == "Regular":
            # Proceed to violation_extraction_agent
            return LLM_agent
        else:
            return Query_Agent

    elif last_speaker is Query_Agent:
        return Step_agent

    elif last_speaker is Step_agent:
        try:
            context["steps"] = Step_agent.last_message()
            return LLM_Agent
        except (ValueError, KeyError, json.JSONDecodeError, TypeError) as e:
            print(f"Error exception: {str(e)}")
            return Query_Agent
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