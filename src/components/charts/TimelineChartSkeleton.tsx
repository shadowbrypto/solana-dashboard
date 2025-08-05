import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { ComponentActions } from "../ComponentActions";

interface TimelineChartSkeletonProps {
  title?: string;
  subtitle?: string;
  showExportActions?: boolean;
}

export function TimelineChartSkeleton({ 
  title = "Timeline Chart", 
  subtitle = "Loading data...",
  showExportActions = true 
}: TimelineChartSkeletonProps) {
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
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-[140px] rounded-xl" />
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-2 px-2">
          <div className="h-[400px] relative bg-muted/10 rounded-lg flex items-center justify-center">
            <div className="absolute inset-4 flex items-end">
              {Array.from({ length: 30 }).map((_, i) => {
                const height = Math.floor(Math.random() * 80) + 20; // 20-100% height
                return (
                  <div key={i} className="flex-1 flex items-end h-full px-0.5">
                    <Skeleton 
                      className="w-full animate-pulse" 
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="text-sm text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
