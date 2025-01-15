from autogen import ConversableAgent
import os
import json
import logging


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
            llm_config={
                "model": os.getenv("OPENAI_MODEL", "gpt-4o"),
                "api_key": os.getenv("OPENAI_API_KEY"),
            },
        )
