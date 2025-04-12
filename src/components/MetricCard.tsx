import { LucideIcon } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  percentageChange?: number;
  duration?: string;
  icon?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  percentageChange,
  duration,
  icon,
}: MetricCardProps) {
  const isNegative = percentageChange && percentageChange < 0;

  return (
    <Card className="bg-card rounded-xl">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <div className="text-muted-foreground">{icon}</div>}
            <div className="text-muted-foreground text-sm font-medium">{title}</div>
          </div>
          {duration && <div className="text-muted-foreground text-xs">{duration}</div>}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-foreground text-2xl font-medium">{value}</div>
        {percentageChange && (
          <div
            className={`text-sm mt-1 ${isNegative ? "text-destructive" : "text-green-500"}`}
          >
            {isNegative ? "" : "+"}
            {percentageChange.toFixed(2)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
