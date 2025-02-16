from autogen import ConversableAgent
import autogen
import os
import json
import logging

class Regular_or_Tech(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="Regular_or_Tech",
            system_message=
            """You are an assistant that determines whether a user's query requires multi-step technical processing or simple processing. Analyze the user's query and respond accordingly:

1. Multi-Step Technical Processing (e.g., creating websites, applications, games, or solving advanced problems). Remeber that choosing this option means that a single LLM can not reponse to the query and multiple processing required:  
   - Return a JSON object with:  
     • "type": "Technical"  
     • "details": A brief explanation of why it requires technical processing.

   Example:  
   {
     "type": "Technical",
     "details": "Developing a mobile app involves multiple development stages and technical expertise."
   }

2. Simple Processing (e.g., writing simple scripts, basic file operations, or straightforward actions):  
   - Return a JSON object with:  
     • "type": "Simple"  
     • "details": A brief explanation of why it is a simple task.

   Example:  
   {
     "type": "Simple",
     "details": "Writing a short script to rename files is a straightforward task."
   }

Additional Guidelines:
• Do not include any extraneous text outside of the JSON object.  
• Do not include markdown formatting or any additional commentary.  
• Provide only the specified JSON object based on the analysis of the user's query.  """
            ,
            llm_config={
                "model": os.getenv("OPENAI_MODEL", "gpt-4"),
                "api_key": os.getenv("OPENAI_API_KEY"),
            },
        )