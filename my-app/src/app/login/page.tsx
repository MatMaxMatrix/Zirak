'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/sign-in');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-x-hidden bg-grid-pattern">
      <div className="p-6 rounded-lg bg-background/80 backdrop-blur-sm">
        <p className="text-lg">Redirecting to login page...</p>
      </div>
    </div>
  );
} 