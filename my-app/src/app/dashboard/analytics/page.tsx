"use client";

import { AnalyticsTabs } from "@/components/analytics/analytics-tabs";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>
      <p className="text-muted-foreground">Track and analyze your data with comprehensive analytics tools.</p>

      <AnalyticsTabs />
    </div>
  );
}
