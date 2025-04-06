'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function RequireAuth({ children, redirectTo = '/api/auth/login' }: RequireAuthProps) {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  // Client-side redirect
  useEffect(() => {
    if (!isLoading && !user && !error) {
      // Only redirect after we've confirmed there's no user
      console.log('No user detected. Redirecting to login...');
      window.location.href = `${redirectTo}?returnTo=${encodeURIComponent(window.location.pathname)}`;
    }
  }, [user, isLoading, error, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md">
          <strong className="font-bold">Authentication Error</strong>
          <p className="block sm:inline">{error.message}</p>
        </div>
        <Button asChild>
          <Link href={`${redirectTo}?returnTo=${encodeURIComponent(window.location.pathname)}`}>
            Try Again
          </Link>
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative max-w-md">
          <strong className="font-bold">Not Authenticated</strong>
          <p className="block sm:inline">Please log in to access this page.</p>
        </div>
        <Button asChild>
          <Link href={`${redirectTo}?returnTo=${encodeURIComponent(window.location.pathname)}`}>
            Log In
          </Link>
        </Button>
      </div>
    );
  }

  // User is authenticated
  return <>{children}</>;
} 