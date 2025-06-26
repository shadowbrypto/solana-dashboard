import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { getProtocolLogoFilename } from '../lib/protocol-config';

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
            bgColor: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50",
            borderColor: "border-emerald-200 dark:border-emerald-800",
            rankColor: "text-emerald-700 dark:text-emerald-400"
          };
        case 1: // Silver - using blue colors
          return {
            bgColor: "bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/50 dark:to-sky-950/50",
            borderColor: "border-blue-200 dark:border-blue-800",
            rankColor: "text-blue-700 dark:text-blue-400"
          };
        case 2: // Bronze - using orange/amber colors
          return {
            bgColor: "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50",
            borderColor: "border-orange-200 dark:border-orange-800",
            rankColor: "text-orange-700 dark:text-orange-400"
          };
        default:
          return {
            bgColor: "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50",
            borderColor: "border-gray-200 dark:border-gray-800",
            rankColor: "text-gray-600 dark:text-gray-400"
          };
      }
    } else {
      // Only emerald/green for top position when less than 3 protocols
      if (index === 0) {
        return {
          bgColor: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50",
          borderColor: "border-emerald-200 dark:border-emerald-800",
          rankColor: "text-emerald-700 dark:text-emerald-400"
        };
      }
      return {
        bgColor: "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50",
        borderColor: "border-gray-200 dark:border-gray-800",
        rankColor: "text-gray-600 dark:text-gray-400"
      };
    }
  };

  // Show maximum 5 protocols
  const displayProtocols = protocolValues.slice(0, 5);

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg group">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {displayProtocols.map((item, index) => {
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const styling = getRankStyling(index);
            
            return (
              <div 
                key={item.protocol} 
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border transition-all duration-200 hover:scale-[1.02]",
                  styling.bgColor,
                  styling.borderColor
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={cn("text-xs font-semibold w-6 flex-shrink-0", styling.rankColor)}>
                    #{index + 1}
                  </span>
                  <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                    <img 
                      src={`/assets/logos/${getProtocolLogoFilename(item.protocol)}`}
                      alt={item.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const container = target.parentElement;
                        if (container) {
                          container.innerHTML = '';
                          container.className = 'w-4 h-4 bg-muted/20 rounded flex items-center justify-center flex-shrink-0';
                          const iconEl = document.createElement('div');
                          iconEl.innerHTML = '<svg class="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                          container.appendChild(iconEl);
                        }
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium truncate min-w-0">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-12 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: item.color 
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold w-16 text-right text-foreground">
                    {formatter(item.value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}