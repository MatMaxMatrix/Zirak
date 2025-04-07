'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Edit, UserPlus, Eye } from 'lucide-react';
import { getSupabase } from '@/utils/supabase';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  last_login: string;
  login_count: number;
  subscription_status: string;
  is_email_verified: boolean;
  onboarding_completed: boolean;
  location: string;
}

export default function UsersList() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const supabase = getSupabase(user.accessToken as string);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setUsers(data || []);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        setError(error.message || 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUsers();
  }, [user]);

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get subscription badge color
  const getSubscriptionBadge = (status: string) => {
    if (!status) return <Badge variant="outline">None</Badge>;
    
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500">Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-red-500">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Free'}</Badge>;
    }
  };

  // Get avatar fallback text
  const getAvatarFallback = (name: string) => {
    if (!name) return '?';
    
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    
    return name[0].toUpperCase();
  };

  // View user details
  const viewUserDetails = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
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
        <CardTitle>Users ({users.length})</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="sm" className="text-xs">
            <UserPlus className="mr-1 h-4 w-4" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No users match your search criteria' : 'No users found'}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Logins</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback>{getAvatarFallback(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                          <div className="text-xs text-muted-foreground">{user.username || user.id.substring(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{user.email}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.is_email_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getSubscriptionBadge(user.subscription_status)}</TableCell>
                    <TableCell>{user.login_count || 0}</TableCell>
                    <TableCell>{formatDate(user.last_login)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => viewUserDetails(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {selectedUser && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>View detailed information about the user.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={selectedUser.avatar_url || ''} />
                <AvatarFallback className="text-2xl">{getAvatarFallback(selectedUser.full_name)}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold">{selectedUser.full_name || 'Unnamed User'}</h3>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              <div className="mt-2">
                {getSubscriptionBadge(selectedUser.subscription_status)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-sm text-muted-foreground truncate">{selectedUser.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Username</p>
                <p className="text-sm text-muted-foreground">{selectedUser.username || 'None'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">{formatDate(selectedUser.created_at)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Login</p>
                <p className="text-sm text-muted-foreground">{formatDate(selectedUser.last_login)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Login Count</p>
                <p className="text-sm text-muted-foreground">{selectedUser.login_count || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Onboarding</p>
                <p className="text-sm text-muted-foreground">
                  {selectedUser.onboarding_completed ? 'Completed' : 'Incomplete'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{selectedUser.location || 'Unknown'}</p>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
              <Button size="sm">Edit User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
} 