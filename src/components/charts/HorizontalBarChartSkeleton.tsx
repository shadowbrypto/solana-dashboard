import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { ComponentActions } from "../ComponentActions";

interface HorizontalBarChartSkeletonProps {
  title?: string;
  subtitle?: string;
  showExportActions?: boolean;
}

export function HorizontalBarChartSkeleton({ 
  title = "Horizontal Bar Chart", 
  subtitle = "Loading data...",
  showExportActions = true 
}: HorizontalBarChartSkeletonProps) {
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
          <div className="h-[300px] relative bg-muted/10 rounded-lg flex items-center justify-center">
            <div className="h-full w-full flex flex-col justify-between py-4 px-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-24 animate-pulse" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-full animate-pulse" />
                  </div>
                  <Skeleton className="h-5 w-16 animate-pulse" />
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
