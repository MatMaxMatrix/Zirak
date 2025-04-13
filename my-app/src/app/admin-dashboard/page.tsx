'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
// Remove Auth0 import if no longer needed elsewhere after this change
// import { useUser } from '@auth0/nextjs-auth0/client'; 
import UsersList from '@/components/admin/UsersList';
import AdminStats from '@/components/admin/AdminStats';
import UserActivity from '@/components/admin/UserActivity';
import ContactQueries from '@/components/admin/ContactQueries';
// Remove RequireAuth if AuthProvider handles loading/auth state adequately
// import { RequireAuth } from '@/components/auth/RequireAuth'; 
import { useAuth } from '@/components/AuthProvider'; // Import our AuthProvider hook
import { Loader2, ShieldAlert, MessageSquare } from 'lucide-react'; // Import icons

export default function AdminDashboardPage() {
  // Use our AuthProvider hook
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get the tab from query params or default to "overview"
  const currentTab = searchParams.get('tab') || 'overview';
  
  // Directly check the role from the user context
  const isAdmin = user?.role === 'admin';

  // Handler to update URL when tab changes
  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    if (newTab === 'overview') {
      params.delete('tab'); // Remove tab param for default view
    } else {
      params.set('tab', newTab);
      }
    router.push(`${pathname}?${params.toString()}`, { scroll: false }); // Use router.push to update URL without full reload
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
        <span>Loading User Information...</span>
      </div>
    );
  }
  
  // Check if user exists and is admin
  if (!user || !isAdmin) {
    // Log why access is denied
    console.log(`[AdminDashboard] Access Denied. User: ${!!user}, IsAdmin: ${isAdmin}, Role: ${user?.role}`); 
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Unauthorized Access</h1>
        <p className="text-muted-foreground">
          {user ? "You do not have permission to view this page." : "Please log in to access this page."}
        </p>
        {/* Optionally add a login button if !user */} 
      </div>
    );
  }

  // If user is admin, render the dashboard content
  // Log that access is granted
  console.log(`[AdminDashboard] Access Granted. Rendering dashboard for User: ${user.id}, Role: ${user.role}`);
  return (
    // Remove RequireAuth if redundant now
    // <RequireAuth>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your system and users</p>
        </div>

        <Tabs 
          value={currentTab} 
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="contact-queries">Contact Queries</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <AdminStats />
          </TabsContent>
          
          <TabsContent value="users">
            <UsersList />
          </TabsContent>
          
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Subscription management features coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact-queries">
            <ContactQueries />
          </TabsContent>
          
          <TabsContent value="activity">
            <UserActivity />
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Admin settings and configuration options coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    // </RequireAuth>
  );
} 