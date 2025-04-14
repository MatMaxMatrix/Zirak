'use server';

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  try {
    // Get Supabase configuration, with fallbacks
    const supabaseUrl = process.env.SUPABASE_URL || 
                         process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 
                         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Enhanced logging for debugging
    console.log('[Supabase Server] Initializing with:');
    console.log(`- URL: ${supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'Missing URL'}`);
    console.log(`- Key: ${supabaseKey ? 'Valid Key (masked)' : 'Missing Key'}`);
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        `Missing Supabase credentials: ${!supabaseUrl ? 'URL' : ''} ${!supabaseKey ? 'Key' : ''}`
      );
    }
    
    return createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          async get(name) {
            try {
              const cookieStore = await cookies();
              return cookieStore.get(name)?.value;
            } catch (error) {
              console.error('[Supabase Server] Error getting cookie:', error);
              return undefined;
            }
          },
          async set(name, value, options) {
            try {
              const cookieStore = await cookies();
              cookieStore.set(name, value, options);
            } catch (error) {
              console.error('[Supabase Server] Error setting cookie:', error);
            }
          },
          async remove(name, options) {
            try {
              const cookieStore = await cookies();
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            } catch (error) {
              console.error('[Supabase Server] Error removing cookie:', error);
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