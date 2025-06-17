import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";

export function TimelineChartSkeleton() {
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
          <div className="absolute inset-0 flex items-end">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="flex-1 flex items-end h-full px-0.5">
                <Skeleton className={`w-full h-[${Math.random() * 100}%]`} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
