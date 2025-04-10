'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import Script from "next/script";

export default function AuthTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  
  // Explicit function to try creating a user
  async function testCreateUser() {
    setLoading(true);
    try {
      const email = `test_${Math.floor(Math.random() * 1000000)}@example.com`;
      const password = "Test12345!";
      
      setTestResult(`Attempting to create user with email: ${email}`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        setTestResult(`Error creating user: ${error.message}`);
        console.error('Error creating user:', error);
      } else {
        setTestResult(`User created successfully: ${JSON.stringify(data, null, 2)}`);
        console.log('User created:', data);
      }
    } catch (err) {
      setTestResult(`Exception creating user: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Exception creating user:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Test sign in with Magic Link
  async function testMagicLink() {
    setLoading(true);
    try {
      const email = prompt('Enter your email for magic link:');
      if (!email) {
        setTestResult('No email provided');
        setLoading(false);
        return;
      }
      
      setTestResult(`Sending magic link to: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      });
      
      if (error) {
        setTestResult(`Error sending magic link: ${error.message}`);
        console.error('Magic link error:', error);
      } else {
        setTestResult(`Magic link sent successfully. Check ${email}`);
        console.log('Magic link sent:', data);
      }
    } catch (err) {
      setTestResult(`Exception sending magic link: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Magic link exception:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Check auth status
  async function checkAuthStatus() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        setTestResult(`Error checking session: ${error.message}`);
        console.error('Session error:', error);
      } else if (data.session) {
        setTestResult(`User is authenticated: ${JSON.stringify(data.session.user, null, 2)}`);
        console.log('User session:', data.session);
      } else {
        setTestResult('No active session found');
        console.log('No session found');
      }
    } catch (err) {
      setTestResult(`Exception checking session: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Session exception:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Test regular sign in
  async function testSignIn() {
    setLoading(true);
    try {
      const email = prompt('Enter email:');
      const password = prompt('Enter password:');
      
      if (!email || !password) {
        setTestResult('Email and password required');
        setLoading(false);
        return;
      }
      
      setTestResult(`Attempting to sign in with: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setTestResult(`Sign in error: ${error.message}`);
        console.error('Sign in error:', error);
      } else {
        setTestResult(`Sign in successful: ${JSON.stringify(data.user, null, 2)}`);
        console.log('Sign in successful:', data);
      }
    } catch (err) {
      setTestResult(`Sign in exception: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Sign in exception:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Handle Google sign-in
  async function handleGoogleSignIn(response: any) {
    try {
      setLoading(true);
      setTestResult(`Received Google response: ${JSON.stringify(response, null, 2)}`);
      console.log('Google response:', response);
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });
      
      if (error) {
        setTestResult(`Google sign-in error: ${error.message}`);
        console.error('Google sign-in error:', error);
      } else {
        setTestResult(`Google sign-in successful: ${JSON.stringify(data.user, null, 2)}`);
        console.log('Google sign-in successful:', data);
      }
    } catch (err) {
      setTestResult(`Google sign-in exception: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Google sign-in exception:', err);
    } finally {
      setLoading(false);
    }
  }
  
  // Make function available for Google callback
  useEffect(() => {
    // @ts-ignore
    window.handleGoogleSignIn = handleGoogleSignIn;
    console.log('Current origin:', window.location.origin);
    console.log('Google Client ID available:', !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('Actual Google Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  }, []);
  
  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
        onLoad={() => console.log('Google Identity Services script loaded in test page')}
      />
      
      <div className="container py-10">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Authentication Testing</CardTitle>
            <CardDescription>
              Test different authentication approaches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={testCreateUser} disabled={loading}>
                  {loading ? 'Working...' : 'Test Create User'}
                </Button>
                
                <Button onClick={testMagicLink} disabled={loading}>
                  {loading ? 'Working...' : 'Test Magic Link'}
                </Button>
                
                <Button onClick={checkAuthStatus} disabled={loading}>
                  {loading ? 'Working...' : 'Check Auth Status'}
                </Button>
                
                <Button onClick={testSignIn} disabled={loading}>
                  {loading ? 'Working...' : 'Test Sign In'}
                </Button>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium mb-4">Test Google Sign-In:</h3>
                
                {/* Raw HTML Google Sign-In Button */}
                <div className="flex justify-center">
                  <div
                    id="g_id_onload"
                    data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
                    data-context="signin"
                    data-ux_mode="popup"
                    data-callback="handleGoogleSignIn"
                    data-auto_select="false"
                    data-itp_support="true"
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
              </div>
              
              {testResult && (
                <div className="mt-4 p-4 bg-gray-100 rounded-md">
                  <h3 className="font-medium mb-2">Test Result:</h3>
                  <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 