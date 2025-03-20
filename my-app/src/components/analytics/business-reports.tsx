"use client";

import { useState } from "react";
import {
  DollarSign,
  CreditCard,
  ShoppingCart,
  RefreshCw,
  BarChart4,
  Users,
  TrendingUp,
  PieChart
} from "lucide-react";
import {
  StatCard,
  ChartCard,
  BarChartComponent,
  LineChartComponent,
  AreaChartComponent,
  PieChartComponent
} from "@/components/analytics/chart-components";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  monthlyData,
  acquisitionCostData,
  satisfactionData
} from "@/lib/analytics-data";

export function BusinessReports() {
  const [timeRange, setTimeRange] = useState("monthly");

  // Financial metrics with safe access to potentially undefined values
  const revenueData = monthlyData.map(item => {
    // Find cost data for this month
    const costData = acquisitionCostData.find(c => c.name === item.name);
    const costValue = costData?.cost || 20; // Default to 20 if not found

    return {
      name: item.name,
      revenue: Math.round(item.signups * 28.5), // Average revenue per signup
      costs: Math.round(item.signups * costValue),
      profit: Math.round(item.signups * (28.5 - costValue))
    };
  });

  // Product revenue breakdown
  const productRevenueData = [
    { name: "Product A", value: 45 },
    { name: "Product B", value: 25 },
    { name: "Product C", value: 15 },
    { name: "Product D", value: 10 },
    { name: "Other", value: 5 },
  ];

  // Top products data
  const topProducts = [
    { id: "PRD-001", name: "Premium Plan", sales: 1250, revenue: 24950, growth: 15.2 },
    { id: "PRD-002", name: "Basic Plan", sales: 3450, revenue: 20700, growth: 8.7 },
    { id: "PRD-003", name: "Enterprise Plan", sales: 420, revenue: 18900, growth: 22.3 },
    { id: "PRD-004", name: "Add-on: API Access", sales: 980, revenue: 9800, growth: 5.4 },
    { id: "PRD-005", name: "Add-on: Storage", sales: 1650, revenue: 8250, growth: 12.8 },
  ];

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = revenueData.reduce((sum, item) => sum + item.profit, 0);
  const totalSignups = monthlyData.reduce((sum, item) => sum + item.signups, 0);
  const averageOrderValue = totalSignups > 0 ? totalRevenue / totalSignups : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Business Performance</h2>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="monthly">Monthly (Last 12 months)</SelectItem>
              <SelectItem value="yearly">Yearly (Last 5 years)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">Export</Button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`$${(totalRevenue).toLocaleString()}`}
          change={{ value: 16.8, trend: "up" }}
          icon={<DollarSign />}
          sparkData={revenueData.slice(-7)}
          sparkDataKey="revenue"
        />
        <StatCard
          title="Total Profit"
          value={`$${(totalProfit).toLocaleString()}`}
          change={{ value: 21.3, trend: "up" }}
          icon={<BarChart4 />}
          sparkData={revenueData.slice(-7)}
          sparkDataKey="profit"
        />
        <StatCard
          title="Average Order Value"
          value={`$${averageOrderValue.toFixed(2)}`}
          change={{ value: 3.7, trend: "up" }}
          icon={<ShoppingCart />}
        />
        <StatCard
          title="Profit Margin"
          value={`${profitMargin.toFixed(1)}%`}
          change={{ value: 2.4, trend: "up" }}
          icon={<TrendingUp />}
        />
      </div>

      {/* Revenue and Profit Chart */}
      <ChartCard
        title="Revenue & Profit Trends"
        description="Monthly revenue and profit over time"
      >
        <div className="h-[350px]">
          <AreaChartComponent
            data={revenueData}
            areas={[
              { dataKey: "revenue", name: "Revenue ($)", fill: "#8884d8" },
              { dataKey: "profit", name: "Profit ($)", fill: "#82ca9d" }
            ]}
            height={350}
          />
        </div>
      </ChartCard>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Revenue by Product"
          description="Percentage of revenue by product"
        >
          <PieChartComponent
            data={productRevenueData}
            dataKey="value"
          />
        </ChartCard>

        <ChartCard
          title="Customer Satisfaction"
          description="User satisfaction score over time (0-10)"
        >
          <LineChartComponent
            data={satisfactionData}
            lines={[
              { dataKey: "score", name: "Satisfaction Score (0-10)", stroke: "#8884d8" }
            ]}
          />
        </ChartCard>
      </div>

      {/* Top Products Table */}
      <ChartCard
        title="Top Products"
        description="Best performing products by revenue"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead className="text-right">Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.id}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.sales.toLocaleString()}</TableCell>
                  <TableCell>${product.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                      ↑ {product.growth}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ChartCard>

      {/* Business Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Costs Analysis"
          description="Breakdown of costs by category"
        >
          <div className="h-[300px]">
            <BarChartComponent
              data={[
                { name: "Marketing", value: 35 },
                { name: "Development", value: 25 },
                { name: "Operations", value: 20 },
                { name: "Support", value: 10 },
                { name: "Admin", value: 5 },
                { name: "Other", value: 5 },
              ]}
              bars={[
                { dataKey: "value", name: "Percentage", fill: "#8884d8" }
              ]}
              layout="horizontal"
              height={300}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Customer Lifetime Value"
          description="Average revenue generated per customer over time"
        >
          <div className="h-[300px]">
            <LineChartComponent
              data={[
                { month: 1, value: 28.5 },
                { month: 3, value: 58.2 },
                { month: 6, value: 95.3 },
                { month: 12, value: 156.8 },
                { month: 24, value: 245.2 },
                { month: 36, value: 312.7 },
              ]}
              lines={[
                { dataKey: "value", name: "Customer Value ($)" }
              ]}
              xAxisDataKey="month"
              height={300}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 px-4 text-center text-sm">
            <div>
              <div className="font-medium">Initial Purchase</div>
              <div className="text-2xl font-bold">$28.50</div>
            </div>
            <div>
              <div className="font-medium">First Year</div>
              <div className="text-2xl font-bold">$156.80</div>
            </div>
            <div>
              <div className="font-medium">Three Years</div>
              <div className="text-2xl font-bold">$312.70</div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Marketing ROI */}
      <ChartCard
        title="Marketing ROI"
        description="Return on investment by marketing channel"
      >
        <div className="p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <BarChartComponent
                data={[
                  { name: "Email", roi: 520 },
                  { name: "Social", roi: 310 },
                  { name: "Search", roi: 480 },
                  { name: "Affiliates", roi: 290 },
                  { name: "Display", roi: 180 },
                  { name: "Events", roi: 250 },
                ]}
                bars={[
                  { dataKey: "roi", name: "ROI (%)", fill: "#82ca9d" }
                ]}
                layout="horizontal"
                height={250}
              />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-medium mb-4">Marketing Performance Insights</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <DollarSign className="h-5 w-5 text-green-500 mt-1" />
                  <span>Email marketing has the highest ROI at <strong>520%</strong>, generating $5.20 for every $1 spent.</span>
                </li>
                <li className="flex items-start gap-2">
                  <DollarSign className="h-5 w-5 text-green-500 mt-1" />
                  <span>Search advertising ROI has increased by <strong>15%</strong> since last quarter.</span>
                </li>
                <li className="flex items-start gap-2">
                  <DollarSign className="h-5 w-5 text-green-500 mt-1" />
                  <span>Overall marketing efficiency has improved, with average ROI across all channels now at <strong>338%</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <DollarSign className="h-5 w-5 text-green-500 mt-1" />
                  <span>Recommendation: Increase investment in email and search marketing for highest returns.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
