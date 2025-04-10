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
  return NextResponse.json({ success: true, message, data }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name, picture, bio, phone, location } = body;
    
    console.log("API received profile update request for user:", userId);
    
    if (!userId) {
      return createErrorResponse('User ID is required', 400);
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

    // Check if profile exists
    console.log(`API: Checking if profile exists for user ${userId}`);
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    let result;
    
    if (checkError && checkError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log(`API: No profile found for ${userId}, creating a new one`);
      
      const { data, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: userId,
            email: email || '',
            name: name || '',
            picture: picture || '',
            bio: bio || '',
            phone_number: phone || '',
            city: location || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('API Error creating profile:', insertError);
        return createErrorResponse(`Failed to create profile: ${insertError.message}`);
      }
      
      result = data;
      console.log(`API: Profile created successfully for: ${userId}`);
    } else if (checkError) {
      // Other error occurred
      console.error('API Error checking profile:', checkError);
      return createErrorResponse(`Failed to check profile: ${checkError.message}`);
    } else {
      // Profile exists, update it
      console.log(`API: Updating profile for user ${userId}`);
      
      // Only update fields that are provided or use existing values
      // This prevents overwriting existing data with null values
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      // Conditionally add fields to update if they are provided
      if (name !== undefined) updateData.name = name;
      if (picture !== undefined) updateData.picture = picture;
      if (bio !== undefined) updateData.bio = bio;
      if (phone !== undefined) updateData.phone_number = phone;
      if (location !== undefined) updateData.city = location;
      
      const { data, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('API Error updating profile:', updateError);
        return createErrorResponse(`Failed to update profile: ${updateError.message}`);
      }
      
      result = data;
      console.log(`API: Profile updated successfully for: ${userId}`);
    }

    // Also update auth metadata if needed to keep all systems in sync
    if (name || picture) {
      try {
        // Get current user data
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (userData && userData.user) {
          // Current metadata
          const currentMetadata = userData.user.user_metadata || {};
          
          // Only update if values are different
          if ((name && name !== currentMetadata.name && name !== currentMetadata.full_name) || 
              (picture && picture !== currentMetadata.picture && picture !== currentMetadata.avatar_url)) {
            
            console.log(`API: Updating auth metadata for ${userId}`);
            
            // Create new metadata object
            const updatedMetadata = { ...currentMetadata };
            
            // Prefer existing fields if present (for provider-specific fields)
            if (name) {
              if (currentMetadata.full_name !== undefined) {
                updatedMetadata.full_name = name;
              } else {
                updatedMetadata.name = name;
              }
            }
            
            if (picture) {
              if (currentMetadata.avatar_url !== undefined) {
                updatedMetadata.avatar_url = picture;
              } else {
                updatedMetadata.picture = picture;
              }
            }
            
            // Update user metadata 
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              user_metadata: updatedMetadata
            });
            
            console.log(`API: Auth metadata updated for ${userId}`);
          }
        }
      } catch (metadataError) {
        // Don't fail the request if metadata update fails
        console.error('API: Error updating auth metadata:', metadataError);
      }
    }

    return createSuccessResponse('Profile updated successfully', { data: result });
  } catch (error) {
    console.error('API: Profile update error:', error);
    return createErrorResponse(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 