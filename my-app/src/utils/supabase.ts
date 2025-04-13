'use client';

import { createClient as createBrowserClient } from '@/utils/supabase/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use a singleton pattern for the Supabase instance
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get a Supabase client instance with singleton pattern
 * to prevent multiple initializations
 * 
 * @returns Supabase client
 */
export function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient();
  }
  return supabaseInstance;
} 