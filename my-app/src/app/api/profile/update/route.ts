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

    // First try to update the profile using our stored procedure
    const { data: updatedProfile, error: rpcError } = await supabase.rpc('update_profile', {
      p_user_id: userId,
      p_name: name,
      p_picture: picture,
      p_bio: bio,
      p_phone_number: phone,
      p_city: location
    });
    
    // If RPC didn't work (perhaps not yet created), fall back to checking if profile exists
    if (rpcError) {
      console.log('RPC not available, falling back to direct query:', rpcError.message);
    
      // Check if profile exists
      console.log(`API: Checking if profile exists for user ${userId}`);
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      let result;
      
      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log(`API: No profile found for ${userId}, creating a new one`);
        
        const { data, error: insertError } = await supabase
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
        
        const { data, error: updateError } = await supabase
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
      
      return createSuccessResponse('Profile updated successfully', { data: result });
    }

    // If RPC worked, return the updated profile
    return createSuccessResponse('Profile updated successfully', { data: updatedProfile });
  } catch (error) {
    console.error('API: Profile update error:', error);
    return createErrorResponse(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 