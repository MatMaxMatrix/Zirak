'use client';

import { createClient } from '@supabase/supabase-js';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useEffect } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create an anonymous Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

/**
 * Custom hook to get Supabase client with Auth0 token
 */
export function useSupabaseClient() {
  const { user, isLoading } = useUser();
  const [supabaseClient, setSupabaseClient] = useState(supabase);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function setupSupabase() {
      if (isLoading) return;

      try {
        setLoading(true);
        
        if (!user) {
          setSupabaseClient(supabase);
          return;
        }

        const response = await fetch('/api/auth/token');
        if (!response.ok) {
          throw new Error('Failed to get authentication token');
        }

        const { accessToken } = await response.json();
        
        const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
          auth: {
            persistSession: false
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
  }, [user, isLoading]);

  return { supabase: supabaseClient, isLoading: isLoading || loading };
} 