#%%
from autogen import ConversableAgent
import autogen
from openai import OpenAI
import json

#%%
class CriticalAnalysisAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="CriticalAnalysisAgent",
            system_message="",
            llm_config=autogen.config_list_from_json("OAI_CONFIG_LIST",)[3],
        )
        api = autogen.config_list_from_json("OAI_CONFIG_LIST",)[3]['config_list'][0]['api_key']
        self.client = OpenAI(api_key=api, base_url="https://api.deepseek.com")
        self.register_reply(
            trigger=self._always_true_trigger,  # Add a specific trigger string
            reply_func=self.handle_message,
            position=0,
        )

    def _always_true_trigger(self, sender):
        # This trigger function always returns True
        return True
    

    def handle_message(self, *args, **kwargs):
            Critic_prompt_template = [
{
    "role": "system",
    "content": """Analyze the User's input and generate a JSON summary of assumptions and clarifications needed.

Instructions:
1. Carefully parse the query for explicit/implicit requirements
2. Identify modern context considerations (digital channels, online/offline needs, etc.)
3. Follow confidentiality guidelines by omitting personal/sensitive data
4. Maintain professional analytical tone throughout

Output JSON structure:
{
    "identified_assumptions": [str],
    "clarifying_questions": [str],
    "requires_clarification": bool
}

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
[QUERY]
[user_query]
[/QUERY]

[CLARIFICATIONS]
[Clarifications]
[/CLARIFICATIONS]

Generate analysis JSON after <thinking>."""
}],
            Input_user = self.context.get("User_input")
            clarifications = self.context.get("clarifications")
            Critic_prompt = Critic_prompt_template[0].replace("[user_query]", Input_user)
            Critic_prompt = Critic_prompt_template[0].replace("[Clarifications]", clarifications)
            def extract_json_from_response(response_text: str) -> dict:
                """
                Extract JSON content from a response text that may contain markdown code blocks
                and thinking tags.
                
                Args:
                    response_text (str): The full response text containing JSON data
                    
                Returns:
                    dict: Extracted JSON object or None if extraction fails
                    
                Example:
                    text = '''<thinking>some analysis</thinking>
                    OUTPUT:
                    ```json
                    {
                        "key": "value"
                    }
                    ```
                    '''
                    result = extract_json_from_response(text)
                """
                try:
                    # If we receive a ChatCompletion object, get the content
                    if hasattr(response_text, 'choices'):
                        response_text = response_text.choices[0].message.content

                    # Find the position of 'OUTPUT:'
                    output_pos = response_text.find('OUTPUT:')
                    if output_pos == -1:
                        return None
                        
                    # Get the text after 'OUTPUT:'
                    json_text = response_text[output_pos + 7:].strip()
                    
                    # Remove markdown code blocks if present
                    json_text = json_text.replace('```json', '').replace('```', '').strip()
                    
                    # Find the first '{' and last '}'
                    start_pos = json_text.find('{')
                    end_pos = json_text.rfind('}')
                    
                    if start_pos == -1 or end_pos == -1:
                        return None
                        
                    # Extract the JSON string
                    json_str = json_text[start_pos:end_pos + 1]
                    
                    # Parse the JSON string
                    return json.loads(json_str)
                    
                except json.JSONDecodeError as e:
                    print(f"JSON decode error: {str(e)}")
                    return None
                except Exception as e:
                    print(f"Error extracting JSON: {str(e)}")
                    return None
            while True:
                print("WE GOT HERE")
                response = self.client.chat.completions.create(
                    model="deepseek-chat",     #autogen.config_list_from_json("OAI_CONFIG_LIST",)[2]['config_list'][0]['model'],
                    messages=[{"role": "user", "content": Critic_prompt}],
                    temperature=0.3,
                    max_tokens=1000,
                )
                try:
                    json_content = extract_json_from_response(response)
                    if json_content:
                        if json_content.get("clarifying_questions"):
                            self.context["requires_clarification"] = True
                            self.context["clarifying_questions"] = json_content.get("clarifying_questions", [])
                            self.context["identified_assumptions"] = json_content.get("identified_assumptions", [])
                        else:
                            self.context["requires_clarification"] = False
                        return  {"role": "assistant", "content": json_content}
                except Exception as e:
                    print(f"Error processing response: {str(e)}")
                    continue