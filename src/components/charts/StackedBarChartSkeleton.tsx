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
          <div className="h-[300px] sm:h-[400px] relative bg-muted/10 rounded-lg flex items-center justify-center">
            <div className="h-full w-full flex flex-col justify-end gap-1 sm:gap-2 p-2 sm:p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-1 h-6 sm:h-8">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton 
                      key={j} 
                      className="flex-1 animate-pulse" 
                      style={{
                        backgroundColor: j === 0 ? 'hsl(210 100% 50%)' : j === 1 ? 'hsl(120 100% 40%)' : 'hsl(45 100% 50%)',
                        opacity: 0.3
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute text-xs sm:text-sm text-muted-foreground">Loading chart data...</div>
            
            {/* Legend skeleton */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-2 sm:gap-4">
              {['Telegram Bots', 'Trading Terminals', 'Mobile Apps'].map((label, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: i === 0 ? 'hsl(210 100% 50%)' : i === 1 ? 'hsl(120 100% 40%)' : 'hsl(45 100% 50%)' }}
                  />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
