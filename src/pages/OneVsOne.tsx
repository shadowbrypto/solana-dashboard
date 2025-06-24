import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { GitCompare, TrendingUp, Users, DollarSign, Activity, Plus, X, BarChart3, RefreshCw, Zap } from 'lucide-react';
import { protocolConfigs } from '../lib/protocol-config';
import { getProtocolStats, getTotalProtocolStats } from '../lib/protocol';
import { ProtocolStats, ProtocolMetrics } from '../types/protocol';
import { getProtocolColor } from '../lib/colors';
import { formatNumber, formatCurrency } from '../lib/utils';
import { MultiComparisonMetricCard } from '../components/MultiComparisonMetricCard';
import { MultiComparisonChart } from '../components/MultiComparisonChart';
import { Skeleton } from '../components/ui/skeleton';

type TimeFrame = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

interface ProtocolData {
  protocol: string;
  stats: ProtocolStats[];
  metrics: ProtocolMetrics;
  color: string;
  name: string;
}

export default function OneVsOne() {
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [protocolData, setProtocolData] = useState<Map<string, ProtocolData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingProtocols, setLoadingProtocols] = useState<Set<string>>(new Set());
  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");

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

  // Quick preset comparisons
  const presets = [
    { name: 'Top Telegram Bots', protocols: ['trojan', 'bonkbot', 'maestro'] },
    { name: 'Trading Terminals', protocols: ['photon', 'bullx'] },
    { name: 'Mobile vs Bots', protocols: ['trojan', 'photon', 'jupiter'] }
  ];

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

  // Convert data for charts with timeframe filtering
  const chartData = useMemo(() => {
    const data = Array.from(protocolData.values());
    
    // Apply timeframe filter to stats
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
  }, [protocolData, timeframe]);

  return (
    <div className="space-y-4 lg:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-center">Protocol Comparison</h1>

      {/* Protocol Selection */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background via-background to-muted/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="w-full max-w-md">
              <Select value="" onValueChange={addProtocol}>
                <SelectTrigger className="h-12 bg-muted/50 border-2 hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Add protocol to compare" />
                  </div>
                </SelectTrigger>
              <SelectContent>
                {filteredProtocols.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {selectedProtocols.length >= 6 
                      ? "Maximum 6 protocols can be compared"
                      : "No protocols found"
                    }
                  </div>
                ) : (
                  filteredProtocols.map(protocol => {
                    const Icon = protocol.icon;
                    return (
                      <SelectItem key={protocol.id} value={protocol.id} className="relative">
                        <div className="flex items-center gap-2 pr-20">
                          <Icon className="w-4 h-4" />
                          <span>{protocol.name}</span>
                        </div>
                        <Badge variant="outline" className={`text-xs absolute right-2 top-1/2 transform -translate-y-1/2 ${getCategoryBadgeStyle(protocol.category)}`}>
                          {protocol.category}
                        </Badge>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 font-medium">
                {selectedProtocols.length}/6 selected
              </Badge>
              {selectedProtocols.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="text-muted-foreground hover:text-foreground hover:border-destructive hover:text-destructive"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Quick Presets */}
          {selectedProtocols.length === 0 && (
            <div className="space-y-4">
              <Separator className="my-6" />
              <div className="text-center">
                <div className="flex flex-wrap justify-center gap-3">
                  {presets.map(preset => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => loadPreset(preset.protocols)}
                      className="h-9 px-4 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Protocols */}
          {selectedProtocols.length > 0 && (
            <div className="space-y-4">
              <Separator className="my-6" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-md">
                    <BarChart3 className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Selected Protocols</h3>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {selectedProtocols.length} protocol{selectedProtocols.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <Select value={timeframe} onValueChange={(value: string) => setTimeframe(value as TimeFrame)}>
                  <SelectTrigger className="w-[160px] bg-background text-foreground border-border hover:bg-muted/50 transition-colors">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground">
                    <SelectItem value="7d" className="text-foreground hover:bg-muted/50 focus:bg-muted/50">
                      Last 7 days
                    </SelectItem>
                    <SelectItem value="30d" className="text-foreground hover:bg-muted/50 focus:bg-muted/50">
                      Last 30 days
                    </SelectItem>
                    <SelectItem value="3m" className="text-foreground hover:bg-muted/50 focus:bg-muted/50">
                      Last 3 months
                    </SelectItem>
                    <SelectItem value="6m" className="text-foreground hover:bg-muted/50 focus:bg-muted/50">
                      Last 6 months
                    </SelectItem>
                    <SelectItem value="1y" className="text-foreground hover:bg-muted/50 focus:bg-muted/50">
                      Last 1 year
                    </SelectItem>
                    <SelectItem value="all" className="text-foreground hover:bg-muted/50 focus:bg-muted/50">
                      All time
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedProtocols.map(protocolId => {
                  const Icon = getProtocolIcon(protocolId);
                  const isLoading = loadingProtocols.has(protocolId);
                  const data = protocolData.get(protocolId);
                  
                  return (
                    <div
                      key={protocolId}
                      className="p-4 bg-gradient-to-r from-background via-muted/10 to-background rounded-xl border-2 border-muted/50 hover:border-primary/30 group hover:shadow-md transition-all duration-200 relative"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-24">
                        {Icon && (
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate">{data?.name || protocolId}</div>
                          {isLoading && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">Loading...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className={`text-xs absolute right-12 top-1/2 transform -translate-y-1/2 font-medium ${getCategoryBadgeStyle(getProtocolCategory(protocolId) || '')}`}>
                        {getProtocolCategory(protocolId)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProtocol(protocolId)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/20 hover:text-destructive rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {selectedProtocols.length >= 2 && (
        <div className="space-y-6">
          {/* Metric Comparison Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MultiComparisonMetricCard
              title="Total Volume"
              icon={DollarSign}
              data={chartData}
              dataKey="total_volume_usd"
              formatter={formatCurrency}
            />
            <MultiComparisonMetricCard
              title="Total Users"
              icon={Users}
              data={chartData}
              dataKey="numberOfNewUsers"
              formatter={formatNumber}
            />
            <MultiComparisonMetricCard
              title="Total Trades"
              icon={Activity}
              data={chartData}
              dataKey="daily_trades"
              formatter={formatNumber}
            />
            <MultiComparisonMetricCard
              title="Total Fees"
              icon={TrendingUp}
              data={chartData}
              dataKey="total_fees_usd"
              formatter={formatCurrency}
            />
          </div>

          {/* Time Series Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MultiComparisonChart
              title="Volume Comparison"
              data={chartData}
              dataKey="volume_usd"
              formatter={formatCurrency}
              timeframe={timeframe}
            />
            <MultiComparisonChart
              title="Daily Users Comparison"
              data={chartData}
              dataKey="daily_users"
              formatter={formatNumber}
              timeframe={timeframe}
            />
            <MultiComparisonChart
              title="Trades Comparison"
              data={chartData}
              dataKey="trades"
              formatter={formatNumber}
              timeframe={timeframe}
            />
            <MultiComparisonChart
              title="Fees Comparison"
              data={chartData}
              dataKey="fees_usd"
              formatter={formatCurrency}
              timeframe={timeframe}
            />
          </div>
        </div>
      )}

      {/* Empty/Instruction State */}
      {selectedProtocols.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Select Protocols to Compare</h3>
              <p className="text-muted-foreground max-w-md">
                Search and add multiple protocols using the dropdown above to see a comprehensive comparison across all metrics.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProtocols.length === 1 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Add More Protocols</h3>
              <p className="text-muted-foreground max-w-md">
                Add at least one more protocol to start comparing. You can compare up to 6 protocols simultaneously.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}