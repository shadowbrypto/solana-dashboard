import React, { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { TrendingUp, TrendingDown, Award, Target, AlertTriangle, Info, Activity, Users, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import { Protocol } from "../types/protocol";
import { getProtocolLogoFilename } from "../lib/protocol-config";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ComponentActions } from './ComponentActions';

interface EVMDailyHighlightsProps {
  date: Date;
}

interface EVMProtocolData {
  protocol: Protocol;
  totalVolume: number;
  chainVolumes: {
    ethereum: number;
    base: number;
    bsc: number;
  };
  dailyGrowth: number;
  weeklyTrend: number[];
}

// Function to fetch standalone AVAX and ARB volumes
const fetchStandaloneChainVolumes = async (date: Date): Promise<{avax: number, arbitrum: number}> => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const dateStr = format(date, 'yyyy-MM-dd');
  
  try {
    const [avaxResponse, arbResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/unified/daily?date=${dateStr}&chain=avax&dataType=public`),
      fetch(`${API_BASE_URL}/unified/daily?date=${dateStr}&chain=arbitrum&dataType=public`)
    ]);
    
    const avaxData = avaxResponse.ok ? await avaxResponse.json() : null;
    const arbData = arbResponse.ok ? await arbResponse.json() : null;
    
    return {
      avax: avaxData?.success ? avaxData.data.totalVolume || 0 : 0,
      arbitrum: arbData?.success ? arbData.data.totalVolume || 0 : 0
    };
  } catch (error) {
    console.error('Failed to fetch standalone chain volumes:', error);
    return { avax: 0, arbitrum: 0 };
  }
};

interface EVMProtocolPerformance {
  protocol: Protocol;
  current: EVMProtocolData;
  previous: EVMProtocolData[];
  trends: {
    volume1d: number;
    volume7d: number;
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

const fetchEVMDailyData = async (protocols: Protocol[], date: Date): Promise<EVMProtocolData[]> => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const protocolDataPromises = protocols.filter(p => p !== 'all').map(async (protocol) => {
    const cleanProtocol = protocol.replace('_evm', '');
    
    try {
      const response = await fetch(`${API_BASE_URL}/unified/daily?date=${dateStr}&chain=evm&protocol=${cleanProtocol}&dataType=public`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        return {
          protocol,
          totalVolume: result.data.totalVolume || 0,
          chainVolumes: {
            ethereum: result.data.chainVolumes?.ethereum || 0,
            base: result.data.chainVolumes?.base || 0,
            bsc: result.data.chainVolumes?.bsc || 0
          },
          dailyGrowth: result.data.dailyGrowth || 0,
          weeklyTrend: result.data.weeklyTrend || Array(7).fill(0)
        };
      } else {
        throw new Error(`API returned success:false - ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Failed to fetch real data for ${cleanProtocol}:`, error);
      
      return {
        protocol,
        totalVolume: 0,
        chainVolumes: {
          ethereum: 0,
          base: 0,
          bsc: 0
        },
        dailyGrowth: 0,
        weeklyTrend: Array(7).fill(0)
      };
    }
  });
  
  const protocolData = await Promise.all(protocolDataPromises);
  return protocolData;
};

export function EVMDailyHighlights({ date }: EVMDailyHighlightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyzeData = async () => {
      setLoading(true);
      try {
        const performances: EVMProtocolPerformance[] = [];
        
        // EVM protocols list
        const evmProtocols: Protocol[] = ['sigma_evm', 'maestro_evm', 'bloom_evm', 'banana_evm', 'padre_evm'];

        // Fetch data for current day and historical periods
        const [currentData, currentStandaloneData] = await Promise.all([
          fetchEVMDailyData(evmProtocols, date),
          fetchStandaloneChainVolumes(date)
        ]);
        
        // Fetch 7-day historical data
        const [historical7d, historicalStandalone7d] = await Promise.all([
          Promise.all(Array.from({ length: 7 }, (_, i) => fetchEVMDailyData(evmProtocols, subDays(date, i + 1)))),
          Promise.all(Array.from({ length: 7 }, (_, i) => fetchStandaloneChainVolumes(subDays(date, i + 1))))
        ]);

        // Analyze each protocol
        for (const currentProtocol of currentData) {
          if (currentProtocol.totalVolume === 0) continue;

          const previous7d = historical7d.map(dayData => 
            dayData.find(p => p.protocol === currentProtocol.protocol)
          ).filter(Boolean) as EVMProtocolData[];

          // Calculate trends
          const yesterday = previous7d[0];
          const volume1d = yesterday?.totalVolume ? 
            (currentProtocol.totalVolume - yesterday.totalVolume) / yesterday.totalVolume : 0;
          
          const avg7dVolume = previous7d.reduce((sum, d) => sum + d.totalVolume, 0) / Math.max(previous7d.length, 1);
          const volume7d = avg7dVolume > 0 ? (currentProtocol.totalVolume - avg7dVolume) / avg7dVolume : 0;

          // Calculate reliability score (high volume + low volatility)
          const volumeVariance = previous7d.length > 1 ? 
            previous7d.reduce((sum, d) => sum + Math.pow(d.totalVolume - avg7dVolume, 2), 0) / previous7d.length : 0;
          const coefficientOfVariation = avg7dVolume > 0 ? Math.sqrt(volumeVariance) / avg7dVolume : 1;
          const reliability = avg7dVolume * (1 / (1 + coefficientOfVariation));

          performances.push({
            protocol: currentProtocol.protocol,
            current: currentProtocol,
            previous: previous7d,
            trends: {
              volume1d,
              volume7d,
              consistency: reliability
            }
          });
        }

        // Generate insights
        const generatedInsights: Insight[] = [];

        // 1. Top Performer by Volume
        if (performances.length > 0) {
          const topByVolume = performances.reduce((best, current) => 
            current.current.totalVolume > best.current.totalVolume ? current : best
          );
          
          generatedInsights.push({
            type: 'success',
            title: 'EVM Volume Leader',
            description: `Dominates EVM protocols with ${formatCurrency(topByVolume.current.totalVolume)} in daily volume`,
            protocol: topByVolume.protocol,
            value: formatCurrency(topByVolume.current.totalVolume),
            trend: topByVolume.trends.volume1d,
            icon: <Award className="h-4 w-4" />
          });
        }

        // 2. Biggest Gainer (1-day volume growth)
        const biggestGainer = performances
          .filter(p => p.trends.volume1d > 0)
          .reduce((best, current) => 
            current.trends.volume1d > best.trends.volume1d ? current : best, 
            { trends: { volume1d: -Infinity } } as EVMProtocolPerformance
          );

        if (biggestGainer.trends.volume1d > 0.05) { // > 5% growth
          generatedInsights.push({
            type: 'success',
            title: 'EVM Breakout Performance',
            description: `Surged ${(biggestGainer.trends.volume1d * 100).toFixed(1)}% in volume from yesterday`,
            protocol: biggestGainer.protocol,
            trend: biggestGainer.trends.volume1d,
            icon: <TrendingUp className="h-4 w-4" />
          });
        }

        // 3. Most Reliable High Performer
        const reliablePerformers = performances
          .filter(p => p.current.totalVolume > 100000) // Min $100K daily volume
          .filter(p => p.previous.length >= 5); // Need at least 5 days of data
        
        if (reliablePerformers.length > 0) {
          const mostReliable = reliablePerformers.reduce((best, current) => 
            current.trends.consistency > best.trends.consistency ? current : best
          );

          const avg7dVolume = mostReliable.previous.reduce((sum, d) => sum + d.totalVolume, 0) / mostReliable.previous.length;
          const volumeRange = Math.max(...mostReliable.previous.map(d => d.totalVolume)) - 
                             Math.min(...mostReliable.previous.map(d => d.totalVolume));
          const volatilityPercent = (volumeRange / avg7dVolume) * 100;

          generatedInsights.push({
            type: 'info',
            title: 'Reliable EVM Performer',
            description: `Maintains strong ${formatCurrency(avg7dVolume)} average daily volume with only ${volatilityPercent.toFixed(1)}% volatility`,
            protocol: mostReliable.protocol,
            value: `${formatCurrency(avg7dVolume)} avg volume`,
            icon: <Target className="h-4 w-4" />
          });
        }

        // 4. Chain Distribution Insight
        const protocolTotalVolume = performances.reduce((sum, p) => sum + p.current.totalVolume, 0);
        const totalVolumeWithStandalone = protocolTotalVolume + currentStandaloneData.avax + currentStandaloneData.arbitrum;
        
        if (totalVolumeWithStandalone > 0) {
          const totalEthereum = performances.reduce((sum, p) => sum + p.current.chainVolumes.ethereum, 0);
          const totalBase = performances.reduce((sum, p) => sum + p.current.chainVolumes.base, 0);
          const totalBSC = performances.reduce((sum, p) => sum + p.current.chainVolumes.bsc, 0);
          const totalAVAX = currentStandaloneData.avax;
          const totalArbitrum = currentStandaloneData.arbitrum;

          const chainVolumes = {
            'Ethereum': totalEthereum,
            'Base': totalBase,
            'BSC': totalBSC,
            'Avalanche': totalAVAX,
            'Arbitrum': totalArbitrum
          };

          const dominantChain = Object.keys(chainVolumes).reduce((a, b) => 
            chainVolumes[a] > chainVolumes[b] ? a : b
          );
          
          const dominantVolume = chainVolumes[dominantChain];
          const dominancePercent = (dominantVolume / totalVolumeWithStandalone) * 100;

          generatedInsights.push({
            type: 'info',
            title: 'Chain Dominance',
            description: `${dominantChain} leads EVM activity with ${dominancePercent.toFixed(1)}% of total volume`,
            value: `${formatCurrency(dominantVolume)} on ${dominantChain}`,
            icon: <Activity className="h-4 w-4" />
          });
        }

        // 5. Underperformer Alert
        const underperformer = performances
          .filter(p => p.current.totalVolume > 50000) // Only consider protocols with meaningful volume
          .filter(p => p.trends.volume7d < -0.2) // > 20% decline
          .reduce((worst, current) => 
            current.trends.volume7d < worst.trends.volume7d ? current : worst,
            { trends: { volume7d: Infinity } } as EVMProtocolPerformance
          );

        if (underperformer.trends.volume7d < -0.2) {
          generatedInsights.push({
            type: 'alert',
            title: 'EVM Performance Concern',
            description: `Volume declined ${Math.abs(underperformer.trends.volume7d * 100).toFixed(1)}% over the past week`,
            protocol: underperformer.protocol,
            trend: underperformer.trends.volume7d,
            icon: <AlertTriangle className="h-4 w-4" />
          });
        }

        // 6. Market Growth Insight - Always show this regardless of threshold
        const yesterdayProtocolTotal = performances.reduce((sum, p) => {
          const yesterday = p.previous[0];
          return sum + (yesterday?.totalVolume || 0);
        }, 0);
        
        const yesterdayStandaloneTotal = historicalStandalone7d[0] 
          ? historicalStandalone7d[0].avax + historicalStandalone7d[0].arbitrum 
          : 0;
        
        const yesterdayTotalWithStandalone = yesterdayProtocolTotal + yesterdayStandaloneTotal;

        if (yesterdayTotalWithStandalone > 0) {
          const totalGrowth = (totalVolumeWithStandalone - yesterdayTotalWithStandalone) / yesterdayTotalWithStandalone;
          
          // Always add the market movement insight
          generatedInsights.push({
            type: totalGrowth > 0 ? 'success' : 'warning',
            title: 'EVM Market Movement',
            description: `Total EVM volume ${totalGrowth > 0 ? 'increased' : 'decreased'} ${Math.abs(totalGrowth * 100).toFixed(1)}% from yesterday`,
            value: formatCurrency(totalVolumeWithStandalone),
            trend: totalGrowth,
            icon: totalGrowth > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
          });
        } else {
          // If no yesterday data, show current total
          generatedInsights.push({
            type: 'info',
            title: 'EVM Market Volume',
            description: `Total EVM volume for ${format(date, 'MMM dd')}`,
            value: formatCurrency(totalVolumeWithStandalone),
            icon: <Activity className="h-4 w-4" />
          });
        }

        setInsights(generatedInsights.slice(0, 4)); // Show top 4 insights for 2x2 grid
      } catch (error) {
        console.error('Error analyzing EVM data:', error);
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
              <CardTitle className="text-base font-medium">EVM Daily Insights</CardTitle>
              <p className="text-xs text-muted-foreground">
                Key trends and performance highlights for EVM protocols
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
    <ComponentActions 
      componentName="EVM Daily Insights"
      filename={`EVM_Daily_Insights_${format(date, 'yyyy_MM_dd')}.png`}
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">EVM Daily Insights</CardTitle>
              <p className="text-xs text-muted-foreground">
                Key trends and performance highlights for EVM protocols
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
                              {insight.protocol.replace('_evm', '').charAt(0).toUpperCase() + insight.protocol.replace('_evm', '').slice(1)}
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