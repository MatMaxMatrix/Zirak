"use server";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[SignIn] Error:", error.message);
    return redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  return redirect("/dashboard");
};

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const headersList = headers();
  const origin = headersList.get("origin");

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
  return redirect("/sign-in");
}; 