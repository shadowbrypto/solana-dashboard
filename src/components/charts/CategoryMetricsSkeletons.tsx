import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";

export function CategoryStackedBarChartSkeleton() {
  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium text-card-foreground">
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-[140px] rounded-xl" />
      </CardHeader>
      <CardContent className="pt-2 px-2">
        <div className="h-[400px] flex flex-col justify-end gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex gap-1 h-8">
              {/* 3 categories instead of 4 */}
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryStackedAreaChartSkeleton() {
  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium text-card-foreground">
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-[140px] rounded-xl" />
      </CardHeader>
      <CardContent className="pt-2 px-2">
        <div className="h-[400px] relative">
          {/* Area chart skeleton */}
          <div className="absolute inset-0">
            <div className="w-full h-full bg-gradient-to-t from-muted/50 via-muted/20 to-transparent animate-pulse" />
          </div>
          
          {/* Legend skeleton - 3 categories */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryMultiAreaChartSkeleton() {
  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium text-card-foreground">
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-[140px] rounded-xl" />
      </CardHeader>
      <CardContent className="pt-2 px-2">
        <div className="h-[400px] relative">
          {/* Multi area chart skeleton with overlapping areas */}
          <div className="absolute inset-0">
            <div className="w-full h-full relative">
              {/* Multiple overlapping area gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-muted/40 via-muted/15 to-transparent animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-t from-muted/30 via-muted/10 to-transparent animate-pulse" style={{animationDelay: '0.2s'}} />
              <div className="absolute inset-0 bg-gradient-to-t from-muted/20 via-muted/5 to-transparent animate-pulse" style={{animationDelay: '0.4s'}} />
            </div>
          </div>
          
          {/* Legend skeleton - 3 categories */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}