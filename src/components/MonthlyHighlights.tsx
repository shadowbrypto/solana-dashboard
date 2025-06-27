import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from "date-fns";
import { TrendingUp, TrendingDown, Award, Target, AlertTriangle, Info, Activity, Users, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { getDailyMetrics } from "../lib/protocol";
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolLogoFilename } from "../lib/protocol-config";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface MonthlyHighlightsProps {
  date: Date;
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

export function MonthlyHighlights({ date }: MonthlyHighlightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyzeMonthlyData = async () => {
      setLoading(true);
      try {
        const performances: MonthlyProtocolPerformance[] = [];
        
        // Get all protocols except 'all'
        const allProtocols: Protocol[] = [];
        getMutableAllCategories().forEach(categoryName => {
          const categoryProtocols = getMutableProtocolsByCategory(categoryName);
          categoryProtocols.forEach(p => {
            if (!allProtocols.includes(p.id as Protocol)) {
              allProtocols.push(p.id as Protocol);
            }
          });
        });

        // Get month boundaries
        const currentMonthStart = startOfMonth(date);
        const currentMonthEnd = endOfMonth(date);
        const previousMonthStart = startOfMonth(subMonths(date, 1));
        const previousMonthEnd = endOfMonth(subMonths(date, 1));
        const threeMonthsAgoStart = startOfMonth(subMonths(date, 3));

        // Fetch daily data for the entire month
        const currentMonthDays = eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });
        const previousMonthDays = eachDayOfInterval({ start: previousMonthStart, end: previousMonthEnd });
        
        // Get all daily data for current month
        const currentMonthData = await Promise.all(
          currentMonthDays.map(day => getDailyMetrics(day))
        );
        
        // Get all daily data for previous month
        const previousMonthData = await Promise.all(
          previousMonthDays.map(day => getDailyMetrics(day))
        );

        // Get previous 3 months for historical comparison
        const historical3m = await Promise.all(
          Array.from({ length: 90 }, (_, i) => getDailyMetrics(subMonths(date, Math.floor(i / 30) + 1)))
        );

        // Aggregate monthly data for each protocol
        for (const protocol of allProtocols) {
          // Current month aggregation
          const currentMonthMetrics = currentMonthData.reduce((acc, dayData) => {
            const protocolData = dayData[protocol];
            if (protocolData) {
              acc.total_volume_usd += protocolData.total_volume_usd;
              acc.daily_users = Math.max(acc.daily_users, protocolData.daily_users);
              acc.numberOfNewUsers += protocolData.numberOfNewUsers;
              acc.daily_trades += protocolData.daily_trades;
              acc.total_fees_usd += protocolData.total_fees_usd;
            }
            return acc;
          }, {
            total_volume_usd: 0,
            daily_users: 0,
            numberOfNewUsers: 0,
            daily_trades: 0,
            total_fees_usd: 0
          });

          // Previous month aggregation
          const previousMonthMetrics = previousMonthData.reduce((acc, dayData) => {
            const protocolData = dayData[protocol];
            if (protocolData) {
              acc.total_volume_usd += protocolData.total_volume_usd;
              acc.daily_users = Math.max(acc.daily_users, protocolData.daily_users);
              acc.numberOfNewUsers += protocolData.numberOfNewUsers;
              acc.daily_trades += protocolData.daily_trades;
              acc.total_fees_usd += protocolData.total_fees_usd;
            }
            return acc;
          }, {
            total_volume_usd: 0,
            daily_users: 0,
            numberOfNewUsers: 0,
            daily_trades: 0,
            total_fees_usd: 0
          });

          if (currentMonthMetrics.total_volume_usd === 0) continue;

          // Calculate trends
          const volume1m = previousMonthMetrics.total_volume_usd > 0 ? 
            (currentMonthMetrics.total_volume_usd - previousMonthMetrics.total_volume_usd) / previousMonthMetrics.total_volume_usd : 0;
          
          const avg3mVolume = historical3m.reduce((sum, data) => sum + (data[protocol]?.total_volume_usd || 0), 0) / Math.max(historical3m.length, 1);
          const volume3m = avg3mVolume > 0 ? (currentMonthMetrics.total_volume_usd - avg3mVolume) / avg3mVolume : 0;
          
          const users1m = previousMonthMetrics.daily_users > 0 ? 
            (currentMonthMetrics.daily_users - previousMonthMetrics.daily_users) / previousMonthMetrics.daily_users : 0;
          
          const trades1m = previousMonthMetrics.daily_trades > 0 ? 
            (currentMonthMetrics.daily_trades - previousMonthMetrics.daily_trades) / previousMonthMetrics.daily_trades : 0;

          // Calculate consistency (monthly volume variance over 3 months)
          const monthlyVolumes = [0, 1, 2].map(i => {
            const monthStart = startOfMonth(subMonths(date, i));
            const monthEnd = endOfMonth(subMonths(date, i));
            const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
            return monthDays.reduce((sum, day) => {
              const dayIndex = Math.floor((new Date().getTime() - day.getTime()) / (1000 * 60 * 60 * 24));
              const dayData = historical3m[dayIndex];
              return sum + (dayData?.[protocol]?.total_volume_usd || 0);
            }, 0);
          });
          
          const avgMonthlyVolume = monthlyVolumes.reduce((sum, vol) => sum + vol, 0) / monthlyVolumes.length;
          const volumeVariance = monthlyVolumes.reduce((sum, vol) => sum + Math.pow(vol - avgMonthlyVolume, 2), 0) / monthlyVolumes.length;
          const reliability = avgMonthlyVolume > 0 ? avgMonthlyVolume * (1 / (1 + Math.sqrt(volumeVariance) / avgMonthlyVolume)) : 0;

          performances.push({
            protocol,
            current: currentMonthMetrics,
            previous: [previousMonthMetrics],
            trends: {
              volume1m,
              volume3m,
              users1m,
              trades1m,
              consistency: reliability
            }
          });
        }

        // Generate insights using similar logic to daily but adapted for monthly
        const generatedInsights: Insight[] = [];

        // 1. Top Performer by Volume
        const topByVolume = performances.reduce((best, current) => 
          current.current.total_volume_usd > best.current.total_volume_usd ? current : best
        );
        
        generatedInsights.push({
          type: 'success',
          title: 'Monthly Volume Leader',
          description: `Dominated the month with ${formatCurrency(topByVolume.current.total_volume_usd)} in total volume`,
          protocol: topByVolume.protocol,
          value: formatCurrency(topByVolume.current.total_volume_usd),
          trend: topByVolume.trends.volume1m,
          icon: <Award className="h-4 w-4" />
        });

        // 2. Biggest Monthly Gainer
        const biggestGainer = performances
          .filter(p => p.trends.volume1m > 0)
          .reduce((best, current) => 
            current.trends.volume1m > best.trends.volume1m ? current : best, 
            { trends: { volume1m: -Infinity } } as MonthlyProtocolPerformance
          );

        if (biggestGainer.trends.volume1m > 0.1) { // > 10% growth
          generatedInsights.push({
            type: 'success',
            title: 'Monthly Breakout',
            description: `Surged ${(biggestGainer.trends.volume1m * 100).toFixed(1)}% in volume from last month`,
            protocol: biggestGainer.protocol,
            trend: biggestGainer.trends.volume1m,
            icon: <TrendingUp className="h-4 w-4" />
          });
        }

        // 3. Monthly Market Leader
        const totalMarketVolume = performances.reduce((sum, p) => sum + p.current.total_volume_usd, 0);
        const sortedByVolume = performances
          .filter(p => p.current.total_volume_usd > 0)
          .sort((a, b) => b.current.total_volume_usd - a.current.total_volume_usd);

        if (sortedByVolume.length > 0 && totalMarketVolume > 0) {
          const marketLeader = sortedByVolume[0];
          const leaderMarketShare = marketLeader.current.total_volume_usd / totalMarketVolume;
          
          if (leaderMarketShare >= 0.25) { // 25%+ market share
            generatedInsights.push({
              type: 'success',
              title: 'Monthly Market Dominance',
              description: `Controlled ${(leaderMarketShare * 100).toFixed(1)}% of total market volume throughout the month`,
              protocol: marketLeader.protocol,
              value: `${(leaderMarketShare * 100).toFixed(1)}% market share`,
              icon: <Target className="h-4 w-4" />
            });
          }
        }

        // 4. Monthly Efficiency Champion
        const efficiencyCandidates = performances
          .filter(p => p.current.total_volume_usd > 1000000) // Min $1M monthly volume
          .filter(p => p.current.daily_users > 50) // Min 50 peak users
          .map(p => {
            const volumePerUser = p.current.total_volume_usd / p.current.daily_users;
            return {
              protocol: p.protocol,
              volumePerUser,
              totalVolume: p.current.total_volume_usd,
              totalUsers: p.current.daily_users
            };
          })
          .sort((a, b) => b.volumePerUser - a.volumePerUser);

        if (efficiencyCandidates.length > 0) {
          const efficiencyChampion = efficiencyCandidates[0];
          const marketAvgVolumePerUser = performances
            .filter(p => p.current.daily_users > 0)
            .reduce((sum, p) => sum + (p.current.total_volume_usd / p.current.daily_users), 0) / 
            performances.filter(p => p.current.daily_users > 0).length;
          
          const efficiencyMultiplier = efficiencyChampion.volumePerUser / marketAvgVolumePerUser;
          
          if (efficiencyMultiplier > 1.5) {
            generatedInsights.push({
              type: 'info',
              title: 'Monthly Efficiency Leader',
              description: `Generated ${formatCurrency(efficiencyChampion.volumePerUser)} per user, ${efficiencyMultiplier.toFixed(1)}x above market average`,
              protocol: efficiencyChampion.protocol,
              value: `${formatCurrency(efficiencyChampion.volumePerUser)} per user`,
              icon: <Users className="h-4 w-4" />
            });
          }
        }

        setInsights(generatedInsights.slice(0, 4)); // Show top 4 insights for 2x2 grid
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

  if (loading) {
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
  );
}