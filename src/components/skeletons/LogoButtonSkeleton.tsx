import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

interface LogoButtonSkeletonProps {
  className?: string;
}

export function LogoButtonSkeleton({ className }: LogoButtonSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      <CardHeader className="p-4 pb-2">
        <CardDescription className="text-sm text-muted-foreground">
          Volume by Chain
        </CardDescription>
        <Skeleton className="h-9 w-32" />
      </CardHeader>
      <CardContent className="p-4 pt-0 pb-4 flex flex-col justify-between h-[100px]">
        <div className="flex-1 min-h-0"></div>
        <div className="flex gap-2 justify-start">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}