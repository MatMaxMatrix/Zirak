"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  X
} from "lucide-react";
import { getStoredApiKey, getStoredAnthropicApiKey } from "@/utils/apiKey";
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function UserDashboardPage() {
  const { user } = useUser();
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);

  // Check if API keys exist
  useEffect(() => {
    const openaiKey = getStoredApiKey();
    setHasOpenAIKey(!!openaiKey);
    
    const anthropicKey = getStoredAnthropicApiKey();
    setHasAnthropicKey(!!anthropicKey);
  }, []);

  // Mock subscription data
  const subscription = {
    plan: "Pro",
    status: "Active",
    nextBilling: "May 15, 2025",
    monthlyUsage: 78,
  };

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
            <p className="text-muted-foreground">Manage your account and see your usage</p>
          </div>
        </div>

        {/* User Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Plan</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscription.plan}</div>
              <p className="text-xs text-muted-foreground">Status: {subscription.status}</p>
            </CardContent>
            <CardFooter>
              <Link href="/user-dashboard/billing">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Subscription
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usage This Month</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscription.monthlyUsage}%</div>
              <div className="mt-4 h-2 w-full rounded-full bg-secondary">
                <div 
                  className="h-2 rounded-full bg-primary" 
                  style={{ width: `${subscription.monthlyUsage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {100 - subscription.monthlyUsage}% remaining for this billing cycle
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Billing Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscription.nextBilling}</div>
              <p className="text-xs text-muted-foreground">Your card will be charged automatically</p>
            </CardContent>
            <CardFooter>
              <Link href="/user-dashboard/billing#payment-methods">
                <Button variant="outline" size="sm" className="w-full">
                  Update Payment Method
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* API Key Settings Card */}
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

        {/* User Profile Quick View */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.picture || ""} />
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
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
        <Card className="bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-indigo-500/20 border-blue-500/30 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <MessageSquare className="h-6 w-6 mr-2 text-blue-400" />
              AI Chat Assistant
            </CardTitle>
            <CardDescription className="text-base">
              Get help with your projects using our AI assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="md:flex-1">
                <p className="mb-4 text-base">
                  Our AI chat assistant can help you with:
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
                  onClick={() => window.location.href = "/chat"}
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Start Chatting Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
} 