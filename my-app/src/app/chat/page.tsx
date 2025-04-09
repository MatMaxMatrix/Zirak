"use client";

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from 'next/navigation';

// Loading component
function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="ml-2 text-lg">Loading chat interface...</span>
    </div>
  );
}

// Dynamically import the chat interface with no SSR
const ChatInterface = dynamic(
  () => import('@/components/chat/ChatInterface'),
  { 
    ssr: false,
    loading: () => <Loading />
  }
);

// Simple wrapper for the chat page
export default function ChatPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  
  // Redirect to waitlist if user is authenticated
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect authenticated users to the waitlist
        router.push('/waitlist');
      } else {
        // Redirect unauthenticated users to login
        router.push('/api/auth/login?returnTo=/waitlist');
      }
    }
  }, [user, isLoading, router]);

  // Show loading while authentication state is being determined
  if (isLoading) {
    return <Loading />;
  }
  
  // This will only briefly show before redirection happens
  return (
    <Suspense fallback={<Loading />}>
      <ChatInterface />
    </Suspense>
  );
} 