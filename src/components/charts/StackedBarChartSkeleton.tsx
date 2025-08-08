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
        <CardHeader className="flex flex-col border-b gap-3 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">
                {title}
              </CardTitle>
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {showExportActions && (
              <div className="flex items-center gap-1 sm:gap-2">
                <Skeleton className="h-8 w-16 sm:w-20 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-1 px-2 sm:pt-6 sm:pb-6 sm:px-6">
          <div className="h-[300px] sm:h-[400px] relative bg-muted/10 rounded-lg flex items-end justify-center p-2 sm:p-4">
            {/* Vertical stacked bars */}
            <div className="flex items-end justify-center gap-1 sm:gap-2 h-full w-full max-w-[600px]">
              {Array.from({ length: 12 }).map((_, i) => {
                const barHeight = Math.random() * 0.6 + 0.3; // Random height between 30% and 90%
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-0" style={{ height: `${barHeight * 100}%` }}>
                    {/* Stacked segments within each bar */}
                    <div 
                      className="w-full rounded-t-sm bg-muted animate-pulse"
                      style={{
                        height: '20%'
                      }}
                    />
                    <div 
                      className="w-full bg-muted/80 animate-pulse"
                      style={{
                        height: '50%'
                      }}
                    />
                    <div 
                      className="w-full rounded-b-sm bg-muted/60 animate-pulse"
                      style={{
                        height: '30%'
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs sm:text-sm text-muted-foreground">Loading chart data...</div>
            
            {/* Legend skeleton */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-2 sm:gap-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-3 w-16 sm:w-20" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
