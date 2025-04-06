'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

export default function SimpleUserDashboard() {
  const { user, error, isLoading } = useUser();
  const [showCookieInfo, setShowCookieInfo] = useState(false);
  const [cookieData, setCookieData] = useState<string>('');

  // Function to check all cookies
  const checkCookies = () => {
    setShowCookieInfo(true);
    setCookieData(document.cookie);
  };

  // Debug function to log authentication details
  useEffect(() => {
    console.log('Auth Status:');
    console.log('- isLoading:', isLoading);
    console.log('- error:', error);
    console.log('- user:', user ? 'Logged in as ' + user.email : 'Not logged in');
  }, [isLoading, error, user]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading user information...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Authentication Error</p>
          <p>{error.message}</p>
        </div>
        <Button asChild className="mt-4">
          <Link href="/api/auth/login?returnTo=/user-dashboard-simple">Try Login Again</Link>
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Not Authenticated</p>
          <p>Please log in to view your dashboard.</p>
        </div>
        <Button asChild className="mt-4">
          <Link href="/api/auth/login?returnTo=/user-dashboard-simple">Log In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Simple User Dashboard</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={user.picture || ""} />
              <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>
          
          <div className="mt-6 space-y-2">
            <Button onClick={checkCookies}>Check Authentication Cookies</Button>
            
            {showCookieInfo && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-bold mb-2">Cookie Information:</h3>
                <p className="text-sm break-all">{cookieData || 'No cookies found'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex space-x-4">
        <Button asChild variant="outline">
          <Link href="/">Back to Home</Link>
        </Button>
        
        <Button asChild variant="outline">
          <Link href="/auth-debug">Auth Debug</Link>
        </Button>
        
        <Button asChild variant="outline">
          <Link href="/user-dashboard">Full Dashboard</Link>
        </Button>
        
        <Button asChild variant="destructive">
          <Link href="/api/auth/logout">Log Out</Link>
        </Button>
      </div>
    </div>
  );
} 