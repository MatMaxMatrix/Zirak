import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// API route to handle AI model requests securely
export async function POST(request: NextRequest) {
  try {
    // Extract request details
    const requestData = await request.json();
    const { provider, prompt, options } = requestData;
    
    // Validate required fields
    if (!provider || !prompt) {
      return NextResponse.json(
        { error: 'Provider and prompt are required' },
        { status: 400 }
      );
    }
    
    // Get API key from Supabase
    const supabase = await createClient();
    
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Fetch the API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('key_name, key_prefix, hashed_key')
      .eq('user_id', session.user.id)
      .eq('key_name', provider)
      .eq('is_active', true)
      .single();
      
    if (apiKeyError || !apiKeyData) {
      console.error('Error fetching API key:', apiKeyError);
      return NextResponse.json(
        { error: `No ${provider} API key found. Please add your API key in settings.` },
        { status: 404 }
      );
    }
    
    // IMPORTANT NOTE: This is where we'd retrieve the actual API key from a secure vault
    // For this example, we're using a dummy key since we can't access the real key
    // In production, you'd need to implement a secure key management solution
    // const apiKey = getSecureApiKey(apiKeyData.key_prefix, apiKeyData.hashed_key);
    
    // Dummy implementation that would be replaced in production
    const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`] || 'dummy-key-for-demonstration';
    
    // Make the actual AI API call
    let response;
    
    if (provider === 'openai') {
      response = await callOpenAI(prompt, apiKey, options);
    } else if (provider === 'anthropic') {
      response = await callAnthropic(prompt, apiKey, options);
    } else {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ result: response });
  } catch (error) {
    console.error('Error in AI API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function for OpenAI API calls
async function callOpenAI(prompt: string, apiKey: string, options: any = {}) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 500
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Unknown error from OpenAI');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

// Helper function for Anthropic API calls
async function callAnthropic(prompt: string, apiKey: string, options: any = {}) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || 'claude-2.1',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.max_tokens || 500
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Unknown error from Anthropic');
    }
    
    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Anthropic:', error);
    throw error;
  }
} 