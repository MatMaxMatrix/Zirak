"use client";

import { useState } from "react";
import {
  Clock,
  Calendar,
  Layers,
  Heart,
  RefreshCw,
  MousePointerClick,
  BookOpen
} from "lucide-react";
import {
  StatCard,
  ChartCard,
  BarChartComponent,
  LineChartComponent,
  AreaChartComponent,
  RadarChartComponent
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
import { Progress } from "@/components/ui/progress";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import {
  dailyData,
  weeklyData,
  monthlyData,
  topPagesData,
  userRetentionData,
  featureUsageData
} from "@/lib/analytics-data";

export function EngagementReports() {
  const [timeRange, setTimeRange] = useState("monthly");

  // Get the appropriate data based on the selected time range
  const data = timeRange === "daily"
    ? dailyData
    : timeRange === "weekly"
      ? weeklyData
      : monthlyData;

  // Generate engagement scores for the heatmap
  const engagementByDayHour = Array(7).fill(0).map((_, dayIndex) => {
    return Array(24).fill(0).map((_, hourIndex) => {
      // Generate a value between 0 and 100 with a pattern
      // More engagement during working hours and on weekdays
      const isWeekday = dayIndex < 5;
      const isWorkingHour = hourIndex >= 8 && hourIndex <= 18;
      const baseValue = isWeekday ? 50 : 30;
      const hourFactor = isWorkingHour ? 30 : 10;
      const randomFactor = Math.floor(Math.random() * 20);

      return {
        day: dayIndex,
        hour: hourIndex,
        value: Math.min(100, baseValue + hourFactor + randomFactor)
      };
    });
  }).flat();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Engagement</h2>
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
          title="Avg. Session Duration"
          value={`${data.reduce((sum, item) => sum + item.avgTime, 0) / data.length}m`}
          change={{ value: 2.5, trend: "up" }}
          icon={<Clock />}
          sparkData={data.map(item => ({ name: item.name, value: item.avgTime }))}
          sparkDataKey="value"
        />
        <StatCard
          title="Pages per Session"
          value="3.8"
          change={{ value: 0.7, trend: "up" }}
          icon={<Layers />}
        />
        <StatCard
          title="Bounce Rate"
          value={`${Math.round(data.reduce((sum, item) => sum + item.bounce, 0) / data.length)}%`}
          change={{ value: 3.2, trend: "down" }}
          icon={<MousePointerClick />}
          sparkData={data.map(item => ({ name: item.name, value: item.bounce }))}
          sparkDataKey="value"
        />
        <StatCard
          title="Retention Rate"
          value="42%"
          change={{ value: 5.3, trend: "up" }}
          icon={<RefreshCw />}
        />
      </div>

      {/* User Retention */}
      <ChartCard
        title="User Retention"
        description="Percentage of users returning after initial visit"
      >
        <AreaChartComponent
          data={userRetentionData}
          areas={[
            { dataKey: "retention", name: "Retention Rate (%)", fill: "#8884d8" }
          ]}
          height={300}
        />
      </ChartCard>

      {/* Top Pages Performance */}
      <ChartCard
        title="Top Pages by Engagement"
        description="Pages with the highest user engagement"
      >
        <div className="space-y-6 p-4">
          {topPagesData.map((page, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-medium flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  {page.name}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{page.views.toLocaleString()} views</Badge>
                  <Badge variant="outline">{page.avgTime}m avg. time</Badge>
                  <Badge
                    variant="outline"
                    className={page.bounce < 30 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}
                  >
                    {page.bounce}% bounce
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground w-24">Engagement:</div>
                <Progress
                  value={Math.round(
                    (page.avgTime / Math.max(...topPagesData.map(p => p.avgTime))) *
                    ((100 - page.bounce) / (100 - Math.min(...topPagesData.map(p => p.bounce)))) *
                    100
                  )}
                  className="h-2 flex-1"
                />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title="Engagement by Time of Day"
          description="When users are most active"
        >
          <div className="p-2">
            <div className="space-y-1">
              <div className="text-xs font-medium">Hours (0-23)</div>
              <div className="grid grid-cols-24 gap-1 h-[150px]">
                {Array(24).fill(0).map((_, hour) => {
                  // Calculate average engagement for this hour across all days
                  const hourData = engagementByDayHour.filter(item => item.hour === hour);
                  const avgValue = hourData.reduce((sum, item) => sum + item.value, 0) / hourData.length;

                  return (
                    <HoverCard key={hour}>
                      <HoverCardTrigger>
                        <div
                          className="h-full w-full rounded-sm cursor-pointer"
                          style={{
                            backgroundColor: `rgba(136, 132, 216, ${avgValue / 100})`,
                            position: 'relative'
                          }}
                        >
                          <div className="absolute bottom-0 w-full text-[8px] text-center text-white">
                            {hour}
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto">
                        <div className="text-sm">
                          <strong>{hour}:00 - {hour+1}:00</strong>
                          <div>Engagement score: {avgValue.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">
                            {avgValue > 70 ? 'High activity' : avgValue > 40 ? 'Medium activity' : 'Low activity'}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1 mt-6">
              <div className="text-xs font-medium">Days of Week</div>
              <div className="grid grid-cols-7 gap-1 h-[30px]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => {
                  // Calculate average engagement for this day across all hours
                  const dayData = engagementByDayHour.filter(item => item.day === dayIndex);
                  const avgValue = dayData.reduce((sum, item) => sum + item.value, 0) / dayData.length;

                  return (
                    <HoverCard key={day}>
                      <HoverCardTrigger>
                        <div
                          className="h-full w-full rounded-sm flex items-center justify-center cursor-pointer"
                          style={{ backgroundColor: `rgba(136, 132, 216, ${avgValue / 100})` }}
                        >
                          <div className="text-[10px] text-white font-medium">
                            {day}
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto">
                        <div className="text-sm">
                          <strong>{day}</strong>
                          <div>Engagement score: {avgValue.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">
                            {avgValue > 70 ? 'High activity' : avgValue > 40 ? 'Medium activity' : 'Low activity'}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-muted-foreground">Low</div>
              <div className="h-2 w-32 bg-gradient-to-r from-indigo-100 to-indigo-600 rounded-sm"></div>
              <div className="text-xs text-muted-foreground">High</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Feature Usage"
          description="Most used platform features"
        >
          <RadarChartComponent
            data={featureUsageData}
            dataKey="usage"
            height={300}
          />
        </ChartCard>
      </div>

      {/* Engagement Metrics Over Time */}
      <ChartCard
        title="Engagement Trends"
        description="Key engagement metrics over time"
      >
        <LineChartComponent
          data={data.map(item => ({
            name: item.name,
            "Session Duration": item.avgTime,
            "Bounce Rate": item.bounce / 10, // Scale down to make it comparable
            "Pages per Session": 3 + (Math.random() * 1.5), // Made up data for example
          }))}
          lines={[
            { dataKey: "Session Duration", name: "Avg. Session Duration (min)" },
            { dataKey: "Bounce Rate", name: "Bounce Rate (×10%)" },
            { dataKey: "Pages per Session", name: "Pages per Session" },
          ]}
          height={350}
        />
      </ChartCard>
    </div>
  );
}
