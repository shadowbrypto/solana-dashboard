import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

interface DailyStatsSkeletonProps {
  className?: string;
}

export function DailyStatsSkeleton({ className }: DailyStatsSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden shadow-sm h-full", className)}>
      <CardHeader className="p-4 pb-2">
        {/* Tabs skeleton */}
        <div className="flex space-x-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-lg" />
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-6 flex-1 flex flex-col">
        <div className="space-y-6 flex-1">
          {/* Data rows skeleton */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-6 h-6 rounded" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  {i < 3 && <Skeleton className="w-4 h-4" />}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
          
          {/* Horizontal bar chart skeleton */}
          <div className="mt-4">
            <Skeleton className="w-full h-3 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}