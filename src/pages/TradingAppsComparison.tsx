import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { GitCompare, TrendingUp, Users, DollarSign, Activity, Plus, X, BarChart3, RefreshCw, Zap, MessageSquare, Monitor, Smartphone, Frown } from 'lucide-react';
import { protocolConfigs, getProtocolLogoFilename, getProtocolsByCategory } from '../lib/protocol-config';
import { getProtocolStats, getTotalProtocolStats } from '../lib/protocol';
import { ProtocolStats, ProtocolMetrics } from '../types/protocol';
import { getProtocolColor } from '../lib/colors';
import { formatNumber, formatCurrency } from '../lib/utils';
import { MultiComparisonMetricCard } from '../components/MultiComparisonMetricCard';
import { MultiComparisonChart } from '../components/MultiComparisonChart';
import { MarketShareComparisonChart } from '../components/MarketShareComparisonChart';
import { Skeleton } from '../components/ui/skeleton';
import { MetricCardSkeleton } from '../components/MetricCardSkeleton';

type TimeFrame = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

interface ProtocolData {
  protocol: string;
  stats: ProtocolStats[];
  metrics: ProtocolMetrics;
  color: string;
  name: string;
}

export default function TradingAppsComparison() {
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [protocolData, setProtocolData] = useState<Map<string, ProtocolData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingProtocols, setLoadingProtocols] = useState<Set<string>>(new Set());
  const [volumeTimeframe, setVolumeTimeframe] = useState<TimeFrame>("3m");
  const [usersTimeframe, setUsersTimeframe] = useState<TimeFrame>("3m");
  const [tradesTimeframe, setTradesTimeframe] = useState<TimeFrame>("3m");
  const [marketShareTimeframe, setMarketShareTimeframe] = useState<TimeFrame>("3m");
  const [allProtocolsData, setAllProtocolsData] = useState<Map<string, ProtocolStats[]>>(new Map());

  // Filter protocols to exclude already selected
  const filteredProtocols = useMemo(() => 
    protocolConfigs.filter(p => !selectedProtocols.includes(p.id)), 
    [selectedProtocols]
  );

  const fetchProtocolData = async (protocolId: string): Promise<ProtocolData> => {
    const [stats, metrics] = await Promise.all([
      getProtocolStats([protocolId]),
      getTotalProtocolStats(protocolId)
    ]);

    const protocolConfig = protocolConfigs.find(p => p.id === protocolId);

    return {
      protocol: protocolId,
      stats: stats as ProtocolStats[],
      metrics,
      color: getProtocolColor(protocolId),
      name: protocolConfig?.name || protocolId
    };
  };

  const addProtocol = useCallback(async (protocolId: string) => {
    if (selectedProtocols.includes(protocolId) || selectedProtocols.length >= 6) return;
    
    setSelectedProtocols(prev => [...prev, protocolId]);
    setLoadingProtocols(prev => new Set([...prev, protocolId]));
    
    try {
      const data = await fetchProtocolData(protocolId);
      setProtocolData(prev => new Map([...prev, [protocolId, data]]));
    } catch (error) {
      console.error(`Failed to load data for ${protocolId}:`, error);
      // Remove protocol if failed to load
      setSelectedProtocols(prev => prev.filter(p => p !== protocolId));
    } finally {
      setLoadingProtocols(prev => {
        const next = new Set(prev);
        next.delete(protocolId);
        return next;
      });
    }
  }, [selectedProtocols]);

  const removeProtocol = useCallback((protocolId: string) => {
    setSelectedProtocols(prev => prev.filter(p => p !== protocolId));
    setProtocolData(prev => {
      const next = new Map(prev);
      next.delete(protocolId);
      return next;
    });
    setLoadingProtocols(prev => {
      const next = new Set(prev);
      next.delete(protocolId);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelectedProtocols([]);
    setProtocolData(new Map());
    setLoadingProtocols(new Set());
  }, []);

  // Fetch all protocols data for market share calculation
  useEffect(() => {
    const fetchAllProtocolsData = async () => {
      try {
        const allProtocolIds = protocolConfigs.map(p => p.id);
        const allStats = await getProtocolStats(); // Get ALL protocols without filtering
        
        console.log('OneVsOne - Fetched all stats count:', allStats.length);
        
        // Organize stats by protocol
        const dataMap = new Map<string, ProtocolStats[]>();
        allProtocolIds.forEach((protocolId) => {
          const protocolStats = allStats.filter((stat: ProtocolStats) => {
            const statProtocol = stat.protocol_name || stat.protocol;
            return statProtocol === protocolId || 
                   statProtocol?.toLowerCase() === protocolId.toLowerCase() ||
                   (protocolId === 'fomo' && (statProtocol === 'tryFomo' || statProtocol === 'tryfomo')) ||
                   (protocolId === 'trojan' && statProtocol === 'trojan') ||
                   (protocolId === 'bloom' && statProtocol === 'bloom');
          });
          
          if (protocolId === 'trojan' || protocolId === 'bloom') {
            console.log(`OneVsOne - ${protocolId} stats count:`, protocolStats.length);
          }
          
          dataMap.set(protocolId, protocolStats);
        });
        
        setAllProtocolsData(dataMap);
      } catch (error) {
        console.error('Failed to fetch all protocols data:', error);
      }
    };

    fetchAllProtocolsData();
  }, []);

  // Quick preset comparisons - dynamically generated from all protocols in each category
  const presets = useMemo(() => [
    { 
      name: 'Top Telegram Bots', 
      protocols: getProtocolsByCategory('Telegram Bots').map(p => p.id)
    },
    { 
      name: 'Trading Terminals', 
      protocols: getProtocolsByCategory('Trading Terminals').map(p => p.id)
    },
    { 
      name: 'Mobile Apps', 
      protocols: getProtocolsByCategory('Mobile Apps').map(p => p.id)
    }
  ], []);

  const loadPreset = useCallback(async (protocolIds: string[]) => {
    clearAll();
    
    // Validate protocols first
    const validProtocols = protocolIds.slice(0, 6).filter(id => 
      protocolConfigs.find(p => p.id === id)
    );
    
    // Set selected protocols first to prevent re-renders
    setSelectedProtocols(validProtocols);
    setLoadingProtocols(new Set(validProtocols));
    
    // Load data for all protocols in parallel
    try {
      const protocolDataPromises = validProtocols.map(async (protocolId) => {
        const data = await fetchProtocolData(protocolId);
        return [protocolId, data] as const;
      });
      
      const results = await Promise.all(protocolDataPromises);
      
      // Update data map with all results at once
      setProtocolData(new Map(results));
    } catch (error) {
      console.error('Failed to load preset data:', error);
      // Reset on error
      clearAll();
    } finally {
      setLoadingProtocols(new Set());
    }
  }, [clearAll]);

  const getProtocolIcon = (id: string) => {
    return protocolConfigs.find(p => p.id === id)?.icon;
  };

  const getProtocolCategory = (id: string) => {
    return protocolConfigs.find(p => p.id === id)?.category;
  };

  // Get category badge styling to match daily report colors
  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case 'Telegram Bots':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      case 'Trading Terminals':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'Mobile Apps':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  // Helper function to filter data by timeframe
  const getFilteredData = (timeframe: TimeFrame) => {
    const data = Array.from(protocolData.values());
    
    if (timeframe !== "all") {
      const now = new Date();
      let daysToSubtract: number;

      switch (timeframe) {
        case "7d":
          daysToSubtract = 7;
          break;
        case "30d":
          daysToSubtract = 30;
          break;
        case "3m":
          daysToSubtract = 90;
          break;
        case "6m":
          daysToSubtract = 180;
          break;
        case "1y":
          daysToSubtract = 365;
          break;
        default:
          daysToSubtract = 90;
      }

      const cutoffDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
      
      return data.map(protocolData => ({
        ...protocolData,
        stats: protocolData.stats.filter(stat => new Date(stat.date) >= cutoffDate)
      }));
    }
    
    return data;
  };

  // Chart data for comparison cards (uses all-time data)
  const chartData = useMemo(() => Array.from(protocolData.values()), [protocolData]);

  // Check if any EVM protocols are selected (they only have volume data)
  const hasEvmProtocols = useMemo(() => {
    return selectedProtocols.some(protocolId => {
      const protocol = protocolConfigs.find(p => p.id === protocolId);
      return protocol?.chain === 'evm';
    });
  }, [selectedProtocols]);

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <h1 className="text-lg sm:text-2xl lg:text-3xl mb-4 sm:mb-6 lg:mb-8 text-foreground text-center font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
        Trading Apps Comparison
      </h1>

      {/* Protocol Selection */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="mb-2 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Select Trading Apps for Detailed Comparison</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Select value="" onValueChange={addProtocol}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-xs sm:text-sm">Add trading app to compare</span>
              </SelectTrigger>
              <SelectContent>
                {filteredProtocols.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {selectedProtocols.length >= 6 
                      ? "Maximum 6 trading apps can be compared"
                      : "No trading apps found"
                    }
                  </div>
                ) : (
                  filteredProtocols.map(protocol => {
                    const Icon = protocol.icon;
                    return (
                      <SelectItem key={protocol.id} value={protocol.id} className="relative pr-36">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                            <img 
                              src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                              alt={protocol.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const container = target.parentElement;
                                if (container) {
                                  container.innerHTML = '';
                                  container.className = 'w-4 h-4 bg-muted/20 rounded flex items-center justify-center';
                                  const iconEl = document.createElement('div');
                                  iconEl.innerHTML = '<svg class="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                  container.appendChild(iconEl);
                                }
                              }}
                            />
                          </div>
                          <span>{protocol.name}</span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`absolute right-2 top-1/2 -translate-y-1/2 ${getCategoryBadgeStyle(protocol.category)}`}
                        >
                          {protocol.category}
                        </Badge>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <div className="text-xs sm:text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedProtocols.length}</span> / 6 selected
              </div>
              {selectedProtocols.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">

          {/* Quick Presets */}
          {selectedProtocols.length === 0 && (
            <div className="space-y-3 sm:space-y-4">
              <Separator />
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <h3 className="text-xs sm:text-sm font-medium">Quick Comparisons</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {presets.map((preset, index) => {
                    const icons = [
                      <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />,
                      <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />,
                      <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                    ];
                    const descriptions = [
                      "Compare top performing Telegram trading bots",
                      "Analyze desktop trading terminal platforms",
                      "Compare leading mobile trading applications"
                    ];
                    return (
                      <Card 
                        key={preset.name}
                        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
                        onClick={() => loadPreset(preset.protocols)}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1 sm:p-1.5 rounded bg-muted group-hover:bg-primary/10 transition-colors">
                              {icons[index]}
                            </div>
                            <div className="flex-1 text-left">
                              <h4 className="text-xs sm:text-sm font-medium leading-none">{preset.name}</h4>
                            </div>
                            <div className="flex -space-x-1">
                              {preset.protocols.slice(0, 3).map((protocolId, avatarIndex) => (
                                <div 
                                  key={protocolId}
                                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background bg-muted overflow-hidden"
                                  style={{ zIndex: preset.protocols.length - avatarIndex }}
                                >
                                  <img 
                                    src={`/assets/logos/${getProtocolLogoFilename(protocolId)}`}
                                    alt={protocolConfigs.find(p => p.id === protocolId)?.name || protocolId}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      const container = target.parentElement;
                                      if (container) {
                                        container.innerHTML = '';
                                        container.className = 'w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background bg-muted/50 flex items-center justify-center';
                                        const iconEl = document.createElement('div');
                                        iconEl.innerHTML = '<svg class="h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                        container.appendChild(iconEl);
                                      }
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Selected Protocols */}
          {selectedProtocols.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <Separator />
              
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-lg font-semibold">Selected Trading Apps</h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  {selectedProtocols.length} selected
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {selectedProtocols.map(protocolId => {
                  const Icon = getProtocolIcon(protocolId);
                  const isLoading = loadingProtocols.has(protocolId);
                  const data = protocolData.get(protocolId);
                  
                  return (
                    <Card key={protocolId} className="group">
                      <CardContent className="p-2 sm:p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                            <img 
                              src={`/assets/logos/${getProtocolLogoFilename(protocolId)}`}
                              alt={data?.name || protocolId} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const container = target.parentElement;
                                if (container) {
                                  container.innerHTML = '';
                                  container.className = 'w-4 h-4 bg-muted/20 rounded flex items-center justify-center';
                                  const iconEl = document.createElement('div');
                                  iconEl.innerHTML = '<svg class="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                  container.appendChild(iconEl);
                                }
                              }}
                            />
                          </div>
                          <h4 className="font-medium text-xs sm:text-sm flex-1 truncate">{data?.name || protocolId}</h4>
                          <Badge variant="outline" className={`text-[10px] sm:text-xs hidden sm:inline-flex ${getCategoryBadgeStyle(getProtocolCategory(protocolId) || '')}`}>
                            {getProtocolCategory(protocolId)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProtocol(protocolId)}
                            className="h-5 w-5 sm:h-6 sm:w-6 -mr-1 sm:-mr-2 flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {isLoading && (
                          <div className="flex items-center gap-2 mt-1 sm:mt-2">
                            <div className="h-2 w-2 border border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Loading...</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {selectedProtocols.length >= 2 && (
        <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          {/* Metric Comparison Cards */}
          <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${hasEvmProtocols ? 'md:grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-3'}`}>
            {loadingProtocols.size > 0 ? (
              <>
                <MetricCardSkeleton />
                {!hasEvmProtocols && (
                  <>
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                  </>
                )}
              </>
            ) : (
              <>
                <MultiComparisonMetricCard
                  title="Lifetime Volume"
                  icon={DollarSign}
                  data={chartData}
                  dataKey="total_volume_usd"
                  formatter={formatCurrency}
                />
                {!hasEvmProtocols && (
                  <>
                    <MultiComparisonMetricCard
                      title="Lifetime Users"
                      icon={Users}
                      data={chartData}
                      dataKey="numberOfNewUsers"
                      formatter={formatNumber}
                    />
                    <MultiComparisonMetricCard
                      title="Lifetime Trades"
                      icon={Activity}
                      data={chartData}
                      dataKey="daily_trades"
                      formatter={formatNumber}
                    />
                  </>
                )}
              </>
            )}
          </div>

          {/* Time Series Charts */}
          <div className="space-y-4 sm:space-y-6">
            {loadingProtocols.size > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
                {!hasEvmProtocols && (
                  <>
                    <Card>
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-64 w-full" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-64 w-full" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-64 w-full" />
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            ) : (
              <>
                <MultiComparisonChart
                  title="Volume Comparison"
                  data={getFilteredData(volumeTimeframe)}
                  dataKey="volume_usd"
                  formatter={formatCurrency}
                  timeframe={volumeTimeframe}
                  onTimeframeChange={(value) => setVolumeTimeframe(value as TimeFrame)}
                />
                {!hasEvmProtocols && (
                  <>
                    <MultiComparisonChart
                      title="Daily Users Comparison"
                      data={getFilteredData(usersTimeframe)}
                      dataKey="daily_users"
                      formatter={formatNumber}
                      timeframe={usersTimeframe}
                      onTimeframeChange={(value) => setUsersTimeframe(value as TimeFrame)}
                    />
                    <MultiComparisonChart
                      title="Trades Comparison"
                      data={getFilteredData(tradesTimeframe)}
                      dataKey="trades"
                      formatter={formatNumber}
                      timeframe={tradesTimeframe}
                      onTimeframeChange={(value) => setTradesTimeframe(value as TimeFrame)}
                    />
                    <MarketShareComparisonChart
                      data={getFilteredData(marketShareTimeframe)}
                      allProtocolsData={allProtocolsData}
                      timeframe={marketShareTimeframe}
                      onTimeframeChange={(value) => setMarketShareTimeframe(value as TimeFrame)}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty/Instruction State */}
      {selectedProtocols.length === 0 && (
        <Card className="border-dashed mt-4 sm:mt-6">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <Frown className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No trading apps selected</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
              Select trading apps from the dropdown above to compare their performance metrics.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedProtocols.length === 1 && (
        <Card className="border-dashed mt-4 sm:mt-6">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <GitCompare className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">Add another trading app</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
              Select at least one more trading app to start comparing metrics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}