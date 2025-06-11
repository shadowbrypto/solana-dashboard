import { Skeleton } from "./ui/skeleton";

export function MetricCardSkeleton() {
  return (
    <div className="border rounded-2xl p-6 shadow-sm [--tw-gradient-position:to_top_in_oklab] bg-gradient-to-t from-background to-muted/50">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-xl" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
