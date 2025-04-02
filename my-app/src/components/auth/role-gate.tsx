"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
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
  const { user, isLoading, error } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Get user role from Auth0 user metadata or default to 'user'
  const getUserRole = (): UserRole => {
    // Check for namespace roles (Auth0 custom claims)
    if (user?.['https://example.com/roles'] && 
        Array.isArray(user['https://example.com/roles']) && 
        user['https://example.com/roles'].length > 0) {
      const role = user['https://example.com/roles'][0] as string;
      return isValidRole(role) ? role as UserRole : UserRole.USER;
    }
    
    // Check for role directly on user object
    if (user?.role && typeof user.role === 'string') {
      return isValidRole(user.role) ? user.role as UserRole : UserRole.USER;
    }
    
    return UserRole.USER;
  };

  // Helper to validate if a role is valid
  const isValidRole = (role: string): boolean => {
    return Object.values(UserRole).includes(role as UserRole);
  };

  const userRole = getUserRole();

  const isAllowed =
    (!allowedRoles || allowedRoles.includes(userRole)) &&
    (!requiredPermission || hasPermission(userRole, requiredPermission));

  useEffect(() => {
    // Check route access if user is logged in
    if (user && pathname) {
      const currentPath = pathname as string;
      if (!hasRouteAccess(userRole, currentPath)) {
        notification.error("You don't have access to this page");
        router.push("/dashboard");
      }
    }
  }, [userRole, pathname, user, router]);

  if (isLoading) {
    return <div className="p-8 flex justify-center">Checking permissions...</div>;
  }

  if (error) {
    return <div className="p-8 text-center">Authentication error: {error.message}</div>;
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