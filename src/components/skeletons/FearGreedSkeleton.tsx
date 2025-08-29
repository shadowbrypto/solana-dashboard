import React from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function FearGreedSkeleton() {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="p-4 pb-0">
        <CardDescription className="text-sm text-muted-foreground">
          Fear & Greed Index
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-8">
        <div className="relative w-full h-[120px] flex items-end justify-center">
          {/* Semicircle skeleton */}
          <Skeleton className="w-[280px] h-[100px] rounded-t-full" />
          {/* Center content skeleton */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}