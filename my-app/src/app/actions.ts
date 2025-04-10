"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[SignIn] Error:", error.message);
    return redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  // Record login history using the API route instead of direct database access
  // This allows us to properly parse user agent and get IP info
  try {    
    if (data.user) {
      // Send login data to the login history API
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/login-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: data.user.id,
          // The IP will be determined server-side in the API route
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[SignIn] Failed to record login history:", errorData.error);
      }
    }
  } catch (historyError) {
    // Just log the error, don't prevent sign-in
    console.error("[SignIn] Error recording login history:", historyError);
  }

  // Redirect to home page after successful sign-in
  return redirect("/");
};

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  
  // Use the site URL from environment or a hardcoded default
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!email || !password) {
    return redirect(`/sign-up?error=${encodeURIComponent("Email and password are required")}`);
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("[SignUp] Error:", error.message);
    return redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  return redirect(`/sign-up?success=${encodeURIComponent("Check your email for verification link")}`);
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Redirect to home page after sign out
  return redirect("/");
}; 