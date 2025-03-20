// @ts-nocheck
"use client";

import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
  "#a4de6c",
  "#d0ed57"
];

// Chart card wrapper for consistent styling
interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, description, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Line chart component
interface LineChartComponentProps {
  data: any[];
  lines: Array<{
    dataKey: string;
    stroke?: string;
    name?: string;
  }>;
  xAxisDataKey?: string;
  height?: number;
  grid?: boolean;
}

export function LineChartComponent({
  data,
  lines,
  xAxisDataKey = "name",
  height = 300,
  grid = true,
}: LineChartComponentProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {grid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xAxisDataKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke || COLORS[index % COLORS.length]}
              name={line.name || line.dataKey}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Area chart component
interface AreaChartComponentProps {
  data: any[];
  areas: Array<{
    dataKey: string;
    fill?: string;
    stroke?: string;
    name?: string;
  }>;
  xAxisDataKey?: string;
  height?: number;
  stacked?: boolean;
  grid?: boolean;
}

export function AreaChartComponent({
  data,
  areas,
  xAxisDataKey = "name",
  height = 300,
  stacked = false,
  grid = true,
}: AreaChartComponentProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {grid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xAxisDataKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {areas.map((area, index) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              stackId={stacked ? "1" : undefined}
              stroke={area.stroke || COLORS[index % COLORS.length]}
              fill={area.fill || COLORS[index % COLORS.length]}
              name={area.name || area.dataKey}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Bar chart component
interface BarChartComponentProps {
  data: any[];
  bars: Array<{
    dataKey: string;
    fill?: string;
    name?: string;
  }>;
  xAxisDataKey?: string;
  height?: number;
  stacked?: boolean;
  grid?: boolean;
  layout?: "vertical" | "horizontal";
}

export function BarChartComponent({
  data,
  bars,
  xAxisDataKey = "name",
  height = 300,
  stacked = false,
  grid = true,
  layout = "horizontal",
}: BarChartComponentProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {grid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis
            dataKey={layout === "horizontal" ? xAxisDataKey : undefined}
            type={layout === "horizontal" ? "category" : "number"}
          />
          <YAxis
            dataKey={layout === "vertical" ? xAxisDataKey : undefined}
            type={layout === "vertical" ? "category" : "number"}
          />
          <Tooltip />
          <Legend />
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              stackId={stacked ? "a" : undefined}
              fill={bar.fill || COLORS[index % COLORS.length]}
              name={bar.name || bar.dataKey}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Pie chart component
interface PieChartComponentProps {
  data: any[];
  dataKey: string;
  nameKey?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  colors?: string[];
}

export function PieChartComponent({
  data,
  dataKey,
  nameKey = "name",
  height = 300,
  innerRadius = 0,
  outerRadius = 80,
  colors = COLORS,
}: PieChartComponentProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={1}
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut chart is just a pie chart with inner radius
export function DonutChartComponent(props: PieChartComponentProps) {
  return <PieChartComponent {...props} innerRadius={60} />;
}

// Radar chart component
interface RadarChartComponentProps {
  data: any[];
  dataKey: string;
  height?: number;
  fill?: string;
  stroke?: string;
}

export function RadarChartComponent({
  data,
  dataKey,
  height = 300,
  fill = "#8884d8",
  stroke = "#8884d8",
}: RadarChartComponentProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RadarChart outerRadius={90} data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" />
          <PolarRadiusAxis />
          <Radar
            name={dataKey}
            dataKey={dataKey}
            stroke={stroke}
            fill={fill}
            fillOpacity={0.6}
          />
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Stats grid with numbers and sparklines
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  sparkData?: any[];
  sparkDataKey?: string;
}

export function StatCard({ title, value, change, icon, sparkData, sparkDataKey }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={`text-xs ${
            change.trend === "up"
              ? "text-green-500"
              : change.trend === "down"
                ? "text-red-500"
                : "text-muted-foreground"
          }`}>
            {change.trend === "up" ? "↑" : change.trend === "down" ? "↓" : "→"} {Math.abs(change.value)}%
          </p>
        )}
        {sparkData && sparkDataKey && (
          <div className="h-[40px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey={sparkDataKey}
                  stroke={
                    change?.trend === "up"
                      ? "#10b981"
                      : change?.trend === "down"
                        ? "#ef4444"
                        : "#8884d8"
                  }
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
