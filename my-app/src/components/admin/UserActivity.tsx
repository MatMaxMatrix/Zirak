'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, ShieldAlert } from 'lucide-react';
import { getSupabase } from '@/utils/supabase';

interface LoginHistoryItem {
  id: number;
  user_id: string;
  login_at: string;
  ip_address: string;
  device: string;
  location: string;
  profile?: {
    email: string;
    full_name: string;
    avatar_url: string;
  }
}

interface UserActivityItem {
  id: number;
  user_id: string;
  action: string;
  created_at: string;
  metadata: any;
  profile?: {
    email: string;
    full_name: string;
    avatar_url: string;
  }
}

export function UserActivity() {
  const { user } = useUser();
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'logins' | 'activity'>('logins');

  useEffect(() => {
    async function fetchActivityData() {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const supabase = getSupabase(user.accessToken as string);
        
        // Fetch login history with user profiles
        const { data: loginData, error: loginError } = await supabase
          .from('login_history')
          .select(`
            *,
            profile:profiles(email, full_name, avatar_url)
          `)
          .order('login_at', { ascending: false })
          .limit(50);
          
        if (loginError) throw loginError;
        setLoginHistory(loginData || []);
        
        // Fetch user activity with user profiles
        const { data: activityData, error: activityError } = await supabase
          .from('user_activity')
          .select(`
            *,
            profile:profiles(email, full_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (activityError) throw activityError;
        setUserActivity(activityData || []);
        
      } catch (error: any) {
        console.error('Error fetching activity data:', error);
        setError(error.message || 'Failed to load activity data');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchActivityData();
  }, [user]);

  // Filter based on search query
  const filteredLoginHistory = loginHistory.filter(item => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      item.profile?.email?.toLowerCase().includes(query) ||
      item.profile?.full_name?.toLowerCase().includes(query) ||
      item.ip_address?.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query) ||
      item.device?.toLowerCase().includes(query)
    );
  });

  const filteredUserActivity = userActivity.filter(item => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      item.profile?.email?.toLowerCase().includes(query) ||
      item.profile?.full_name?.toLowerCase().includes(query) ||
      item.action?.toLowerCase().includes(query)
    );
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get action badge color
  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return <Badge className="bg-green-500">Login</Badge>;
      case 'signup':
        return <Badge className="bg-blue-500">Signup</Badge>;
      case 'payment':
        return <Badge className="bg-purple-500">Payment</Badge>;
      case 'subscription_updated':
        return <Badge className="bg-yellow-500">Subscription</Badge>;
      case 'password_reset':
        return <Badge className="bg-red-500">Password Reset</Badge>;
      case 'admin_action':
        return <Badge className="bg-orange-500">Admin Action</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 p-4 rounded text-red-800">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex gap-8 items-center">
          <CardTitle>User Activity</CardTitle>
          <div className="flex gap-4">
            <button
              className={`px-3 py-1 rounded-md ${activeTab === 'logins' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
              onClick={() => setActiveTab('logins')}
            >
              <UserCheck className="h-4 w-4 inline mr-1" />
              Login History
            </button>
            <button
              className={`px-3 py-1 rounded-md ${activeTab === 'activity' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
              onClick={() => setActiveTab('activity')}
            >
              <ShieldAlert className="h-4 w-4 inline mr-1" />
              Activity Log
            </button>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === 'logins' ? (
          /* Login History Table */
          <>
            <h3 className="font-medium mb-4">Recent Login History ({filteredLoginHistory.length})</h3>
            {filteredLoginHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No login history matches your search criteria' : 'No login history available'}
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoginHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.profile?.full_name || 'Unknown User'}</span>
                            <span className="text-xs text-muted-foreground">{item.profile?.email || item.user_id}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(item.login_at)}</TableCell>
                        <TableCell>{item.ip_address || 'Unknown'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.device || 'Unknown'}</TableCell>
                        <TableCell>{item.location || 'Unknown'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : (
          /* User Activity Table */
          <>
            <h3 className="font-medium mb-4">User Activity Log ({filteredUserActivity.length})</h3>
            {filteredUserActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No activity matches your search criteria' : 'No activity records available'}
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUserActivity.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.profile?.full_name || 'Unknown User'}</span>
                            <span className="text-xs text-muted-foreground">{item.profile?.email || item.user_id}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getActionBadge(item.action)}</TableCell>
                        <TableCell className="max-w-[300px]">
                          {item.metadata ? (
                            <div className="text-sm">
                              {Object.entries(item.metadata).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium">{key}: </span>
                                  <span>{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No details</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 