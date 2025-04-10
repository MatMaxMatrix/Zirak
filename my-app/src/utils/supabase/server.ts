'use server';

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  try {
    // Log Supabase configuration
    console.log('[Supabase Server] Initialized with URL:', 
      process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Valid URL' : 'Missing URL',
      'and key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Valid Key' : 'Missing Key');
    
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const cookie = cookies().get(name);
            return cookie?.value;
          },
          set(name, value, options) {
            try {
              cookies().set(name, value, options);
            } catch (error) {
              console.error('Error setting cookie:', error);
            }
          },
          remove(name, options) {
            try {
              cookies().set(name, '', { ...options, maxAge: 0 });
            } catch (error) {
              console.error('Error removing cookie:', error);
            }
          },
        },
      }
    );
  } catch (error) {
    console.error('[Supabase Server] Error creating client:', error);
    throw error;
  }
} 