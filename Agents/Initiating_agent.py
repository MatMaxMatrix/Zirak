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
            reply_func=self.handle_message,
            position=0,
        )

        self.conversation_context = {}
    def _always_true_trigger(self, sender):
        return True





    def handle_message(self, *args, **kwargs):
        """Process input and gather clarifications if needed"""
        print(f"Here is the context: {self.context}")
        
        if not self.context.get("User_input"):
            # Return False to indicate the conversation should not proceed
            return False, {"role": "assistant", "content": "User input is missing or empty."}

        # If clarification is needed (checked from conversation context)
        if self.context.get("requires_clarification", False):
            clarifying_questions = self.context["clarifying_questions"]
            clarification_responses = {}
            
            for question in clarifying_questions:
                # Get user input for each clarifying question
                response = self.get_human_input(question)
                clarification_responses[question] = response

            self.context["clarifications"] = clarification_responses            
            self.context["requires_clarification"] = None
            # Return enhanced query with clarifications
            reply_content = {
                "original_query": self.context.get("User_input"),
                "clarifications": clarification_responses
            }
            return True, {"role": "assistant", "content": reply_content}
        else:
            response = self.get_human_input("Please provide a query.")
            self.context["User_input"] = response
            return True, {"role": "assistant", "content": response}

    def get_human_input(self, prompt):
        """Enhanced method to get human input with validation"""
        while True:
            try:
                user_input = input(f"Ask Me: ")
                if user_input.strip():  # Basic validation
                    return user_input
                print("Please provide a non-empty response.")
            except Exception as e:
                logging.error(f"Error getting human input: {str(e)}")
                print("An error occurred. Please try again.")

