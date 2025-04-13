'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface LoginHistoryItem {
  id: number;
  user_id: string;
  login_at: string;
  ip_address: string;
  device: string;
  location: string;
  profile?: {
    email: string;
    name: string;
    picture: string;
  }
}

export default function UserActivity() {
  const { user } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchLoginHistory() {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();
        
        const { data: loginData, error: loginError } = await supabase
          .from('login_history')
          .select(`
            *,
            profile:profiles(email, name, picture)
          `)
          .order('login_at', { ascending: false })
          .limit(50);
          
        if (loginError) throw loginError;
        setLoginHistory(loginData || []);
        
      } catch (error: any) {
        console.error('Full error object fetching login history:', JSON.stringify(error, null, 2));
        setError(error?.message || `Failed to load login history. Code: ${error?.code || 'N/A'}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchLoginHistory();
  }, [user]);

  const filteredLoginHistory = loginHistory.filter(item => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      item.profile?.email?.toLowerCase().includes(query) ||
      item.profile?.name?.toLowerCase().includes(query) ||
      item.ip_address?.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query) ||
      item.device?.toLowerCase().includes(query)
    );
  });

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
        <CardTitle>Recent Logins</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logins..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-medium mb-4">Login History ({filteredLoginHistory.length})</h3>
        {filteredLoginHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No logins match your search criteria' : 'No login history available'}
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
                        <span className="font-medium">{item.profile?.name || 'Unknown User'}</span>
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
      </CardContent>
    </Card>
  );
} 