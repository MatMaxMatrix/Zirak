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

// Get the active API key (with proper security handling)
export async function getApiKey(userId: string, provider: string): Promise<string | null> {
  if (!userId) return null;
  
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('key_name', provider)
      .eq('is_active', true)
      .single();
      
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error(`Error fetching ${provider} API key:`, error);
      }
      return null;
    }
    
    // NOTE: You can't actually return the API key since we only store a hash
    // In practice, you would need to handle API calls server-side where the real keys are stored
    // or implement a secure way to request the real key from your backend
    
    // This would typically be handled through a secure proxy API
    return data ? 'secure-placeholder-value' : null;
  } catch (error) {
    console.error(`Error fetching ${provider} API key:`, error);
    return null;
  }
}

// Check if user has any API key
export async function hasAnyApiKey(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);
      
    if (error) {
      console.error('Error checking for any API key:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking for any API key:', error);
    return false;
  }
}

// Get preferred API key (OpenAI first, then Anthropic)
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