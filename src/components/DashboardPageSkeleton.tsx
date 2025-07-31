import { MetricCardSkeleton } from "./MetricCardSkeleton";
import { PageHeaderSkeleton } from "./PageHeaderSkeleton";
import { StackedBarChartSkeleton } from "./charts/StackedBarChartSkeleton";
import { Skeleton } from "./ui/skeleton";

interface DashboardPageSkeletonProps {
  showHeader?: boolean;
  headerProps?: {
    showLogo?: boolean;
    titleWidth?: string;
    showSubtitle?: boolean;
    subtitleWidth?: string;
  };
  showMetricCards?: boolean;
  metricCardsCount?: number;
  showCharts?: boolean;
  chartsCount?: number;
  showTables?: boolean;
  tablesCount?: number;
}

export function DashboardPageSkeleton({
  showHeader = true,
  headerProps = { showLogo: false, titleWidth: "w-64" },
  showMetricCards = true,
  metricCardsCount = 3,
  showCharts = true,
  chartsCount = 2,
  showTables = false,
  tablesCount = 1
}: DashboardPageSkeletonProps) {
  return (
    <div className="p-2 sm:p-4 lg:p-6">
      {/* Header */}
      {showHeader && (
        <PageHeaderSkeleton {...headerProps} />
      )}
      
      {/* Metric Cards */}
      {showMetricCards && (
        <div className="mb-6 lg:mb-8 grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-3 lg:grid-cols-3">
          {Array.from({ length: metricCardsCount }, (_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Charts */}
      {showCharts && (
        <div className="space-y-6 mb-6">
          {Array.from({ length: chartsCount }, (_, i) => (
            <StackedBarChartSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Tables */}
      {showTables && (
        <div className="space-y-6">
          {Array.from({ length: tablesCount }, (_, i) => (
            <TableSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {/* Table Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      
      {/* Table Content */}
      <div className="space-y-3">
        {/* Header Row */}
        <div className="grid grid-cols-4 gap-4 pb-2 border-b border-border">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-18" />
          <Skeleton className="h-4 w-14" />
        </div>
        
        {/* Data Rows */}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 py-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}