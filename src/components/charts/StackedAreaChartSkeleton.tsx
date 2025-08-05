import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { ComponentActions } from "../ComponentActions";

interface StackedAreaChartSkeletonProps {
  title?: string;
  subtitle?: string;
  showExportActions?: boolean;
}

export function StackedAreaChartSkeleton({ 
  title = "Stacked Area Chart", 
  subtitle = "Loading data...",
  showExportActions = true 
}: StackedAreaChartSkeletonProps) {
  return (
    <ComponentActions 
      componentName={title}
      filename={`${title.replace(/\s+/g, '_')}.png`}
      disabled={true}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-base font-medium text-card-foreground">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {showExportActions && (
            <Skeleton className="h-9 w-[140px] rounded-xl" />
          )}
        </CardHeader>
        <CardContent className="pt-2 px-2">
          <div className="h-[400px] relative bg-muted/10 rounded-lg flex items-center justify-center">
            {/* Area chart skeleton */}
            <div className="absolute inset-4">
              <div className="w-full h-full bg-gradient-to-t from-muted/20 via-muted/10 to-transparent" />
            </div>
            
            {/* Legend skeleton */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full animate-pulse" />
                  <Skeleton className="h-4 w-16 animate-pulse" />
                </div>
              ))}
            </div>
            
            <div className="text-sm text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
