'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@auth0/nextjs-auth0/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create an anonymous Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false
  }
});

/**
 * Custom hook to get Supabase client with Auth0 token
 */
export function useSupabaseClient() {
  const { user, isLoading } = useUser();
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function setupSupabase() {
      if (isLoading) return;

      try {
        setLoading(true);
        
        if (!user) {
          // If not authenticated, use anonymous client
          setSupabaseClient(supabase);
          return;
        }

        // Get custom Auth0 JWT token for Supabase
        const response = await fetch('/api/auth/token');
        if (!response.ok) {
          throw new Error('Failed to get authentication token');
        }

        const { accessToken } = await response.json();
        
        // Create a Supabase client with the Auth0 token
        const authenticatedClient = createClient(supabaseUrl || '', supabaseAnonKey || '', {
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
        // Fallback to anonymous client on error
        setSupabaseClient(supabase);
      } finally {
        setLoading(false);
      }
    }

    setupSupabase();
  }, [user, isLoading]);

  return { supabase: supabaseClient, isLoading: isLoading || loading };
} 