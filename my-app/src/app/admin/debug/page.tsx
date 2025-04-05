'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useSupabaseClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';
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
  const [error, setError] = useState<string | null>(null);
  const [clientProfiles, setClientProfiles] = useState<any[]>([]);
  const [serverProfiles, setServerProfiles] = useState<any[]>([]);
  const [tokenData, setTokenData] = useState<any>(null);

  // Function to fetch profiles using client-side Supabase
  async function fetchClientProfiles() {
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

  // Function to fetch profiles using server-side API
  async function fetchServerProfiles() {
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

  // Check authentication and admin status
  if (isAuth0Loading || isSupabaseLoading) {
    return <div className="p-8">Loading authentication...</div>;
  }

  if (!user) {
    return <div className="p-8">Please log in to access this page.</div>;
  }

  if (!isAdmin(user)) {
    return <div className="p-8">Admin access required.</div>;
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