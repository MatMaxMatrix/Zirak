"use client";

import { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Users,
  ShoppingCart,
  Flag,
  BadgePercent,
  Goal
} from "lucide-react";
import {
  StatCard,
  ChartCard,
  BarChartComponent,
  LineChartComponent,
  AreaChartComponent,
  DonutChartComponent
} from "@/components/analytics/chart-components";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  monthlyData,
  acquisitionCostData
} from "@/lib/analytics-data";

export function ConversionReports() {
  const [timeRange, setTimeRange] = useState("monthly");

  // Funnel data for conversion visualization
  const funnelData = [
    { stage: "Page Visit", count: 100000, percentage: 100 },
    { stage: "Product View", count: 65000, percentage: 65 },
    { stage: "Add to Cart", count: 32000, percentage: 32 },
    { stage: "Checkout Start", count: 18000, percentage: 18 },
    { stage: "Purchase", count: 12000, percentage: 12 },
  ];

  // Goal conversion data
  const goalConversions = [
    { name: "Sign Up", completions: 24500, rate: 9.8, change: 12.3 },
    { name: "Product Purchase", completions: 12000, rate: 4.8, change: 8.7 },
    { name: "Demo Request", completions: 5600, rate: 2.2, change: 15.2 },
    { name: "Newsletter", completions: 18700, rate: 7.5, change: -2.1 },
    { name: "Download", completions: 32400, rate: 13.0, change: 5.9 },
  ];

  // Generate derived data for charts
  const conversionRateData = monthlyData.map(item => {
    return {
      name: item.name,
      rate: (item.signups / item.visits) * 100
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Conversion Analysis</h2>
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
          title="Conversion Rate"
          value="12.8%"
          change={{ value: 1.5, trend: "up" }}
          icon={<TrendingUp />}
          sparkData={conversionRateData.slice(-7)}
          sparkDataKey="rate"
        />
        <StatCard
          title="Cost Per Acquisition"
          value="$28.50"
          change={{ value: 3.2, trend: "down" }}
          icon={<DollarSign />}
          sparkData={acquisitionCostData.slice(-7)}
          sparkDataKey="cost"
        />
        <StatCard
          title="New Customers"
          value="12,350"
          change={{ value: 8.7, trend: "up" }}
          icon={<Users />}
          sparkData={monthlyData.slice(-7).map(m => ({ name: m.name, value: m.signups }))}
          sparkDataKey="value"
        />
        <StatCard
          title="Goal Completions"
          value="93,200"
          change={{ value: 5.3, trend: "up" }}
          icon={<Flag />}
        />
      </div>

      {/* Conversion Funnel */}
      <ChartCard
        title="Conversion Funnel"
        description="Visitor progression through the conversion path"
      >
        <div className="space-y-6 p-4">
          {funnelData.map((stage, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-medium">{stage.stage}</div>
                <div className="text-sm text-muted-foreground">
                  {stage.count.toLocaleString()} users ({stage.percentage}%)
                </div>
              </div>
              <Progress value={stage.percentage} className="h-4" />
              {index < funnelData.length - 1 && (
                <div className="text-xs text-muted-foreground text-center">
                  {((funnelData[index+1].count / stage.count) * 100).toFixed(1)}% conversion to next stage
                  {index === 0 && <Badge className="ml-2 bg-blue-500">Entry Point</Badge>}
                  {index === funnelData.length - 2 && <Badge className="ml-2 bg-green-500">Final Conversion</Badge>}
                </div>
              )}
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Conversion Rate Trend"
          description="Conversion rate over time"
        >
          <LineChartComponent
            data={conversionRateData}
            lines={[
              { dataKey: "rate", name: "Conversion Rate (%)" }
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Customer Acquisition Cost"
          description="Cost per customer acquisition over time"
        >
          <AreaChartComponent
            data={acquisitionCostData}
            areas={[
              { dataKey: "cost", name: "Cost ($)", fill: "#8884d8" }
            ]}
          />
        </ChartCard>
      </div>

      {/* Goal Conversions */}
      <ChartCard
        title="Goal Conversions"
        description="Performance of conversion goals"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <BarChartComponent
              data={goalConversions.map(g => ({ name: g.name, rate: g.rate }))}
              bars={[
                { dataKey: "rate", name: "Conversion Rate (%)", fill: "#8884d8" }
              ]}
              layout="horizontal"
              height={250}
            />
          </div>
          <div className="space-y-6">
            {goalConversions.map((goal, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="font-medium flex items-center">
                    <Goal className="h-4 w-4 mr-2" />
                    {goal.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{goal.completions.toLocaleString()}</Badge>
                    <Badge
                      variant="outline"
                      className={goal.change >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}
                    >
                      {goal.change >= 0 ? '↑' : '↓'} {Math.abs(goal.change)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={goal.rate * 2} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {goal.rate}% conversion rate
                </div>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* Conversion Attribution */}
      <ChartCard
        title="Conversion Attribution"
        description="Which traffic sources lead to conversions"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <DonutChartComponent
              data={[
                { name: "Organic Search", value: 35 },
                { name: "Direct", value: 22 },
                { name: "Social Media", value: 18 },
                { name: "Email", value: 12 },
                { name: "Referral", value: 8 },
                { name: "Paid Search", value: 5 },
              ]}
              dataKey="value"
              height={300}
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Conversion Insights</h3>
            <ul className="space-y-2">
              <li className="text-sm flex items-start gap-2">
                <BadgePercent className="h-4 w-4 mt-0.5 text-blue-500" />
                <span>Organic search drives <strong>35%</strong> of all conversions with the highest ROI.</span>
              </li>
              <li className="text-sm flex items-start gap-2">
                <BadgePercent className="h-4 w-4 mt-0.5 text-blue-500" />
                <span>Email campaigns have the highest conversion rate at <strong>4.7%</strong>.</span>
              </li>
              <li className="text-sm flex items-start gap-2">
                <BadgePercent className="h-4 w-4 mt-0.5 text-blue-500" />
                <span>Social media conversions increased by <strong>18%</strong> since last period.</span>
              </li>
              <li className="text-sm flex items-start gap-2">
                <BadgePercent className="h-4 w-4 mt-0.5 text-blue-500" />
                <span>Mobile conversions are growing <strong>2x faster</strong> than desktop.</span>
              </li>
              <li className="text-sm flex items-start gap-2">
                <BadgePercent className="h-4 w-4 mt-0.5 text-blue-500" />
                <span>Returning visitors convert at <strong>3.2x</strong> the rate of new visitors.</span>
              </li>
            </ul>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
