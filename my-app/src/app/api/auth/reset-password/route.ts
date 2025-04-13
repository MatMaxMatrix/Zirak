import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;
    
    // Input validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    console.log("[API ResetPassword] Using redirect URL:", `${origin}/auth/callback?redirect_to=/reset-password`);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?redirect_to=/reset-password`,
    });

    if (error) {
      console.error("[API ResetPassword] Error:", error.message, error);
      // Use a generic message for security
      return NextResponse.json(
        { error: 'Could not reset password' },
        { status: 400 }
      );
    }

    // If we got here, password reset email was sent successfully
    console.log("[API ResetPassword] Success: Email sent to", email);
    return NextResponse.json(
      { success: true, message: 'Check your email for a link to reset your password.' },
      { status: 200 }
    );
  } catch (unexpectedError) {
    console.error("[API ResetPassword] Unexpected error:", unexpectedError);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
} 