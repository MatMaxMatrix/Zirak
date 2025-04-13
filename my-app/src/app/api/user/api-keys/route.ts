import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// Helper to generate API key
function generateApiKey() {
  const prefix = 'zk_';
  const key = crypto.randomBytes(24).toString('hex');
  return {
    fullKey: `${prefix}${key}`,
    prefix: prefix,
    hashedKey: crypto.createHash('sha256').update(key).digest('hex')
  };
}

// Get all API keys for the authenticated user or check for a specific provider
export async function GET(request: NextRequest) {
  try {
    // Check if the provider parameter is present
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    
    // If provider is specified, we're checking if a specific key exists
    if (provider) {
      // Use server-side client for provider checks
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const userId = session.user.id;
      console.log(`Checking API key for provider ${provider} for user ${userId}`);

      // Check if the user has the key for the specified provider
      const { data, error } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', userId)
        .eq('key_name', provider)
        .eq('is_active', true)
        .limit(1);
      
      if (error) {
        console.error('Error checking API key:', error);
        return NextResponse.json({ 
          error: 'Failed to check API key', 
          details: error.message,
          code: error.code
        }, { status: 500 });
      }
      
      // Return response indicating if key exists
      return NextResponse.json({
        hasKey: data && data.length > 0
      });
    }
    
    // Otherwise, return all API keys (original behavior)
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`Fetching all API keys for user ${userId}`);

    // Get all API keys for the user (don't return the hashed key)
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, key_name, key_prefix, is_active, last_used_at, created_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details
       }, { status: 500 });
    }

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('Error in API keys route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || JSON.stringify(error)
    }, { status: 500 });
  }
}

// Create a new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { keyName, expiresInDays } = await request.json();

    if (!keyName) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    console.log(`Creating API key "${keyName}" for user ${userId}`);

    // Generate API key
    const { fullKey, prefix, hashedKey } = generateApiKey();

    // Calculate expiration date if provided
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString() 
      : null;

    // Try to use the server-side client to avoid RLS issues
    let serverSupabase;
    try {
      serverSupabase = await createClient();
    } catch (error) {
      console.error('Error creating server client:', error);
      // Continue with the regular client
    }

    const clientToUse = serverSupabase || supabase;
    
    // Insert new API key
    const { data, error } = await clientToUse
      .from('api_keys')
      .insert([
        {
          user_id: userId,
          key_name: keyName,
          key_prefix: prefix,
          hashed_key: hashedKey,
          is_active: true,
          expires_at: expiresAt,
        }
      ])
      .select('id, key_name, key_prefix, is_active, created_at, expires_at');

    if (error) {
      console.error('Error creating API key:', error);
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details
      }, { status: 500 });
    }

    // Return the new API key with the full key (only time it's returned)
    return NextResponse.json({ 
      apiKey: { 
        ...data[0], 
        full_key: fullKey 
      },
      message: 'Save this key now. You won\'t be able to see it again!'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || JSON.stringify(error)
    }, { status: 500 });
  }
}

// Update an API key (revoke or rename)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId, keyName, isActive } = await request.json();

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    // First verify this key belongs to the user
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', keyId)
      .eq('user_id', session.user.id)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Update the key
    const updateData: any = {};
    if (keyName !== undefined) updateData.key_name = keyName;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', keyId)
      .select('id, key_name, key_prefix, is_active, created_at, expires_at');

    if (error) {
      console.error('Error updating API key:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ apiKey: data[0] });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    // First verify this key belongs to the user
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', keyId)
      .eq('user_id', session.user.id)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Delete the key
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      console.error('Error deleting API key:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 