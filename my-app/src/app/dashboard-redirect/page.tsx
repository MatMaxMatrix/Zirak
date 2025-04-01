"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isLoading, error } = useUser();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // If not logged in, redirect to login
        router.push("/api/auth/login");
      } else if (user.email === "admin@example.com") {
        // If admin, redirect to admin dashboard
        router.push("/dashboard");
      } else {
        // If regular user, redirect to user dashboard
        router.push("/user-dashboard");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
} 