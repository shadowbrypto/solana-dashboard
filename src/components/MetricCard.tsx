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
      <div className="group relative rounded-xl border bg-gradient-to-br from-background via-background/95 to-muted/30 p-4 sm:p-5 lg:p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 cursor-default overflow-hidden">
        {/* Subtle accent line */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r transition-opacity duration-300 ${
          type === 'volume' ? 'from-blue-500 to-cyan-500' :
          type === 'users' ? 'from-green-500 to-emerald-500' :
          type === 'trades' ? 'from-purple-500 to-violet-500' :
          'from-orange-500 to-amber-500'
        } opacity-0 group-hover:opacity-100`} />
        
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg transition-all duration-300 ${
                type === 'volume' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20' :
                type === 'users' ? 'bg-green-500/10 text-green-600 dark:text-green-400 group-hover:bg-green-500/20' :
                type === 'trades' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20' :
                'bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500/20'
              }`}>
                {getIcon()}
              </div>
              <h3 className="text-foreground text-base sm:text-lg font-semibold truncate">{title}</h3>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="inline-flex items-center rounded-lg bg-muted/50 border border-border/50 px-2.5 py-1 text-xs font-medium transition-all duration-200 text-muted-foreground group-hover:bg-muted/70 group-hover:border-border/70">
                Lifetime
              </div>
              {percentageChange && (
                <div className={`flex items-center gap-1 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 transition-all duration-200 ${
                  isNegative 
                    ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                    : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
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
