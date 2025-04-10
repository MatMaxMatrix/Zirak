"use client";

import React, { useEffect } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import { notification } from "@/lib/notification";
import { useAuth } from "@/components/AuthProvider";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      notification.error("Please log in to access the dashboard");
      router.push("/sign-in");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 ml-64">
        <div className="flex h-14 items-center justify-between border-b px-6">
          <h1 className="text-lg font-semibold">Dashboard</h1>
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
