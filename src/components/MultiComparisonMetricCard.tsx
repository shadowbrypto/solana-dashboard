import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { getProtocolLogoFilename } from '../lib/protocol-config';
import { ComponentActions } from './ComponentActions';

interface ProtocolData {
  protocol: string;
  name: string;
  color: string;
  metrics: any;
}

interface MultiComparisonMetricCardProps {
  title: string;
  icon: LucideIcon;
  data: ProtocolData[];
  dataKey: string;
  formatter: (value: number) => string;
}

export function MultiComparisonMetricCard({
  title,
  icon: Icon,
  data,
  dataKey,
  formatter
}: MultiComparisonMetricCardProps) {
  // Extract values and sort by performance
  const protocolValues = data.map(item => ({
    ...item,
    value: item.metrics[dataKey] || 0
  })).sort((a, b) => b.value - a.value);

  const maxValue = protocolValues[0]?.value || 0;
  
  // Helper function to get rank styling using shadcn color themes
  const getRankStyling = (index: number) => {
    if (data.length >= 3) {
      switch (index) {
        case 0: // Gold - using emerald/green colors for success/winning
          return {
            bgColor: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20",
            borderColor: "border-emerald-200 dark:border-emerald-900/30",
            rankColor: "text-emerald-700 dark:text-emerald-500/80"
          };
        case 1: // Silver - using blue colors
          return {
            bgColor: "bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20",
            borderColor: "border-blue-200 dark:border-blue-900/30",
            rankColor: "text-blue-700 dark:text-blue-500/80"
          };
        case 2: // Bronze - using orange/amber colors
          return {
            bgColor: "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20",
            borderColor: "border-orange-200 dark:border-orange-900/30",
            rankColor: "text-orange-700 dark:text-orange-500/80"
          };
        default:
          return {
            bgColor: "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/10 dark:to-slate-950/10",
            borderColor: "border-gray-200 dark:border-gray-900/20",
            rankColor: "text-gray-600 dark:text-gray-500/60"
          };
      }
    } else {
      // Only emerald/green for top position when less than 3 protocols
      if (index === 0) {
        return {
          bgColor: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20",
          borderColor: "border-emerald-200 dark:border-emerald-900/30",
          rankColor: "text-emerald-700 dark:text-emerald-500/80"
        };
      }
      return {
        bgColor: "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/10 dark:to-slate-950/10",
        borderColor: "border-gray-200 dark:border-gray-900/20",
        rankColor: "text-gray-600 dark:text-gray-500/60"
      };
    }
  };

  // Show maximum 5 protocols
  const displayProtocols = protocolValues.slice(0, 5);

  return (
    <ComponentActions 
      componentName={`${title} Comparison`}
      filename={`${title.replace(/\s+/g, '_')}_Comparison.png`}
    >
      <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg group">
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-3 sm:p-6 sm:pt-0">
          <div className="space-y-1.5 sm:space-y-2">
            {displayProtocols.map((item, index) => {
              const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              const styling = getRankStyling(index);
              
              return (
                <div 
                  key={item.protocol} 
                  className={cn(
                    "flex items-center justify-between p-1.5 sm:p-2 rounded-lg border transition-all duration-200 hover:scale-[1.02]",
                    styling.bgColor,
                    styling.borderColor
                  )}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <span className={cn("text-[10px] sm:text-xs font-semibold w-4 sm:w-6 flex-shrink-0", styling.rankColor)}>
                      #{index + 1}
                    </span>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                      <img 
                        src={`/assets/logos/${getProtocolLogoFilename(item.protocol)}`}
                        alt={item.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const container = target.parentElement;
                          if (container) {
                            container.innerHTML = '';
                            container.className = 'w-3 h-3 sm:w-4 sm:h-4 bg-muted/20 rounded flex items-center justify-center flex-shrink-0';
                            const iconEl = document.createElement('div');
                            iconEl.innerHTML = '<svg class="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                            container.appendChild(iconEl);
                          }
                        }}
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium truncate min-w-0">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <div className="w-8 sm:w-12 h-1 sm:h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold w-12 sm:w-16 text-right text-foreground">
                      {formatter(item.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}