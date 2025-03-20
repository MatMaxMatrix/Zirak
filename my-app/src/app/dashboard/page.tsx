import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, CreditCard, ActivityIcon } from "lucide-react";
import { ToastDemo } from "@/components/notifications/toast-demo";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome to your dashboard</p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,350</div>
            <p className="text-xs text-muted-foreground">+180 new users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <ActivityIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,389</div>
            <p className="text-xs text-muted-foreground">+201 since last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Toast Demo Section */}
      <div className="mt-8">
        <ToastDemo />
      </div>

      <h2 className="text-xl font-semibold mt-6">Recent Activity</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Recent transactions from your store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center">
                  <div className="mr-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>User activity on your platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center">
                  <div className="mr-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <div className="ml-auto flex items-center">
                    <Skeleton className="h-4 w-[50px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
