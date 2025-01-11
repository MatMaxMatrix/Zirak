from openai import OpenAI
from config import Config
from rich.console import Console
Console = Console()

def count_tokens(messages, model="gpt-3.5-turbo"):
    """
    Count total tokens used (input + output) for a chat completion.
    
    Args:
        messages: List of message dictionaries to send to the model
        model: The model name to use (default: gpt-3.5-turbo)
    
    Returns:
        dict: Token counts for prompt, completion, and total
    """
    client = OpenAI(api_key=Config.ANTHROPIC_API_KEY)
  # Uses OPENAI_API_KEY environment variable
    
    # Make the API call
    response = client.chat.completions.create(
        model=model,
        messages=messages
    )
    
    return {
        'response': response,  # Full response object
        'prompt_tokens': response.usage.prompt_tokens,    # Input tokens
        'completion_tokens': response.usage.completion_tokens,  # Output tokens
        'total_tokens': response.usage.total_tokens      # Total tokens
    }

# Example usage
if __name__ == "__main__":
    messages = [
        {"role": "user", "content": "Hello, how are you?"}
    ]
    
    usage = count_tokens(messages)
    Console.print(f"Input tokens: {usage['prompt_tokens']}")
    Console.print(f"Output tokens: {usage['completion_tokens']}")
    Console.print(f"Total tokens: {usage['total_tokens']}")
    Console.print(f"Response: {usage['response']}")