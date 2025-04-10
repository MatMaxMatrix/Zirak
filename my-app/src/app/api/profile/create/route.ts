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

    // Check if user exists in auth
    console.log(`API: Verifying auth user ${userId}`);
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('API Error verifying auth user:', authError);
      return createErrorResponse(`Failed to verify auth user: ${authError.message}`);
    }
    
    if (!authUser || !authUser.user) {
      return createErrorResponse('User not found in auth system', 404);
    }

    // Check if profile exists
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
      return createSuccessResponse('Profile already exists', { data: existingProfile });
    }

    // Create profile if it doesn't exist
    console.log(`API: Creating profile for user ${userId}`);
    const { data, error: insertError } = await supabaseAdmin
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
    
    // Ensure auth metadata is in sync with profile data
    if (name || picture) {
      try {
        // Get current metadata
        const currentMetadata = authUser.user.user_metadata || {};
        let needsUpdate = false;
        const updatedMetadata = { ...currentMetadata };
        
        // Check if we need to update name
        if (name && !currentMetadata.name && !currentMetadata.full_name) {
          // For Google auth, use full_name
          if (authUser.user.app_metadata?.provider === 'google') {
            updatedMetadata.full_name = name;
          } else {
            updatedMetadata.name = name;
          }
          needsUpdate = true;
        }
        
        // Check if we need to update picture
        if (picture && !currentMetadata.picture && !currentMetadata.avatar_url) {
          if (authUser.user.app_metadata?.provider === 'google') {
            updatedMetadata.avatar_url = picture;
          } else {
            updatedMetadata.picture = picture;
          }
          needsUpdate = true;
        }
        
        // Update auth metadata if needed
        if (needsUpdate) {
          console.log(`API: Updating auth metadata for ${userId}`);
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: updatedMetadata
          });
        }
      } catch (metadataError) {
        // Don't fail the profile creation if metadata update fails
        console.error('API: Error updating auth metadata:', metadataError);
      }
    }
    
    console.log(`API: Profile created successfully for: ${email}`);
    return createSuccessResponse('Profile created successfully', { data });
  } catch (error) {
    console.error('API: Profile creation error:', error);
    return createErrorResponse(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 