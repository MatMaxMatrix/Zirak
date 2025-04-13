'use client';

import { signUpAction } from "@/app/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

export default function SignUp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const { refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customSuccess, setCustomSuccess] = useState<string | null>(null);

  // Successful sign-up handler that updates auth state and redirects if needed
  const handleSuccessfulSignUp = async (needsEmailVerification = true) => {
    // If email verification is needed, just show success message
    if (needsEmailVerification) {
      setCustomSuccess("Check your email for verification link");
      return;
    }
    
    // If direct sign-up (e.g., Google), refresh auth context and redirect
    await refreshUser();
    toast.success('Signed up successfully');
    window.location.href = '/';
  };

  async function handleSignInWithGoogle(response: any) {
    try {
      console.log('[Google Sign In] Received response:', response);
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) {
        console.error('[Google Sign In] Error:', error);
        return;
      }

      console.log('[Google Sign In] Success:', data);
      await handleSuccessfulSignUp(false); // No email verification needed with Google
    } catch (err) {
      console.error('[Google Sign In] Error:', err);
    }
  }

  // Alternative signup method using fetch API
  async function handleSignUpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setCustomError(null);
    setCustomSuccess(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setCustomError(data.error || 'An error occurred during sign up');
        return;
      }
      
      await handleSuccessfulSignUp(); // Needs email verification
    } catch (error) {
      console.error('[Manual Sign Up] Error:', error);
      setCustomError('An error occurred during sign up');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Make the function available globally for Google's callback
  useEffect(() => {
    // @ts-ignore
    window.handleSignInWithGoogle = handleSignInWithGoogle;
    
    // Debug: Check if client ID is properly set
    console.log('Google Client ID available:', !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('Current origin:', window.location.origin);
  }, []);

  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Google Identity Services script loaded');
          
          // Add direct initialize version of Google One Tap
          try {
            // @ts-ignore
            window.google.accounts.id.initialize({
              client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
              callback: handleSignInWithGoogle,
              use_fedcm_for_prompt: false,
            });
            // @ts-ignore
            window.google.accounts.id.renderButton(
              document.getElementById("googleButton"),
              { theme: "outline", size: "large", width: 250 }
            );
          } catch (err) {
            console.error('Error initializing Google Sign-In:', err);
          }
        }}
      />
      
      <form className="flex-1 flex flex-col min-w-64" onSubmit={handleSignUpSubmit}>
        <h1 className="text-2xl font-medium">Sign up</h1>
        <p className="text-sm text-foreground mb-6">
          Already have an account?{" "}
          <Link className="text-foreground font-medium underline" href="/sign-in">
            Sign in
          </Link>
        </p>

        <div className="flex flex-col gap-2 [&>input]:mb-3">
          {/* Google Sign-In Button */}
          <div className="flex justify-center mb-6">
            {/* Button container for direct rendering */}
            <div id="googleButton" className="mt-4"></div>
          </div>

          <Separator className="my-4">
            <span className="mx-2 text-xs text-muted-foreground">Or continue with email</span>
          </Separator>

          <Label htmlFor="email">Email</Label>
          <Input name="email" placeholder="you@example.com" required />
          <div>
            <Label htmlFor="password">Password</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Must be at least 8 characters with numbers and special characters
            </p>
          </div>
          <Input
            type="password"
            name="password"
            placeholder="Create a password"
            required
          />
          
          {/* Display custom error/success messages */}
          {customError && (
            <div className="text-red-500 text-sm mt-2">{customError}</div>
          )}
          {customSuccess && (
            <div className="text-green-500 text-sm mt-2">{customSuccess}</div>
          )}
          
          {/* Manual submit button */}
          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing Up...' : 'Sign up with Email'}
          </Button>
          
          <FormMessage message={null} />
        </div>
      </form>
    </>
  );
} 