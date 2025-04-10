'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { RefreshCw, Shield, Clock, MapPin, Monitor } from 'lucide-react';
import { toast } from 'sonner';

interface LoginHistoryEntry {
  id: number;
  user_id: string;
  login_at: string;
  ip_address: string;
  device: string;
  location: string;
}

export default function LoginHistoryTable() {
  const { user } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchLoginHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      const { data, error: supabaseError } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', user.id)
        .order('login_at', { ascending: false })
        .limit(10);
      
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
      
      setLoginHistory(data || []);
    } catch (err) {
      console.error('Error fetching login history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch login history');
      toast.error('Failed to load login history');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (user) {
      fetchLoginHistory();
    }
  }, [user]);
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp'); // Format: Apr 29, 2023, 1:30 PM
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Login History</CardTitle>
          <CardDescription>
            Recent login activity for your account
          </CardDescription>
        </div>
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
          <Shield className="h-3 w-3 mr-1" />
          Security
        </Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-800">
            {error}
          </div>
        ) : loginHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No login history available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        {formatDate(entry.login_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Monitor className="h-4 w-4 mr-2 text-muted-foreground" />
                        {entry.device || 'Unknown device'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        {entry.location || 'Unknown location'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {entry.ip_address || 'Unknown'}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 