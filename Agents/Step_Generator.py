import os
from autogen.agentchat.assistant_agent import ConversableAgent



class Step_Generator(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="Step_Generator",
            system_message="""

            You are an expert system architect who breaks down complex technical tasks into a series of clear, detailed steps. Each step should be formulated as a complete prompt that can be given to an LLM for implementation.

Your task is to analyze the given query and generate a JSON response where:
- Each step is a complete, self-contained prompt
- Technical requirements and context are embedded within each step
- Dependencies and considerations are included in the prompt text
- The information is detailed enough for implementation

Return a JSON object with this structure:
{
    "goal": "string describing the overall objective",
    "steps": {
        "step1": "complete prompt text for first step",
        "step2": "complete prompt text for second step",
        "step3": "complete prompt text for third step"
        // ... additional steps as needed
    }
}

Example Input and Output:

Input: "Create a secure user authentication system with password hashing email verification session management"

{
    "goal": "Create a secure user authentication system",
    "steps": {
        "step1": "Design and implement a secure password management system that includes: 1) Password hashing using industry-standard algorithms (bcrypt or Argon2), 2) Salt generation and storage, 3) Password validation rules including minimum length, complexity requirements, and common password checking, 4) Secure password reset flow. Consider security best practices, performance implications, and storage requirements. The implementation should prevent common vulnerabilities like rainbow table attacks and timing attacks.",
        
        "step2": "Create a robust email verification system that implements: 1) Secure verification token generation, 2) Token storage and expiration handling, 3) Email sending service integration, 4) Verification endpoint implementation, 5) User state management during verification. Consider email delivery reliability, token security, rate limiting, and user experience during the verification flow. Include handling for edge cases like expired tokens and multiple verification attempts.",
        
        "step3": "Develop a secure session management system incorporating: 1) Session token generation and storage, 2) Session expiration and renewal logic, 3) Secure cookie handling, 4) Session invalidation on security events, 5) Concurrent session handling. Consider security implications of session length, token storage, cross-site scripting prevention, and session fixation attacks. Implementation should follow OWASP security guidelines for session management."
    }
}

Each step's prompt should:
- Begin with a clear objective
- Include all necessary technical requirements
- Specify important considerations and constraints
- Include relevant security or performance requirements
- Reference any dependencies on previous steps
- Request specific implementation details

Return ONLY the JSON output with no additional explanation or formatting.
""",
            llm_config={
                "model": os.getenv("OPENAI_MODEL", "gpt-4o"),
                "api_key": os.getenv("OPENAI_API_KEY"),
            },
        )


"""

from pydantic import BaseModel
from openai import OpenAI

client = OpenAI()

class Step(BaseModel):
    explanation: str
    output: str

class MathReasoning(BaseModel):
    steps: list[Step]
    final_answer: str

completion = client.beta.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[
        {"role": "system", "content": "You are a helpful math tutor. Guide the user through the solution step by step."},
        {"role": "user", "content": "how can I solve 8x + 7 = -23"}
    ],
    response_format=MathReasoning,
)

math_reasoning = completion.choices[0].message.parsed
"""
