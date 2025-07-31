import { MetricCardSkeleton } from "./MetricCardSkeleton";
import { RecentActivitySkeleton } from "./RecentActivitySkeleton";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";
import { StackedBarChartSkeleton } from "./charts/StackedBarChartSkeleton";
import { TimelineChartSkeleton } from "./charts/TimelineChartSkeleton";

export function LaunchpadPageSkeleton() {
  return (
    <div className="p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <PageHeaderSkeleton showLogo={true} titleWidth="w-48" />
      
      {/* Lifetime Metrics Cards */}
      <div className="mb-6 lg:mb-8 grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-3 lg:grid-cols-3">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Recent Activity Section */}
      <RecentActivitySkeleton />

      {/* Charts Section */}
      <div className="space-y-6">
        <StackedBarChartSkeleton />
        <TimelineChartSkeleton />
      </div>
    </div>
  );
}

