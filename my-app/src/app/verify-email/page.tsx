"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [refreshLoading, setRefreshLoading] = useState(false);

  // Get the user's email from the session if available
  const userEmail = user?.email || "your email";

  const handleRefresh = () => {
    setRefreshLoading(true);
    // Redirect to login to trigger a fresh authentication check
    window.location.href = "/api/auth/login?prompt=login";
  };

  // If the user is verified or there's no user yet, redirect
  useEffect(() => {
    if (!isLoading && user && user.email_verified) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900/50 p-8 rounded-xl border border-gray-800/50 backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verify Your Email</h1>
          <p className="text-gray-400">
            We've sent a verification email to <span className="text-blue-400 font-medium">{userEmail}</span>. Please check your email and click the verification link to continue.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
            <p className="text-sm text-blue-300">
              If you don't see the email, please check your spam folder. The email comes from Auth0 &lt;noreply@auth0.com&gt;
            </p>
          </div>

          <Button
            onClick={handleRefresh}
            className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
            disabled={refreshLoading}
          >
            {refreshLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check verification
              </>
            )}
          </Button>

          <div className="text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-300 inline-flex items-center">
              <ArrowLeft className="mr-1 h-3 w-3" />
              Return to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 