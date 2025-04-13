"use client";

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Loading component
function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="ml-2 text-lg">Redirecting to waitlist...</span>
    </div>
  );
}

// Simple wrapper for the chat page that redirects all users to waitlist
export default function ChatPage() {
  const router = useRouter();
  
  // Always redirect to waitlist regardless of authentication status
  useEffect(() => {
    // Immediate redirect to waitlist page
    router.push('/waitlist');
    
    // Add event listener for navigation back to this page
    const handleFocus = () => {
      // Re-redirect if user navigates back to this page
      if (window.location.pathname.startsWith('/chat')) {
        router.push('/waitlist');
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  // Show loading while redirect happens
  return <Loading />;
} 