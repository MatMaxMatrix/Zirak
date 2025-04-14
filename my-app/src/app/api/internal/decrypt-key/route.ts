import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isRateLimited } from '@/lib/rate-limit';
import { createDecipheriv } from 'crypto';

// This is a sensitive internal API endpoint that should NEVER be exposed publicly
// It's only for server-side usage

export async function POST(request: Request) {
  try {
    // 1. Verify internal API key to prevent unauthorized access
    const internalApiKey = request.headers.get('X-Internal-API-Key');
    if (!internalApiKey || internalApiKey !== process.env.INTERNAL_API_KEY) {
      console.error('[API DecryptKey] Invalid internal API key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Apply strict rate limiting 
    const response = NextResponse.next();
    const rateLimitResult = await isRateLimited(request as any, response, { 
      limit: 20, 
      window: 60,
      blockDuration: 300 
    });
    
    if (rateLimitResult.isLimited) {
      console.warn(`[API DecryptKey] Rate limit exceeded`);
      return rateLimitResult.response;
    }

    // 3. Get parameters 
    const body = await request.json();
    const { userId, provider } = body;
    
    if (!userId || !provider) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 4. Get the encrypted key from Supabase
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('api_keys')
      .select('encrypted_key, encryption_iv')
      .eq('user_id', userId)
      .eq('key_name', provider)
      .eq('is_active', true)
      .single();
      
    if (error || !data) {
      console.error(`[API DecryptKey] Error fetching key:`, error);
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    // 5. Decrypt the key
    try {
      const { encrypted_key, encryption_iv } = data;
      
      if (!encrypted_key || !encryption_iv) {
        throw new Error('Missing encryption data');
      }
      
      const encryptionKey = process.env.API_KEY_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error('Encryption key not configured');
      }
      
      // Convert hex strings back to buffers
      const key = Buffer.from(encryptionKey, 'hex');
      const iv = Buffer.from(encryption_iv, 'hex');
      const encryptedKeyBuffer = Buffer.from(encrypted_key, 'hex');
      
      // Create decipher and decrypt
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      const decrypted = Buffer.concat([
        decipher.update(encryptedKeyBuffer),
        decipher.final()
      ]);
      
      const decryptedKey = decrypted.toString('utf8');
      
      // 6. Return the decrypted key (only to server-side code)
      return NextResponse.json({ key: decryptedKey }, { status: 200 });
    } catch (decryptError) {
      console.error('[API DecryptKey] Decryption error:', decryptError);
      return NextResponse.json({ error: 'Decryption failed' }, { status: 500 });
    }
  } catch (unexpectedError) {
    console.error('[API DecryptKey] Unexpected error:', unexpectedError);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 