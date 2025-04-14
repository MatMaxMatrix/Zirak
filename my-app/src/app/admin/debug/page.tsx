'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useSupabaseClient } from '@/lib/supabase';
import { hasRole, UserRole } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminDebugPage() {
  const { user, isLoading: isAuth0Loading } = useUser();
  const { supabase, isLoading: isSupabaseLoading } = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | undefined>(undefined);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientProfiles, setClientProfiles] = useState<any[]>([]);
  const [serverProfiles, setServerProfiles] = useState<any[]>([]);
  const [tokenData, setTokenData] = useState<any>(null);

  useEffect(() => {
    async function checkAdminRole() {
      if (isAuth0Loading || isSupabaseLoading || !user || !supabase) return;
      
      if (initialCheckDone) return;

      setLoading(true);
      setError(null);
      
      try {
        const supabaseClient = await supabase;
        const auth0UserId = user.sub;
        
        if (!auth0UserId) {
          throw new Error("Auth0 user ID not found.");
        }
        
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', auth0UserId)
          .single();
          
        if (profileError) {
          if (profileError.code !== 'PGRST116') {
             console.error('Error fetching user role:', profileError);
             setError('Failed to verify admin status.');
          }
          setCurrentUserRole(undefined);
        } else {
          setCurrentUserRole(profileData?.role);
        }
        
      } catch (err: any) {
        console.error("Error during initial admin check:", err);
        setError("Failed to verify admin status.");
        setCurrentUserRole(undefined);
      } finally {
        setLoading(false);
        setInitialCheckDone(true);
      }
    }
    
    checkAdminRole();
  }, [isAuth0Loading, isSupabaseLoading, user, supabase, initialCheckDone]);

  async function fetchClientProfiles() {
     if (!hasRole(currentUserRole, UserRole.ADMIN)) {
        setError('Admin permission required to perform this action.');
        return;
     }
     try {
       setLoading(true);
       setError(null);
       
       const supabaseClient = await supabase;
       const { data, error } = await supabaseClient
         .from('profiles')
         .select('*')
         .order('created_at', { ascending: false });
       
       if (error) {
         throw new Error(`Client fetch error: ${error.message}`);
       }
       
       setClientProfiles(data || []);
     } catch (err: any) {
       console.error('Client fetch error:', err);
       setError(err.message);
     } finally {
       setLoading(false);
     }
   }

  async function fetchServerProfiles() {
     if (!hasRole(currentUserRole, UserRole.ADMIN)) {
        setError('Admin permission required to perform this action.');
        return;
     }
     try {
       setLoading(true);
       setError(null);
       
       const response = await fetch('/api/admin/debug-profiles');
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(`Server API error: ${errorData.error} - ${errorData.details || ''}`);
       }
       
       const data = await response.json();
       setServerProfiles(data.profiles || []);
       setTokenData(data.token);
     } catch (err: any) {
       console.error('Server fetch error:', err);
       setError(err.message);
     } finally {
       setLoading(false);
     }
   }

  if (isAuth0Loading || isSupabaseLoading || !initialCheckDone) {
    return <div className="p-8 text-center">Verifying access...</div>;
  }

  if (!user) {
    return <div className="p-8">Please log in to access this page.</div>;
  }

  if (!hasRole(currentUserRole, UserRole.ADMIN)) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
        <p>{error || 'Admin access required.'}</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Debug Page</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      <div className="flex gap-4 mb-6">
        <Button 
          onClick={fetchClientProfiles} 
          disabled={loading}
          variant="outline"
        >
          Test Client-Side Fetch
        </Button>
        
        <Button 
          onClick={fetchServerProfiles} 
          disabled={loading}
          variant="default"
        >
          Test Server-Side Fetch
        </Button>
      </div>
      
      <Tabs defaultValue="client">
        <TabsList className="mb-4">
          <TabsTrigger value="client">Client Profiles ({clientProfiles.length})</TabsTrigger>
          <TabsTrigger value="server">Server Profiles ({serverProfiles.length})</TabsTrigger>
          <TabsTrigger value="token">Token Info</TabsTrigger>
        </TabsList>
        
        <TabsContent value="client">
          <Card>
            <CardHeader>
              <CardTitle>Client-Side Fetch Results</CardTitle>
              <CardDescription>
                Profiles fetched using the Supabase client in the browser
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : clientProfiles.length === 0 ? (
                <div className="text-center py-4">No profiles found</div>
              ) : (
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]">
                  {JSON.stringify(clientProfiles, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="server">
          <Card>
            <CardHeader>
              <CardTitle>Server-Side Fetch Results</CardTitle>
              <CardDescription>
                Profiles fetched using the API endpoint with service_role
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : serverProfiles.length === 0 ? (
                <div className="text-center py-4">No profiles found</div>
              ) : (
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]">
                  {JSON.stringify(serverProfiles, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="token">
          <Card>
            <CardHeader>
              <CardTitle>Token Information</CardTitle>
              <CardDescription>
                Details about the token used for server-side fetch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!tokenData ? (
                <div className="text-center py-4">No token data available</div>
              ) : (
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]">
                  {JSON.stringify(tokenData, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 