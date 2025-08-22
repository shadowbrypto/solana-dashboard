import { Skeleton } from "./ui/skeleton";
import { CircleDollarSign, UsersRound, Hash, HandCoins } from "lucide-react";

interface MetricCardSkeletonProps {
  title?: string;
  type?: 'volume' | 'users' | 'trades' | 'fees';
  protocolName?: string;
}

export function MetricCardSkeleton({ 
  title = "Loading...", 
  type = 'volume',
  protocolName = "All Protocols" 
}: MetricCardSkeletonProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'volume':
        return <CircleDollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />;
      case 'users':
        return <UsersRound className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />;
      case 'trades':
        return <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />;
      case 'fees':
        return <HandCoins className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />;
      default:
        return <CircleDollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="group relative rounded-lg sm:rounded-xl border-2 border-border/80 bg-card p-3 sm:p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-xl cursor-default overflow-hidden">
      {/* Content Container */}
      <div className="flex flex-col h-full">
        {/* Top Section - Static Title */}
        <div className="mb-auto">
          <h3 className="text-sm sm:text-lg font-semibold text-foreground">
            {title}
          </h3>
        </div>

        {/* Middle Section - Loading Value */}
        <div className="flex-1 flex items-center justify-center py-2 sm:py-4">
          <div className="text-center">
            <div className="relative">
              {/* Skeleton with gradient background to match the actual component */}
              <div className="text-2xl sm:text-4xl lg:text-5xl font-semibold font-mono tracking-tight bg-gradient-to-br from-purple-600 via-purple-500 to-teal-500 bg-clip-text text-transparent">
                <Skeleton className="h-8 sm:h-12 lg:h-16 w-24 sm:w-32 lg:w-40 mx-auto bg-gradient-to-br from-purple-600/20 via-purple-500/20 to-teal-500/20" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Static Protocol Name, Loading Data Freshness */}
        <div className="flex items-center justify-between mt-auto">
          {/* Static Protocol Name */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm overflow-hidden bg-muted flex items-center justify-center">
              <span className="text-[8px] font-medium text-muted-foreground">
                {protocolName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">
              {protocolName}
            </span>
          </div>

          {/* Loading Data Freshness Indicator */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md border border-border/50 bg-muted/20">
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
            <Skeleton className="h-2 sm:h-2.5 w-6 sm:w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
