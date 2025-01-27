from autogen import ConversableAgent, UserProxyAgent
import autogen
import json
import logging


class EnhancedInitiatingAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="InitiatingAgent",
            system_message="",
            llm_config=autogen.config_list_from_json("OAI_CONFIG_LIST",)[2],
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
            response = self.get_human_input()
            self.context["User_input"] = response
            return True, {"role": "assistant", "content": response}

    def get_human_input(self):
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

