from autogen import ConversableAgent
import autogen
import json
import os



class CriticalAnalysisAgent(ConversableAgent):

    def __init__(self):
        self.llm_config = {
            "timeout": 600,
            "cache_seed": 45,
            "config_list": autogen.config_list_from_json(
                "OAI_CONFIG_LIST",
                filter_dict={"model": ["gpt-4o-json"]},
            ),
            "temperature": 0,
        }
        super().__init__(
            name = "CriticalAnalysisAgent",
            system_message = """
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

Examples:
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

<json>
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
</json>

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

<json>
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
</json>

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

<json>
{
    "identified_assumptions": [
        "Website will include an e-commerce platform for online ordering",
        "Needs a content management system for the blog",
        "Requires mobile-responsive design"
    ],
    "clarifying_questions": [],
    "requires_clarification": false
}
</json>
</examples>
</instructions>

Before generating the JSON, please analyze the query in <thinking> tags.
Include your identification of the core requirements, implicit assumptions, and any modern context considerations.
Then, provide your JSON output in <json> tags.
""",
            


            

            llm_config ={
                "model": os.getenv("OPENAI_MODEL", "gpt-4o"),
                "api_key": os.getenv("OPENAI_API_KEY"),
            },
        )