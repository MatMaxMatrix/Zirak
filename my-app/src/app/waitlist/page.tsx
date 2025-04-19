"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function WaitlistPage() {
  const { user, isLoading } = useAuth();
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromChat = searchParams.get('from') === 'chat';
  const { theme } = useTheme();
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  useEffect(() => {
    // Get user input from localStorage if it exists
    const savedPrompt = localStorage.getItem('initial_prompt');
    if (savedPrompt && fromChat) {
      setInitialPrompt(savedPrompt);
    }
    
    // Check if user is on waitlist
    if (user) {
      // TODO: Make API call to check if user is on waitlist
      // For now, we'll just set it to true if user is logged in
      setIsOnWaitlist(true);
    }
    
    // Show toast for users coming from the chat
    if (fromChat) {
      toast.info("Chat is currently only available for waitlisted users");
    } else if (savedPrompt && fromChat) {
      // If they have a prompt stored but didn't come through the 'from=chat' parameter,
      // they likely used the chat on the homepage
      toast.info("Thank you for your interest! Our AI assistant is currently in early access.");
    }
  }, [user, fromChat]);

  // Function to handle joining the waitlist
  const handleJoinWaitlist = async () => {
    if (!user) {
      router.push('/sign-in?returnTo=/waitlist');
      return;
    }
    
    setJoiningWaitlist(true);
    
    try {
      // TODO: Implement actual waitlist API call here
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsOnWaitlist(true);
      toast.success("You've been added to the waitlist!");
    } catch (error) {
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setJoiningWaitlist(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-grid-pattern p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="dark-card">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-blue-400" />
              AI Chat Access Waitlist
            </CardTitle>
            <CardDescription>
              Our AI chat feature is currently in limited access. Join the waitlist to get early access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {initialPrompt && (
              <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400 mb-2">You asked:</p>
                <p className="text-gray-200">{initialPrompt}</p>
                <p className="text-sm text-gray-400 mt-4">We'll answer your question once you get access to our AI assistant.</p>
              </div>
            )}
            
            {!user ? (
              <div className="space-y-6">
                <p>
                  To join the waitlist, please sign in or create an account.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href={`/sign-in?returnTo=${encodeURIComponent('/waitlist')}`}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/sign-in?returnTo=${encodeURIComponent('/waitlist')}`}>
                      Create Account
                    </Link>
                  </Button>
                </div>
              </div>
            ) : isOnWaitlist ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="text-xl">You're on the waitlist!</span>
                </div>
                <p>
                  Thank you for joining the waitlist! We'll notify you via email when you get access to the AI chat assistant.
                </p>
                <div className="flex gap-4">
                  <Button asChild variant="outline">
                    <Link href="/">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Return to Home
                    </Link>
                  </Button>
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/user-dashboard">
                      Go to Dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p>
                  Join the waitlist to be notified when the AI chat assistant becomes available.
                </p>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleJoinWaitlist}
                  disabled={joiningWaitlist}
                >
                  {joiningWaitlist ? 'Processing...' : 'Join Waitlist'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 