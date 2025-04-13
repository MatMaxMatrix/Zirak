"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Input validation
  if (!email || !password) {
    return redirect(`/sign-in?error=${encodeURIComponent("Email and password are required")}`);
  }
  
  if (!isValidEmail(email)) {
    return redirect(`/sign-in?error=${encodeURIComponent("Invalid email format")}`);
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[SignIn] Error:", error.message);
      // Use generic error message for security
      return redirect(`/sign-in?error=${encodeURIComponent("Invalid email or password")}`);
    }

    // Record login history using the API route
    try {    
      if (data.user) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/login-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id }),
        });
      }
    } catch (historyError) {
      // Non-blocking error - don't prevent sign-in
      console.error("[SignIn] Error recording login history");
    }

    // Redirect to home page after successful sign-in
    return redirect("/");
  } catch (unexpectedError) {
    console.error("[SignIn] Unexpected error:", unexpectedError);
    
    // Check if this is a redirect - we don't want to treat redirects as errors
    if (unexpectedError instanceof Error && 
        unexpectedError.message === 'NEXT_REDIRECT') {
      throw unexpectedError; // Let Next.js handle the redirect
    }
    
    return redirect(`/sign-in?error=${encodeURIComponent("An error occurred during sign in")}`);
  }
};

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  
  // Input validation
  if (!email || !password) {
    return redirect(`/sign-up?error=${encodeURIComponent("Email and password are required")}`);
  }
  
  if (!isValidEmail(email)) {
    return redirect(`/sign-up?error=${encodeURIComponent("Invalid email format")}`);
  }
  
  if (password.length < 8) {
    return redirect(`/sign-up?error=${encodeURIComponent("Password must be at least 8 characters")}`);
  }
  
  try {
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    console.log("[SignUp] Using redirect URL:", `${origin}/auth/callback`);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("[SignUp] Error:", error.message, error);
      return redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
    }

    // Check if email is already registered (identities array will be empty)
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      console.log("[SignUp] Email already registered:", email);
      return redirect(`/sign-up?error=${encodeURIComponent("Email already registered. Try signing in instead.")}`);
    }

    // If we got here, signup was successful
    console.log("[SignUp] Success:", data);
    return redirect(`/sign-up?success=${encodeURIComponent("Check your email for verification link")}`);
  } catch (unexpectedError) {
    console.error("[SignUp] Unexpected error:", unexpectedError);
    
    // Check if this is a redirect - we don't want to treat redirects as errors
    if (unexpectedError instanceof Error && 
        unexpectedError.message === 'NEXT_REDIRECT') {
      throw unexpectedError; // Let Next.js handle the redirect
    }
    
    return redirect(`/sign-up?error=${encodeURIComponent("An error occurred during sign up")}`);
  }
};

export const signOutAction = async () => {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    
    // Always redirect to home page after sign out attempt
    return redirect("/");
  } catch (error) {
    console.error("[SignOut] Error:", error);
    
    // Check if this is a redirect - we don't want to treat redirects as errors
    if (error instanceof Error && 
        error.message === 'NEXT_REDIRECT') {
      throw error; // Let Next.js handle the redirect
    }
    
    // For other errors, still try to redirect home
    return redirect("/");
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  
  if (!email) {
    return redirect(`/forgot-password?error=${encodeURIComponent("Email is required")}`);
  }
  
  if (!isValidEmail(email)) {
    return redirect(`/forgot-password?error=${encodeURIComponent("Invalid email format")}`);
  }

  try {
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?redirect_to=/reset-password`,
    });

    if (error) {
      console.error("[ForgotPassword] Error:", error.message);
      // Use a generic message for security 
      return redirect(`/forgot-password?error=${encodeURIComponent("Could not reset password")}`);
    }

    return redirect(`/forgot-password?success=${encodeURIComponent("Check your email for a link to reset your password.")}`);
  } catch (unexpectedError) {
    console.error("[ForgotPassword] Unexpected error:", unexpectedError);
    
    // Check if this is a redirect - we don't want to treat redirects as errors
    if (unexpectedError instanceof Error && 
        unexpectedError.message === 'NEXT_REDIRECT') {
      throw unexpectedError; // Let Next.js handle the redirect
    }
    
    return redirect(`/forgot-password?error=${encodeURIComponent("An error occurred")}`);
  }
}; 