import { Skeleton } from "./ui/skeleton";

export function MetricCardSkeleton() {
  return (
    <div className="relative rounded-xl border-2 border-border/80 bg-card p-4 overflow-hidden">
      {/* Content Container */}
      <div className="flex flex-col h-full">
        {/* Top Section - Title */}
        <div className="mb-auto">
          <Skeleton className="h-5 w-24" />
        </div>

        {/* Middle Section - Large Value */}
        <div className="flex-1 flex items-center justify-center py-4">
          <div className="text-center">
            <Skeleton className="h-12 lg:h-16 w-32 lg:w-40 mx-auto" />
          </div>
        </div>

        {/* Bottom Section - Protocol Name and Data Freshness */}
        <div className="flex items-center justify-between mt-auto">
          {/* Protocol Name */}
          <div className="flex items-center gap-1">
            <Skeleton className="w-4 h-4 rounded-sm" />
            <Skeleton className="h-3 w-16" />
          </div>

          {/* Data Freshness Indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-border/50 bg-muted/20">
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
            <Skeleton className="h-2.5 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
