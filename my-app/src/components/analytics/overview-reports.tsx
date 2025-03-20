// @ts-nocheck
"use client";

import { useState } from "react";
import {
  Users,
  CreditCard,
  MousePointerClick,
  Clock,
  TrendingUp,
  Activity
} from "lucide-react";
import {
  StatCard,
  ChartCard,
  LineChartComponent,
  AreaChartComponent,
  BarChartComponent,
  DonutChartComponent
} from "@/components/analytics/chart-components";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dailyData,
  weeklyData,
  monthlyData,
  trafficSourcesData
} from "@/lib/analytics-data";

export function OverviewReports() {
  const [timeRange, setTimeRange] = useState("daily");

  // Get the appropriate data based on the selected time range
  const data = timeRange === "daily"
    ? dailyData
    : timeRange === "weekly"
      ? weeklyData
      : monthlyData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Overview</h2>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily (Last 7 days)</SelectItem>
              <SelectItem value="weekly">Weekly (Last 4 weeks)</SelectItem>
              <SelectItem value="monthly">Monthly (Last 12 months)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">Export</Button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Visitors"
          value={timeRange === "daily" ? "17,550" : timeRange === "weekly" ? "103,000" : "1.2M"}
          change={{ value: 12.5, trend: "up" }}
          icon={<Users />}
          sparkData={data.slice(0, 7)}
          sparkDataKey="visits"
        />
        <StatCard
          title="Page Views"
          value={timeRange === "daily" ? "28,404" : timeRange === "weekly" ? "82,900" : "1.06M"}
          change={{ value: 8.2, trend: "up" }}
          icon={<MousePointerClick />}
          sparkData={data.slice(0, 7)}
          sparkDataKey="pageViews"
        />
        <StatCard
          title="Conversion Rate"
          value={timeRange === "daily" ? "12.5%" : timeRange === "weekly" ? "13.1%" : "14.2%"}
          change={{ value: 3.1, trend: "up" }}
          icon={<TrendingUp />}
          sparkData={data.map(item => ({name: item.name, convRate: (item.signups / item.visits) * 100}))}
          sparkDataKey="convRate"
        />
        <StatCard
          title="Avg. Session Duration"
          value={timeRange === "daily" ? "3.2m" : timeRange === "weekly" ? "3.7m" : "3.4m"}
          change={{ value: 1.8, trend: "down" }}
          icon={<Clock />}
          sparkData={data.map(item => ({name: item.name, avgTime: item.avgTime}))}
          sparkDataKey="avgTime"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Traffic Overview"
          description="Website visits and page views over time"
        >
          <LineChartComponent
            data={data}
            lines={[
              { dataKey: "visits", name: "Visitors" },
              { dataKey: "pageViews", name: "Page Views" }
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Sign-up Conversion"
          description="New account sign-ups over time"
        >
          <AreaChartComponent
            data={data}
            areas={[
              { dataKey: "signups", name: "Sign-ups", fill: "#8884d8" }
            ]}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Bounce Rate vs Avg. Session Duration"
          description="User engagement metrics"
        >
          <BarChartComponent
            data={data}
            bars={[
              { dataKey: "bounce", name: "Bounce Rate (%)" },
              { dataKey: "avgTime", name: "Avg. Time (min)" }
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Traffic Sources"
          description="Where your visitors are coming from"
        >
          <DonutChartComponent
            data={trafficSourcesData}
            dataKey="value"
            height={280}
          />
        </ChartCard>
      </div>

      {/* Recent stats */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-sm">Most active day</span>
              <span className="text-lg font-medium">Wednesday</span>
              <span className="text-sm text-muted-foreground">9,800 page views</span>
            </div>

            <div className="flex flex-col">
              <span className="text-muted-foreground text-sm">Top referrer</span>
              <span className="text-lg font-medium">Google</span>
              <span className="text-sm text-muted-foreground">32% of all traffic</span>
            </div>

            <div className="flex flex-col">
              <span className="text-muted-foreground text-sm">Top device</span>
              <span className="text-lg font-medium">Desktop</span>
              <span className="text-sm text-muted-foreground">55% of all sessions</span>
            </div>

            <div className="flex flex-col">
              <span className="text-muted-foreground text-sm">Busiest time</span>
              <span className="text-lg font-medium">2:00 PM - 5:00 PM</span>
              <span className="text-sm text-muted-foreground">30% of daily traffic</span>
            </div>

            <div className="flex flex-col">
              <span className="text-muted-foreground text-sm">Avg. pages per session</span>
              <span className="text-lg font-medium">3.4</span>
              <span className="text-sm text-green-500">↑ 12% from last period</span>
            </div>

            <div className="flex flex-col">
              <span className="text-muted-foreground text-sm">New vs returning</span>
              <span className="text-lg font-medium">65% / 35%</span>
              <span className="text-sm text-muted-foreground">+2% returning users</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
