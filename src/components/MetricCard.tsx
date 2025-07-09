import { LucideIcon, TrendingDown, TrendingUp, Sparkles, Coins, Users, BarChart2, DollarSign, UsersRound, CircleDollarSign, Hash, HandCoins } from "lucide-react";
import { ComponentActions } from "./ComponentActions";

interface MetricCardProps {
  title: string;
  value: string | number;
  percentageChange?: number;
  duration?: string;
  icon?: React.ReactNode;
  description?: string;
  type?: 'volume' | 'users' | 'trades' | 'fees';
  prefix?: string;
  subtitle?: string;
  subtitleIcon?: string;
}

export function MetricCard({
  title,
  value,
  percentageChange,
  duration,
  icon,
  description,
  type = 'volume',
  prefix,
  subtitle,
  subtitleIcon,
}: MetricCardProps) {
  const isNegative = percentageChange && percentageChange < 0;
  const TrendIcon = isNegative ? TrendingDown : TrendingUp;

  const formatNumber = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 1e9) {
      return (value / 1e9).toFixed(2) + 'B';
    } else if (absValue >= 1e6) {
      return (value / 1e6).toFixed(2) + 'M';
    } else if (absValue >= 1e3) {
      return (value / 1e3).toFixed(2) + 'K';
    }
    return value.toFixed(2);
  };

  const getIcon = () => {
    switch (type) {
      case 'volume':
        return <CircleDollarSign className="h-4 w-4 text-muted-foreground" />;
      case 'users':
        return <UsersRound className="h-4 w-4 text-muted-foreground" />;
      case 'trades':
        return <Hash className="h-4 w-4 text-muted-foreground" />;
      case 'fees':
        return <HandCoins className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Sparkles className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <ComponentActions 
      componentName={`${title} Metric`}
      filename={`${title.replace(/\s+/g, '_')}_Metric.png`}
    >
      <div className="rounded-xl border bg-gradient-to-b from-background to-muted/20 p-3 sm:p-4 lg:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-foreground/20 cursor-default">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 lg:mb-6 gap-2 sm:gap-0">
          <div className="flex flex-col gap-2">
            <h3 className="text-foreground text-base sm:text-lg font-semibold truncate">{title}</h3>
            {subtitle && (
              <div className="flex items-center gap-2">
                {subtitleIcon && (
                  <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                    <img 
                      src={`/assets/logos/${subtitleIcon}`}
                      alt={subtitle} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <span className="text-xs text-muted-foreground capitalize">{subtitle}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 justify-start sm:justify-end">
            <div className="inline-flex items-center rounded-lg border bg-muted/50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold transition-colors text-muted-foreground">
              Lifetime
            </div>
            {percentageChange && (
              <div className={`flex items-center gap-1 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 ${
                isNegative 
                  ? 'bg-destructive/10 text-destructive' 
                  : 'bg-green-500/10 text-green-600 dark:text-green-400'
              }`}>
                <TrendIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="text-[10px] sm:text-xs font-medium">
                  {isNegative ? "" : "+"}
                  {percentageChange.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2 sm:space-y-3 lg:space-y-4">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            {typeof value === 'number' ? `${prefix || ''}${formatNumber(value)}` : value}
          </div>
          
          {(duration || description) && (
            <div className="space-y-1">
              {duration && (
                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
                  {duration}
                  <TrendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              )}
              {description && (
                <div className="text-muted-foreground text-xs sm:text-sm">
                  {description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ComponentActions>
  );
}
