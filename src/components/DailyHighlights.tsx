import React, { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { TrendingUp, TrendingDown, Award, Target, AlertTriangle, Info, Activity, Users } from "lucide-react";
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

          // Calculate consistency (lower standard deviation = more consistent)
          const volumeVariance = previous7d.length > 1 ? 
            previous7d.reduce((sum, d) => sum + Math.pow(d.total_volume_usd - avg7dVolume, 2), 0) / previous7d.length : 0;
          const consistency = volumeVariance > 0 ? 1 / (1 + Math.sqrt(volumeVariance) / avg7dVolume) : 1;

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
              consistency
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

        // 3. Most Consistent Performer
        const mostConsistent = performances.reduce((best, current) => 
          current.trends.consistency > best.trends.consistency ? current : best
        );

        if (mostConsistent.trends.consistency > 0.7) {
          generatedInsights.push({
            type: 'info',
            title: 'Reliable Performer',
            description: `Shows excellent consistency with stable daily volumes over the past week`,
            protocol: mostConsistent.protocol,
            value: `${(mostConsistent.trends.consistency * 100).toFixed(0)}% consistency`,
            icon: <Target className="h-4 w-4" />
          });
        }

        // 4. User Growth Champion
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

        // 5. Underperformer Alert
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

        // 6. Trading Activity Insights
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

        // 7. Market Share Concentration
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

        // 8. New User Acquisition Analysis
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

        setInsights(generatedInsights.slice(0, 6)); // Show top 6 insights
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
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'alert':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
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
          "ml-2 text-xs",
          isPositive 
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        )}
      >
        {isPositive ? '↗' : '↘'} {percentage.toFixed(1)}%
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Daily Highlights
            <Badge variant="outline" className="ml-auto text-xs">
              {format(date, 'MMM dd, yyyy')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-md"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Daily Highlights
          <Badge variant="outline" className="ml-auto text-xs">
            {format(date, 'MMM dd, yyyy')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-muted-foreground">No significant insights for this date.</p>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  "hover:bg-muted/30 transition-colors"
                )}
              >
                <div className={cn(
                  "p-2 rounded-md",
                  getInsightBadgeColor(insight.type)
                )}>
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    {insight.protocol && (
                      <Badge variant="outline" className="text-xs">
                        {insight.protocol.charAt(0).toUpperCase() + insight.protocol.slice(1)}
                      </Badge>
                    )}
                    {getTrendBadge(insight.trend)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                  {insight.value && (
                    <p className="text-xs font-mono text-foreground mt-1">
                      {insight.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}