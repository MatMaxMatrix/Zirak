'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { RequireAuth } from '@/components/auth/RequireAuth';

// Define a type for Hasura claims in the user object
interface HasuraClaims {
  'x-hasura-user-id': string;
  'x-hasura-default-role': string;
  'x-hasura-allowed-roles': string[];
  [key: string]: unknown;
}

// Extend UserProfile to include Auth0 claims
interface Auth0UserProfile {
  name?: string;
  email?: string;
  sub?: string;
  picture?: string;
  'https://hasura.io/jwt/claims'?: HasuraClaims;
  [key: string]: any;
}

export default function AuthDebugPage() {
  const { user, error, isLoading } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [cookieInfo, setCookieInfo] = useState<string>('');

  const getTokenInfo = async () => {
    try {
      const response = await fetch('/api/auth/token');
      const data = await response.json();
      
      if (data.error) {
        setTokenError(data.error);
        setToken(null);
      } else {
        setToken(data.token);
        setTokenError(null);
      }
    } catch (err) {
      setTokenError('Failed to fetch token');
      setToken(null);
    }
  };

  const checkCookies = () => {
    const cookies = document.cookie;
    setCookieInfo(cookies || 'No cookies found');
  };

  useEffect(() => {
    if (user) {
      getTokenInfo();
    }
  }, [user]);

  // Type guard to check if the claims object has the expected structure
  const hasHasuraClaims = (claims: any): claims is HasuraClaims => {
    return claims && 
           typeof claims['x-hasura-user-id'] === 'string' && 
           typeof claims['x-hasura-default-role'] === 'string' && 
           Array.isArray(claims['x-hasura-allowed-roles']);
  };

  // Type cast user to our extended Auth0 profile type
  const typedUser = user as Auth0UserProfile | undefined;

  return (
    <RequireAuth>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Auth Debugging Page</h1>
        <p className="text-muted-foreground">Debug authentication state and session information</p>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Authentication Status</CardTitle>
              <CardDescription>Current login state from useUser hook</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading authentication status...</p>
              ) : error ? (
                <div className="text-red-500">
                  <p>Error: {error.message}</p>
                </div>
              ) : typedUser ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">✅ Authenticated</h3>
                    <p className="text-sm text-muted-foreground">You are logged in</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p><span className="font-semibold">User ID:</span> {typedUser.sub}</p>
                    <p><span className="font-semibold">Name:</span> {typedUser.name}</p>
                    <p><span className="font-semibold">Email:</span> {typedUser.email}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mt-4">Roles/Permissions:</h4>
                    {typedUser['https://hasura.io/jwt/claims'] && hasHasuraClaims(typedUser['https://hasura.io/jwt/claims']) && (
                      <div className="mt-2 text-xs">
                        <p><span className="font-semibold">User ID:</span> {typedUser['https://hasura.io/jwt/claims']['x-hasura-user-id']}</p>
                        <p><span className="font-semibold">Default Role:</span> {typedUser['https://hasura.io/jwt/claims']['x-hasura-default-role']}</p>
                        <p><span className="font-semibold">Allowed Roles:</span> {typedUser['https://hasura.io/jwt/claims']['x-hasura-allowed-roles'].join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold">❌ Not Authenticated</h3>
                  <p className="text-sm text-muted-foreground">You are not logged in</p>
                  <div className="mt-4">
                    <Link href="/api/auth/login">
                      <Button>Log In</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Access Token Card */}
          <Card>
            <CardHeader>
              <CardTitle>Access Token</CardTitle>
              <CardDescription>JWT token from the server-side session</CardDescription>
            </CardHeader>
            <CardContent>
              {typedUser ? (
                <>
                  {tokenError ? (
                    <div className="text-red-500">
                      <h3 className="font-semibold">Error retrieving token</h3>
                      <p>{tokenError}</p>
                    </div>
                  ) : token ? (
                    <div>
                      <h3 className="font-semibold">✅ Token Retrieved</h3>
                      <div className="mt-2">
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
                          <div className="text-xs font-mono overflow-auto max-h-40 whitespace-pre-wrap break-all">
                            {token}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold">⏳ Click to retrieve token</h3>
                      <Button onClick={getTokenInfo} className="mt-2">
                        Get Access Token
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p>Log in to view your access token</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Cookie Debug Section */}
        <Card>
          <CardHeader>
            <CardTitle>Cookie Information</CardTitle>
            <CardDescription>Check browser cookies related to authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={checkCookies}>Check Cookies</Button>
            
            {cookieInfo && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Current Cookies:</h3>
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
                  <pre className="text-xs font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                    {cookieInfo}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Navigation Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Navigation Test</CardTitle>
            <CardDescription>Test navigation to protected routes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/user-dashboard">
                <Button variant="outline" className="w-full">
                  Go to User Dashboard
                </Button>
              </Link>
              <Link href="/user-dashboard-simple">
                <Button variant="outline" className="w-full">
                  Go to Simple User Dashboard
                </Button>
              </Link>
              <Link href="/admin-dashboard">
                <Button variant="outline" className="w-full">
                  Go to Admin Dashboard
                </Button>
              </Link>
              <Link href="/api/auth/logout">
                <Button variant="destructive" className="w-full">
                  Log Out
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Raw Auth Debug */}
        {typedUser && (
          <Card>
            <CardHeader>
              <CardTitle>Raw User Object</CardTitle>
              <CardDescription>Complete user information from Auth0</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
                <pre className="text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">
                  {JSON.stringify(typedUser, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RequireAuth>
  );
} 