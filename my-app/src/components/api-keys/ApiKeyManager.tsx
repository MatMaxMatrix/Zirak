'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Key, 
  Plus, 
  Trash, 
  CheckCircle, 
  XCircle,
  RefreshCw 
} from 'lucide-react';
import { format } from 'date-fns';

interface ApiKey {
  id: number;
  key_name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  full_key?: string; // Only present for newly created keys
}

export default function ApiKeyManager() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  
  // Fetch API keys
  const fetchApiKeys = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/api-keys');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch API keys');
      }
      
      const data = await response.json();
      setApiKeys(data.apiKeys || []);
    } catch (err) {
      console.error('Error fetching API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch API keys');
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new API key
  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }
    
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyName: newKeyName.trim(),
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create API key');
      }
      
      const data = await response.json();
      
      // Add new key to the list
      setApiKeys(prev => [data.apiKey, ...prev]);
      
      // Store the full key to display to the user (one time only)
      setNewApiKey(data.apiKey.full_key);
      
      setNewKeyName('');
      setExpiresInDays('');
      toast.success('API key created successfully');
    } catch (err) {
      console.error('Error creating API key:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };
  
  // Toggle API key status (active/inactive)
  const toggleApiKeyStatus = async (keyId: number, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyId,
          isActive: !currentStatus,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update API key');
      }
      
      const data = await response.json();
      
      // Update the key in the list
      setApiKeys(prev => prev.map(key => 
        key.id === keyId ? data.apiKey : key
      ));
      
      toast.success(`API key ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (err) {
      console.error('Error updating API key:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update API key');
    }
  };
  
  // Delete an API key
  const deleteApiKey = async (keyId: number) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/user/api-keys?keyId=${keyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }
      
      // Remove the key from the list
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      
      toast.success('API key deleted successfully');
    } catch (err) {
      console.error('Error deleting API key:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };
  
  // Copy API key to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Load API keys on component mount
  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);
  
  if (!user) {
    return <div>Please sign in to manage API keys</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">API Keys</h2>
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                API keys allow secure access to the API from your applications.
              </DialogDescription>
            </DialogHeader>
            
            {newApiKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <h3 className="font-medium text-amber-800">Save your API key</h3>
                  <p className="text-sm text-amber-700 mb-2">
                    This key will only be shown once. Save it in a secure location.
                  </p>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border font-mono text-sm">
                    <code className="flex-1 overflow-x-auto">{newApiKey}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => copyToClipboard(newApiKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setNewApiKey(null);
                    setShowNewKeyDialog(false);
                  }}
                >
                  I've saved my API key
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="My App Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expires">Expires</Label>
                    <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                      <SelectTrigger>
                        <SelectValue placeholder="Never" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Never</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createApiKey}>
                    Create Key
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Manage API keys for accessing the API from your applications
          </CardDescription>
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
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>You don't have any API keys yet.</p>
              <p className="text-sm">Create one to get started with the API.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.key_name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {key.key_prefix}••••••••
                      </TableCell>
                      <TableCell>
                        {key.is_active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-200 text-gray-500">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(key.created_at)}</TableCell>
                      <TableCell>
                        {key.expires_at ? formatDate(key.expires_at) : 'Never'}
                      </TableCell>
                      <TableCell>
                        {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                      </TableCell>
                      <TableCell className="flex justify-end space-x-2">
                        <Switch
                          checked={key.is_active}
                          onCheckedChange={() => toggleApiKeyStatus(key.id, key.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteApiKey(key.id)}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="text-xs text-muted-foreground">
            <p>
              API keys should be kept secure and should not be shared. If you suspect
              a key has been compromised, revoke it immediately.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 