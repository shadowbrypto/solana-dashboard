import { Skeleton } from "./ui/skeleton";

interface RecentActivitySkeletonProps {
  showTitle?: boolean;
}

export function RecentActivitySkeleton({ showTitle = true }: RecentActivitySkeletonProps) {
  return (
    <div className="mb-6 lg:mb-8">
      {showTitle && (
        <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Last Day Card Skeleton */}
        <RecentActivityCardSkeleton 
          gradientClass="bg-gradient-to-br from-card via-card/95 to-blue-50/30 dark:to-blue-950/10"
          accentClass="bg-gradient-to-r from-blue-500 to-cyan-500"
          dotClass="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        
        {/* Last 7 Days Card Skeleton */}
        <RecentActivityCardSkeleton 
          gradientClass="bg-gradient-to-br from-card via-card/95 to-green-50/30 dark:to-green-950/10"
          accentClass="bg-gradient-to-r from-green-500 to-emerald-500"
          dotClass="bg-gradient-to-r from-green-500 to-green-600"
        />
        
        {/* Last 30 Days Card Skeleton */}
        <RecentActivityCardSkeleton 
          gradientClass="bg-gradient-to-br from-card via-card/95 to-purple-50/30 dark:to-purple-950/10"
          accentClass="bg-gradient-to-r from-purple-500 to-violet-500"
          dotClass="bg-gradient-to-r from-purple-500 to-purple-600"
        />
      </div>
    </div>
  );
}

interface RecentActivityCardSkeletonProps {
  gradientClass: string;
  accentClass: string;
  dotClass: string;
}

function RecentActivityCardSkeleton({ 
  gradientClass, 
  accentClass, 
  dotClass 
}: RecentActivityCardSkeletonProps) {
  return (
    <div className={`group relative ${gradientClass} border border-border/50 rounded-xl p-5 shadow-sm overflow-hidden`}>
      {/* Subtle accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accentClass} opacity-20`} />
      
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${dotClass} shadow-sm`}></div>
            <Skeleton className="h-4 w-16" />
          </div>
          
          {/* Growth Badge Skeleton */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
        
        {/* Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex justify-between items-center py-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="flex justify-between items-center py-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}