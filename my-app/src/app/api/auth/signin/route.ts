import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    console.log('[API SignIn] Attempting to sign in user:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[API SignIn] Error:', error.message, error);
      // Use generic error message for security
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    // Record login history
    try {
      if (data.user) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/login-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id }),
        });
      }
    } catch (historyError) {
      console.error('[API SignIn] Error recording login history:', historyError);
    }

    // If we got here, sign-in was successful
    console.log('[API SignIn] Success:', data.user ? data.user.id : 'unknown user');
    return NextResponse.json(
      { success: true, user: { id: data.user.id, email: data.user.email } },
      { status: 200 }
    );
  } catch (unexpectedError) {
    console.error('[API SignIn] Unexpected error:', unexpectedError);
    return NextResponse.json(
      { error: 'An error occurred during sign in' },
      { status: 500 }
    );
  }
} 