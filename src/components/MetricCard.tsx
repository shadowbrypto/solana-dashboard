import { LucideIcon } from "lucide-react";

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
    <div className="bg-black rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="text-gray-400">{icon}</div>}
          <div className="text-gray-400 text-sm font-medium">{title}</div>
        </div>
        {duration && <div className="text-gray-500 text-xs">{duration}</div>}
      </div>
      <div className="text-white text-2xl font-medium mt-1">{value}</div>
      {percentageChange && (
        <div
          className={`text-sm mt-1 ${
            isNegative ? "text-red-500" : "text-green-500"
          }`}
        >
          {isNegative ? "" : "+"}
          {percentageChange.toFixed(2)}%
        </div>
      )}
    </div>
  );
}
