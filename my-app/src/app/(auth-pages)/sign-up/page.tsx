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
import { useEffect, useState, useRef } from "react";
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
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [googleButtonLoading, setGoogleButtonLoading] = useState(true);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

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
      const confirmPassword = formData.get('confirmPassword') as string;
      
      // Check if passwords match
      if (password !== confirmPassword) {
        setPasswordsMatch(false);
        setCustomError("Passwords do not match");
        setIsSubmitting(false);
        return;
      }
      
      setPasswordsMatch(true);
      
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

  // Initialize Google button
  const initializeGoogleButton = () => {
    if (!googleButtonRef.current) return;
    if (!window.google?.accounts?.id) {
      setTimeout(initializeGoogleButton, 200); // Retry if Google API not ready
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleSignInWithGoogle,
        use_fedcm_for_prompt: false,
      });
      
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { theme: "outline", size: "large", width: 250 }
      );
      
      setGoogleButtonLoading(false);
    } catch (err) {
      console.error('Error initializing Google Sign-In:', err);
      setGoogleButtonLoading(false);
    }
  };

  // Make the function available globally for Google's callback
  useEffect(() => {
    // @ts-ignore
    window.handleSignInWithGoogle = handleSignInWithGoogle;
    
    // Debug: Check if client ID is properly set
    console.log('Google Client ID available:', !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('Current origin:', window.location.origin);

    // Check if script is already loaded
    if (window.google?.accounts?.id && googleButtonRef.current) {
      initializeGoogleButton();
    } else if (scriptLoadedRef.current && googleButtonRef.current) {
      initializeGoogleButton();
    }

    return () => {
      // Clean up on unmount
      if (window.google?.accounts?.id) {
        // The cancel method doesn't exist, so we'll just do cleanup differently
        // No specific cleanup needed for Google Sign-In button at this point
      }
    };
  }, []);

  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Google Identity Services script loaded');
          scriptLoadedRef.current = true;
          if (googleButtonRef.current) {
            initializeGoogleButton();
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
            {googleButtonLoading && (
              <div className="text-sm text-gray-500 animate-pulse">Loading Google Sign-in...</div>
            )}
            {/* Button container for direct rendering */}
            <div id="googleButton" ref={googleButtonRef} className="mt-4"></div>
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
          
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Enter your password again to confirm
            </p>
          </div>
          <Input
            type="password"
            name="confirmPassword"
            placeholder="Confirm your password"
            required
            className={!passwordsMatch ? "border-red-500" : ""}
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