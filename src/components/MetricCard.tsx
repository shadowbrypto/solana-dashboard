import { LucideIcon, TrendingDown, TrendingUp, Sparkles, Coins, Users, BarChart2, DollarSign } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  percentageChange?: number;
  duration?: string;
  icon?: React.ReactNode;
  description?: string;
  type?: 'volume' | 'users' | 'trades' | 'fees';
}

export function MetricCard({
  title,
  value,
  percentageChange,
  duration,
  icon,
  description,
  type = 'volume',
}: MetricCardProps) {
  const isNegative = percentageChange && percentageChange < 0;
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;

  const getIcon = () => {
    switch (type) {
      case 'volume':
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
      case 'users':
        return <Users className="h-4 w-4 text-muted-foreground" />;
      case 'trades':
        return <BarChart2 className="h-4 w-4 text-muted-foreground" />;
      case 'fees':
        return <Coins className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Sparkles className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h3 className="text-muted-foreground text-sm">{title}</h3>
        </div>
        {percentageChange && (
          <div className="flex items-center gap-1 rounded-full bg-background/10 px-2 py-1">
            <TrendIcon className="h-3 w-3" />
            <span className="text-xs font-medium">
              {isNegative ? "" : "+"}
              {percentageChange.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="text-4xl font-semibold tracking-tight">
          {value}
        </div>
        
        {(duration || description) && (
          <div className="space-y-1">
            {duration && (
              <div className="flex items-center gap-2 text-sm font-medium">
                {duration}
                <TrendIcon className="h-4 w-4" />
              </div>
            )}
            {description && (
              <div className="text-muted-foreground text-sm">
                {description}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
