from autogen import ConversableAgent, UserProxyAgent
import autogen
import json
import logging

llm_config = {
    "timeout": 600,
    "cache_seed": 45,
    "config_list": autogen.config_list_from_json(
        "OAI_CONFIG_LIST",
        filter_dict={"model": ["gpt-4o"]},
    ),
    "temperature": 0,
}

class EnhancedInitiatingAgent(UserProxyAgent):
    def __init__(self):
        super().__init__(
            name="InitiatingAgent",
            system_message="""You are an enhanced initiating agent that:
            1. Receives and processes initial user queries
            2. Handles interactive communication with users for clarifications
            3. Maintains conversation context and history
            4. Ensures all necessary information is gathered before proceeding
            
            Your role is to:
            - Forward initial queries to the analysis agent
            - Present clarifying questions to the user
            - Collect and validate user responses
            - Store all gathered information in the conversation context
            - Only proceed when all necessary information is collected""",
            human_input_mode="ALWAYS",  # Enable user interaction
            llm_config=llm_config,
            code_execution_config=False  # Disable code execution as it's not needed
        )
        self.register_reply(
            trigger=self._always_true_trigger,
            reply_func=self.process_input,
            position=0,
        )

        self.conversation_context = {}
    def _always_true_trigger(self, sender):
        return True




    async def process_input(self, message, conversation):
        """Process input and gather clarifications if needed"""
        if not message:
            return {"error": "Empty input received"}

        # Store initial query in context
        self.conversation_context["initial_query"] = message

        # If clarification is needed (checked from conversation context)
        if conversation.context.get("clarifying_questions"):
            clarifying_questions = conversation.context["clarifying_questions"]
            clarification_responses = {}
            
            for question in clarifying_questions:
                # Get user input for each clarifying question
                response = await self.get_human_input(question)
                clarification_responses[question] = response

            # Store clarification responses in context
            self.conversation_context["clarifications"] = clarification_responses
            conversation.context["clarifications"] = clarification_responses
            
            # Clear the clarifying questions flag
            conversation.context["clarifying_questions"] = None
            conversation.context["user_input_required"] = False

            # Return enhanced query with clarifications
            return {
                "original_query": message,
                "clarifications": clarification_responses
            }

        return {"query": message}

    async def get_human_input(self, prompt):
        """Enhanced method to get human input with validation"""
        while True:
            try:
                user_input = input(f"\n{prompt}\nYour response: ")
                if user_input.strip():  # Basic validation
                    return user_input
                print("Please provide a non-empty response.")
            except Exception as e:
                logging.error(f"Error getting human input: {str(e)}")
                print("An error occurred. Please try again.")
