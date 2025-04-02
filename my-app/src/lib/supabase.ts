import { createClient } from '@supabase/supabase-js';
import { useUser } from '@auth0/nextjs-auth0/client';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Hook to get an authenticated Supabase client with the current user's Auth0 token
export function useSupabaseClient() {
  const { user, isLoading } = useUser();

  const getSupabaseClient = async () => {
    if (!user) return supabase;

    try {
      // Get the Auth0 access token
      const response = await fetch('/api/auth/token');
      if (!response.ok) {
        throw new Error('Failed to get Auth0 token');
      }
      const { accessToken } = await response.json();

      // Create a new Supabase client with the Auth0 token
      return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });
    } catch (error) {
      console.error('Error getting authenticated Supabase client:', error);
      return supabase; // Fallback to anonymous client
    }
  };

  return {
    supabase: getSupabaseClient(),
    isLoading,
  };
} 