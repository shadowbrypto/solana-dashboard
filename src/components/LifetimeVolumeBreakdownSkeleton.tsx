import React from "react";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

interface LifetimeVolumeBreakdownSkeletonProps {
  title?: string;
  subtitle?: string;
}

export function LifetimeVolumeBreakdownSkeleton({ 
  title = "Lifetime Volume Breakdown",
  subtitle = "Active Protocols" 
}: LifetimeVolumeBreakdownSkeletonProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-3">
            <h3 className="text-3xl font-bold text-foreground">{title}</h3>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <span className="text-sm text-muted-foreground">{subtitle}</span>
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-9 w-24 mb-2 animate-pulse" /> {/* Loading total volume */}
            <div className="flex gap-1 justify-end">
              {/* Stacked avatar skeletons */}
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="relative inline-block"
                  style={{ 
                    marginLeft: index > 0 ? '-8px' : '0',
                    zIndex: 8 - index
                  }}
                >
                  <Skeleton className="w-6 h-6 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Horizontal Bar Chart Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-full rounded animate-pulse" /> {/* Loading progress bar */}

          {/* Protocol Details Skeleton - 3 Rows with 5 Items Each */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 15 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg"
              >
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Skeleton className="w-3 h-3 rounded-full animate-pulse" /> {/* Loading color */}
                  <Skeleton className="h-3 w-12 animate-pulse" /> {/* Loading protocol name */}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Skeleton className="h-3 w-8 animate-pulse" /> {/* Loading volume */}
                  <Skeleton className="h-3 w-6 animate-pulse" /> {/* Loading percentage */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}