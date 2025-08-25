import React from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Skeleton } from './ui/skeleton';

interface MultiComparisonMetricCardSkeletonProps {
  protocolCount?: number;
}

export function MultiComparisonMetricCardSkeleton({ 
  protocolCount = 3 
}: MultiComparisonMetricCardSkeletonProps) {
  // Show maximum 5 protocols like the real component
  const displayCount = Math.min(protocolCount, 5);
  
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 sm:w-5 sm:h-5 rounded" />
          <Skeleton className="h-4 w-24 sm:w-32" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 p-3 sm:p-6 sm:pt-0">
        <div className="space-y-1.5 sm:space-y-2">
          {Array.from({ length: displayCount }).map((_, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg border bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/10 dark:to-slate-950/10 border-gray-200 dark:border-gray-900/20"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <Skeleton className="w-4 sm:w-6 h-3 sm:h-4" />
                <Skeleton className="w-3 h-3 sm:w-4 sm:h-4 rounded" />
                <Skeleton className="h-3 w-12 sm:w-16" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <Skeleton className="w-8 sm:w-12 h-1 sm:h-1.5 rounded-full" />
                <Skeleton className="h-3 w-12 sm:w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}