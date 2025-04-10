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
        <div className="flex h-screen">
          <UserSidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4">
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