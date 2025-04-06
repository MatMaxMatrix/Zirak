"use client";

import React, { useEffect } from "react";
import { UserSidebar } from "@/components/user-dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { notification } from "@/lib/notification";

export default function UserDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { user, error, isLoading } = useUser();

  // Use effect for navigation to handle client-side transitions properly
  useEffect(() => {
    // Only redirect after we know for sure the user is not logged in
    if (!isLoading && !user) {
      console.log("User not authenticated, redirecting to login...");
      notification.error("Please log in to access your dashboard");
      // Add a delay to prevent immediate redirect that can cause redirect loops
      const redirectTimer = setTimeout(() => {
        router.push("/api/auth/login?returnTo=/user-dashboard");
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, isLoading, router]);

  // Show loading state while authenticating
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (error) {
    console.error("Auth error:", error);
    notification.error("Authentication error");
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold text-red-700 mb-2">Authentication Error</h2>
          <p className="text-red-600">{error.message}</p>
          <div className="mt-4">
            <a 
              href="/api/auth/login?returnTo=/user-dashboard" 
              className="inline-block px-4 py-2 bg-primary text-white rounded-md"
            >
              Try Logging In Again
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Handle not authenticated state
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <h2 className="text-xl font-bold text-yellow-700 mb-2">Authentication Required</h2>
          <p className="text-yellow-600">Please log in to access your dashboard</p>
          <div className="mt-4">
            <a 
              href="/api/auth/login?returnTo=/user-dashboard" 
              className="inline-block px-4 py-2 bg-primary text-white rounded-md"
            >
              Log In
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Only render the dashboard when fully authenticated
  return (
    <div className="flex h-[calc(100vh-64px)]">
      <UserSidebar />
      <div className="flex-1 ml-64">
        <div className="flex h-14 items-center justify-between border-b px-6">
          <h1 className="text-lg font-semibold">User Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {user?.email}
            </div>
            <ThemeToggle />
          </div>
        </div>
        <main className="overflow-y-auto p-6 h-[calc(100vh-64px-56px)]">
          {children}
        </main>
      </div>
    </div>
  );
} 