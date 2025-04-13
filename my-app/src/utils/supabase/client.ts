'use client';

import { createBrowserClient } from '@supabase/ssr';

// Use a singleton pattern for the Supabase instance
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;
let hasLoggedInitialization = false;

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Only log on first initialization
    if (!hasLoggedInitialization) {
      console.log('[Supabase Client] Initialized with URL:', 
        process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Valid URL' : 'Missing URL',
        'and key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Valid Key' : 'Missing Key');
      hasLoggedInitialization = true;
    }

    return supabaseInstance;
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