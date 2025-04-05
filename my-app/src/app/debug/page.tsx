'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import Link from 'next/link';

export default function DebugPage() {
  const { user, error, isLoading } = useUser();
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchTokenInfo() {
    setLoading(true);
    setTokenError(null);
    
    try {
      const response = await fetch('/api/debug-token');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch token information');
      }
      
      const data = await response.json();
      setTokenInfo(data);
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching token info:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && !isLoading) {
      fetchTokenInfo();
    }
  }, [user, isLoading]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Authentication Required</h1>
        <p>Please log in to debug your Auth0 token.</p>
        <Link href="/api/auth/login?returnTo=/debug">
          <Button>Log In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Auth0 Token Debug</h1>
      
      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Debug Information</AlertTitle>
        <AlertDescription>
          This page shows the contents of your Auth0 token and session information for debugging purposes.
        </AlertDescription>
      </Alert>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Basic Information</CardTitle>
          <CardDescription>Information from the useUser() hook</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[300px]">
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="text-center py-4">Loading token information...</div>
      ) : tokenError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error Fetching Token</AlertTitle>
          <AlertDescription>{tokenError}</AlertDescription>
        </Alert>
      ) : tokenInfo ? (
        <Card>
          <CardHeader>
            <CardTitle>Complete Token Information</CardTitle>
            <CardDescription>Full session and token claims from API</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="session">
              <TabsList>
                <TabsTrigger value="session">Session</TabsTrigger>
                <TabsTrigger value="user">User</TabsTrigger>
                <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="session" className="mt-4">
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]">
                  {JSON.stringify(tokenInfo.session, null, 2)}
                </pre>
              </TabsContent>
              
              <TabsContent value="user" className="mt-4">
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]">
                  {JSON.stringify(tokenInfo.session.user, null, 2)}
                </pre>
              </TabsContent>
              
              <TabsContent value="roles" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Roles (https://example.com/roles)</h3>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto">
                      {JSON.stringify(tokenInfo.session.roles, null, 2) || "No roles found"}
                    </pre>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Alternative Roles</h3>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto">
                      {JSON.stringify(tokenInfo.session.rolesAlt, null, 2) || "No alternative roles found"}
                    </pre>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Permissions</h3>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto">
                      {JSON.stringify(tokenInfo.session.permissions, null, 2) || "No permissions found"}
                    </pre>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Access Token</h3>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto">
                      {tokenInfo.session.accessToken}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : null}
      
      <div className="mt-6">
        <Button onClick={fetchTokenInfo} disabled={loading}>
          {loading ? "Loading..." : "Refresh Token Info"}
        </Button>
      </div>
    </div>
  );
} 