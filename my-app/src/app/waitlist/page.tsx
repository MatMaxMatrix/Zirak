"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function WaitlistPage() {
  const { user, isLoading } = useUser();
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);

  useEffect(() => {
    // Check if user is on waitlist (you'll need to implement this check with your backend)
    if (user) {
      // TODO: Make API call to check if user is on waitlist
      // For now, we'll just set it to true if user is logged in
      setIsOnWaitlist(true);
    }
  }, [user]);

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
              Join the AI Chat Waitlist
            </CardTitle>
            <CardDescription className="text-gray-400">
              Be among the first to experience our AI-powered chat assistant
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
                    <Link href="/api/auth/login?prompt=login">
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-gray-600 hover:bg-gray-700">
                    <Link href="/api/auth/login?prompt=signup">
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
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Join Waitlist
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 