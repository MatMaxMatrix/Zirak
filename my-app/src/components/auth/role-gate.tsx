"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission, UserRole, hasRouteAccess } from "@/lib/roles";
import { notification } from "@/lib/notification";

// Define the permission type
type Permission =
  | 'dashboard:view'
  | 'analytics:view'
  | 'analytics:export'
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'profile:view'
  | 'profile:edit'
  | 'settings:view'
  | 'settings:edit'
  | 'settings:advanced'
  | 'settings:billing';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
}

export function RoleGate({
  children,
  allowedRoles,
  requiredPermission,
  fallback
}: RoleGateProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = session?.user?.role || '';
  const isAllowed =
    (!allowedRoles || allowedRoles.includes(userRole as UserRole)) &&
    (!requiredPermission || hasPermission(userRole, requiredPermission));

  useEffect(() => {
    // Check route access
    if (status === "authenticated" && !hasRouteAccess(userRole, pathname)) {
      notification.error("You don't have access to this page");
      router.push("/dashboard");
    }
  }, [userRole, pathname, status, router]);

  if (status === "loading") {
    return <div className="p-8 flex justify-center">Checking permissions...</div>;
  }

  if (!isAllowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to access this resource.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
