import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowUp, ArrowDown, Crown } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '../lib/utils';
import { getProtocolById } from '../lib/protocol-config';

interface DailyStatsRow {
  app: string;
  protocolId: string;
  volume: number;
  volumeGrowth: number;
  daus: number;
  dausGrowth: number;
  newUsers: number;
  newUsersGrowth: number;
  trades: number;
  tradesGrowth: number;
}

type MetricType = 'volume' | 'daus' | 'newUsers' | 'trades';

interface DailyStatsCardProps {
  title?: string;
  data: DailyStatsRow[];
  className?: string;
}

export function DailyStatsCard({ 
  title = "Daily Stats", 
  data, 
  className 
}: DailyStatsCardProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('volume');

  const getMetricValue = (row: DailyStatsRow, metric: MetricType): number => {
    switch (metric) {
      case 'volume': return row.volume;
      case 'daus': return row.daus;
      case 'newUsers': return row.newUsers;
      case 'trades': return row.trades;
    }
  };

  const getMetricGrowth = (row: DailyStatsRow, metric: MetricType): number => {
    switch (metric) {
      case 'volume': return row.volumeGrowth;
      case 'daus': return row.dausGrowth;
      case 'newUsers': return row.newUsersGrowth;
      case 'trades': return row.tradesGrowth;
    }
  };

  const formatMetricValue = (value: number, metric: MetricType): string => {
    return metric === 'volume' ? formatCurrency(value) : formatNumber(value);
  };

  const tabs = [
    { id: 'volume' as MetricType, label: 'Volume' },
    { id: 'daus' as MetricType, label: 'DAUs' },
    { id: 'newUsers' as MetricType, label: 'New Users' },
    { id: 'trades' as MetricType, label: 'Trades' }
  ];

  // Take only first 6 rows
  const displayData = data.slice(0, 6);

  return (
    <Card className={cn("overflow-hidden shadow-sm h-full", className)}>
      <CardHeader className="p-4 pb-2">
        {/* Tabs */}
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMetric(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all border",
                activeMetric === tab.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-6 flex-1 flex flex-col">
        <div className="space-y-6 flex-1">
          {/* Data rows */}
          {displayData.map((row, index) => {
            const protocol = getProtocolById(row.protocolId);
            const IconComponent = protocol?.icon;
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {IconComponent && (
                    <IconComponent className="w-6 h-6 text-foreground flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-foreground">
                      {row.app}
                    </div>
                    {index === 0 && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                    {index === 1 && (
                      <Crown className="w-4 h-4 text-gray-400" />
                    )}
                    {index === 2 && (
                      <Crown className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-foreground">
                    {formatMetricValue(getMetricValue(row, activeMetric), activeMetric)}
                  </div>
                  <Badge 
                    variant={getMetricGrowth(row, activeMetric) >= 0 ? "default" : "destructive"}
                    className={cn(
                      "flex items-center gap-0.5 px-1 py-0 shadow-none",
                      getMetricGrowth(row, activeMetric) >= 0 
                        ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                    )}
                  >
                    {getMetricGrowth(row, activeMetric) >= 0 ? (
                      <ArrowUp className="w-2.5 h-2.5" />
                    ) : (
                      <ArrowDown className="w-2.5 h-2.5" />
                    )}
                    <span className="text-xs font-medium">
                      {Math.abs(getMetricGrowth(row, activeMetric)).toFixed(1)}%
                    </span>
                  </Badge>
                </div>
              </div>
            );
          })}
          
          {/* Single horizontal bar chart */}
          <div className="mt-4">
            <div className="flex rounded-md overflow-hidden h-3 bg-muted">
              {displayData.map((row, index) => {
                const totalValue = displayData.reduce((sum, item) => sum + getMetricValue(item, activeMetric), 0);
                const percentage = (getMetricValue(row, activeMetric) / totalValue) * 100;
                const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
                
                return (
                  <div 
                    key={index}
                    className={`h-full ${colors[index]} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                    title={`${row.app}: ${percentage.toFixed(1)}%`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}