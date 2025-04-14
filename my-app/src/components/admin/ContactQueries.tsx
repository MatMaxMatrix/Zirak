'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MessageCircle, 
  Check, 
  Clock, 
  AlertCircle, 
  Filter, 
  MessageSquare,
  UserCircle,
  Calendar 
} from 'lucide-react';

// Define the contact query interface
interface ContactQuery {
  id: number;
  user_id: string | null;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}

export default function ContactQueries() {
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<ContactQuery | null>(null);
  const [responseText, setResponseText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  // Function to fetch contact queries
  const fetchQueries = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get contact queries based on filters
      let query = supabase
        .from('contact_queries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (topicFilter !== 'all') {
        query = query.eq('topic', topicFilter);
      }
      
      const { data: queriesData, error: queriesError } = await query;
      
      if (queriesError) {
        throw queriesError;
      }
      
      setQueries(queriesData || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load contact queries');
      console.error('Error fetching queries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch of queries
  useEffect(() => {
    fetchQueries();
  }, [statusFilter, topicFilter]);

  // Function to handle opening the response dialog
  const handleOpenResponse = (query: ContactQuery) => {
    setSelectedQuery(query);
    setResponseText(query.admin_response || '');
    setDialogOpen(true);
  };

  // Function to handle submitting a response
  const handleSubmitResponse = async () => {
    if (!selectedQuery) return;
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('contact_queries')
        .update({
          admin_response: responseText,
          status: 'responded',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedQuery.id);
      
      if (error) throw error;
      
      toast.success('Response saved successfully');
      setDialogOpen(false);
      
      // Refresh queries list
      fetchQueries();
    } catch (err: any) {
      toast.error('Failed to save response');
      console.error('Error saving response:', err);
    }
  };

  // Function to handle marking a query as resolved
  const handleMarkResolved = async (id: number) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('contact_queries')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Query marked as resolved');
      
      // Refresh queries list
      fetchQueries();
    } catch (err: any) {
      toast.error('Failed to update query status');
      console.error('Error marking as resolved:', err);
    }
  };

  // Get unique topics for filter - filter out empty topics
  const uniqueTopics = Array.from(
    new Set(queries.map(q => q.topic))
  ).filter(topic => topic && topic.trim() !== '');

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500">New</Badge>;
      case 'responded':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Responded</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Contact Queries
        </CardTitle>
        <CardDescription>
          View and manage user contact queries and support requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Topics</SelectItem>
                  {uniqueTopics.map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <Clock className="animate-spin h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p>Loading contact queries...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        ) : queries.length === 0 ? (
          <div className="text-center py-10 border rounded-md">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Contact Queries</h3>
            <p className="text-muted-foreground">
              No contact queries found with the current filters.
            </p>
          </div>
        ) : (
          <Table>
            <TableCaption>List of all contact queries from users</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell>{renderStatusBadge(query.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      {query.name || 'Anonymous'}
                    </div>
                  </TableCell>
                  <TableCell>{query.email || 'N/A'}</TableCell>
                  <TableCell className="font-medium">{query.topic || 'General Inquiry'}</TableCell>
                  <TableCell>
                    <span className="line-clamp-1">{query.message}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{new Date(query.created_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleOpenResponse(query)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {query.admin_response ? 'Edit Response' : 'Respond'}
                      </Button>
                      {query.status !== 'resolved' && query.admin_response && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 border-green-600"
                          onClick={() => handleMarkResolved(query.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Response Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedQuery?.admin_response ? 'Edit Response' : 'Respond to Query'}
              </DialogTitle>
              <DialogDescription>
                From: {selectedQuery?.name} ({selectedQuery?.email})<br />
                Topic: {selectedQuery?.topic}<br />
                Sent: {selectedQuery ? new Date(selectedQuery.created_at).toLocaleString() : ''}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <h4 className="text-sm font-medium mb-2">User Message:</h4>
              <div className="p-3 bg-muted rounded-md text-sm">
                {selectedQuery?.message}
              </div>
            </div>
            
            <div className="py-4">
              <h4 className="text-sm font-medium mb-2">Your Response:</h4>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your response here..."
                className="min-h-[150px]"
              />
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmitResponse}>
                Save Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 