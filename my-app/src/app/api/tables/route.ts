import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use service role client (has admin privileges)
    const supabaseAdmin = createRouteHandlerClient(
      { cookies },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Service role key has admin privileges
      }
    );

    // Create the profiles table if it doesn't exist
    await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        -- Create profiles table if not exists
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          picture TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
        
        -- Create policy for service role
        DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
        CREATE POLICY "Service role can manage profiles"
        ON public.profiles
        USING (true)
        WITH CHECK (true);
        
        -- Create user_roles table if not exists
        CREATE TABLE IF NOT EXISTS user_roles (
          user_id TEXT PRIMARY KEY REFERENCES profiles(id),
          role TEXT NOT NULL DEFAULT 'user',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
      `
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Database tables and policies setup complete' 
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to setup database tables and policies' 
    }, { status: 500 });
  }
} 