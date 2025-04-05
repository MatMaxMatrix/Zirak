'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useSupabaseClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Define types for our data
interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
  };
}

interface Payment {
  id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  payment_date: string;
  created_at: string;
  profiles?: {
    email: string;
  };
}

export default function AdminDashboard() {
  const { user, isLoading: isAuth0Loading } = useUser();
  const { supabase, isLoading: isSupabaseLoading } = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (isAuth0Loading || isSupabaseLoading) return;
      
      try {
        setLoading(true);
        setError(null);
        const supabaseClient = await supabase;
        
        // For debugging - log some info about the user
        console.log('Fetching data as user:', user?.email);
        console.log('Admin status:', isAdmin(user));
        
        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }
        
        console.log(`Found ${profilesData?.length || 0} profiles`);
        setProfiles(profilesData || []);
        
        // Fetch subscriptions
        const { data: subscriptionsData, error: subscriptionsError } = await supabaseClient
          .from('subscriptions')
          .select('*, profiles(email)')
          .order('created_at', { ascending: false });
          
        if (subscriptionsError) throw subscriptionsError;
        setSubscriptions(subscriptionsData || []);
        
        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabaseClient
          .from('payments')
          .select('*, profiles(email)')
          .order('payment_date', { ascending: false });
          
        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      } catch (error: any) {
        console.error('Error fetching admin data:', error);
        setError(error.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [supabase, isAuth0Loading, isSupabaseLoading, user]);
  
  if (isAuth0Loading || isSupabaseLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Admin Access Required</h1>
        <p>Please log in to access the admin dashboard.</p>
        <Link href="/api/auth/login">
          <Button>Log In</Button>
        </Link>
      </div>
    );
  }
  
  if (!isAdmin(user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You don't have permission to access the admin dashboard.</p>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users">Users ({profiles.length})</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all registered users in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading users...</div>
              ) : (
                <Table>
                  <TableCaption>A list of all registered users.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      profiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={profile.avatar_url} alt={profile.username} />
                              <AvatarFallback>
                                {profile.username?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{profile.full_name}</span>
                          </TableCell>
                          <TableCell>{profile.email}</TableCell>
                          <TableCell>{profile.username}</TableCell>
                          <TableCell>
                            {new Date(profile.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>
                View and manage all user subscriptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading subscriptions...</div>
              ) : (
                <Table>
                  <TableCaption>A list of all subscriptions.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Period</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No subscriptions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptions.map((subscription) => (
                        <TableRow key={subscription.id}>
                          <TableCell>{subscription.profiles?.email}</TableCell>
                          <TableCell>{subscription.plan_id}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={subscription.status === 'active' ? 'default' : 
                                     subscription.status === 'canceled' ? 'destructive' : 
                                     'outline'}
                            >
                              {subscription.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(subscription.current_period_start).toLocaleDateString()} - {new Date(subscription.current_period_end).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                View all payment transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading payments...</div>
              ) : (
                <Table>
                  <TableCaption>A list of all payment transactions.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No payments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.profiles?.email}</TableCell>
                          <TableCell>
                            {payment.currency.toUpperCase()} {payment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={payment.status === 'succeeded' ? 'default' : 
                                     payment.status === 'failed' ? 'destructive' : 
                                     'outline'}
                            >
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{payment.payment_method}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 