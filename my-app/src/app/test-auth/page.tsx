'use client';

import React from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TestAuthPage() {
  const { user, isLoading, error } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Auth0 Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <>
              <div>
                <h2 className="text-xl font-bold">Logged in as:</h2>
                <p>{user.name} ({user.email})</p>
              </div>
              <div>
                <Button asChild variant="outline">
                  <Link href="/api/auth/logout">Logout</Link>
                </Button>
              </div>
            </>
          ) : (
            <div>
              <p>You are not logged in.</p>
              <Button asChild className="mt-4">
                <Link href="/api/auth/login">Login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 