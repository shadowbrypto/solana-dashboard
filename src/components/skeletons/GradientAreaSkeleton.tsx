import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

interface GradientAreaSkeletonProps {
  className?: string;
}

export function GradientAreaSkeleton({ className }: GradientAreaSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      <CardHeader className="p-4 pb-2 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[108px]">
          <Skeleton className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}