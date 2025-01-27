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
            llm_config=autogen.config_list_from_json("OAI_CONFIG_LIST",)[2],
        )
        api = autogen.config_list_from_json("OAI_CONFIG_LIST",)[2]['config_list'][0]['api_key']
        self.client = OpenAI(api_key=api)
        self.register_reply(
            trigger=self._always_true_trigger,  # Add a specific trigger string
            reply_func=self.handle_message,
            position=0,
        )

    def _always_true_trigger(self, sender):
        # This trigger function always returns True
        return True
    

    def handle_message(self, *args, **kwargs):
            Critic_prompt_template = """
Analyze the User's query and generate a JSON summary of the identified assumptions and necessary clarifications:

Instructions:
<instructions>
1. Read the query carefully.
2. Identify the core requirements and implicit assumptions present in the query.
3. Flag any modern context considerations such as online/offline modes, digital channels, etc.
4. Generate a JSON object summarizing the identified assumptions, clarifying questions needed, and whether more information is required according to the specified structure.

Important guidelines:
- Confidentiality: Omit any specific personal data like names, contact information, and sensitive details.
- Clarity: Ensure that each assumption and question is clearly and concisely stated.
- Professionalism: Maintain a professional and analytical tone in your summary.

Output format:
Generate a JSON object with the following structure:
<json>
{
    "identified_assumptions": ["List of unstated assumptions in the query"],
    "clarifying_questions": ["List of questions needed for clarification"],
    "requires_clarification": true/false
}
</json>

Examples-1:
<examples>
1. Query about starting a restaurant:
<query>
"I want to open a new restaurant in downtown."
</query>

<thinking>
Core requirements: Opening a restaurant in a downtown location.
Implicit assumptions:
- Focus on physical location only.
- Assumes customers will dine in.
- No consideration of delivery or takeout services.
Modern context considerations:
- No mention of online presence or use of food delivery apps.
</thinking>

OUTPUT:
{
    "identified_assumptions": [
        "Focus on physical location only",
        "Assumes customers will dine in",
        "No consideration of online marketing or delivery services"
    ],
    "clarifying_questions": [
        "Are you planning to offer delivery or takeout services?",
        "What type of cuisine are you considering?",
        "Will you establish an online presence or use food delivery platforms?"
    ],
    "requires_clarification": true
}


Example-2:

2. Query with sufficient detail:
<query>
"I want to develop a mobile app for personal finance management that syncs across devices and supports multiple currencies."
</query>

<thinking>
Core requirements: Develop a cross-device mobile app for personal finance management supporting multiple currencies.
Implicit assumptions:
- Users need synchronization across devices.
- The app should handle currency conversion.
Modern context considerations:
- Compatibility with different operating systems (iOS, Android).
- Data security and privacy considerations.
</thinking>

OUTPUT:
{
    "identified_assumptions": [
        "Users require synchronization across multiple devices",
        "App will handle multiple currencies and possibly currency conversion",
        "Assumes availability on common mobile platforms (iOS, Android)"
    ],
    "clarifying_questions": [
        "Do you have specific security requirements for user data?",
        "Will the app support offline functionality?",
        "Are there plans for web or desktop versions in addition to mobile?"
    ],
    "requires_clarification": true
}

Example-3:
3. Query with all necessary information:
<query>
"I need a website designed for my bakery business that showcases our products, allows online ordering, and includes a blog for recipes."
</query>

<thinking>
Core requirements: Design a bakery website with product showcase, online ordering, and a blog.
Implicit assumptions:
- Requires an e-commerce platform for online orders.
- Blog will need a content management system.
Modern context considerations:
- Mobile-responsive design.
- Integration with payment gateways.
</thinking>

OUTPUT:
{
    "identified_assumptions": [
        "Website will include an e-commerce platform for online ordering",
        "Needs a content management system for the blog",
        "Requires mobile-responsive design"
    ],
    "clarifying_questions": [],
    "requires_clarification": false
}

Examples-4:
4. Query with simple input:
<query>
"Hi, how can you help me?"
</query>

OUTPUT:
{
    "identified_assumptions": [],
    "clarifying_questions": ["Please provide more details about the assistance you need."],
    "requires_clarification": true
}

</examples>


Before generating the JSON, please analyze the query in <thinking> tags.
Include your identification of the core requirements, implicit assumptions, and any modern context considerations.
Then, provide your JSON output.

Input query and information to analyze:
[Original query: "[user_query]"]
[Clarifications]

""",
            Input_user = self.context.get("User_input")
            clarifications = self.context.get("clarifications")
            Critic_prompt = Critic_prompt_template[0].replace("[user_query]", Input_user)
            if clarifications is not None:
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
                    model=autogen.config_list_from_json("OAI_CONFIG_LIST",)[2]['config_list'][0]['model'],
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