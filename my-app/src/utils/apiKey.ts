import { createClient } from '@/utils/supabase/client';

// Constants for key providers
export const KEY_PROVIDER_OPENAI = 'openai';
export const KEY_PROVIDER_ANTHROPIC = 'anthropic';

// Check if user has a specific API key
export async function hasApiKey(userId: string, provider: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', userId)
      .eq('key_name', provider)
      .eq('is_active', true)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error(`Error checking for ${provider} API key:`, error);
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error checking for ${provider} API key:`, error);
    return false;
  }
}

// IMPORTANT: This function should ONLY be used server-side in secure API routes
// It should never be exposed to the client
export async function getDecryptedApiKey(userId: string, provider: string): Promise<string | null> {
  // This should ONLY be called from server-side code
  if (typeof window !== 'undefined') {
    console.error('API key decryption attempted on client side! This is a security risk.');
    return null;
  }
  
  try {
    // Make a call to a secure server endpoint that handles decryption
    const response = await fetch(`/api/internal/decrypt-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include an internal API key for additional security
        'X-Internal-API-Key': process.env.INTERNAL_API_KEY || '',
      },
      body: JSON.stringify({ userId, provider }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to decrypt key: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.key || null;
  } catch (error) {
    console.error(`Error decrypting ${provider} API key:`, error);
    return null;
  }
}

// Client-safe function to proxied API calls that need API keys
export async function makeSecureApiCall(provider: string, endpoint: string, payload: any): Promise<Response> {
  try {
    // Make request to our secure proxy endpoint
    const response = await fetch(`/api/secure-proxy/${provider}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    return response;
  } catch (error) {
    console.error(`Error making secure API call to ${provider}/${endpoint}:`, error);
    throw error;
  }
}

// Get preferred API key provider (OpenAI first, then Anthropic)
export async function getPreferredApiKey(userId: string): Promise<{ provider: 'openai' | 'anthropic' | null }> {
  if (!userId) return { provider: null };
  
  // Check for OpenAI key first
  const hasOpenAI = await hasApiKey(userId, KEY_PROVIDER_OPENAI);
  if (hasOpenAI) {
    return { provider: 'openai' };
  }
  
  // Then check for Anthropic key
  const hasAnthropic = await hasApiKey(userId, KEY_PROVIDER_ANTHROPIC);
  if (hasAnthropic) {
    return { provider: 'anthropic' };
  }
  
  return { provider: null };
} 