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
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    console.log("[API SignUp] Using redirect URL:", `${origin}/auth/callback`);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("[API SignUp] Error:", error.message, error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Check if email is already registered (identities array will be empty)
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      console.log("[API SignUp] Email already registered:", email);
      return NextResponse.json(
        { error: 'Email already registered. Try signing in instead.' },
        { status: 400 }
      );
    }

    // If we got here, signup was successful
    console.log("[API SignUp] Success:", data);
    return NextResponse.json(
      { success: true, message: 'Check your email for verification link' },
      { status: 200 }
    );
  } catch (unexpectedError) {
    console.error("[API SignUp] Unexpected error:", unexpectedError);
    return NextResponse.json(
      { error: 'An error occurred during sign up' },
      { status: 500 }
    );
  }
} 