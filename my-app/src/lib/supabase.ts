'use client';

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Custom hook to get Supabase client with session
 */
export function useSupabaseClient() {
  const [supabaseClient, setSupabaseClient] = useState(supabase);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function setupSupabase() {
      try {
        setLoading(true);
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setSupabaseClient(supabase);
          return;
        }

        // Create an authenticated client with the session
        const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });

        setSupabaseClient(authenticatedClient);
      } catch (error) {
        console.error('Error setting up Supabase client:', error);
        setSupabaseClient(supabase);
      } finally {
        setLoading(false);
      }
    }

    setupSupabase();
  }, []);

  return { supabase: supabaseClient, isLoading: loading };
} 