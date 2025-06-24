import React, { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { TrendingUp, TrendingDown, Award, Target, AlertTriangle, Info, Activity, Users, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { getDailyMetrics } from "../lib/protocol";
import { getMutableAllCategories, getMutableProtocolsByCategory } from "../lib/protocol-config";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

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
    const analyzeData = async () => {
      setLoading(true);
      try {
        const performances: ProtocolPerformance[] = [];
        
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

        // Fetch data for current day and historical periods
        const currentData = await getDailyMetrics(date);
        const yesterdayData = await getDailyMetrics(subDays(date, 1));
        
        // Fetch 7-day and 30-day historical data
        const historical7d = await Promise.all(
          Array.from({ length: 7 }, (_, i) => getDailyMetrics(subDays(date, i + 1)))
        );
        
        const historical30d = await Promise.all(
          Array.from({ length: 30 }, (_, i) => getDailyMetrics(subDays(date, i + 1)))
        );

        // Analyze each protocol
        for (const protocol of allProtocols) {
          const current = currentData[protocol];
          const yesterday = yesterdayData[protocol];
          
          if (!current || current.total_volume_usd === 0) continue;

          const previous7d = historical7d.map(data => data[protocol]).filter(Boolean);
          const previous30d = historical30d.map(data => data[protocol]).filter(Boolean);

          // Calculate trends
          const volume1d = yesterday?.total_volume_usd ? 
            (current.total_volume_usd - yesterday.total_volume_usd) / yesterday.total_volume_usd : 0;
          
          const avg7dVolume = previous7d.reduce((sum, d) => sum + d.total_volume_usd, 0) / Math.max(previous7d.length, 1);
          const volume7d = avg7dVolume > 0 ? (current.total_volume_usd - avg7dVolume) / avg7dVolume : 0;
          
          const avg30dVolume = previous30d.reduce((sum, d) => sum + d.total_volume_usd, 0) / Math.max(previous30d.length, 1);
          const volume30d = avg30dVolume > 0 ? (current.total_volume_usd - avg30dVolume) / avg30dVolume : 0;

          const users1d = yesterday?.daily_users ? 
            (current.daily_users - yesterday.daily_users) / yesterday.daily_users : 0;
          
          const avg7dUsers = previous7d.reduce((sum, d) => sum + d.daily_users, 0) / Math.max(previous7d.length, 1);
          const users7d = avg7dUsers > 0 ? (current.daily_users - avg7dUsers) / avg7dUsers : 0;

          const trades1d = yesterday?.daily_trades ? 
            (current.daily_trades - yesterday.daily_trades) / yesterday.daily_trades : 0;

          // Calculate reliability score (high volume + low volatility)
          const volumeVariance = previous7d.length > 1 ? 
            previous7d.reduce((sum, d) => sum + Math.pow(d.total_volume_usd - avg7dVolume, 2), 0) / previous7d.length : 0;
          const coefficientOfVariation = avg7dVolume > 0 ? Math.sqrt(volumeVariance) / avg7dVolume : 1;
          // Reliability = high volume * low volatility (lower CV = more reliable)
          const reliability = avg7dVolume * (1 / (1 + coefficientOfVariation));

          performances.push({
            protocol,
            current,
            previous7d,
            previous30d,
            trends: {
              volume1d,
              volume7d,
              volume30d,
              users1d,
              users7d,
              trades1d,
              consistency: reliability
            }
          });
        }

        // Generate insights
        const generatedInsights: Insight[] = [];

        // 1. Top Performer by Volume
        const topByVolume = performances.reduce((best, current) => 
          current.current.total_volume_usd > best.current.total_volume_usd ? current : best
        );
        
        generatedInsights.push({
          type: 'success',
          title: 'Volume Leader',
          description: `Dominates with ${formatCurrency(topByVolume.current.total_volume_usd)} in daily volume`,
          protocol: topByVolume.protocol,
          value: formatCurrency(topByVolume.current.total_volume_usd),
          trend: topByVolume.trends.volume1d,
          icon: <Award className="h-4 w-4" />
        });

        // 2. Biggest Gainer (1-day volume growth)
        const biggestGainer = performances
          .filter(p => p.trends.volume1d > 0)
          .reduce((best, current) => 
            current.trends.volume1d > best.trends.volume1d ? current : best, 
            { trends: { volume1d: -Infinity } } as ProtocolPerformance
          );

        if (biggestGainer.trends.volume1d > 0.05) { // > 5% growth
          generatedInsights.push({
            type: 'success',
            title: 'Breakout Performance',
            description: `Surged ${(biggestGainer.trends.volume1d * 100).toFixed(1)}% in volume from yesterday`,
            protocol: biggestGainer.protocol,
            trend: biggestGainer.trends.volume1d,
            icon: <TrendingUp className="h-4 w-4" />
          });
        }

        // 3. Most Reliable High Performer (high volume + low volatility)
        const reliablePerformers = performances
          .filter(p => p.current.total_volume_usd > 500000) // Min $500K daily volume
          .filter(p => p.previous7d.length >= 5); // Need at least 5 days of data
        
        if (reliablePerformers.length > 0) {
          const mostReliable = reliablePerformers.reduce((best, current) => 
            current.trends.consistency > best.trends.consistency ? current : best
          );

          const avg7dVolume = mostReliable.previous7d.reduce((sum, d) => sum + d.total_volume_usd, 0) / mostReliable.previous7d.length;
          const volumeRange = Math.max(...mostReliable.previous7d.map(d => d.total_volume_usd)) - 
                             Math.min(...mostReliable.previous7d.map(d => d.total_volume_usd));
          const volatilityPercent = (volumeRange / avg7dVolume) * 100;

          generatedInsights.push({
            type: 'info',
            title: 'Reliable High Performer',
            description: `Maintains strong ${formatCurrency(avg7dVolume)} average daily volume with only ${volatilityPercent.toFixed(1)}% volatility`,
            protocol: mostReliable.protocol,
            value: `${formatCurrency(avg7dVolume)} avg volume`,
            icon: <Target className="h-4 w-4" />
          });
        }

        // 4. Stable Market Leader (consistently top performer)
        const topPerformers = performances
          .filter(p => p.current.total_volume_usd > 1000000) // Min $1M daily volume
          .sort((a, b) => b.current.total_volume_usd - a.current.total_volume_usd)
          .slice(0, 3); // Top 3 by current volume

        if (topPerformers.length > 0) {
          const stableLeader = topPerformers.find(p => {
            // Check if this protocol has been consistently performing well
            const daysAbove1M = p.previous7d.filter(d => d.total_volume_usd > 1000000).length;
            const hasStableGrowth = p.trends.volume7d > -0.1; // Not declining significantly
            return daysAbove1M >= 5 && hasStableGrowth; // 5+ days above $1M and not declining
          });

          if (stableLeader && topPerformers.indexOf(stableLeader) === 0) {
            const daysAbove1M = stableLeader.previous7d.filter(d => d.total_volume_usd > 1000000).length;
            generatedInsights.push({
              type: 'success',
              title: 'Stable Market Leader',
              description: `Maintains #1 position with ${daysAbove1M}/7 days above $1M volume, showing market dominance`,
              protocol: stableLeader.protocol,
              value: `${daysAbove1M}/7 strong days`,
              icon: <Award className="h-4 w-4" />
            });
          }
        }

        // 5. User Growth Champion
        const userGrowthLeader = performances
          .filter(p => p.trends.users7d > 0)
          .reduce((best, current) => 
            current.trends.users7d > best.trends.users7d ? current : best,
            { trends: { users7d: -Infinity } } as ProtocolPerformance
          );

        if (userGrowthLeader.trends.users7d > 0.1) { // > 10% user growth
          generatedInsights.push({
            type: 'success',
            title: 'User Acquisition Leader',
            description: `Grew user base by ${(userGrowthLeader.trends.users7d * 100).toFixed(1)}% over 7 days`,
            protocol: userGrowthLeader.protocol,
            trend: userGrowthLeader.trends.users7d,
            icon: <Users className="h-4 w-4" />
          });
        }

        // 6. Underperformer Alert
        const underperformer = performances
          .filter(p => p.current.total_volume_usd > 100000) // Only consider protocols with meaningful volume
          .filter(p => p.trends.volume7d < -0.2) // > 20% decline
          .reduce((worst, current) => 
            current.trends.volume7d < worst.trends.volume7d ? current : worst,
            { trends: { volume7d: Infinity } } as ProtocolPerformance
          );

        if (underperformer.trends.volume7d < -0.2) {
          generatedInsights.push({
            type: 'alert',
            title: 'Performance Concern',
            description: `Volume declined ${Math.abs(underperformer.trends.volume7d * 100).toFixed(1)}% over the past week`,
            protocol: underperformer.protocol,
            trend: underperformer.trends.volume7d,
            icon: <AlertTriangle className="h-4 w-4" />
          });
        }

        // 7. Trading Activity Insights
        const totalVolume = performances.reduce((sum, p) => sum + p.current.total_volume_usd, 0);
        const totalTrades = performances.reduce((sum, p) => sum + p.current.daily_trades, 0);
        const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

        if (avgTradeSize > 2000) {
          generatedInsights.push({
            type: 'info',
            title: 'High-Value Trading Day',
            description: `Average trade size reached ${formatCurrency(avgTradeSize)}, indicating institutional activity`,
            value: formatCurrency(avgTradeSize),
            icon: <Activity className="h-4 w-4" />
          });
        }

        // 8. Market Share Concentration
        const marketLeaderShare = topByVolume.current.total_volume_usd / totalVolume;
        if (marketLeaderShare > 0.4) {
          generatedInsights.push({
            type: 'warning',
            title: 'Market Concentration',
            description: `${topByVolume.protocol} commands ${(marketLeaderShare * 100).toFixed(1)}% of total market volume`,
            protocol: topByVolume.protocol,
            value: `${(marketLeaderShare * 100).toFixed(1)}%`,
            icon: <Info className="h-4 w-4" />
          });
        }

        // 9. New User Acquisition Analysis
        const totalNewUsers = performances.reduce((sum, p) => sum + p.current.numberOfNewUsers, 0);
        const totalUsers = performances.reduce((sum, p) => sum + p.current.daily_users, 0);
        const newUserRate = totalUsers > 0 ? totalNewUsers / totalUsers : 0;

        if (newUserRate > 0.15) {
          generatedInsights.push({
            type: 'success',
            title: 'Strong User Acquisition',
            description: `${(newUserRate * 100).toFixed(1)}% of today's users are new, indicating healthy growth`,
            value: `${totalNewUsers.toLocaleString()} new users`,
            icon: <TrendingUp className="h-4 w-4" />
          });
        }

        setInsights(generatedInsights.slice(0, 4)); // Show top 4 insights for 2x2 grid
      } catch (error) {
        console.error('Error analyzing daily highlights:', error);
        setInsights([]);
      } finally {
        setLoading(false);
      }
    };

    analyzeData();
  }, [date]);

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
          "text-xs px-2 py-0.5 font-medium border-0 shadow-sm",
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
              <CardTitle className="text-base font-medium">Daily Insights</CardTitle>
              <p className="text-xs text-muted-foreground">
                Key trends and performance highlights
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-5 text-xs">
                <Calendar className="w-2.5 h-2.5 mr-1 animate-pulse" />
                {format(date, 'MMM dd')}
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
            <CardTitle className="text-base font-medium">Daily Insights</CardTitle>
            <p className="text-xs text-muted-foreground">
              Key trends and performance highlights
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-5 text-xs">
              <Calendar className="w-2.5 h-2.5 mr-1" />
              {format(date, 'MMM dd')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {insights.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No significant insights for this date</p>
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
                          <Badge variant="outline" className="h-4 text-xs font-medium px-2">
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