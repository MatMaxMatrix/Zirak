from autogen.agentchat.assistant_agent import ConversableAgent
from openai import OpenAI
import json
from rich.console import Console

from .config import Config
from .Query_Transformation import Query_Transformation


Query_Transformation = Query_Transformation()


class Step_Generator(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="Step_Generator",
            system_message="",
            llm_config={
                "model": Config.Model,
                "api_key": Config.api_key,
                "base_url": Config.base_url,
            },
            description="""
            You are an expert system architect who breaks down complex technical tasks into a series of clear, detailed steps. Each step should be formulated as a complete prompt that can be given to an LLM for implementation. The first step must always contain the overall workflow and core implementation of the query, while subsequent steps should focus on additional details, features, or validations.
            """,
        )
        # Initialize OpenAI client with the correct API key and base URL
        self.client = OpenAI(api_key=Config.api_key, base_url=Config.base_url)
        self.register_reply(
            trigger=self._always_true_trigger,  # Add a specific trigger string
            reply_func=self.handle_message,
            position=0,
        )
        self.console = Console()

    def _always_true_trigger(self, sender):
        # This trigger function always returns True
        return True

    def handle_message(self, *args, **kwargs):
        try:
            query = Query_Transformation.last_message().get("content", "{}")
            self.console.print(
                f"[bold green]Step Generator processing query[/bold green]"
            )

            # Define the system prompt
            system_message = """
You are an expert system architect who breaks down complex technical tasks into a series of clear, detailed steps. Each step should be formulated as a complete prompt that can be given to an LLM for implementation. The first step must always contain the overall workflow and core implementation of the query, while subsequent steps should focus on additional details, features, or validations.

Your task is to analyze the given query and generate a JSON response where:
- Each step is a complete, self-contained prompt
- Technical requirements and context are embedded within each step
- Dependencies and considerations are included in the prompt text
- The information is detailed enough for implementation
- Include explicit instructions for file and folder creation when needed

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
        "step1": "Design and implement a secure user authentication system with the overall workflow including user registration, login, and basic security features. First, create the following folder structure: 1) 'auth_system' as the main folder, 2) 'auth_system/models' for data models, 3) 'auth_system/routes' for API endpoints, 4) 'auth_system/utils' for helper functions. Then implement core functionality with: 1) User registration with secure password hashing (e.g., bcrypt or Argon2) and storage, 2) Login endpoint to authenticate users by verifying hashed passwords, 3) Basic error handling for invalid credentials. Include a high-level description of how password hashing, email verification, and session management will integrate into the system. Follow security best practices to prevent vulnerabilities like SQL injection and ensure scalability.",

        "step2": "Extend the authentication system from step1 to include a robust email verification process. Create a new file 'auth_system/utils/email_verification.py' for the email verification functionality. Implement: 1) Secure verification token generation, 2) Token storage with expiration (e.g., 24 hours), 3) Integration with an email sending service, 4) A verification endpoint to validate tokens, 5) User account activation upon successful verification. Consider reliability of email delivery, token security, rate limiting, and edge cases like expired or reused tokens.",

        "step3": "Enhance the authentication system from step1 with secure session management. Create a new file 'auth_system/utils/session_management.py' for the session management functionality. Implement: 1) Session token generation upon successful login, 2) Secure storage of session tokens (e.g., in a database or cache) with expiration handling, 3) Secure cookie management (HTTP-only, Secure flags), 4) Session invalidation on logout or security events, 5) Support for session renewal. Address security concerns like session fixation and cross-site scripting, adhering to OWASP session management guidelines."
    }
}

Each step's prompt should:
- Begin with a clear objective
- Include all necessary technical requirements
- Specify important considerations and constraints
- Include relevant security or performance requirements
- Reference any dependencies on previous steps
- Request specific implementation details
- Include explicit instructions for file and folder creation when needed
- For step1, provide the overall workflow and core implementation; for subsequent steps, focus on additional features or validations

Return ONLY the JSON output with no additional explanation or formatting.
"""

            # Make API call to get the step breakdown
            max_retries = 3
            retry_count = 0

            while retry_count < max_retries:
                try:
                    response = self.client.chat.completions.create(
                        model=Config.Model,
                        messages=[
                            {"role": "system", "content": system_message},
                            {"role": "user", "content": query},
                        ],
                        temperature=0.2,
                        max_tokens=4000,
                        response_format={"type": "json_object"},
                    )

                    # Extract the JSON content
                    json_str = response.choices[0].message.content

                    # Validate the JSON
                    step_response = json.loads(json_str)

                    # Make sure the response has the expected structure
                    if "steps" not in step_response:
                        self.console.print(
                            "[bold red]Invalid response format, missing 'steps'. Retrying...[/bold red]"
                        )
                        retry_count += 1
                        continue

                    # Store steps in context
                    self.context["steps"] = step_response.get("steps", {})
                    self.console.print(
                        f"[bold cyan]Step Generator finished - found {len(self.context['steps'])} steps[/bold cyan]"
                    )

                    # Return the response
                    return True, {"role": "assistant", "content": json_str}

                except json.JSONDecodeError:
                    self.console.print(
                        "[bold red]Failed to parse JSON response. Retrying...[/bold red]"
                    )
                    retry_count += 1

                except Exception as e:
                    self.console.print(
                        f"[bold red]Error: {str(e)}. Retrying...[/bold red]"
                    )
                    retry_count += 1

            # If we've exhausted retries, return an error
            self.console.print(
                "[bold red]Failed to generate valid steps after maximum retries[/bold red]"
            )
            return True, {
                "role": "assistant",
                "content": json.dumps(
                    {"error": "Failed to generate valid steps", "goal": query}
                ),
            }

        except Exception as e:
            self.console.print(
                f"[bold red]Unexpected error in Step Generator: {str(e)}[/bold red]"
            )
            return True, {
                "role": "assistant",
                "content": json.dumps(
                    {"error": str(e), "goal": "Error processing request"}
                ),
            }
