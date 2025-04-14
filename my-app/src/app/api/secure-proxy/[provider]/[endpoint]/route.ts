import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isRateLimited } from '@/lib/rate-limit';
import { KEY_PROVIDER_OPENAI, KEY_PROVIDER_ANTHROPIC, getDecryptedApiKey } from '@/utils/apiKey';

// This endpoint securely proxies requests to external APIs requiring API keys
// It prevents API keys from being exposed to the client

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string; endpoint: string } }
) {
  const { provider, endpoint } = params;
  
  // Validate provider
  if (![KEY_PROVIDER_OPENAI, KEY_PROVIDER_ANTHROPIC].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  
  // Apply rate limiting
  const response = NextResponse.next();
  const rateLimitResult = await isRateLimited(request, response, { 
    limit: 30, 
    window: 60,
    blockDuration: 300
  });
  
  if (rateLimitResult.isLimited) {
    console.warn(`[API SecureProxy] Rate limit exceeded`);
    return rateLimitResult.response;
  }
  
  try {
    // Get user from session
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get the user's API key for the provider
    const apiKey = await getDecryptedApiKey(userId, provider);
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    
    // Get request payload
    const payload = await request.json();
    
    // Determine the target API URL and headers based on provider
    let apiUrl: string, headers: Record<string, string>;
    
    switch(provider) {
      case KEY_PROVIDER_OPENAI:
        apiUrl = `https://api.openai.com/v1/${endpoint}`;
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        break;
        
      case KEY_PROVIDER_ANTHROPIC:
        apiUrl = `https://api.anthropic.com/v1/${endpoint}`;
        headers = {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        };
        break;
        
      default:
        return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }
    
    // Forward the request to the external API
    console.log(`[API SecureProxy] Forwarding request to ${provider}/${endpoint}`);
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    
    // Read the response data
    const data = await apiResponse.json();
    
    // Forward the response back to the client
    return NextResponse.json(data, { 
      status: apiResponse.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: any) {
    console.error(`[API SecureProxy] Error:`, error);
    
    // Provide generic error message to client
    return NextResponse.json(
      { error: 'Failed to process request' }, 
      { status: 500 }
    );
  }
} 