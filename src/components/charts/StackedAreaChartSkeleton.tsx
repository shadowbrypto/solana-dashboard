import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";

export function StackedAreaChartSkeleton() {
  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div>
          <CardTitle className="text-base font-medium text-card-foreground">
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </div>
        <Skeleton className="h-9 w-[140px] rounded-xl" />
      </CardHeader>
      <CardContent className="pt-2 px-2">
        <div className="h-[400px] relative">
          {/* Area chart skeleton */}
          <div className="absolute inset-0">
            <div className="w-full h-full bg-gradient-to-t from-muted/20 via-muted/10 to-transparent" />
          </div>
          
          {/* Legend skeleton */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
