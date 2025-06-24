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
        return 'bg-gradient-to-br from-emerald-50 to-green-100 text-emerald-700 dark:from-emerald-950/50 dark:to-green-900/30 dark:text-emerald-400';
      case 'warning':
        return 'bg-gradient-to-br from-amber-50 to-yellow-100 text-amber-700 dark:from-amber-950/50 dark:to-yellow-900/30 dark:text-amber-400';
      case 'alert':
        return 'bg-gradient-to-br from-red-50 to-rose-100 text-red-700 dark:from-red-950/50 dark:to-rose-900/30 dark:text-red-400';
      default:
        return 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 dark:from-blue-950/50 dark:to-indigo-900/30 dark:text-blue-400';
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
      <Card className="mb-8 shadow-sm border-0 bg-gradient-to-br from-background via-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Daily Insights
              </span>
            </CardTitle>
            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-muted/60 text-muted-foreground border-0">
              {format(date, 'MMM dd, yyyy')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-gradient-to-br from-background to-muted/30 p-5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-muted/50 rounded-xl flex-shrink-0"></div>
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted/50 rounded-lg w-3/4"></div>
                      <div className="h-3 bg-muted/30 rounded-lg w-full"></div>
                      <div className="h-3 bg-muted/30 rounded-lg w-2/3"></div>
                    </div>
                    <div className="h-6 bg-muted/40 rounded-lg w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 shadow-sm border-0 bg-gradient-to-br from-background via-background to-muted/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Daily Insights
            </span>
          </CardTitle>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-muted/60 text-muted-foreground border-0">
            {format(date, 'MMM dd, yyyy')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted/30 mb-4">
              <Info className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No significant insights available</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Try selecting a different date</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {insights.slice(0, 4).map((insight, index) => (
              <div
                key={index}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-0 bg-gradient-to-br from-background to-muted/30",
                  "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
                  "transition-all duration-300 hover:-translate-y-0.5",
                  "p-5"
                )}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-current to-transparent" />
                </div>
                
                <div className="relative flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-xl flex-shrink-0 shadow-sm",
                    "border border-white/10 dark:border-black/10",
                    getInsightBadgeColor(insight.type)
                  )}>
                    {insight.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-semibold text-base leading-tight text-foreground">
                        {insight.title}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {insight.protocol && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-background/50 border-border/50">
                            {insight.protocol.charAt(0).toUpperCase() + insight.protocol.slice(1)}
                          </Badge>
                        )}
                        {getTrendBadge(insight.trend)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                      {insight.description}
                    </p>
                    {insight.value && (
                      <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs font-mono text-foreground/90 font-medium">
                          {insight.value}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}