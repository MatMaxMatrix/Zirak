"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CreditCard, 
  Star,
  Calendar,
  Clock,
  ChevronRight,
  BarChart,
  MessageSquare,
  Check,
  Key,
  X,
  User as UserIcon,
  Shield,
  ArrowRight,
  Activity
} from "lucide-react";
import { getStoredApiKey, getStoredAnthropicApiKey } from "@/utils/apiKey";
import { createClient } from "@/utils/supabase/client";
import { isAdmin } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/AuthProvider";

// Interface for subscription data
interface SubscriptionData {
  id: number;
  status: string;
  current_period_ends_at: string;
  plan?: {
    name: string;
    price_monthly: number;
  };
}

// Interface for payment data
interface PaymentData {
  id: number;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_date: string;
  invoice_url: string;
}

// Interface for login history
interface LoginHistory {
  id: number;
  login_at: string;
  ip_address: string;
  device: string;
  location: string;
}

// Interface for user profile
interface UserProfile {
  id: string;
  name: string;
  email: string;
  subscription_status: string;
  login_count: number;
  last_login: string;
  location: string;
  picture: string;
}

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userIsAdmin = user ? isAdmin(user) : false;
  const fetchedRef = useRef(false);

  // Check if API keys exist
  useEffect(() => {
    const openaiKey = getStoredApiKey();
    setHasOpenAIKey(!!openaiKey);
    
    const anthropicKey = getStoredAnthropicApiKey();
    setHasAnthropicKey(!!anthropicKey);
  }, []);

  // Fetch user data from Supabase
  useEffect(() => {
    async function fetchUserData() {
      if (!user || fetchedRef.current) return;
      
      setLoading(true);
      try {
        fetchedRef.current = true;
        const supabase = createClient();
        
        // Fetch user profile
        console.log('Fetching profile data for dashboard:', user.id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // No profile found, this might be normal for new users
            console.log('User profile not found, may still be creating');
            
            // Try to create profile if not found
            try {
              const response = await fetch('/api/profile/create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: user.id,
                  email: user.email,
                  name: user.user_metadata?.name || user.user_metadata?.full_name || '',
                  picture: user.user_metadata?.picture || user.user_metadata?.avatar_url || '',
                }),
                cache: 'no-store',
              });
              
              if (response.ok) {
                const result = await response.json();
                if (result.data) {
                  setProfile(result.data);
                  console.log('Created profile for dashboard:', result.data);
                }
              }
            } catch (createError) {
              console.error('Error creating profile in dashboard:', createError);
            }
          } else {
            console.error('Error fetching profile:', JSON.stringify(profileError));
          }
        } else if (profileData) {
          console.log('Found existing profile for dashboard:', profileData);
          setProfile(profileData);
        }
        
        try {
          // Fetch subscription data - don't fail the whole function if this one fails
          const { data: subscriptionData, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select(`
              id, 
              status, 
              current_period_ends_at,
              subscription_plans:plan_id(name, price_monthly)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          if (!subscriptionError && subscriptionData) {
            // Convert from Supabase format to our interface - handle nested objects correctly
            let planName: string | undefined;
            let planPrice: number | undefined;
            
            if (subscriptionData.subscription_plans) {
              // Handle the case when it's an array
              if (Array.isArray(subscriptionData.subscription_plans) && subscriptionData.subscription_plans.length > 0) {
                planName = subscriptionData.subscription_plans[0]?.name;
                planPrice = subscriptionData.subscription_plans[0]?.price_monthly ?? 0;
              } 
              // Handle the case when it's an object
              else if (typeof subscriptionData.subscription_plans === 'object') {
                planName = (subscriptionData.subscription_plans as any).name;
                planPrice = (subscriptionData.subscription_plans as any).price_monthly ?? 0;
              }
            }
            
            const plan = planName ? { name: planName, price_monthly: planPrice ?? 0 } : undefined;
            
            setSubscription({
              id: subscriptionData.id,
              status: subscriptionData.status,
              current_period_ends_at: subscriptionData.current_period_ends_at,
              plan: plan
            });
          }
        } catch (subError) {
          console.error('Error fetching subscription data:', subError);
        }
        
        try {
          // Fetch payment history - don't fail the whole function if this one fails
          const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .order('payment_date', { ascending: false })
            .limit(5);
            
          if (!paymentError && paymentData) {
            setPayments(paymentData);
          }
        } catch (payError) {
          console.error('Error fetching payment data:', payError);
        }
        
        try {
          // Fetch login history - don't fail the whole function if this one fails
          const { data: loginData, error: loginError } = await supabase
            .from('login_history')
            .select('*')
            .eq('user_id', user.id)
            .order('login_at', { ascending: false })
            .limit(5);
            
          if (!loginError && loginData) {
            setLoginHistory(loginData);
          }
        } catch (loginError) {
          console.error('Error fetching login history:', loginError);
        }
        
      } catch (error) {
        console.error('Error fetching user data:', JSON.stringify(error));
        setError('Failed to load some user data. Please refresh or try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [user?.id]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'trialing':
        return 'bg-blue-500';
      case 'canceled':
        return 'bg-red-500';
      case 'past_due':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || 'User'}</h1>
          <p className="text-muted-foreground">Manage your account and see your usage</p>
        </div>
        {userIsAdmin && (
          <Link href="/admin-dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Account Activity</TabsTrigger>
          <TabsTrigger value="payments">Billing & Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Subscription Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscription Plan</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subscription?.plan?.name || 'Free'}</div>
                <div className="flex items-center mt-1">
                  <Badge className={getStatusColor(subscription?.status || 'free')}>
                    {subscription?.status || 'Free'}
                  </Badge>
                </div>
                {subscription?.current_period_ends_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Next billing: {formatDate(subscription.current_period_ends_at)}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Link href="/user-dashboard/billing">
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Subscription
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Login Stats Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Statistics</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile?.login_count || 0}</div>
                <p className="text-xs text-muted-foreground">Total Logins</p>
                {profile?.last_login && (
                  <div className="mt-4">
                    <p className="text-sm">Last login:</p>
                    <p className="text-sm font-medium">{formatDate(profile.last_login)}</p>
                    <p className="text-xs text-muted-foreground">{profile.location || 'Unknown location'}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Keys Card */}
            <Card className="border border-amber-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>API Key Settings</CardTitle>
                  <CardDescription>Manage your AI model API keys</CardDescription>
                </div>
                <Key className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="mb-2 md:mb-0">
                      <div className="flex items-center">
                        <div className="w-28 font-medium">OpenAI:</div>
                        {hasOpenAIKey ? (
                          <span className="flex items-center text-green-600">
                            <Check className="h-4 w-4 mr-1" />
                            Configured
                          </span>
                        ) : (
                          <span className="flex items-center text-amber-600">
                            <X className="h-4 w-4 mr-1" />
                            Not configured
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        <div className="w-28 font-medium">Anthropic:</div>
                        {hasAnthropicKey ? (
                          <span className="flex items-center text-green-600">
                            <Check className="h-4 w-4 mr-1" />
                            Configured
                          </span>
                        ) : (
                          <span className="flex items-center text-amber-600">
                            <X className="h-4 w-4 mr-1" />
                            Not configured
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href="/user-dashboard/profile/api-settings">
                      <Button variant="outline">
                        Manage API Keys
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All API keys are stored locally in your browser and are only used to communicate with AI services.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Profile Quick View */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile?.picture || user?.user_metadata?.picture || user?.user_metadata?.avatar_url || ""} />
                  <AvatarFallback>{profile?.name?.charAt(0) || user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{profile?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email || user?.email}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/user-dashboard/profile" className="flex items-center">
                  View Profile
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* AI Chat Assistant Card */}
          <Card className="mt-6 bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-indigo-500/20 border-blue-500/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center">
                <MessageSquare className="h-6 w-6 mr-2 text-blue-400" />
                AI Chat Assistant
              </CardTitle>
              <CardDescription className="text-base">
                Join the waitlist to be among the first to experience our AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="md:flex-1">
                  <p className="mb-4 text-base">
                    Our AI chat assistant will help you with:
                  </p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 mr-2">
                        <Check className="h-3 w-3 text-blue-400" />
                      </div>
                      <span>Code problems and debugging</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 mr-2">
                        <Check className="h-3 w-3 text-blue-400" />
                      </div>
                      <span>Project guidance and best practices</span>
                    </li>
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 mr-2">
                        <Check className="h-3 w-3 text-blue-400" />
                      </div>
                      <span>Technical questions and explanations</span>
                    </li>
                  </ul>
                </div>
                <div className="md:flex-1 flex justify-center mt-4 md:mt-0">
                  <Button 
                    size="lg" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 text-lg shadow-md rounded-xl"
                    onClick={() => window.location.href = "/waitlist"}
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Join Waitlist
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Login History</h2>
            <Card>
              <CardContent className="pt-6">
                {loginHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginHistory.map((login) => (
                        <TableRow key={login.id}>
                          <TableCell>
                            {new Date(login.login_at).toLocaleString()}
                          </TableCell>
                          <TableCell>{login.device || 'Unknown'}</TableCell>
                          <TableCell>{login.ip_address}</TableCell>
                          <TableCell>{login.location || 'Unknown'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No login history available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="payments">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Payment History</h2>
            <Card>
              <CardContent className="pt-6">
                {payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {formatDate(payment.payment_date)}
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: payment.currency.toUpperCase()
                            }).format(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={payment.status === 'succeeded' ? 'bg-green-500' : 'bg-yellow-500'}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.payment_method}</TableCell>
                          <TableCell className="text-right">
                            {payment.invoice_url ? (
                              <a 
                                href={payment.invoice_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment history available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 