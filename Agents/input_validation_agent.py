from autogen import ConversableAgent
import autogen
import os
import json
import logging

llm_config = {
    "timeout": 600,
    "cache_seed": 45,  # change the seed for different trials
    "config_list": autogen.config_list_from_json(
        "OAI_CONFIG_LIST",
        filter_dict={"model": ["gpt-4o-json"]},  # This Config is set to JSON mode
    ),
    "temperature": 0,
}


class Similar_case_Recommendation(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="Regular_or_Tech",
            system_message="""
                        You are an assistant that determines whether a user's query is straightforward or requires 
                        multi-step, technical processing. Analyze the query and return one of these JSON objects:
                        
                        For straightforward queries: {"type": "Regular"}
                        For complex queries: {"type": "Technical"}
                        
                        Examples:
                        - "What's the weather?" → {"type": "Regular"}
                        - "Can you analyze this log file and create a visualization?" → {"type": "Technical"}
                        
                        Return ONLY the JSON object. No other text.""",
            llm_config=llm_config,
        )