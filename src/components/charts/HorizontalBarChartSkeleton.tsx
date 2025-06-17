import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";

export function HorizontalBarChartSkeleton() {
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
        <div className="h-[300px] flex flex-col justify-between py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-24" />
              <div className="flex-1">
                <Skeleton className="h-5 w-full" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
