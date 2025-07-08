import React from "react";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function LifetimeVolumeBreakdownSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-3">
            <Skeleton className="h-9 w-48" /> {/* Lifetime Volume title */}
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-2.5 h-2.5 rounded-full" /> {/* Green dot */}
              <Skeleton className="h-4 w-32" /> {/* Active Protocols text */}
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-9 w-24 mb-2" /> {/* Total volume */}
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
                  <Skeleton className="w-6 h-6 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Horizontal Bar Chart Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-full rounded" /> {/* Progress bar */}

          {/* Protocol Details Skeleton - 3 Rows with 5 Items Each */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 15 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg"
              >
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Skeleton className="w-3 h-3 rounded-full" /> {/* Color dot */}
                  <Skeleton className="h-3 w-12" /> {/* Protocol name */}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Skeleton className="h-3 w-8" /> {/* Volume */}
                  <Skeleton className="h-3 w-6" /> {/* Percentage */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}