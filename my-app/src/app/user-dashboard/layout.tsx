"use client";

import React from "react";
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

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    notification.error("Please log in to access your dashboard");
    router.push("/api/auth/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    notification.error("Authentication error");
    console.error(error);
    return null;
  }

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