import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { LucideIcon, Crown } from 'lucide-react';
import { cn } from '../lib/utils';

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
  const winner = protocolValues[0];

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg group">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Winner highlight */}
        {winner && (
          <div className="p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold">Leader</span>
              </div>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                #{1}
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: winner.color }}
                />
                <span className="text-sm font-medium truncate max-w-24">
                  {winner.name}
                </span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {formatter(winner.value)}
              </span>
            </div>
          </div>
        )}

        {/* All protocols list */}
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {protocolValues.map((item, index) => {
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const isWinner = index === 0;
            
            return (
              <div key={item.protocol} className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-colors",
                isWinner ? "bg-muted/50" : "hover:bg-muted/30"
              )}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground w-4">
                    #{index + 1}
                  </span>
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium truncate max-w-16">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: item.color 
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-16 text-right">
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