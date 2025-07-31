import { Card, CardContent, CardHeader } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export function PieChartSkeleton() {
  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b gap-3 sm:gap-0">
        <div className="space-y-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-[140px] rounded-xl" />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Pie Chart Skeleton */}
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <div className="relative">
              {/* Outer circle */}
              <div className="w-60 h-60 rounded-full border-8 border-muted animate-pulse" />
              {/* Inner segments effect */}
              <div className="absolute inset-4 rounded-full border-4 border-muted/60 animate-pulse" />
              <div className="absolute inset-8 rounded-full border-4 border-muted/40 animate-pulse" />
            </div>
          </div>

          {/* Legend Skeleton */}
          <div className="flex-shrink-0 w-full lg:w-64 space-y-3">
            {/* Total */}
            <div className="bg-muted/20 rounded-lg p-4 text-center">
              <Skeleton className="h-4 w-12 mx-auto mb-2" />
              <Skeleton className="h-8 w-20 mx-auto" />
            </div>

            {/* Legend Items */}
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <Skeleton className="w-3 h-3 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}