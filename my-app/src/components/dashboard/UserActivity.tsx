'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getSupabase } from '@/utils/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Clock, MapPin, User, Activity } from 'lucide-react';
import { format } from 'date-fns';

type LoginRecord = {
  id: number;
  login_at: string;
  ip_address: string;
  device: string;
  location: string;
};

type ActivityRecord = {
  id: number;
  action: string;
  created_at: string;
  metadata: any;
};

export default function UserActivity() {
  const { user, isLoading: isUserLoading } = useUser();
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [activityHistory, setActivityHistory] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsLoading(false);
      setError('Please log in to view your activity');
      return;
    }

    fetchUserActivity();
  }, [user, isUserLoading]);

  const fetchUserActivity = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase(user?.accessToken as string | undefined);
      
      // Fetch login history
      const { data: loginData, error: loginError } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', user?.sub)
        .order('login_at', { ascending: false })
        .limit(10);
      
      if (loginError) {
        console.error('Error fetching login history:', loginError);
      } else {
        setLoginHistory(loginData || []);
      }
      
      // Fetch activity history
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user?.sub)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (activityError) {
        console.error('Error fetching activity history:', activityError);
      } else {
        setActivityHistory(activityData || []);
      }
    } catch (err: any) {
      console.error('Error fetching user activity:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format timestamps
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to format activity actions
  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isUserLoading || isLoading) {
    return <div className="p-4 text-center">Loading user activity...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  // Add mock data if tables are empty (for demonstration)
  if (loginHistory.length === 0) {
    const mockLoginHistory: LoginRecord[] = [
      {
        id: 1,
        login_at: new Date().toISOString(),
        ip_address: '192.168.1.1',
        device: 'Chrome on macOS',
        location: 'San Francisco, US',
      },
      {
        id: 2,
        login_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        ip_address: '192.168.1.1',
        device: 'Safari on iOS',
        location: 'San Francisco, US',
      },
    ];
    setLoginHistory(mockLoginHistory);
  }

  if (activityHistory.length === 0) {
    const mockActivityHistory: ActivityRecord[] = [
      {
        id: 1,
        action: 'created_todo',
        created_at: new Date().toISOString(),
        metadata: { todo_id: 1, title: 'Complete project' },
      },
      {
        id: 2,
        action: 'updated_profile',
        created_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        metadata: { fields: ['username', 'avatar'] },
      },
      {
        id: 3,
        action: 'completed_todo',
        created_at: new Date(Date.now() - 129600000).toISOString(), // 36 hours ago
        metadata: { todo_id: 1, title: 'Complete project' },
      },
    ];
    setActivityHistory(mockActivityHistory);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account Activity</h2>
        <p className="text-muted-foreground">View your recent logins and account activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Login</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loginHistory.length > 0 ? formatDate(loginHistory[0].login_at).split(',')[0] : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              {loginHistory.length > 0 ? formatDate(loginHistory[0].login_at).split(',')[1] : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loginHistory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Device</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loginHistory.length > 0 ? loginHistory[0].device.split(' ')[0] : 'Unknown'}
            </div>
            <p className="text-xs text-muted-foreground">
              {loginHistory.length > 0 ? loginHistory[0].device.split(' ').slice(1).join(' ') : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activityHistory.length > 0 ? formatAction(activityHistory[0].action) : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {activityHistory.length > 0 ? formatDate(activityHistory[0].created_at).split(',')[1] : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginHistory.map((login) => (
                  <TableRow key={login.id}>
                    <TableCell className="font-medium">{formatDate(login.login_at)}</TableCell>
                    <TableCell>{login.device}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                        {login.location}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityHistory.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{formatAction(activity.action)}</TableCell>
                    <TableCell>{formatDate(activity.created_at)}</TableCell>
                    <TableCell>
                      {activity.metadata && activity.metadata.todo_id && (
                        <>Todo #{activity.metadata.todo_id}</>
                      )}
                      {activity.metadata && activity.metadata.fields && (
                        <>Updated: {activity.metadata.fields.join(', ')}</>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 