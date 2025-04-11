"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function WaitlistPage() {
  const { user, isLoading } = useAuth();
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromChat = searchParams.get('from') === 'chat';

  useEffect(() => {
    // Check if user is on waitlist (you'll need to implement this check with your backend)
    if (user) {
      // TODO: Make API call to check if user is on waitlist
      // For now, we'll just set it to true if user is logged in
      setIsOnWaitlist(true);
    }
    
    // Show toast if redirected from chat
    if (fromChat) {
      toast.info("Chat is currently only available for waitlisted users");
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-blue-400" />
              AI Chat Access Waitlist
            </CardTitle>
            <CardDescription className="text-gray-400">
              Our AI chat feature is currently in limited access. Join the waitlist to get early access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="space-y-6">
                <p className="text-gray-300">
                  To join the waitlist, please sign in or create an account.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href={`/sign-in?returnTo=${encodeURIComponent('/waitlist')}`}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-gray-600 hover:bg-gray-700">
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
                <p className="text-gray-300">
                  Thank you for joining the waitlist! We'll notify you via email when you get access to the AI chat assistant.
                </p>
                <div className="flex gap-4">
                  <Button asChild variant="outline" className="border-gray-600 hover:bg-gray-700">
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
                <p className="text-gray-300">
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