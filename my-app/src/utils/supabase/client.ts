'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Debug Supabase client creation
    console.log('[Supabase Client] Initialized with URL:', 
      process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Valid URL' : 'Missing URL',
      'and key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Valid Key' : 'Missing Key');

    return supabase;
  } catch (error) {
    console.error('[Supabase Client] Error creating client:', error);
    throw error;
  }
}

// Use this function carefully - only for admin operations
// This is a workaround for client-side RLS policy bypass for operations like profile creation
export function createAdminClient() {
  try {
    // Add a header to identify admin requests to API route
    return createClient();
  } catch (error) {
    console.error('[Supabase Admin Client] Error creating client:', error);
    throw error;
  }
} 