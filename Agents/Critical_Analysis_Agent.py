#%%
from autogen import ConversableAgent
import autogen
from openai import OpenAI
import json
from rich.console import Console
from .config import Config
#%%
class CriticalAnalysisAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="CriticalAnalysisAgent",
            system_message="",
            llm_config={
                "model": Config.Model,
                "api_key": Config.api_key,
                "base_url": Config.base_url,
            },
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
            Input_user = self.context.get("User_input")
            clarifications = self.context.get("clarifications")
            #self.console.print(f"[red]{clarifications}.[/red]")
            
            Critic_prompt = f"""Analyze the User's input and generate a JSON summary of assumptions and clarifications needed.

Instructions:
1. Carefully parse the query for explicit/implicit requirements
2. Identify modern context considerations (digital channels, online/offline needs, etc.)
3. Follow confidentiality guidelines by omitting personal/sensitive data
4. Maintain professional analytical tone throughout

Output JSON structure:
{{
    "identified_assumptions": [str],
    "clarifying_questions": [str],
    "requires_clarification": bool
}}

Process flow:
<thinking>
[REQUIRED ANALYSIS SECTION]
- Core requirements extraction
- Implicit assumption identification 
- Modern context evaluation
- Clarity/completeness assessment
</thinking>

Examples:
1. Restaurant query → Assumptions about physical space only
2. Finance app → Clarify cross-platform needs
3. Complete website spec → No questions needed

Current Input:
{Input_user}
[user_query]
[/QUERY]

[CLARIFICATIONS]
{clarifications}
[/CLARIFICATIONS]

Generate analysis JSON after <thinking>.""",
            



            #Critic_prompt = Critic_prompt_template[0].replace("[user_query]", Input_user)
            #Critic_prompt = Critic_prompt_template[0].replace("[Clarifications]", clarifications)

            def extract_json_from_response(response_text: str) -> dict:
                """
                Extract JSON content from a response text that contains markdown code blocks.
                
                Args:
                    response_text (str): The full response text containing JSON data
                    
                Returns:
                    dict: Extracted JSON object or None if extraction fails
                    
                Example:
                    text = '''```json
                    {
                        "key": "value"
                    }
                    ```'''
                    result = extract_json_from_response(text)
                """
                try:
                    # If we receive a ChatCompletion object, get the content
                    if hasattr(response_text, 'choices'):
                        response_text = response_text.choices[0].message.content

                    # Try to parse the entire response as JSON first
                    try:
                        return json.loads(response_text)
                    except json.JSONDecodeError:
                        pass  # Continue with other extraction methods

                    # Find the start of a JSON code block
                    start_marker = '```json'
                    start_idx = response_text.find(start_marker)
                    if start_idx == -1:
                        # Check for a generic code block
                        start_marker = '```'
                        start_idx = response_text.find(start_marker)
                        if start_idx == -1:
                            # Try to find JSON directly with curly braces
                            start_idx = response_text.find('{')
                            if start_idx == -1:
                                return None
                            end_idx = response_text.rfind('}')
                            if end_idx == -1:
                                return None
                            json_str = response_text[start_idx:end_idx + 1]
                            return json.loads(json_str)
                        else:
                            start_idx += len(start_marker)
                    else:
                        start_idx += len(start_marker)

                    # Find the end of the code block
                    end_idx = response_text.find('```', start_idx)
                    if end_idx == -1:
                        # If no closing code block, try to find the last curly brace
                        end_idx = response_text.rfind('}')
                        if end_idx == -1:
                            return None
                        json_text = response_text[start_idx:end_idx + 1].strip()
                    else:
                        json_text = response_text[start_idx:end_idx].strip()

                    # Find the first '{' and last '}' to handle possible leading/trailing text
                    start_pos = json_text.find('{')
                    end_pos = json_text.rfind('}')
                    if start_pos == -1 or end_pos == -1:
                        return None

                    json_str = json_text[start_pos:end_pos + 1]

                    # Parse the JSON string
                    return json.loads(json_str)
                except Exception as e:
                    print(f"Error extracting JSON: {str(e)}")
                    # Return a default JSON object instead of None
                    return {
                        "identified_assumptions": [],
                        "clarifying_questions": [],
                        "requires_clarification": False
                    }


            # Add a maximum number of attempts to prevent infinite loops
            max_attempts = 3
            attempts = 0
            
            while attempts < max_attempts:
                attempts += 1
                #print("WE GOT HERE")
                try:
                    # Make sure we're using the correct model name for OpenAI
                    response = self.client.chat.completions.create(
                        model=Config.Model,
                        messages=[{"role": "user", "content": str(Critic_prompt)}],
                        temperature=0,
                        max_tokens=1000,
                    )
                    print(response.choices[0].message.content)
                    #self.console.print(f"[purple]{response}.[/purple]")
                    
                    json_content = extract_json_from_response(response)
                    if json_content:
                        if json_content.get("clarifying_questions"):
                            self.context["requires_clarification"] = True
                            self.context["clarifying_questions"] = json_content.get("clarifying_questions", [])
                            self.context["identified_assumptions"] = json_content.get("identified_assumptions", [])
                        else:
                            self.context["requires_clarification"] = False
                        # Convert the JSON object to a string before returning it
                        json_str = json.dumps(json_content, indent=2)
                        # Return a tuple with (final, reply) as expected by autogen
                        return True, {"role": "assistant", "content": json_str}
                except Exception as e:
                    print(f"Error processing response: {str(e)}")
                    # Continue to the next attempt
            
            # Return a fallback response if we couldn't get a valid response after max attempts
            self.context["requires_clarification"] = False
            # Return a tuple with (final, reply) as expected by autogen
            return True, {"role": "assistant", "content": "I encountered an issue analyzing the request. Let's proceed with the conversation."}