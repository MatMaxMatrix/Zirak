// Utility function to make AI API calls through our secure server endpoint
export async function callAI(provider: 'openai' | 'anthropic', prompt: string, options: any = {}) {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        prompt,
        options,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Unknown error calling AI service');
    }
    
    return data.result;
  } catch (error) {
    console.error(`Error calling ${provider} AI:`, error);
    throw error;
  }
}

// Check if a specific AI provider's API key is configured
export async function isAIProviderConfigured(provider: 'openai' | 'anthropic'): Promise<boolean> {
  try {
    const response = await fetch(`/api/user/api-keys?provider=${provider}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return response.ok && data.hasKey;
  } catch (error) {
    console.error(`Error checking if ${provider} is configured:`, error);
    return false;
  }
} 