// Constants for storage keys
const OPENAI_KEY_STORAGE_KEY = 'openai_api_key';
const ANTHROPIC_KEY_STORAGE_KEY = 'anthropic_api_key';

// OpenAI API key functions
export const getStoredApiKey = (): string | null => {
  try {
    return localStorage.getItem(OPENAI_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Error reading OpenAI API key from storage:', error);
    return null;
  }
};

export const storeApiKey = (apiKey: string): void => {
  try {
    localStorage.setItem(OPENAI_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('Error storing OpenAI API key:', error);
  }
};

export const removeApiKey = (): void => {
  try {
    localStorage.removeItem(OPENAI_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Error removing OpenAI API key:', error);
  }
};

// Anthropic API key functions
export const getStoredAnthropicApiKey = (): string | null => {
  try {
    return localStorage.getItem(ANTHROPIC_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Error reading Anthropic API key from storage:', error);
    return null;
  }
};

export const storeAnthropicApiKey = (apiKey: string): void => {
  try {
    localStorage.setItem(ANTHROPIC_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('Error storing Anthropic API key:', error);
  }
};

export const removeAnthropicApiKey = (): void => {
  try {
    localStorage.removeItem(ANTHROPIC_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Error removing Anthropic API key:', error);
  }
};

// Check if either API key is available
export const hasAnyApiKey = (): boolean => {
  return !!getStoredApiKey() || !!getStoredAnthropicApiKey();
};

// Get preferred API key (OpenAI first, then Anthropic)
export const getPreferredApiKey = (): { key: string | null, provider: 'openai' | 'anthropic' | null } => {
  const openaiKey = getStoredApiKey();
  if (openaiKey) {
    return { key: openaiKey, provider: 'openai' };
  }
  
  const anthropicKey = getStoredAnthropicApiKey();
  if (anthropicKey) {
    return { key: anthropicKey, provider: 'anthropic' };
  }
  
  return { key: null, provider: null };
}; 