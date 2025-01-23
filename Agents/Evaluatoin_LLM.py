from autogen import ConversableAgent
import os
import json
import logging
from openai import OpenAI

import autogen


class Evaluatoin_LLM(ConversableAgent):
    def __init__(self):

        self.llm_config = {
                    "timeout": 600,
                    "cache_seed": 45,  # change the seed for different trials
                    "config_list": autogen.config_list_from_json(
                        "OAI_CONFIG_LIST",
                        filter_dict={"model": ["gpt-4o-json"]},  # This Config is set to JSON mode
                    ),
                    "temperature": 0,
                }
        
        super().__init__(
            name="Query_Transformation",
            system_message="",
            llm_config=self.llm_config,
        )

        self.client = OpenAI(api_key=self.llm_config["config_list"][0].get("api_key"))
        self.register_reply(
            trigger=self._always_true_trigger,  # Add a specific trigger string
            reply_func=self.handle_message,
            position=0,
        )

    def _always_true_trigger(self, sender):
        # This trigger function always returns True
        return True

    def handle_message(self, *args, **kwargs):
        message = """
You are an expert Technical Evaluation Agent responsible for assessing the quality and completeness of technical implementations. Your role is to evaluate the output of each implementation step against established criteria and provide clear pass/fail decisions with detailed feedback.

When evaluating each implementation, consider these key aspects:

Technical Completeness:
- All required functionality is implemented
- Core features are properly addressed
- Edge cases are handled
- Error scenarios are considered

Security Considerations:
- Security best practices are followed
- Common vulnerabilities are addressed
- Proper validation and sanitization
- Secure data handling

Code Quality:
- Clean and maintainable code structure
- Proper error handling
- Efficient implementation
- Following language/framework best practices

Architecture:
- Proper separation of concerns
- Scalable design
- Clear component interfaces
- Appropriate design patterns

Your output must be a JSON object with this structure:
{
    "evaluation": {
        "status": "PASS" or "FAIL",
        "feedback": {
            "issues": [
                "Detailed description of each issue found"
            ],
            "suggestions": [
                "Specific suggestions for improvement"
            ],
            "missing_requirements": [
                "List of requirements not met"
            ]
        },
        "critical_concerns": [
            "List of any critical issues that must be addressed"
        ]
    }
}

Example Input (Password Management Implementation):
```python
def hash_password(password):
    salt = generate_salt()
    hashed = bcrypt.hashpw(password.encode(), salt)
    return hashed

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed)

def generate_salt():
    return bcrypt.gensalt()
```

Example Output:
{
    "evaluation": {
        "status": "FAIL",
        "feedback": {
            "issues": [
                "No password complexity validation implemented",
                "Missing rate limiting for password attempts",
                "No handling of null or empty password inputs"
            ],
            "suggestions": [
                "Add password strength requirements (length, special chars, numbers)",
                "Implement rate limiting mechanism",
                "Add input validation and proper error handling"
            ],
            "missing_requirements": [
                "Password complexity validation",
                "Brute force protection",
                "Input validation"
            ]
        },
        "critical_concerns": [
            "Lack of brute force protection creates significant security vulnerability",
            "Missing input validation could lead to application crashes"
        ]
    }
}

Return ONLY the JSON evaluation output. Do not include any additional explanation or commentary. Your feedback should be specific, actionable, and focused on technical implementation details.
"""

        response = self.client.chat.completions.create(
            model=self.llm_config["config_list"][0].get("model"),
            messages=message,
            temperature=0.3,
            max_tokens=1000,
        )
        #  logging.debug(f"{self.name}: Generated corrective action plan:\n{corrective_action_plan.strip()}")

        self.context["Evaluation_result"] = response.choices[0].message.content.strip()
