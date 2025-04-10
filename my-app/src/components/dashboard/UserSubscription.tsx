'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getSupabase } from '@/utils/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type SubscriptionPlan = {
  id: number;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
};

type Subscription = {
  id: number;
  status: string;
  started_at: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  plan: SubscriptionPlan;
};

/**
 * This component requires the following RLS policies in Supabase:
 * 
 * -- Allow users to view their own subscriptions
 * CREATE POLICY "Users can view their own subscriptions" 
 * ON subscriptions FOR SELECT 
 * USING (user_id = auth.user_id());
 * 
 * -- Allow users to view subscription plans (all users can view plans)
 * CREATE POLICY "Anyone can view subscription plans" 
 * ON subscription_plans FOR SELECT 
 * USING (true);
 * 
 * -- Allow users to view their own payment history
 * CREATE POLICY "Users can view their own payments" 
 * ON payments FOR SELECT 
 * USING (user_id = auth.user_id());
 */

export default function UserSubscription() {
  const { user, isLoading: isUserLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsLoading(false);
      setError('Please log in to view subscription details');
      return;
    }

    fetchSubscriptionData();
  }, [user, isUserLoading]);

  const fetchSubscriptionData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const supabase = createClient();
      
      // First get all available subscription plans
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });
      
      if (plansError) {
        throw plansError;
      }
      
      // Format plan features from JSONB to array
      const formattedPlans = plans.map(plan => {
        let features: string[] = [];
        
        if (plan.features) {
          if (typeof plan.features === 'string') {
            try {
              features = JSON.parse(plan.features);
            } catch (e) {
              console.error('Error parsing features:', e);
            }
          } else if (Array.isArray(plan.features)) {
            features = plan.features;
          } else if (typeof plan.features === 'object') {
            // Handle JSONB object
            features = Object.values(plan.features).map(f => String(f));
          }
        }
        
        return {
          ...plan,
          features
        };
      });
      
      setAvailablePlans(formattedPlans);
      
      // Get user's active subscription with join to subscription_plans
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans:plan_id (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        // Error other than "not found"
        throw subscriptionError;
      }
      
      if (subscriptionData) {
        // Format the subscription data
        const planData = Array.isArray(subscriptionData.subscription_plans) 
          ? subscriptionData.subscription_plans[0] 
          : subscriptionData.subscription_plans;
        
        let planFeatures: string[] = [];
        
        if (planData) {
          if (typeof planData.features === 'string') {
            try {
              planFeatures = JSON.parse(planData.features);
            } catch (e) {
              console.error('Error parsing features:', e);
              planFeatures = [];
            }
          } else if (Array.isArray(planData.features)) {
            planFeatures = planData.features;
          } else if (typeof planData.features === 'object') {
            // Handle JSONB object
            planFeatures = Object.values(planData.features).map(f => String(f));
          }
        }
        
        const formattedSubscription = {
          ...subscriptionData,
          plan: {
            ...(planData as any),
            features: planFeatures
          }
        };
        
        delete formattedSubscription.subscription_plans;
        
        setSubscription(formattedSubscription);
        
        // Get latest payment for this subscription
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('subscription_id', subscriptionData.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (paymentData && paymentData.length > 0) {
          setPaymentInfo(paymentData[0]);
        }
      } else {
        // If no active subscription, use the free plan
        const freePlan = formattedPlans.find(plan => plan.name.toLowerCase() === 'free');
        if (freePlan) {
          setSubscription({
            id: 0,
            status: 'free',
            started_at: new Date().toISOString(),
            trial_ends_at: null,
            current_period_ends_at: null,
            plan: freePlan
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching subscription data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = (planId: number) => {
    // Redirect to checkout page or show modal
    console.log(`Upgrading to plan ${planId}`);
    // Here you would redirect to a checkout page
    // window.location.href = `/checkout?plan=${planId}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" /> Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" /> Past Due</Badge>;
      case 'free':
        return <Badge className="bg-gray-500">Free</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isUserLoading || isLoading) {
    return <div className="p-4 text-center">Loading subscription details...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Subscription</h2>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Current Plan: {subscription.plan.name}</CardTitle>
            <CardDescription className="flex items-center">
              Status: {getStatusBadge(subscription.status)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium">Plan Features:</p>
                <ul className="mt-2 list-disc pl-5">
                  {subscription.plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="font-medium">
                    {new Date(subscription.started_at).toLocaleDateString()}
                  </p>
                </div>
                {subscription.current_period_ends_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Renews on</p>
                    <p className="font-medium">
                      {new Date(subscription.current_period_ends_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {subscription.trial_ends_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Trial ends on</p>
                    <p className="font-medium">
                      {new Date(subscription.trial_ends_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {subscription.status === 'free' ? (
              <Button className="w-full">Upgrade Now</Button>
            ) : (
              <div className="w-full space-y-2">
                <Button className="w-full" variant="outline">Manage Billing</Button>
                <Button className="w-full" variant="ghost">Cancel Subscription</Button>
              </div>
            )}
          </CardFooter>
        </Card>
      )}

      {availablePlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-medium">Available Plans</h3>
          <div className="grid gap-6 md:grid-cols-3">
            {availablePlans.map(plan => (
              <Card key={plan.id} className={subscription?.plan.id === plan.id ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ${plan.price_monthly}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {subscription?.plan.id === plan.id ? (
                    <Button className="w-full" disabled>Current Plan</Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => handleUpgrade(plan.id)}
                      variant={plan.name.toLowerCase() === 'free' ? 'outline' : 'default'}
                    >
                      {plan.name.toLowerCase() === 'free' ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 