import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { getProtocolLogoFilename } from '../lib/protocol-config';
import { StackedBarChart } from './charts/StackedBarChart';
import { StackedAreaChart } from './charts/StackedAreaChart';
import { ComponentActions } from './ComponentActions';

interface EVMMetrics {
  lifetimeVolume: number;
  chainBreakdown: Array<{
    chain: string;
    volume: number;
    percentage: number;
  }>;
  totalChains: number;
}

interface EVMDailyData {
  date: string;
  formattedDay: string;
  chainData: Record<string, number>;
  totalVolume: number;
}

interface EVMProtocolLayoutProps {
  protocol: string;
}

// Chain color mapping for consistent UI
const chainColors: Record<string, string> = {
  ethereum: '#627EEA',
  base: '#0052FF', 
  arbitrum: '#28A0F0',
  bsc: '#F3BA2F',
  avax: '#E84142',
  polygon: '#8247E5'
};

const chainNames: Record<string, string> = {
  ethereum: 'Ethereum',
  base: 'Base',
  arbitrum: 'Arbitrum',
  bsc: 'BSC',
  avax: 'Avalanche',
  polygon: 'Polygon'
};

const formatVolume = (volume: number): string => {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
  return `$${volume.toFixed(2)}`;
};

export const EVMProtocolLayout: React.FC<EVMProtocolLayoutProps> = ({ protocol }) => {
  const [evmMetrics, setEvmMetrics] = useState<EVMMetrics | null>(null);
  const [dailyData, setDailyData] = useState<EVMDailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '6m' | '1y'>('90d'); // Default to 90d to match chart's 3m default

  useEffect(() => {
    const fetchEVMMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use clean protocol name (remove _evm suffix if present)
        const cleanProtocol = protocol.replace('_evm', '');
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/unified/chain-breakdown?protocol=${cleanProtocol}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch EVM metrics: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setEvmMetrics(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch EVM metrics');
        }
      } catch (err) {
        console.error('Error fetching EVM metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (protocol) {
      fetchEVMMetrics();
    }
  }, [protocol]);

  const fetchDailyData = async (timeframe: '7d' | '30d' | '90d' | '6m' | '1y') => {
    try {
      setDailyLoading(true);
      
      const cleanProtocol = protocol.replace('_evm', '');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/unified/metrics?protocol=${cleanProtocol}&chain=evm&timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch daily metrics: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setDailyData(result.data);
      } else {
        console.warn('No daily data available:', result.error);
        setDailyData([]);
      }
    } catch (err) {
      console.error('Error fetching daily metrics:', err);
      setDailyData([]);
    } finally {
      setDailyLoading(false);
    }
  };

  const handleTimeframeChange = (newTimeframe: '7d' | '30d' | '90d' | '6m' | '1y') => {
    setSelectedTimeframe(newTimeframe);
    fetchDailyData(newTimeframe);
  };
  
  // Map timeframe to StackedBarChart's TimeFrame type
  const mapTimeframeToChartTimeframe = (timeframe: '7d' | '30d' | '90d' | '6m' | '1y'): '7d' | '30d' | '3m' | '6m' | '1y' => {
    switch (timeframe) {
      case '7d': return '7d';
      case '30d': return '30d';
      case '90d': return '3m';
      case '6m': return '6m';
      case '1y': return '1y';
      default: return '30d';
    }
  };
  
  // Map StackedBarChart's TimeFrame type back to our API timeframe
  const mapChartTimeframeToAPITimeframe = (timeframe: '7d' | '30d' | '3m' | '6m' | '1y' | 'all'): '7d' | '30d' | '90d' | '6m' | '1y' => {
    switch (timeframe) {
      case '7d': return '7d';
      case '30d': return '30d';
      case '3m': return '90d';
      case '6m': return '6m'; // Now properly maps to 6m
      case '1y': return '1y';
      case 'all': return '1y'; // Map 'all' to 1y as the maximum
      default: return '30d';
    }
  };

  useEffect(() => {
    if (protocol) {
      fetchDailyData(selectedTimeframe);
    }
  }, [protocol]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !evmMetrics) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading EVM metrics: {error}</p>
      </div>
    );
  }

  const protocolDisplayName = protocol.replace('_evm', '').charAt(0).toUpperCase() + protocol.replace('_evm', '').slice(1);

  // Get unique chains that actually have data across all days
  const allChainsInData = new Set<string>();
  dailyData.forEach(day => {
    Object.keys(day.chainData).forEach(chain => {
      if (day.chainData[chain] > 0) {
        allChainsInData.add(chain);
      }
    });
  });

  // Use chains that have actual data, fallback to static breakdown
  const availableChains = allChainsInData.size > 0 
    ? Array.from(allChainsInData).sort() 
    : (evmMetrics ? evmMetrics.chainBreakdown.map(chain => chain.chain) : []);

  // Process daily data for StackedBarChart, ensuring all chains have values
  const chartData = dailyData.map(day => {
    const dayData: any = {
      formattedDay: day.formattedDay,
      date: day.date,
    };
    
    // Add all available chains, defaulting to 0 if missing
    availableChains.forEach(chain => {
      dayData[chain] = day.chainData[chain] || 0;
    });
    
    return dayData;
  });

  // Process daily data for StackedAreaChart (chain dominance over time)
  const dominanceChartData = dailyData.map(day => {
    const dayData: any = {
      formattedDay: day.formattedDay,
      date: day.date,
    };
    
    const totalVolume = day.totalVolume || Object.values(day.chainData).reduce((sum, val) => sum + (val || 0), 0);
    
    // Calculate dominance percentages for each chain
    availableChains.forEach(chain => {
      const chainVolume = day.chainData[chain] || 0;
      // Store as percentage (0-100) for StackedAreaChart
      dayData[`${chain}_dominance`] = totalVolume > 0 ? (chainVolume / totalVolume) * 100 : 0;
    });
    
    return dayData;
  });

  const chainLabels = availableChains.map(chain => chainNames[chain] || chain);
  const chainDominanceKeys = availableChains.map(chain => `${chain}_dominance`);
  const chartColors = availableChains.map(chain => chainColors[chain] || '#6B7280');


  return (
    <div className="space-y-6">

      {/* Wide Lifetime Volume Card with Chain Breakdown */}
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-3">
              <div className="text-3xl font-bold tracking-tight">
                Lifetime Volume
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                <span className="text-sm font-medium text-muted-foreground">
                  {evmMetrics.totalChains} Active Chains
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold mb-2">
                {formatVolume(evmMetrics.lifetimeVolume)}
              </div>
              <div className="flex gap-1 justify-end">
                {evmMetrics.chainBreakdown.map((chain, index) => (
                  <div
                    key={chain.chain}
                    className="p-1 rounded-md"
                    style={{ 
                      backgroundColor: `${chainColors[chain.chain] || '#6B7280'}15`
                    }}
                  >
                    <img
                      src={`/assets/logos/${chain.chain}.jpg`}
                      alt={chainNames[chain.chain] || chain.chain}
                      className="w-5 h-5 rounded-full border border-background object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Horizontal Bar Chart */}
          <div className="space-y-4">
            <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
              {evmMetrics.chainBreakdown.reduce((acc, chain, index) => {
                const prevPercentage = acc.total;
                acc.total += chain.percentage;
                acc.bars.push(
                  <div
                    key={chain.chain}
                    className="absolute top-0 h-full flex items-center justify-center text-white text-xs font-medium transition-all duration-300 hover:opacity-80"
                    style={{
                      left: `${prevPercentage}%`,
                      width: `${chain.percentage}%`,
                      backgroundColor: chainColors[chain.chain] || '#6B7280',
                      minWidth: chain.percentage > 12 ? 'auto' : '0',
                    }}
                    title={`${chainNames[chain.chain] || chain.chain}: ${formatVolume(chain.volume)} (${chain.percentage.toFixed(1)}%)`}
                  >
                    {chain.percentage > 12 && (
                      <span className="px-1">
                        {chainNames[chain.chain] || chain.chain}
                      </span>
                    )}
                  </div>
                );
                return acc;
              }, { total: 0, bars: [] as JSX.Element[] }).bars}
            </div>

            {/* Chain Details in Single Row */}
            <div className="flex justify-between items-center w-full gap-2">
              {evmMetrics.chainBreakdown.map((chain) => (
                <div 
                  key={chain.chain}
                  className="flex items-center gap-2 flex-1 justify-center p-2 rounded-lg"
                  style={{ 
                    backgroundColor: `${chainColors[chain.chain] || '#6B7280'}10`
                  }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chainColors[chain.chain] || '#6B7280' }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {chainNames[chain.chain] || chain.chain}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatVolume(chain.volume)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {chain.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Chain Volume Breakdown Chart */}
      {!dailyLoading && chartData.length > 0 && availableChains.length > 0 ? (
        <StackedBarChart
          title="Daily Volume by Chain"
          subtitle={protocolDisplayName}
          data={chartData}
          dataKeys={availableChains}
          labels={chainLabels}
          colors={chartColors}
          valueFormatter={(value) => formatVolume(value)}
          loading={dailyLoading}
          timeframe={mapTimeframeToChartTimeframe(selectedTimeframe)}
          onTimeframeChange={(newTimeframe) => handleTimeframeChange(mapChartTimeframeToAPITimeframe(newTimeframe))}
        />
      ) : dailyLoading ? (
        <Card className="bg-card border-border rounded-xl">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border rounded-xl">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">No daily volume data available for this timeframe</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chain Dominance Over Time Chart */}
      {!dailyLoading && dominanceChartData.length > 0 && availableChains.length > 0 ? (
        <StackedAreaChart
          title="Chain Volume Dominance Over Time"
          subtitle={protocolDisplayName}
          data={dominanceChartData}
          keys={chainDominanceKeys}
          labels={chainLabels}
          colors={chartColors}
          valueFormatter={(value) => `${value.toFixed(1)}%`}
          loading={dailyLoading}
        />
      ) : dailyLoading ? (
        <Card className="bg-card border-border rounded-xl">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border rounded-xl">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">No dominance data available for this timeframe</p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default EVMProtocolLayout;