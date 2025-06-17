import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";

export function CombinedChartSkeleton() {
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
          {/* Line chart skeleton */}
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
          </div>
          
          {/* Bar chart skeleton */}
          <div className="absolute inset-0 flex items-end justify-between px-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-4">
                <Skeleton className={`w-full h-[${Math.random() * 60 + 40}%]`} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
