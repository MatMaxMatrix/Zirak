'use client';

import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function AssignAdminPage() {
  const { user } = useUser();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This would typically require admin privileges
  // For now, let's create a demonstration of how it would work
  const handleAssignAdmin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // In a real implementation, this would call your Auth0 Management API
      // to assign the admin role to the user
      // For demonstration, we'll simulate the API call:
      
      const response = await fetch('/api/auth/assign-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign admin role');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Check if the current user has admin role
  const userRoles = user?.['https://example.com/roles'] as string[] | undefined;
  const isAdmin = userRoles?.includes('admin');

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Please log in to access this page.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You need admin privileges to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Assign Admin Role</CardTitle>
          <CardDescription>
            Grant admin privileges to a user by their Auth0 user ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Admin role has been assigned successfully.
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="userId">
                Auth0 User ID
              </label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="auth0|1234567890"
              />
              <p className="text-xs text-gray-500">
                Enter the full Auth0 user ID (e.g., auth0|1234567890)
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleAssignAdmin} 
            disabled={loading || !userId}
          >
            {loading ? 'Processing...' : 'Assign Admin Role'}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-2">Your User ID</h3>
        <p className="p-2 bg-gray-100 rounded text-sm font-mono break-all">
          {user.sub}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          You can use this ID to assign yourself admin rights in Auth0.
        </p>
      </div>
    </div>
  );
} 