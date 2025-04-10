'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

export default function AuthDebug() {
  const [authInfo, setAuthInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error.message);
          setError(error.message);
        } else {
          setAuthInfo(data);
          console.log("Session data:", data);
        }
      } catch (err) {
        console.error("Exception getting session:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    getSession();
  }, []);

  async function handleSignInWithGoogle(response: any) {
    try {
      setLoading(true);
      setError(null);
      console.log('[Google Debug] Response:', response);
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) {
        console.error('[Google Debug] Error:', error);
        setError(error.message);
        return;
      }

      console.log('[Google Debug] Success:', data);
      setAuthInfo(data);
    } catch (err) {
      console.error('[Google Debug] Error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // Make the function available globally for Google's callback
  useEffect(() => {
    // @ts-ignore
    window.handleSignInWithGoogle = handleSignInWithGoogle;
    
    // Debug: Log environment variables
    console.log('Google Client ID available:', !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('Supabase URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Anon Key available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);

  async function handleSignOut() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message);
        console.error("Sign out error:", error);
      } else {
        setAuthInfo(null);
        console.log("Signed out successfully");
      }
    } catch (err) {
      console.error("Sign out exception:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
        onLoad={() => console.log('Google Identity Services script loaded in debug page')}
      />
      
      <div className="container py-10">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Authentication Debug</CardTitle>
            <CardDescription>
              Test and debug your authentication configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="p-4 bg-gray-100 rounded-md">
                <h3 className="font-medium mb-2">Environment Variables:</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL: </span>
                    {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
                  </p>
                  <p>
                    <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY: </span>
                    {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
                  </p>
                  <p>
                    <span className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID: </span>
                    {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}
                  </p>
                </div>
              </div>
              
              {error && (
                <div className="p-4 bg-red-50 text-red-500 rounded-md">
                  <h3 className="font-medium mb-2">Error:</h3>
                  <pre className="text-sm overflow-x-auto">{error}</pre>
                </div>
              )}
              
              <div className="flex flex-col items-center justify-center space-y-4">
                <h3 className="font-medium">Test Google Sign In:</h3>
                
                <div
                  id="g_id_onload"
                  data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
                  data-context="signin"
                  data-ux_mode="popup"
                  data-callback="handleSignInWithGoogle"
                  data-auto_select="false"
                  data-itp_support="true"
                  data-use_fedcm_for_prompt="false"
                ></div>
                <div
                  className="g_id_signin"
                  data-type="standard"
                  data-shape="rectangular"
                  data-theme="outline"
                  data-text="signin_with"
                  data-size="large"
                  data-logo_alignment="left"
                ></div>
              </div>

              {authInfo?.session && (
                <div className="space-y-4">
                  <h3 className="font-medium">Current Session:</h3>
                  <div className="overflow-hidden">
                    <Button variant="destructive" onClick={handleSignOut}>
                      Sign Out
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-100 rounded-md overflow-auto max-h-96">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(authInfo, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 