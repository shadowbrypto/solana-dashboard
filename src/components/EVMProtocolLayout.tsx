import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { getProtocolLogoFilename } from '../lib/protocol-config';

interface EVMMetrics {
  lifetimeVolume: number;
  chainBreakdown: Array<{
    chain: string;
    volume: number;
    percentage: number;
  }>;
  totalChains: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEVMMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use clean protocol name (remove _evm suffix if present)
        const cleanProtocol = protocol.replace('_evm', '');
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/protocols/evm-metrics/${cleanProtocol}`);
        
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

    </div>
  );
};

export default EVMProtocolLayout;