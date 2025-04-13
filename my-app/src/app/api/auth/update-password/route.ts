import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;
    
    // Input validation
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    console.log('[API UpdatePassword] Attempting to update password');

    // This will work if the user has a valid session from the reset link
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('[API UpdatePassword] Error:', error.message, error);
      
      // Use error message from Supabase
      return NextResponse.json(
        { error: error.message || 'Could not update password' },
        { status: 400 }
      );
    }

    // If we got here, password was updated successfully
    console.log('[API UpdatePassword] Success: Password updated');
    return NextResponse.json(
      { success: true, message: 'Password updated successfully' },
      { status: 200 }
    );
  } catch (unexpectedError) {
    console.error('[API UpdatePassword] Unexpected error:', unexpectedError);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
} 