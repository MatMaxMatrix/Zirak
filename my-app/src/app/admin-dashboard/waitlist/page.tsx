'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Search, RefreshCw, Check, Clock, X, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { isAdmin } from '@/lib/auth';
import { useRouter } from 'next/navigation';

// Types for waitlist entries
interface WaitlistEntry {
  id: string;
  email: string;
  status: 'pending' | 'notified' | 'registered';
  source: string;
  created_at: string;
  updated_at: string;
  ip_address?: string;
  referral_code?: string;
  notes?: string;
}

export default function WaitlistAdmin() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [waitlistData, setWaitlistData] = useState<WaitlistEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [count, setCount] = useState({ all: 0, pending: 0, notified: 0, registered: 0 });
  
  // Check if user is admin, if not redirect
  useEffect(() => {
    if (!isLoading && user && !isAdmin(user)) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/');
    }
  }, [user, isLoading, router]);
  
  // Fetch waitlist data
  const fetchWaitlistData = async () => {
    setIsLoadingData(true);
    
    try {
      const supabase = createClient();
      
      // Get counts for different statuses
      const { data: countData, error: countError } = await supabase
        .from('waitlist_emails')
        .select('status', { count: 'exact', head: false })
        .eq('status', 'pending');
        
      if (countError) {
        throw countError;
      }
      
      const { data: pendingCount } = await supabase
        .from('waitlist_emails')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
      const { data: notifiedCount } = await supabase
        .from('waitlist_emails')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'notified');
        
      const { data: registeredCount } = await supabase
        .from('waitlist_emails')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'registered');
      
      setCount({
        all: (pendingCount?.length || 0) + (notifiedCount?.length || 0) + (registeredCount?.length || 0),
        pending: pendingCount?.length || 0,
        notified: notifiedCount?.length || 0,
        registered: registeredCount?.length || 0
      });
      
      // Fetch waitlist entries with filters if needed
      let query = supabase
        .from('waitlist_emails')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply tab filter
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }
      
      // Apply search filter
      if (searchTerm) {
        query = query.ilike('email', `%${searchTerm}%`);
      }
      
      // Limit to 100 entries for performance
      query = query.limit(100);
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      setWaitlistData(data || []);
    } catch (error) {
      console.error('Error fetching waitlist data:', error);
      toast.error('Failed to load waitlist data');
    } finally {
      setIsLoadingData(false);
    }
  };
  
  // Update email status
  const updateStatus = async (id: string, newStatus: 'pending' | 'notified' | 'registered') => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('waitlist_emails')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setWaitlistData(prev => 
        prev.map(item => 
          item.id === id ? { ...item, status: newStatus } : item
        )
      );
      
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };
  
  // Export waitlist as CSV
  const exportWaitlist = () => {
    try {
      // Create CSV content
      const headers = ['Email', 'Status', 'Source', 'Created At', 'IP Address'];
      const csvContent = [
        headers.join(','),
        ...waitlistData.map(entry => [
          entry.email,
          entry.status,
          entry.source || 'unknown',
          entry.created_at,
          entry.ip_address || 'unknown'
        ].join(','))
      ].join('\n');
      
      // Create blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `waitlist-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Waitlist exported successfully');
    } catch (error) {
      console.error('Error exporting waitlist:', error);
      toast.error('Failed to export waitlist');
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'notified':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30"><Check className="h-3 w-3 mr-1" /> Notified</Badge>;
      case 'registered':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><Check className="h-3 w-3 mr-1" /> Registered</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/30"><AlertTriangle className="h-3 w-3 mr-1" /> Unknown</Badge>;
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    if (user && isAdmin(user)) {
      fetchWaitlistData();
    }
  }, [user, activeTab, searchTerm]);
  
  // If still loading auth or user is not admin, show loading
  if (isLoading || !user || !isAdmin(user)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Waitlist Management</CardTitle>
          <CardDescription>
            View and manage emails in the waitlist for early access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center w-full sm:w-auto">
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchWaitlistData}
                disabled={isLoadingData}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportWaitlist}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({count.all})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({count.pending})
              </TabsTrigger>
              <TabsTrigger value="notified">
                Notified ({count.notified})
              </TabsTrigger>
              <TabsTrigger value="registered">
                Registered ({count.registered})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waitlistData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {isLoadingData ? (
                              <div className="flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                Loading waitlist data...
                              </div>
                            ) : (
                              'No waitlist entries found'
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        waitlistData.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.email}</TableCell>
                            <TableCell>{getStatusBadge(entry.status)}</TableCell>
                            <TableCell>{entry.source || 'unknown'}</TableCell>
                            <TableCell>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {entry.status !== 'notified' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => updateStatus(entry.id, 'notified')}
                                  >
                                    Mark Notified
                                  </Button>
                                )}
                                {entry.status !== 'registered' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => updateStatus(entry.id, 'registered')}
                                  >
                                    Mark Registered
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 