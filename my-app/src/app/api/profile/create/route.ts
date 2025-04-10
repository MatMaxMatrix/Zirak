import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Ensure our error responses are consistent
function createErrorResponse(error: any, status = 500) {
  console.log("Creating error response:", error);
  return NextResponse.json({ 
    success: false, 
    error: typeof error === 'string' ? error : error instanceof Error ? error.message : JSON.stringify(error)
  }, { status });
}

// Ensure our success responses are consistent
function createSuccessResponse(message: string, data = {}) {
  console.log("Creating success response:", message);
  return NextResponse.json({ success: true, message, ...data }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name, picture } = body;
    
    console.log("API received request:", { userId, email, hasName: !!name, hasPicture: !!picture });
    
    if (!userId || !email) {
      return createErrorResponse('User ID and email are required', 400);
    }

    // Create a Supabase Admin client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user exists
    console.log(`API: Checking if profile exists for user ${userId}`);
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError) {
      if (checkError.code !== 'PGRST116') { // Not found is expected
        console.error('API Error checking profile:', checkError);
        return createErrorResponse(`Failed to check profile: ${checkError.message}`);
      }
      // Not found, so we'll create the profile
      console.log(`API: No profile found for ${userId}, will create one`);
    } else {
      // Profile exists
      console.log(`API: Profile already exists for ${userId}`);
      return createSuccessResponse('Profile already exists');
    }

    // Create profile if it doesn't exist
    console.log(`API: Creating profile for user ${userId}`);
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
      return createErrorResponse(`Failed to create profile: ${insertError.message}`);
    }
    
    console.log(`API: Profile created successfully for: ${email}`);
    return createSuccessResponse('Profile created successfully');
  } catch (error) {
    console.error('API: Profile creation error:', error);
    return createErrorResponse(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 