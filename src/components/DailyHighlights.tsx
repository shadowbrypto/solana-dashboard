import React, { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { TrendingUp, TrendingDown, Award, Target, AlertTriangle, Info, Activity, Users, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { protocolApi } from "../lib/api";
import { getProtocolLogoFilename } from "../lib/protocol-config";
import { Settings } from "../lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ComponentActions } from './ComponentActions';

interface DailyHighlightsProps {
  date: Date;
}

interface ProtocolPerformance {
  protocol: Protocol;
  current: ProtocolMetrics;
  previous7d: ProtocolMetrics[];
  previous30d: ProtocolMetrics[];
  trends: {
    volume1d: number;
    volume7d: number;
    volume30d: number;
    users1d: number;
    users7d: number;
    trades1d: number;
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

export function DailyHighlights({ date }: DailyHighlightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHighlights = async () => {
      setLoading(true);
      try {
        const dataType = Settings.getDataTypePreference();
        console.log('Fetching daily highlights for date:', format(date, 'yyyy-MM-dd'), 'dataType:', dataType);
        
        const highlightsData = await protocolApi.getDailyHighlightsSol(date, dataType);
        console.log('Daily highlights received:', highlightsData);
        
        // Transform backend insights to frontend format
        const transformedInsights: Insight[] = highlightsData.insights.map((insight: any) => ({
          type: insight.type,
          title: insight.title,
          description: insight.description,
          protocol: insight.protocol,
          value: insight.value,
          trend: insight.trend,
          icon: getInsightIcon(insight.title)
        }));
        
        setInsights(transformedInsights);
      } catch (error) {
        console.error('Error loading daily highlights:', error);
        setInsights([]);
      } finally {
        setLoading(false);
      }
    };

    loadHighlights();
  }, [date]);

  // Helper function to get the appropriate icon for insights
  const getInsightIcon = (title: string): React.ReactNode => {
    if (title.includes('Volume Leader') || title.includes('Market Leader')) {
      return <Award className="h-4 w-4" />;
    } else if (title.includes('Breakout') || title.includes('Momentum')) {
      return <TrendingUp className="h-4 w-4" />;
    } else if (title.includes('Reliable') || title.includes('Efficiency')) {
      return <Target className="h-4 w-4" />;
    } else if (title.includes('User')) {
      return <Users className="h-4 w-4" />;
    } else if (title.includes('Trading') || title.includes('High-Value')) {
      return <Activity className="h-4 w-4" />;
    } else if (title.includes('Concern') || title.includes('Alert')) {
      return <AlertTriangle className="h-4 w-4" />;
    } else {
      return <Info className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
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
          "text-[9px] md:text-xs px-1 py-0.5 md:px-2 md:py-1 font-medium border-0 shadow-sm",
          isPositive 
            ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 dark:from-emerald-900/30 dark:to-green-900/30 dark:text-emerald-400"
            : "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 dark:from-red-900/30 dark:to-rose-900/30 dark:text-red-400"
        )}
      >
        {isPositive ? '↗' : '↘'} {percentage.toFixed(1)}%
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 md:space-y-1">
              <CardTitle className="text-xs md:text-base font-medium">Daily Insights</CardTitle>
              <p className="text-[9px] md:text-xs text-muted-foreground">
                Key trends and performance highlights
              </p>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <Badge variant="secondary" className="h-3.5 md:h-5 text-[9px] md:text-xs">
                <Calendar className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5 md:mr-1 animate-pulse" />
                {format(date, 'MMM dd')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="border-b md:hidden"></div>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => {
              const isRightColumn = (i + 1) % 2 === 0;
              const isBottomRow = i >= 2;
              
              return (
                <div 
                  key={i}
                  className={`p-2 md:p-4 animate-pulse border-b ${
                    !isRightColumn ? 'border-r' : ''
                  } ${
                    isBottomRow ? 'md:border-b-0' : ''
                  }`}
                >
                  <div className="flex flex-col space-y-1 md:space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-5 h-5 md:w-7 md:h-7 bg-muted rounded-lg"></div>
                      <div className="w-12 h-3 md:w-16 md:h-4 bg-muted rounded"></div>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="w-16 h-2.5 md:w-20 md:h-3 bg-muted rounded"></div>
                      <div className="w-full h-3 md:h-4 bg-muted rounded"></div>
                      <div className="w-20 h-2.5 md:w-24 md:h-3 bg-muted rounded"></div>
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
      componentName="Daily Insights"
      filename={`Daily_Insights_${format(date, 'yyyy_MM_dd')}.png`}
    >
      <Card className="overflow-hidden">
      <CardHeader className="p-3 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 md:space-y-1">
            <CardTitle className="text-xs md:text-base font-medium">Daily Insights</CardTitle>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              Key trends and performance highlights
            </p>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Badge variant="secondary" className="h-3.5 md:h-5 text-[9px] md:text-xs">
              <Calendar className="w-2 h-2 md:w-2.5 md:h-2.5 mr-0.5 md:mr-1" />
              {format(date, 'MMM dd')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <div className="border-b md:hidden"></div>
      <CardContent className="p-0">
        {insights.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 md:py-8">
            <Info className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
            <p className="text-[10px] md:text-sm">No significant insights for this date</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2">
            {insights.slice(0, 4).map((insight, index) => {
              const isRightColumn = (index + 1) % 2 === 0;
              const isBottomRow = index >= 2;
              
              return (
                <div 
                  key={index}
                  className={`relative group p-2 md:p-4 transition-colors hover:bg-muted/50 border-b ${
                    !isRightColumn ? 'border-r' : ''
                  } ${
                    isBottomRow ? 'md:border-b-0' : ''
                  }`}
                >
                  <div className="flex flex-col space-y-1 md:space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "inline-flex h-4 w-4 md:h-7 md:w-7 items-center justify-center rounded-lg",
                        getInsightBadgeColor(insight.type)
                      )}>
                        {React.cloneElement(insight.icon as React.ReactElement, {
                          className: cn("h-2 w-2 md:h-3.5 md:w-3.5", getInsightIconColor(insight.type))
                        })}
                      </div>
                      <div className="flex items-center gap-1 md:gap-1.5">
                        {insight.protocol && (
                          <Badge variant="outline" className="text-[8px] md:text-xs font-medium px-1 py-0.5 md:px-2 md:py-1 flex items-center gap-0.5 md:gap-1.5">
                            <div className="w-2 h-2 md:w-3 md:h-3 bg-muted/10 rounded-full overflow-hidden ring-1 ring-border/20">
                              <img 
                                src={`/assets/logos/${getProtocolLogoFilename(insight.protocol)}`}
                                alt={insight.protocol} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const container = target.parentElement;
                                  if (container) {
                                    container.innerHTML = '';
                                    container.className = 'w-2 h-2 md:w-3 md:h-3 bg-muted/20 rounded-full flex items-center justify-center';
                                    const iconEl = document.createElement('div');
                                    iconEl.innerHTML = '<svg class="h-1 w-1 md:h-1.5 md:w-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                    container.appendChild(iconEl);
                                  }
                                }}
                              />
                            </div>
                            {insight.protocol.charAt(0).toUpperCase() + insight.protocol.slice(1)}
                          </Badge>
                        )}
                        <div className="hidden sm:block">
                          {getTrendBadge(insight.trend)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-0.5 md:space-y-1">
                      <h4 className="text-[9px] md:text-xs font-medium leading-none text-muted-foreground">
                        {insight.title}
                      </h4>
                      <p className="text-[10px] md:text-sm font-semibold tracking-tight leading-tight">
                        {insight.description}
                      </p>
                      {insight.value && (
                        <p className="text-[9px] md:text-xs text-muted-foreground/70">
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