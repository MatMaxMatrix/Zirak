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
    const { userId, email, name, picture, bio, phone, location } = body;
    
    console.log("API received request:", { userId, email, hasName: !!name, hasPicture: !!picture });
    
    if (!userId || !email) {
      return createErrorResponse('User ID and email are required', 400);
    }

    // Create a direct Supabase client with anon key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Check if profile exists using RPC to handle type casting
    console.log(`API: Checking if profile exists for user ${userId}`);
    
    // First try with RPC to handle UUID conversions properly
    const { data: profileExists, error: rpcError } = await supabase.rpc('check_profile_exists', {
      p_user_id: userId
    });
    
    // If RPC fails or doesn't exist yet, use direct query with additional options
    if (rpcError) {
      console.log('RPC not available yet, using direct query');
      
      // Use direct query with eq now that types match
      const { data: existingProfile, error: checkError } = await supabase
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
        return createSuccessResponse('Profile already exists', { data: existingProfile });
      }
    } else if (profileExists) {
      // Profile exists based on RPC check
      console.log(`API: Profile already exists for ${userId} (via RPC)`);
      return createSuccessResponse('Profile already exists', { data: { id: userId } });
    }

    // Create profile if it doesn't exist
    console.log(`API: Creating profile for user ${userId}`);
    
    // Try using an RPC function first for proper type handling
    const { data: createdProfile, error: createRpcError } = await supabase.rpc('create_profile', {
      p_user_id: userId,
      p_email: email,
      p_name: name || '',
      p_picture: picture || '',
      p_bio: bio || '',
      p_phone_number: phone || '',
      p_city: location || ''
    });
    
    if (createRpcError) {
      // Fallback to direct insertion if RPC not available
      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email,
            name: name || '',
            picture: picture || '',
            bio: bio || '',
            phone_number: phone || '',
            city: location || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();

      if (insertError) {
        console.error('API Error creating profile:', insertError);
        return createErrorResponse(`Failed to create profile: ${insertError.message}`);
      }
      
      console.log(`API: Profile created successfully for: ${email}`);
      return createSuccessResponse('Profile created successfully', { data });
    }
    
    console.log(`API: Profile created successfully for: ${email} (via RPC)`);
    return createSuccessResponse('Profile created successfully', { data: createdProfile });
  } catch (error) {
    console.error('API: Profile creation error:', error);
    return createErrorResponse(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 