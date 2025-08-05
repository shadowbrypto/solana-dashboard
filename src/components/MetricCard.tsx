import { LucideIcon, TrendingDown, TrendingUp, Sparkles, Coins, Users, BarChart2, DollarSign, UsersRound, CircleDollarSign, Hash, HandCoins, Rocket, Trophy, Percent, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { ComponentActions } from "./ComponentActions";

interface MetricCardProps {
  title: string;
  value: string | number;
  percentageChange?: number;
  duration?: string;
  icon?: React.ReactNode;
  description?: string;
  type?: 'volume' | 'users' | 'trades' | 'fees' | 'launches' | 'graduations' | 'graduation_rate';
  prefix?: string;
  subtitle?: string;
  subtitleIcon?: string;
  protocolName?: string;
  protocolLogo?: string;
  latestDate?: Date | string;
  isDataCurrent?: boolean;
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
  protocolName = "All Protocols",
  protocolLogo,
  latestDate,
  isDataCurrent = true,
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
      case 'launches':
        return <Rocket className="h-4 w-4 text-muted-foreground" />;
      case 'graduations':
        return <Trophy className="h-4 w-4 text-muted-foreground" />;
      case 'graduation_rate':
        return <Percent className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Sparkles className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDataFreshness = () => {
    if (!latestDate) return null;
    
    const date = typeof latestDate === 'string' ? new Date(latestDate) : latestDate;
    const now = new Date();
    
    // Normalize dates to midnight for accurate day comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = Math.abs(nowOnly.getTime() - dateOnly.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      isCurrent: diffDays === 0,  // Green - same day
      isOneDayOld: diffDays === 1, // Amber - one day old
      isOld: diffDays > 7,         // Red - older than a week
      daysAgo: diffDays,
      dateStr: formatDate(date)
    };
  };

  const dataFreshness = getDataFreshness();

  return (
    <ComponentActions 
      componentName={`${title} Metric`}
      filename={`${title.replace(/\s+/g, '_')}_Metric.png`}
    >
      <div className="group relative rounded-xl border-2 border-border/80 bg-card p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-xl cursor-default overflow-hidden">
        {/* Content Container */}
        <div className="flex flex-col h-full">
          {/* Top Section - Title */}
          <div className="mb-auto">
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
          </div>

          {/* Middle Section - Large Value */}
          <div className="flex-1 flex items-center justify-center py-4">
            <div className="text-center">
              <div className="text-4xl lg:text-5xl font-semibold tracking-tight bg-gradient-to-br from-purple-600 via-purple-500 to-teal-500 bg-clip-text text-transparent">
                {typeof value === 'number' ? formatNumber(value) : value}
              </div>
            </div>
          </div>

          {/* Bottom Section - Protocol Name and Data Freshness */}
          <div className="flex items-center justify-between mt-auto">
            {/* Protocol Name */}
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-sm overflow-hidden bg-muted flex items-center justify-center">
                {protocolLogo ? (
                  <img 
                    src={`/assets/logos/${protocolLogo}`}
                    alt={protocolName} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const container = target.parentElement;
                      if (container) {
                        container.innerHTML = `<span class="text-[8px] font-medium text-muted-foreground">${protocolName.slice(0, 2).toUpperCase()}</span>`;
                      }
                    }}
                  />
                ) : (
                  <span className="text-[8px] font-medium text-muted-foreground">
                    {protocolName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {protocolName}
              </span>
            </div>

            {/* Data Freshness Indicator */}
            {dataFreshness && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all duration-200 ${
                dataFreshness.isCurrent 
                  ? 'bg-green-50/50 border-green-200/50 dark:bg-green-950/20 dark:border-green-800/30' 
                  : dataFreshness.isOneDayOld
                  ? 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30'
                  : dataFreshness.isOld
                  ? 'bg-red-50/50 border-red-200/50 dark:bg-red-950/20 dark:border-red-800/30'
                  : 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  dataFreshness.isCurrent 
                    ? 'bg-green-500' 
                    : dataFreshness.isOneDayOld
                    ? 'bg-amber-500'
                    : dataFreshness.isOld
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                }`} />
                <span className="text-[10px] font-medium text-muted-foreground">
                  {dataFreshness.dateStr}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </ComponentActions>
  );
}
