"use client";

import React from "react";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] pt-16">
      <div className="w-64 fixed h-full border-r pt-4">
        <AdminNav />
      </div>
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 