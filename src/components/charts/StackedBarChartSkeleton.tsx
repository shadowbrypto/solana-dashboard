import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { ComponentActions } from "../ComponentActions";

interface StackedBarChartSkeletonProps {
  title?: string;
  subtitle?: string;
  showExportActions?: boolean;
}

export function StackedBarChartSkeleton({ 
  title = "Stacked Bar Chart", 
  subtitle = "Loading data...",
  showExportActions = true 
}: StackedBarChartSkeletonProps) {
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
            <div className="h-full w-full flex flex-col justify-end gap-2 p-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex gap-1 h-8">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="flex-1 animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute text-sm text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
