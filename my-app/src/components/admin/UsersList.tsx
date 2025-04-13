'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Edit, UserPlus, Eye, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  picture: string;
  created_at: string;
  last_login: string;
  login_count: number;
  subscription_status: string;
  is_email_verified: boolean;
  onboarding_completed: boolean;
  location: string;
}

export default function UsersList() {
  const { user: adminUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      if (!adminUser) return;
      
      try {
        setIsLoading(true);
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setUsers(data || []);
      } catch (error: any) {
        // Log the full error object for better debugging
        console.error('Full error object fetching users:', JSON.stringify(error, null, 2));
        setError(error?.message || `Failed to load users. Code: ${error?.code || 'N/A'}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUsers();
  }, [adminUser]);

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query)
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
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500 text-white">Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500 text-white">Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-red-500 text-white">Canceled</Badge>;
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
    setIsViewDialogOpen(true);
  };

  // Open delete confirmation dialog
  const confirmDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete || !adminUser) return;
    
    // Prevent admin from deleting themselves
    if (userToDelete.id === adminUser.id) {
      toast.error("You cannot delete your own account.");
      return;
    }

    setIsDeleting(true);
    try {
      // Call the API endpoint to delete the user
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      // Remove user from the local state
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
      toast.success(`User ${userToDelete.email} deleted successfully.`);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) { // Explicitly type error as any
      console.error('Error deleting user:', error);
      toast.error(`Error deleting user: ${error.message}`);
    } finally {
      setIsDeleting(false);
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
                          <AvatarImage src={user.picture || ''} />
                          <AvatarFallback>{getAvatarFallback(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name || 'Unnamed User'}</div>
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
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => viewUserDetails(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => confirmDeleteUser(user)}
                          disabled={user.id === adminUser?.id} // Disable delete for self
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* View User Details Dialog */}
      {selectedUser && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>View detailed information about the user.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={selectedUser.picture || ''} />
                <AvatarFallback className="text-2xl">{getAvatarFallback(selectedUser.name)}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold">{selectedUser.name || 'Unnamed User'}</h3>
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
                <p className="text-sm font-medium">Joined</p>
                <p className="text-sm text-muted-foreground">{formatDate(selectedUser.created_at)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Login</p>
                <p className="text-sm text-muted-foreground">{formatDate(selectedUser.last_login)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Logins</p>
                <p className="text-sm text-muted-foreground">{selectedUser.login_count || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email Verified</p>
                <p className="text-sm text-muted-foreground">{selectedUser.is_email_verified ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete User Confirmation Dialog */}
      {userToDelete && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete the user 
                <span className="font-medium"> {userToDelete.email}</span>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
} 