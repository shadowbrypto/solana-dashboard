import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { ComponentActions } from "../ComponentActions";

interface CombinedChartSkeletonProps {
  title?: string;
  subtitle?: string;
  showExportActions?: boolean;
}

export function CombinedChartSkeleton({ 
  title = "Combined Chart", 
  subtitle = "Loading data...",
  showExportActions = true 
}: CombinedChartSkeletonProps) {
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
            {/* Line chart skeleton */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
            </div>
            
            {/* Bar chart skeleton */}
            <div className="absolute inset-0 flex items-end justify-between px-4">
              {Array.from({ length: 12 }).map((_, i) => {
                const height = Math.floor(Math.random() * 60) + 40; // 40-100% height
                return (
                  <div key={i} className="w-4">
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
