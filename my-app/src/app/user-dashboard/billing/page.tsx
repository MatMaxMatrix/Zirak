"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/utils/supabase/client";
import { z } from "zod";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  CreditCard, 
  Calendar,
  Download,
  Check,
  ChevronRight,
  AlertCircle,
  Clock,
  Info,
  PlusCircle,
  CreditCard as CreditCardIcon,
  ShoppingCart,
  FileText
} from "lucide-react";

// Subscription plans available to purchase
const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    features: [
      "5 workflow completions per month",
      "Basic code generation",
      "Community support",
      "Basic file management",
      "Standard response time"
    ],
    nonFeatures: [
      "Priority support",
      "Advanced AI features",
      "Custom templates",
      "Team collaboration",
      "API access"
    ],
    popular: false
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "/month",
    features: [
      "Up to 500 workflow completions per month",
      "Advanced code generation",
      "Priority support",
      "Advanced file management",
      "Faster response time",
      "Custom templates",
      "API access (100k requests/month)",
      "Basic team collaboration"
    ],
    popular: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: [
      "Everything in Pro",
      "Unlimited API access",
      "24/7 priority support",
      "Advanced team collaboration",
      "Custom AI model training",
      "SSO & advanced security",
      "Dedicated account manager",
      "Custom integrations"
    ],
    popular: false
  }
];

export default function BillingPage() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's subscription data
  useEffect(() => {
    async function getSubscription() {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        const { data, error } = await supabase
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
          
        if (!error && data) {
          // Convert from Supabase format to our interface
          let planName: string | undefined;
          let planPrice: number | undefined;
          
          if (data.subscription_plans) {
            // Handle when it's an array
            if (Array.isArray(data.subscription_plans) && data.subscription_plans.length > 0) {
              planName = data.subscription_plans[0]?.name;
              planPrice = data.subscription_plans[0]?.price_monthly ?? 0;
            } 
            // Handle when it's an object
            else if (typeof data.subscription_plans === 'object') {
              planName = (data.subscription_plans as any).name;
              planPrice = (data.subscription_plans as any).price_monthly ?? 0;
            }
          }
          
          const plan = planName ? { name: planName, price_monthly: planPrice ?? 0 } : undefined;
          
          setSubscription({
            id: data.id,
            status: data.status,
            current_period_ends_at: data.current_period_ends_at,
            plan: plan
          });
        }
        
        // Fetch payment history
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('payment_date', { ascending: false });
          
        if (!paymentError && paymentData) {
          setPayments(paymentData);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setError("Failed to fetch your subscription details");
      } finally {
        setIsLoading(false);
      }
    }
    
    getSubscription();
  }, [user]);

  // Handle subscription initiation
  const handleSubscribe = () => {
    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      toast.success(`You've successfully subscribed to the ${plans.find(p => p.id === selectedPlan)?.name} plan`);
    }, 1500);
  };

  // Handle adding a payment method
  const handleAddPaymentMethod = () => {
    toast.info("Payment method feature coming soon");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and payment methods
        </p>
      </div>

      <Tabs defaultValue="subscription">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="billing-history">Billing History</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* No Active Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                You don't have an active subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center p-4 rounded-lg bg-muted">
                <Info className="h-8 w-8 text-muted-foreground mr-4" />
                <div>
                  <h3 className="font-medium">No Active Subscription</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a plan below to get started with our services.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Choose Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Choose a Plan</CardTitle>
              <CardDescription>
                Select a subscription plan that works for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className={`relative rounded-lg border ${plan.id === selectedPlan ? 'border-primary' : 'border-border'} ${plan.popular ? 'border-primary' : 'border-border'} p-4 cursor-pointer`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
                        Popular
                      </span>
                    )}
                    <div className="absolute right-4 top-4 h-4 w-4 rounded-full border border-primary flex items-center justify-center">
                      {selectedPlan === plan.id && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <Label 
                      className="font-medium text-lg block mb-1 cursor-pointer"
                    >
                      {plan.name}
                    </Label>
                    <p className="text-2xl font-bold">{plan.price}</p>
                    <p className="text-sm text-muted-foreground mb-4">per month</p>
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSubscribe} 
                disabled={isSubscribing}
                className="ml-auto"
              >
                {isSubscribing ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Subscribe Now
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Add a payment method to manage your subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-center">
                <CreditCardIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Payment Methods</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You haven't added any payment methods yet.
                </p>
                <Button onClick={handleAddPaymentMethod}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="billing-history">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View your invoice history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Billing History</h3>
                <p className="text-sm text-muted-foreground">
                  Your billing history will appear here after your first subscription.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 