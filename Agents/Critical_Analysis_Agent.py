from autogen import ConversableAgent
import autogen
import json

llm_config = {
    "timeout": 600,
    "cache_seed": 45,
    "config_list": autogen.config_list_from_json(
        "OAI_CONFIG_LIST",
        filter_dict={"model": ["gpt-4o-json"]},
    ),
    "temperature": 0,
}

class CriticalAnalysisAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name = "CriticalAnalysisAgent",
            system_message = """You are a critical analysis agent that evaluates queries for unstated assumptions and edge cases.
            For each query:
            1. Identify core requirements and implicit assumptions
            2. Flag modern context considerations (online/offline, digital channels, etc.)
            3. Return a JSON object with:
               - identified_assumptions: list of unstated assumptions
               - clarifying_questions: list of questions needed
               - requires_clarification: boolean indicating if more info is needed
            
            Example response for restaurant query:
            {
                "identified_assumptions": [
                    "Focus on physical location only",
                    "Traditional dining service model",
                    "No consideration of delivery radius"
                ],
                "clarifying_questions": [
                    "Are you planning to offer delivery services?",
                    "What type of cuisine are you considering?",
                    "What are your target operating hours?"
                ],
                "requires_clarification": true
            }""",
            llm_config = llm_config,
        )