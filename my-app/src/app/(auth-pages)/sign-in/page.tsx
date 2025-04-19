'use client';

import { signInAction } from "@/app/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Script from "next/script";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { fetchWithCSRF } from "@/lib/csrf-client";

// Define types for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
        }
      }
    };
    handleSignInWithGoogle?: (response: any) => void;
  }
}

export default function Login() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const { refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleButtonLoading, setGoogleButtonLoading] = useState(true);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Successful sign-in handler that updates auth state and redirects
  const handleSuccessfulSignIn = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      // First refresh the user data in the auth context
      await refreshUser();
      
      // Then show success message
      toast.success('Signed in successfully');
      
      // Then redirect and refresh the router
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('[Login] Error during post-login process:', error);
      
      // Fallback to direct navigation if the refresh process fails
      window.location.href = '/';
    }
  }, [refreshUser, router]);

  // Handle form submission using the API endpoint
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent duplicate submissions
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required');
      setIsSubmitting(false);
      return;
    }
    
    let retryCount = 0;
    const maxRetries = 2;
    
    const attemptSignIn = async (): Promise<Response> => {
      try {
        return await fetchWithCSRF('/api/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying sign-in attempt (${retryCount}/${maxRetries})...`);
          
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptSignIn();
        }
        throw error;
      }
    };
    
    try {
      // Call our API endpoint with CSRF protection and retry mechanism
      const response = await attemptSignIn();
      
      const data = await response.json();
      
      if (!response.ok) {
        // Special handling for CSRF token errors
        if (response.status === 403 && data.error?.includes('CSRF')) {
          console.log('CSRF token issue detected, refreshing token...');
          
          // Force refresh the CSRF token
          try {
            await import('@/lib/csrf-client').then(m => m.initCSRF());
            
            // Try one more time after refreshing token
            const retryResponse = await fetchWithCSRF('/api/auth/signin', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password }),
            });
            
            const retryData = await retryResponse.json();
            
            if (!retryResponse.ok) {
              if (isMountedRef.current) {
                setErrorMessage(retryData.error || 'An error occurred during sign in');
                setIsSubmitting(false);
              }
              return;
            }
            
            // Success on retry
            await handleSuccessfulSignIn();
            return;
          } catch (csrfError) {
            console.error('Failed to refresh CSRF token:', csrfError);
            if (isMountedRef.current) {
              setErrorMessage('Authentication error. Please try again.');
              setIsSubmitting(false);
            }
            return;
          }
        }
        
        if (isMountedRef.current) {
          setErrorMessage(data.error || 'An error occurred during sign in');
          setIsSubmitting(false);
        }
        return;
      }
      
      // Handle successful sign-in
      await handleSuccessfulSignIn();
    } catch (error) {
      console.error('[Email Sign In] Error:', error);
      if (isMountedRef.current) {
        setErrorMessage('An error occurred during sign in');
        setIsSubmitting(false);
      }
    }
  }, [email, password, isSubmitting, handleSuccessfulSignIn]);

  const handleSignInWithGoogle = useCallback(async (response: any) => {
    try {
      if (!response?.credential) {
        console.error('[Google Sign In] Invalid response received');
        return;
      }
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) {
        console.error('[Google Sign In] Error:', error.message);
        return;
      }

      if (data?.user) {
        try {
          // Record login history using the API
          await fetch('/api/auth/login-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              ipAddress: 'Client Google sign-in',
            }),
          });
        } catch (historyError) {
          // Non-blocking error - don't prevent login if history recording fails
          console.error('[Google Sign In] Error recording login history');
        }
      }
      
      // Handle successful sign-in
      await handleSuccessfulSignIn();
    } catch (err) {
      console.error('[Google Sign In] Error during authentication');
    }
  }, [supabase, handleSuccessfulSignIn]);

  // Initialize Google button function
  const initializeGoogleButton = useCallback(() => {
    if (!googleButtonRef.current || !isMountedRef.current) return;
    if (!window.google?.accounts?.id) {
      setTimeout(initializeGoogleButton, 200); // Retry if Google API not ready
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        callback: handleSignInWithGoogle,
        use_fedcm_for_prompt: false,
      });
      
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { theme: "outline", size: "large", width: 250, type: "standard" }
      );
      
      if (isMountedRef.current) {
        setGoogleButtonLoading(false);
      }
    } catch (err) {
      console.error('Error initializing Google Sign-In:', err);
      if (isMountedRef.current) {
        setGoogleButtonLoading(false);
      }
    }
  }, [handleSignInWithGoogle]);

  // Make the function available globally and manage script loading
  useEffect(() => {
    isMountedRef.current = true;
    window.handleSignInWithGoogle = handleSignInWithGoogle;
    
    // Check if script is already loaded or button is ready
    if (window.google?.accounts?.id && googleButtonRef.current) {
      initializeGoogleButton();
    } else if (scriptLoadedRef.current && googleButtonRef.current) {
      initializeGoogleButton();
    }
    
    // Extract error from URL if present
    const urlError = searchParams.get('error');
    if (urlError) {
      setErrorMessage(urlError);
    }

    return () => {
      // Clean up on unmount
      isMountedRef.current = false;
    };
  }, [handleSignInWithGoogle, initializeGoogleButton, searchParams]);

  // Keyboard shortcut for form submission
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit(e);
    }
  }, [handleSubmit, isSubmitting]);

  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Google Identity Services script loaded on Sign-In page');
          scriptLoadedRef.current = true;
          if (googleButtonRef.current) {
            initializeGoogleButton();
          }
        }}
      />
      
      <form className="flex-1 flex flex-col min-w-64" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-medium">Sign in</h1>
        <p className="text-sm text-foreground mb-6">
          Don&apos;t have an account?{" "}
          <Link className="text-foreground font-medium underline" href="/sign-up">
            Sign up
          </Link>
        </p>

        <div className="flex flex-col gap-2 [&>input]:mb-3">
          {/* Google Sign-In Button */}
          <div className="flex justify-center mb-6">
            {googleButtonLoading && (
              <div className="text-sm text-gray-500 animate-pulse flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Google Sign-in...
              </div>
            )}
            {/* Button container for direct rendering */}
            <div id="googleButton" ref={googleButtonRef} className={`mt-4 ${googleButtonLoading ? 'hidden' : ''}`}></div>
          </div>

          <Separator className="my-4">
            <span className="mx-2 text-xs text-muted-foreground">Or continue with email</span>
          </Separator>
          
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            onKeyDown={handleKeyDown}
            className="mb-4"
          />
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="mb-4"
          />
          
          {/* Display error message */}
          {errorMessage && (
            <div className="text-red-500 text-sm mt-2 mb-4">{errorMessage}</div>
          )}
          
          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
          
          <Link
            className="text-sm text-foreground text-right mt-2 underline"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
          
          <FormMessage message={null} />
        </div>
      </form>
    </>
  );
} 