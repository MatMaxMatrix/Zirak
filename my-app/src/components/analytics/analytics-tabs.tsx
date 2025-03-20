"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartCard } from "@/components/analytics/chart-components";
import { OverviewReports } from "./overview-reports";
import { TrafficReports } from "./traffic-reports";
import { ConversionReports } from "./conversion-reports";
import { EngagementReports } from "./engagement-reports";
import { BusinessReports } from "./business-reports";

export function AnalyticsTabs() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs
      defaultValue="overview"
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full space-y-6"
    >
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="traffic">Traffic</TabsTrigger>
        <TabsTrigger value="conversion">Conversion</TabsTrigger>
        <TabsTrigger value="engagement">Engagement</TabsTrigger>
        <TabsTrigger value="business">Business</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <OverviewReports />
      </TabsContent>

      <TabsContent value="traffic" className="space-y-6">
        <TrafficReports />
      </TabsContent>

      <TabsContent value="conversion" className="space-y-6">
        <ConversionReports />
      </TabsContent>

      <TabsContent value="engagement" className="space-y-6">
        <EngagementReports />
      </TabsContent>

      <TabsContent value="business" className="space-y-6">
        <BusinessReports />
      </TabsContent>
    </Tabs>
  );
}
