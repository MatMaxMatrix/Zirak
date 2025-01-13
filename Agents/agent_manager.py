# File: /Framework/agents/agent_manager.py

import os
from autogen import GroupChat

from prompts.system_prompts import SystemPrompts
from typing import List, Dict, Any

import autogen
from .input_validation_agent import InputValidationAgent
from .violation_extraction_agent import ViolationExtractionAgent
from .validation_agent import ValidationAgent
from .similarity_search_agent import SimilaritySearchAgent
from .regulation_content_agent import RegulationContentAgent
from .recommendation_agent import RecommendationAgent
from .corrective_action_agent import CorrectiveActionAgent
from .corrective_action_validation_agent import CorrectiveActionValidationAgent
from .similar_case_agent import Similar_case_Recommendation
from .Initiating_agent import InitiatingAgent
import json


import logging

conversation_history: List[Dict[str, Any]] = []
conversation_history.append({
                    "role": "system",
                    "content": f"{SystemPrompts.DEFAULT}\n\n{SystemPrompts.TOOL_USAGE}"
                })

initiating_agent = InitiatingAgent()
Regular_or_Tech = InputValidationAgent()
LLM_agent = LLM_Agent()
Query_Agent = Query_Transformation()
Step_agent = Step_Generator()
Evaluation_agent = Evaluatoin_LLM()


agents = [
    initiating_agent,
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
        return LLM_agent
    elif last_speaker is LLM_agent:
        return Evaluation_agent
    elif last_speaker is Evaluation_agent and context.get("total_steps", 0) >= context.get("current_step", 1):
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
