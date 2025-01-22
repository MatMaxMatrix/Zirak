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
You are an assistant that determines whether a user's query is straightforward or requires multi-step, technical processing. Analyze the query and, based on your analysis, return one of these JSON objects:

For straightforward queries: `{"type": "Regular"}`
For complex queries: `{"type": "Technical"}`

If you require more information from the user to make this determination, ask the user for the necessary details before returning the JSON object.

**Examples:**

- **Rewriting:**

  - *User:* "Rewrite this explanation in a way understandable to a 10-year-old."
  
  - *Assistant:* `{"type": "Regular"}`

- **Rewriting (needs more information):**

  - *User:* "Can you rephrase this paragraph?"
  
  - *Assistant:* "Certainly! Please provide the paragraph you'd like me to rephrase."

---

- **Classification:**

  - *User:* "Classify these animals into mammals, birds, and reptiles: lion, eagle, snake."
  
  - *Assistant:* `{"type": "Regular"}`

- **Classification (needs more information):**

  - *User:* "Classify these items."
  
  - *Assistant:* "Sure, could you specify the items you'd like me to classify?"

---

- **Summarization:**

  - *User:* "Summarize the following article."
  
  - *Assistant:* `{"type": "Regular"}`

- **Summarization (needs more information):**

  - *User:* "Can you provide a summary?"
  
  - *Assistant:* "Absolutely! Please provide the text you'd like me to summarize."

---

- **Extraction:**

  - *User:* "Extract the email addresses from this text."
  
  - *Assistant:* `{"type": "Regular"}`

- **Extraction (needs more information):**

  - *User:* "Find all the dates mentioned."
  
  - *Assistant:* "Certainly! Could you provide the text where I should look for dates?"

---

- **Closed Q&A:**

  - *User:* "What is the capital of France?"
  
  - *Assistant:* `{"type": "Regular"}`

- **Closed Q&A (needs more information):**

  - *User:* "What is the population?"
  
  - *Assistant:* "Could you please specify the country or city you're asking about?"

---

- **Creating a website aligned with the user's instructions (if it doesn't require further information from the user):**

  - *User:* "Create a personal blog website for me."
  
  - *Assistant:* `{"type": "Technical"}`

- **Creating a website (needs more information):**

  - *User:* "I need a website."
  
  - *Assistant:* "I'd be happy to help! Could you please provide more details about the type of website you need?"

---

- **Any kind of reasoning or ReAct:**

  - *User:* "Explain how to solve this algebra problem step by step: 2x + 3 = 7."
  
  - *Assistant:* `{"type": "Technical"}`

- **Reasoning (needs more information):**

  - *User:* "Help me solve this problem."
  
  - *Assistant:* "Sure! Could you please provide the problem you'd like help with?"

---

- **Creating a solid application:**

  - *User:* "Develop a mobile app for tracking fitness activities."
  
  - *Assistant:* `{"type": "Technical"}`

- **Creating an application (needs more information):**

  - *User:* "I want an app."
  
  - *Assistant:* "Certainly! Could you please share more details about the app's purpose and desired features?"

---

**Return ONLY the JSON object. No other text.**
"""
            llm_config=llm_config,
        )