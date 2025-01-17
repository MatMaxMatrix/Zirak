from autogen import ConversableAgent
import autogen
import os
import json
import logging


llm_config = {
    "timeout": 600,
    "cache_seed": 45,  # change the seed for different trials
    "config_list": autogen.config_list_from_json(
        "OAI_CONFIG_LIST",
        filter_dict={"model": ["gpt-4o"]},  # This Config is set to JSON mode
    ),
    "temperature": 0,
}


class InitiatingAgent(ConversableAgent):
    def __init__(self):
        super().__init__(
            name="InitiatingAgent",
            system_message="""
                            Initiating Agent. Recevied the input query to be proessed by multiple agents from the user.""",
            llm_config=llm_config,
        )
