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
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
          <div className="flex flex-col sm:flex-col items-start sm:items-start justify-start w-full sm:w-auto">
            {/* Mobile: Title and Total Volume on same line, Desktop: separate */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="text-lg sm:text-3xl font-bold tracking-tight">
                  {title}
                </div>
                {/* Active protocols indicator - under title on mobile */}
                <div className="flex items-center gap-2 sm:gap-2.5 mt-1 sm:mt-0 sm:ml-4">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {subtitle}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end sm:hidden">
                <Skeleton className="h-5 w-20 mb-1 animate-pulse" />
                {/* Mobile stacked avatars below the number */}
                <div className="flex items-center mt-1">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="relative inline-block"
                      style={{ 
                        marginLeft: index > 0 ? '-8px' : '0',
                        zIndex: 4 - index
                      }}
                    >
                      <Skeleton className="w-5 h-5 rounded-full animate-pulse" />
                    </div>
                  ))}
                  <div 
                    className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground"
                    style={{ marginLeft: '-8px', zIndex: 0 }}
                  >
                    +4
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop total volume and avatars */}
          <div className="hidden sm:block text-right">
            <Skeleton className="h-9 w-24 mb-2 animate-pulse" />
            <div className="flex justify-end">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="relative inline-block"
                  style={{ 
                    marginLeft: index > 0 ? '-3px' : '0',
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
        <div className="space-y-3 sm:space-y-4">
          <Skeleton className="h-6 sm:h-8 w-full rounded animate-pulse" />

          {/* Protocol Details Skeleton - Mobile: 2 cols, Tablet: 3 cols, Desktop: 5 cols */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2">
            {Array.from({ length: 15 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg border bg-muted/5"
              >
                <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
                  <Skeleton className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-pulse flex-shrink-0" />
                  <Skeleton className="h-3 w-8 sm:w-12 animate-pulse" />
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                  <Skeleton className="h-3 w-6 sm:w-8 animate-pulse" />
                  <Skeleton className="h-3 w-4 sm:w-6 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}