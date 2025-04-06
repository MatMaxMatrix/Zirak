'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@auth0/nextjs-auth0/client';
import UsersList from '@/components/admin/UsersList';
import AdminStats from '@/components/admin/AdminStats';
import { UserActivity } from '@/components/admin/UserActivity';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function AdminDashboardPage() {
  const { user, error, isLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user has admin role
    if (user && user['https://hasura.io/jwt/claims']) {
      const hasuraClaims = user['https://hasura.io/jwt/claims'] as { 'x-hasura-allowed-roles': string[] };
      if (hasuraClaims['x-hasura-allowed-roles']?.includes('admin')) {
        setIsAdmin(true);
        return;
      }
    }
    setIsAdmin(false);
  }, [user]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your system and users</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">User Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <AdminStats />
          </TabsContent>
          
          <TabsContent value="users">
            <UsersList />
          </TabsContent>
          
          <TabsContent value="activity">
            <UserActivity />
          </TabsContent>
        </Tabs>
      </div>
    </RequireAuth>
  );
} 