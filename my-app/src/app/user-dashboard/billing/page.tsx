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
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
  FileText,
  Construction,
  Rocket,
  BellRing,
  ArrowRight,
  Mail
} from "lucide-react";

// Features that will be available in our pricing plans
const features = [
  {
    icon: <Rocket className="h-8 w-8 text-blue-500" />,
    title: "Free Launch Access",
    description: "Early subscribers will be the first to access our platform for free"
  },
  {
    icon: <Calendar className="h-8 w-8 text-blue-500" />,
    title: "Tiered Pricing",
    description: "Custom plans for developers, teams, and enterprises"
  },
  {
    icon: <BellRing className="h-8 w-8 text-blue-500" />,
    title: "Pricing Notifications",
    description: "Get notified when our pricing plans are available"
  }
];

export default function BillingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

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

  // Handle waitlist redirection
  const handleJoinWaitlist = () => {
    setIsSubscribing(true);
    // Redirect to waitlist page after a short delay
    setTimeout(() => {
      setIsSubscribing(false);
      router.push('/waitlist');
    }, 1000);
  };

  // Handle adding a payment method
  const handleAddPaymentMethod = () => {
    toast.info("Payment method feature coming soon");
  };

  // Handle contact us
  const handleContactUs = () => {
    router.push('/contact');
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
          <Card className="dark-card">
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Beta access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center p-4 rounded-lg dark-card border">
                <Info className="h-8 w-8 text-yellow-400 mr-4" />
                <div>
                  <h3 className="font-medium">Free Beta Access</h3>
                  <p className="text-sm text-muted-foreground">
                    You're among our early users with free access to beta features.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Coming Soon Card */}
          <Card className="dark-card border-blue-500/30">
            <CardHeader className="text-center">
              <div className="inline-block mb-4 p-2 bg-blue-500/20 rounded-xl mx-auto">
                <Construction className="h-8 w-8 text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Pricing Plans Coming Soon</CardTitle>
              <CardDescription className="text-lg">
                We're currently developing our pricing structure to provide the best value for developers and teams.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="dark-card p-6 rounded-xl border hover:border-blue-500/50 transition-all duration-300"
                  >
                    <div className="mb-4">{feature.icon}</div>
                    <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleJoinWaitlist} 
                disabled={isSubscribing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubscribing ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <BellRing className="mr-2 h-4 w-4" />
                    Join Waitlist
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleContactUs}
              >
                <Mail className="mr-2 h-4 w-4" />
                Contact Us
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-6">
          <Card className="dark-card">
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Add or remove payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border dark-card">
                  <div className="flex items-center">
                    <div className="p-2 mr-4 rounded-full dark-card">
                      <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No payment methods</p>
                      <p className="text-sm text-muted-foreground">
                        Add a payment method to manage your subscription
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleAddPaymentMethod}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="billing-history" className="space-y-6">
          <Card className="dark-card">
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View your past transactions and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any, i) => (
                      <TableRow key={i}>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={payment.status === 'succeeded' ? 'default' : 'outline'}
                            className={payment.status === 'succeeded' ? 'bg-green-500/10 text-green-500' : ''}
                          >
                            {payment.status === 'succeeded' ? 'Paid' : payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">No billing history yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Once you subscribe to a paid plan, your billing history will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 