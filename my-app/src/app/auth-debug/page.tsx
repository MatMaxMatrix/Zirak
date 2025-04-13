'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useAuth, UserWithRole } from "@/components/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import React from "react";

export default function AuthDebug() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isProcessingSignIn, setIsProcessingSignIn] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSignInWithGoogle(response: any) {
    setIsProcessingSignIn(true);
    setLocalError(null);
    console.log('[Google Debug] Response:', response);
    
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) {
        console.error('[Google Debug] Error:', error);
        setLocalError(error.message);
      } else {
        console.log('[Google Debug] Success:', data);
        await refreshUser();
      }
    } catch (err) {
      console.error('[Google Debug] Error:', err);
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessingSignIn(false);
    }
  }

  useEffect(() => {
    // @ts-ignore
    window.handleSignInWithGoogle = handleSignInWithGoogle;
    
    console.log('Google Client ID available:', !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('Supabase URL available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Anon Key available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, [refreshUser]);

  async function handleSignOut() {
    setIsSigningOut(true);
    setLocalError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setLocalError(error.message);
        console.error("Sign out error:", error);
      } else {
        console.log("Sign out initiated successfully");
      }
    } catch (err) {
      console.error("Sign out exception:", err);
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSigningOut(false);
    }
  }

  // Helper to render user properties nicely
  const renderUserProperty = (label: string, value: any) => {
    let displayValue: React.ReactNode;

    if (value === null || value === undefined) {
      displayValue = <span className="text-gray-400">N/A</span>;
    } else if (typeof value === 'object' && value !== null && !React.isValidElement(value)) {
      // Handle plain objects (like metadata) - check if it's NOT a valid React element
      displayValue = (
        <div className="text-xs bg-gray-50 p-1 rounded space-y-0.5">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="flex">
              <span className="font-medium text-gray-600 w-20 shrink-0 truncate" title={key}>{key}:</span>
              <span className="ml-2 break-all">
                {typeof val === 'object' && val !== null ? '(Object)' : String(val)}
              </span>
            </div>
          ))}
          {Object.keys(value).length === 0 && <span className="text-gray-400">(Empty Object)</span>}
        </div>
      );
    } else if (React.isValidElement(value)) {
       // If it's already a React element (like the Badge), render it directly
       displayValue = value;
    } else {
      // Handle primitive types (strings, numbers, booleans)
      displayValue = value.toString();
    }

    return (
      <div className="grid grid-cols-3 gap-2 py-1 border-b border-gray-200">
        <dt className="text-sm font-medium text-gray-500 break-words col-span-1">{label}</dt>
        <dd className="text-sm text-gray-900 break-words col-span-2">
          {displayValue}
        </dd>
      </div>
    );
  };

  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
        onLoad={() => console.log('Google Identity Services script loaded in debug page')}
      />
      
      <div className="container py-10">
        <Card className="w-full max-w-4xl mx-auto shadow-lg">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-xl">Authentication Debug</CardTitle>
            <CardDescription>
              View current session details and test sign-in/out.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Environment Variables</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                   <div>
                    <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL: </span>
                    <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'secondary' : 'destructive'}>
                      {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY: </span>
                     <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'secondary' : 'destructive'}>
                       {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}
                     </Badge>
                  </div>
                  <div>
                    <span className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID: </span>
                     <Badge variant={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'secondary' : 'destructive'}>
                       {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Missing'}
                     </Badge>
                  </div>
                </CardContent>
              </Card>
              
              {localError && (
                <Card className="border-red-300 bg-red-50">
                   <CardHeader>
                     <CardTitle className="text-base text-red-700">Action Error</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <pre className="text-sm text-red-600 overflow-x-auto">{localError}</pre>
                   </CardContent>
                </Card>
              )}
              
              {authLoading && (
                <div className="flex items-center justify-center p-6 text-gray-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading session information...
                </div>
              )}

              {!authLoading && (
                <Card>
                   <CardHeader>
                     <CardTitle className="text-base">Session Status</CardTitle>
                   </CardHeader>
                   <CardContent>
                    {user ? (
                      <div className="space-y-4">
                        <dl>
                           {renderUserProperty("User ID", user.id)}
                           {renderUserProperty("Email", user.email)}
                           {renderUserProperty("Role", user.role ? (
                             <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>{user.role}</Badge>
                           ) : 'N/A')}
                           {renderUserProperty("Provider", user.app_metadata?.provider)}
                           {renderUserProperty("Created At", user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A')}
                           {renderUserProperty("Last Sign In", user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A')}
                           {renderUserProperty("User Metadata", user.user_metadata)}
                           {renderUserProperty("App Metadata", user.app_metadata)}
                        </dl>
                         <Button 
                           variant="destructive" 
                           onClick={handleSignOut} 
                           disabled={isSigningOut}
                           className="w-full sm:w-auto"
                         >
                           {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                           Sign Out
                         </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-4 p-4 border rounded-md">
                         <p className="text-gray-600">No active session.</p>
                         <h3 className="font-medium">Test Google Sign In:</h3>
                         {(isProcessingSignIn) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    )}
                   </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 