"use client";

import { useAuth } from '@/components/AuthProvider';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface RoleGateProps {
  children: ReactNode;
  allowedRoles?: string[];
  fallback?: ReactNode;
}

export function RoleGate({ 
  children, 
  allowedRoles = ['admin'], 
  fallback = null 
}: RoleGateProps) {
  const { user, isLoading } = useAuth();

  // If still loading, show nothing or a loading state
  if (isLoading) {
    return <div className="p-4 text-center">Checking permissions...</div>;
  }

  // If no user, redirect to login
  if (!user) {
    redirect('/login');
    return null;
  }

  // Check if user has required role
  const userRole = user.role || 'user';
  const hasRequiredRole = allowedRoles.includes(userRole);

  // If user doesn't have the required role, show fallback or nothing
  if (!hasRequiredRole) {
    return fallback ? <>{fallback}</> : (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  // User has required role, show children
  return <>{children}</>;
}

export default RoleGate; 