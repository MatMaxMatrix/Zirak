'use client';

import { useState, useEffect } from 'react';
// Remove Auth0 import
// import { useUser } from '@auth0/nextjs-auth0/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Adjust Supabase import if getSupabase is replaced
// import { getSupabase } from '@/utils/supabase'; 
import { createClient } from '@/utils/supabase/client'; // Use standard client
import { useAuth } from '@/components/AuthProvider'; // Import useAuth
import { Users, CreditCard, Activity, Clock } from 'lucide-react';

interface StatsData {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  loginActivity: number;
  signupsToday: number;
  popularPlans: { name: string; count: number }[];
}

export default function AdminStats() {
  // Use our auth context
  const { user } = useAuth(); 
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    loginActivity: 0,
    signupsToday: 0,
    popularPlans: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      // Check if user exists and is admin
      if (!user || user.role !== 'admin') { 
        setError("Unauthorized to fetch admin stats.");
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        // Use the standard Supabase client. 
        // Assumes RLS policies using is_admin() grant necessary access.
        const supabase = createClient(); 
        
        // Get total users
        const { count: totalUsers, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
          
        if (usersError) {
          console.error('Error fetching total users:', JSON.stringify(usersError, null, 2));
          throw usersError;
        }
        
        // Get active subscriptions
        const { count: activeSubscriptions, error: subsError } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
          
        if (subsError) {
          console.error('Error fetching subscriptions:', JSON.stringify(subsError, null, 2));
          throw subsError;
        }

        // Get total revenue
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'succeeded');
          
        if (paymentsError) {
          console.error('Error fetching payments:', JSON.stringify(paymentsError, null, 2));
          throw paymentsError;
        }

        // Get login activity for the past 7 days
        const past7Days = new Date();
        past7Days.setDate(past7Days.getDate() - 7);
        
        const { count: loginActivity, error: loginError } = await supabase
          .from('login_history')
          .select('*', { count: 'exact', head: true })
          .gte('login_at', past7Days.toISOString());
          
        if (loginError) {
          console.error('Error fetching login activity:', JSON.stringify(loginError, null, 2));
          throw loginError;
        }

        // Get signups today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: signupsToday, error: signupsError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());
          
        if (signupsError) {
          console.error('Error fetching signups:', JSON.stringify(signupsError, null, 2));
          throw signupsError;
        }

        // Get popular subscription plans
        const { data: subscriptionPlans, error: plansError } = await supabase
          .from('subscriptions')
          .select(`
            plan_id,
            subscription_plans:plan_id(name)
          `)
          .eq('status', 'active');
          
        if (plansError) {
          console.error('Error fetching subscription plans:', JSON.stringify(plansError, null, 2));
          throw plansError;
        }

        // Calculate total revenue
        const totalRevenue = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
        
        // Calculate popular plans
        const planCounts: Record<string, { name: string, count: number }> = {};
        
        if (subscriptionPlans) {
          subscriptionPlans.forEach(sub => {
            let planName = 'Unknown Plan'; // Default plan name
            // Check if subscription_plans is an object and has a name property
            if (sub.subscription_plans && typeof sub.subscription_plans === 'object' && 'name' in sub.subscription_plans) {
              planName = (sub.subscription_plans as { name: string }).name;
            } else {
              console.warn("Subscription plan name missing or invalid format for sub:", sub.plan_id);
            }
            
            if (!planCounts[planName]) {
              planCounts[planName] = { name: planName, count: 0 };
            }
            planCounts[planName].count++;
          });
        }
        
        const popularPlans = Object.values(planCounts).sort((a, b) => b.count - a.count).slice(0, 3);
        
        setStats({
          totalUsers: totalUsers || 0,
          activeSubscriptions: activeSubscriptions || 0,
          totalRevenue,
          loginActivity: loginActivity || 0,
          signupsToday: signupsToday || 0,
          popularPlans
        });
        
      } catch (error: any) {
        console.error('Error fetching admin stats:', JSON.stringify(error, null, 2));
        setError(`Failed to load statistics: ${error?.message || error?.code || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchStats();
  }, [user]); // Depend on the user object from useAuth

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.signupsToday} new today
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}% of users
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.activeSubscriptions} subscriptions
            </p>
          </CardContent>
        </Card>

        {/* Login Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Login Activity (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loginActivity}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.loginActivity / stats.totalUsers) * 100).toFixed(1)}% user engagement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Popular Plans */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Popular Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.popularPlans.length > 0 ? (
              <div className="space-y-4">
                {stats.popularPlans.map((plan, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full bg-primary`}></div>
                      <span className="text-sm font-medium">{plan.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{plan.count} users</span>
                      <span className="text-xs text-muted-foreground">
                        ({((plan.count / stats.totalUsers) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No subscription data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">New signups today</span>
                </div>
                <span className="text-sm font-medium">{stats.signupsToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Logins today</span>
                </div>
                <span className="text-sm font-medium">{Math.floor(stats.loginActivity / 7)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active users rate</span>
                </div>
                <span className="text-sm font-medium">
                  {((stats.loginActivity / stats.totalUsers) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 