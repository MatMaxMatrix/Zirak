"use client";

import React from "react";
import { UserSidebar } from "@/components/user-dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider } from "@/components/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProfileSync } from "@/components/auth/ProfileSync";

export default function UserDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <RequireAuth>
        <ProfileSync />
        <div className="flex min-h-[calc(100vh-4rem)] pt-16">
          <UserSidebar />
          <main className="flex-1 ml-64 overflow-y-auto">
            <div className="container mx-auto p-6">
              {children}
            </div>
          </main>
          <div className="fixed bottom-4 right-4">
            <ThemeToggle />
          </div>
        </div>
      </RequireAuth>
    </AuthProvider>
  );
} 