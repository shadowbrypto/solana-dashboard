import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from "date-fns";
import { TrendingUp, TrendingDown, Award, Target, AlertTriangle, Info, Activity, Users, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { protocolApi } from "../lib/api";
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolLogoFilename } from "../lib/protocol-config";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ComponentActions } from './ComponentActions';

interface MonthlyHighlightsProps {
  date: Date;
  loading?: boolean;
}

interface MonthlyProtocolPerformance {
  protocol: Protocol;
  current: ProtocolMetrics;
  previous: ProtocolMetrics[];
  trends: {
    volume1m: number;
    volume3m: number;
    users1m: number;
    trades1m: number;
    consistency: number;
  };
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'alert';
  title: string;
  description: string;
  protocol?: Protocol;
  value?: string;
  trend?: number;
  icon: React.ReactNode;
}

export function MonthlyHighlights({ date, loading: externalLoading = false }: MonthlyHighlightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyzeMonthlyData = async () => {
      setLoading(true);
      try {
        console.log('Fetching optimized monthly insights...');
        
        // Single optimized API call instead of 150+ individual calls
        const insightsData = await protocolApi.getMonthlyInsights(endOfMonth(date), 'private');
        
        console.log('Received optimized monthly insights:', insightsData);
        
        // Transform backend insights to frontend format
        const generatedInsights: Insight[] = insightsData.insights.map((insight: any) => ({
          type: insight.type,
          title: insight.title,
          description: insight.description,
          protocol: insight.protocol,
          value: insight.value ? formatCurrency(insight.value) : undefined,
          trend: insight.trend,
          icon: getIconForInsight(insight.type, insight.title)
        }));

        console.log('Monthly insights loaded:', generatedInsights.length, 'insights');
        setInsights(generatedInsights);
      } catch (error) {
        setInsights([]);
      } finally {
        setLoading(false);
      }
    };

    analyzeMonthlyData();
  }, [date]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const getIconForInsight = (type: string, title: string) => {
    if (title.includes('Leader') || title.includes('Volume')) {
      return <Award className="h-4 w-4" />;
    } else if (title.includes('Gainer') || title.includes('Growth')) {
      return <TrendingUp className="h-4 w-4" />;
    } else if (title.includes('Consistent') || title.includes('Reliable')) {
      return <Target className="h-4 w-4" />;
    } else if (title.includes('Efficiency') || title.includes('User')) {
      return <Users className="h-4 w-4" />;
    } else if (title.includes('Activity')) {
      return <Activity className="h-4 w-4" />;
    } else if (type === 'warning') {
      return <AlertTriangle className="h-4 w-4" />;
    } else if (type === 'info') {
      return <Info className="h-4 w-4" />;
    } else {
      return <Calendar className="h-4 w-4" />;
    }
  };

  const getInsightBadgeColor = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20';
      case 'warning':
        return 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20';
      case 'alert':
        return 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20';
      default:
        return 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20';
    }
  };

  const getInsightIconColor = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'alert':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getTrendBadge = (trend?: number) => {
    if (!trend || Math.abs(trend) < 0.01) return null;
    
    const isPositive = trend > 0;
    const percentage = Math.abs(trend * 100);
    
    return (
      <Badge 
        variant="secondary" 
        className={cn(
          "text-xs px-2 py-1 font-medium border-0 shadow-sm",
          isPositive 
            ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 dark:from-emerald-900/30 dark:to-green-900/30 dark:text-emerald-400"
            : "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 dark:from-red-900/30 dark:to-rose-900/30 dark:text-red-400"
        )}
      >
        {isPositive ? '↗' : '↘'} {percentage.toFixed(1)}%
      </Badge>
    );
  };

  if (loading || externalLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">Monthly Insights</CardTitle>
              <p className="text-xs text-muted-foreground">
                Key trends and performance highlights
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-5 text-xs">
                <Calendar className="w-2.5 h-2.5 mr-1 animate-pulse" />
                {format(date, 'MMM yyyy')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => {
              const isRightColumn = (i + 1) % 2 === 0;
              const isBottomRow = i >= 2;
              
              return (
                <div 
                  key={i}
                  className={`p-4 animate-pulse ${
                    !isRightColumn ? 'border-r' : ''
                  } ${
                    !isBottomRow ? 'border-b' : ''
                  }`}
                >
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 bg-muted rounded-lg"></div>
                      <div className="w-16 h-4 bg-muted rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-20 h-3 bg-muted rounded"></div>
                      <div className="w-full h-4 bg-muted rounded"></div>
                      <div className="w-24 h-3 bg-muted rounded"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ComponentActions 
      componentName="Monthly Insights"
      filename={`Monthly_Insights_${format(date, 'yyyy_MM')}.png`}
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">Monthly Insights</CardTitle>
              <p className="text-xs text-muted-foreground">
                Key trends and performance highlights
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-5 text-xs">
                <Calendar className="w-2.5 h-2.5 mr-1" />
                {format(date, 'MMM yyyy')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {insights.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No significant insights for this month</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2">
              {insights.slice(0, 4).map((insight, index) => {
                const isRightColumn = (index + 1) % 2 === 0;
                const isBottomRow = index >= 2;
                
                return (
                  <div 
                    key={index}
                    className={`relative group p-4 transition-colors hover:bg-muted/50 ${
                      !isRightColumn ? 'border-r' : ''
                    } ${
                      !isBottomRow ? 'border-b' : ''
                    }`}
                  >
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <div className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-lg",
                          getInsightBadgeColor(insight.type)
                        )}>
                          {React.cloneElement(insight.icon as React.ReactElement, {
                            className: cn("h-3.5 w-3.5", getInsightIconColor(insight.type))
                          })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {insight.protocol && (
                            <Badge variant="outline" className="text-xs font-medium px-2 py-1 flex items-center gap-1.5">
                              <div className="w-3 h-3 bg-muted/10 rounded-full overflow-hidden ring-1 ring-border/20">
                                <img 
                                  src={`/assets/logos/${getProtocolLogoFilename(insight.protocol)}`}
                                  alt={insight.protocol} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const container = target.parentElement;
                                    if (container) {
                                      container.innerHTML = '';
                                      container.className = 'w-3 h-3 bg-muted/20 rounded-full flex items-center justify-center';
                                      const iconEl = document.createElement('div');
                                      iconEl.innerHTML = '<svg class="h-1.5 w-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                      container.appendChild(iconEl);
                                    }
                                  }}
                                />
                              </div>
                              {insight.protocol.charAt(0).toUpperCase() + insight.protocol.slice(1)}
                            </Badge>
                          )}
                          {getTrendBadge(insight.trend)}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium leading-none text-muted-foreground">
                          {insight.title}
                        </h4>
                        <p className="text-sm font-semibold tracking-tight leading-tight">
                          {insight.description}
                        </p>
                        {insight.value && (
                          <p className="text-xs text-muted-foreground/70">
                            {insight.value}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Subtle hover effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </ComponentActions>
  );
}