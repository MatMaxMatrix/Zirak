"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

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
  return (
    <Suspense fallback={<Loading />}>
      <ChatInterface />
    </Suspense>
  );
} 