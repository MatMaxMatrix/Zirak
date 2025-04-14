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
import { useEffect, useState, useRef } from "react";
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
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [googleButtonError, setGoogleButtonError] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  // Successful sign-in handler that updates auth state and redirects
  const handleSuccessfulSignIn = async () => {
    // First refresh the user data in the auth context
    await refreshUser();
    
    // Then show success message
    toast.success('Signed in successfully');
    
    // Then redirect and refresh the router
    router.push('/');
    router.refresh();
    
    // Force a page reload to update all components with the new auth state
    window.location.href = '/';
  };

  // Handle form submission using the API endpoint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    
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
              setErrorMessage(retryData.error || 'An error occurred during sign in');
              setIsSubmitting(false);
              return;
            }
            
            // Success on retry
            await handleSuccessfulSignIn();
            return;
          } catch (csrfError) {
            console.error('Failed to refresh CSRF token:', csrfError);
            setErrorMessage('Authentication error. Please try again.');
            setIsSubmitting(false);
            return;
          }
        }
        
        setErrorMessage(data.error || 'An error occurred during sign in');
        setIsSubmitting(false);
        return;
      }
      
      // Handle successful sign-in
      await handleSuccessfulSignIn();
    } catch (error) {
      console.error('[Email Sign In] Error:', error);
      setErrorMessage('An error occurred during sign in');
      setIsSubmitting(false);
    }
  };

  async function handleSignInWithGoogle(response: any) {
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
  }

  // Make the function available globally for Google's callback
  useEffect(() => {
    window.handleSignInWithGoogle = handleSignInWithGoogle;
  }, []);

  // Initialize Google Sign-In button once script is loaded
  useEffect(() => {
    if (!scriptLoaded || !googleButtonContainerRef.current) return;
    
    try {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        // Initialize button
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          callback: handleSignInWithGoogle,
          use_fedcm_for_prompt: false,
        });
        
        // Render button
        window.google.accounts.id.renderButton(
          googleButtonContainerRef.current,
          { theme: "outline", size: "large", width: 250, type: "standard" }
        );
        
        setGoogleButtonReady(true);
      } else {
        setGoogleButtonError(true);
      }
    } catch (error) {
      console.error("[Google Sign-In] Initialization error:", error);
      setGoogleButtonError(true);
    }
  }, [scriptLoaded]);

  // Retry loading the button if it fails
  const handleRetry = () => {
    // Clear existing button if any
    if (googleButtonContainerRef.current) {
      googleButtonContainerRef.current.innerHTML = '';
    }
    
    setGoogleButtonError(false);
    setGoogleButtonReady(false);
    setScriptLoaded(false);
    
    // Small delay before reloading script
    setTimeout(() => {
      setScriptLoaded(true);
    }, 500);
  };
  
  // Get error from URL if present (for redirects from other pages)
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setErrorMessage(urlError);
    }
  }, [searchParams]);

  return (
    <>
      {/* Load Google script directly in component instead of layout */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setGoogleButtonError(true)}
      />
      
      <form className="flex-1 flex flex-col min-w-64" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-medium">Sign in</h1>
        <p className="text-sm text-foreground mb-6">
          Don't have an account?{" "}
          <Link className="text-foreground font-medium underline" href="/sign-up">
            Sign up
          </Link>
        </p>

        <div className="flex flex-col gap-2 [&>input]:mb-3">
          {/* Google Sign-In Button */}
          <div className="flex justify-center mb-6">
            {!googleButtonReady && !googleButtonError ? (
              <div className="flex items-center justify-center w-[250px] h-10 mt-4 border border-gray-300 rounded-md">
                <div className="animate-pulse w-5 h-5 rounded-full bg-gray-300 mr-2"></div>
                <span>Loading Google Sign-In...</span>
              </div>
            ) : googleButtonError ? (
              <Button 
                variant="outline" 
                className="w-[250px] h-10 mt-4" 
                onClick={handleRetry}
              >
                Reload Google Sign-In
              </Button>
            ) : null}
            {/* Button container for direct rendering */}
            <div 
              ref={googleButtonContainerRef}
              id="googleButton" 
              className={`mt-4 ${googleButtonReady ? 'block' : 'hidden'}`}
            ></div>
          </div>

          <Separator className="my-4">
            <span className="mx-2 text-xs text-muted-foreground">Or continue with email</span>
          </Separator>

          <Label htmlFor="email">Email</Label>
          <Input 
            id="email"
            name="email" 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" 
            required 
          />
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              className="text-xs text-foreground underline"
              href="/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
          
          {/* Error message */}
          {errorMessage && (
            <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
          )}
          
          {/* Submit button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : 'Sign in with Email'}
          </Button>
        </div>
      </form>
    </>
  );
} 