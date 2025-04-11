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
import { useEffect } from "react";
import Script from "next/script";

export default function Login() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

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
      
      // Record login history
      try {
        if (data.user) {
          console.log('[Google Sign In] Recording login history for user:', data.user.id);
          
          const loginHistoryResponse = await fetch('/api/auth/login-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: data.user.id,
              ipAddress: 'Client Google sign-in',
            }),
          });
          
          if (!loginHistoryResponse.ok) {
            const errorData = await loginHistoryResponse.json();
            console.error('[Google Sign In] Failed to record login history:', errorData);
          } else {
            console.log('[Google Sign In] Login history recorded successfully');
          }
        }
      } catch (historyError) {
        console.error('[Google Sign In] Error recording login history:', historyError);
      }
      
      // Redirect to home page after successful sign-in
      router.push('/');
    } catch (err) {
      console.error('[Google Sign In] Error:', err);
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
      
      <form className="flex-1 flex flex-col min-w-64">
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
            {/* Button container for direct rendering */}
            <div id="googleButton" className="mt-4"></div>
          </div>

          <Separator className="my-4">
            <span className="mx-2 text-xs text-muted-foreground">Or continue with email</span>
          </Separator>

          <Label htmlFor="email">Email</Label>
          <Input name="email" placeholder="you@example.com" required />
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
            type="password"
            name="password"
            placeholder="Your password"
            required
          />
          <SubmitButton pendingText="Signing In..." formAction={signInAction}>
            Sign in with Email
          </SubmitButton>
          <FormMessage message={null} />
        </div>
      </form>
    </>
  );
} 