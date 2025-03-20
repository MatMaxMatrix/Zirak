"use client";

import { useState } from "react";
import {
  Globe,
  Smartphone,
  Monitor,
  Chrome,
  Map,
  Share2
} from "lucide-react";
import {
  StatCard,
  ChartCard,
  BarChartComponent,
  LineChartComponent,
  PieChartComponent,
  DonutChartComponent
} from "@/components/analytics/chart-components";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  deviceData,
  browserData,
  locationData,
  trafficSourcesData,
  monthlyData
} from "@/lib/analytics-data";

export function TrafficReports() {
  const [timeRange, setTimeRange] = useState("monthly");

  // Top referrers data
  const topReferrers = [
    { source: "google.com", visits: 35420, change: 12.3 },
    { source: "facebook.com", visits: 12850, change: 5.7 },
    { source: "twitter.com", visits: 8640, change: -2.1 },
    { source: "linkedin.com", visits: 7230, change: 8.4 },
    { source: "instagram.com", visits: 6580, change: 15.2 },
    { source: "bing.com", visits: 4320, change: -4.6 },
    { source: "youtube.com", visits: 3870, change: 7.9 },
    { source: "reddit.com", visits: 2540, change: 22.4 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Traffic Analysis</h2>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Traffic Sources"
          value="12"
          change={{ value: 2, trend: "up" }}
          icon={<Share2 />}
        />
        <StatCard
          title="Top Traffic Source"
          value="Google"
          change={{ value: 5.3, trend: "up" }}
          icon={<Globe />}
        />
        <StatCard
          title="Top Device"
          value="Desktop (55%)"
          change={{ value: 1.2, trend: "down" }}
          icon={<Monitor />}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Traffic Sources"
          description="Distribution of traffic by source"
        >
          <PieChartComponent
            data={trafficSourcesData}
            dataKey="value"
          />
        </ChartCard>

        <ChartCard
          title="Device Distribution"
          description="Traffic by device type"
        >
          <BarChartComponent
            data={deviceData}
            bars={[{ dataKey: "value", name: "Percentage" }]}
            layout="vertical"
          />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Browser Usage"
          description="Traffic by browser type"
        >
          <DonutChartComponent
            data={browserData}
            dataKey="value"
          />
        </ChartCard>

        <ChartCard
          title="Geographic Distribution"
          description="Traffic by location"
        >
          <BarChartComponent
            data={locationData.sort((a, b) => b.value - a.value)}
            bars={[{ dataKey: "value", name: "Percentage" }]}
            layout="horizontal"
          />
        </ChartCard>
      </div>

      {/* Traffic over time */}
      <ChartCard
        title="Traffic Trends"
        description="Traffic by source over time"
      >
        <div className="h-[350px]">
          <LineChartComponent
            data={monthlyData.map(item => ({
              name: item.name,
              Organic: Math.round(item.visits * 0.4),
              Direct: Math.round(item.visits * 0.25),
              Social: Math.round(item.visits * 0.15),
              Referral: Math.round(item.visits * 0.1),
              Email: Math.round(item.visits * 0.05),
              Paid: Math.round(item.visits * 0.05),
            }))}
            lines={[
              { dataKey: "Organic", name: "Organic Search" },
              { dataKey: "Direct", name: "Direct" },
              { dataKey: "Social", name: "Social Media" },
              { dataKey: "Referral", name: "Referral" },
              { dataKey: "Email", name: "Email" },
              { dataKey: "Paid", name: "Paid Search" },
            ]}
            height={350}
          />
        </div>
      </ChartCard>

      {/* Top Referrers Table */}
      <ChartCard
        title="Top Referrers"
        description="Sites sending the most traffic"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Visitors</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topReferrers.map((item) => (
                <TableRow key={item.source}>
                  <TableCell className="font-medium">{item.source}</TableCell>
                  <TableCell>{item.visits.toLocaleString()}</TableCell>
                  <TableCell className={`text-right ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ChartCard>
    </div>
  );
}
