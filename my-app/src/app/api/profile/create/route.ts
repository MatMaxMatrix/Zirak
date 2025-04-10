import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, email, name, picture } = await request.json();
    
    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 });
    }

    // Use service role client (has admin privileges to bypass RLS)
    const supabaseAdmin = createRouteHandlerClient(
      { cookies },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Service role key has admin privileges
      }
    );

    // Check if user exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // Not found is expected
      console.error('Error checking profile:', checkError);
      return NextResponse.json({ error: 'Failed to check profile' }, { status: 500 });
    }

    // Create profile if it doesn't exist
    if (!existingProfile) {
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: userId,
            email,
            name: name || '',
            picture: picture || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        console.error('API Error creating profile:', insertError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }
      
      console.log('Profile created successfully for:', email);
      return NextResponse.json({ success: true, message: 'Profile created successfully' });
    }

    return NextResponse.json({ success: true, message: 'Profile already exists' });
  } catch (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 