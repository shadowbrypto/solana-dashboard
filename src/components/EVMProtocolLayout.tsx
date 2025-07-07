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
        const response = await fetch(`/api/protocols/evm-metrics/${cleanProtocol}`);
        
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
      {/* Header with Protocol Name and EVM Badge */}
      <div className="flex items-center gap-4 mb-6">
        <img 
          src={`/assets/logos/${getProtocolLogoFilename(protocol)}`}
          alt={`${protocolDisplayName} logo`}
          className="w-12 h-12 rounded-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {protocolDisplayName}
          </h1>
          <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            EVM
          </Badge>
        </div>
      </div>

      {/* Wide Lifetime Volume Card */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-gray-600 dark:text-gray-400">
            Lifetime Volume Across All Chains
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {evmMetrics.totalChains} Active Chains
              </span>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {formatVolume(evmMetrics.lifetimeVolume)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Total Volume
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chain Breakdown Horizontal Bar Chart */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-gray-600 dark:text-gray-400">
            Volume by Chain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Horizontal Bar Chart */}
            <div className="relative h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              {evmMetrics.chainBreakdown.reduce((acc, chain, index) => {
                const prevPercentage = acc.total;
                acc.total += chain.percentage;
                acc.bars.push(
                  <div
                    key={chain.chain}
                    className="absolute top-0 h-full flex items-center justify-center text-white text-sm font-medium transition-all duration-300 hover:opacity-80"
                    style={{
                      left: `${prevPercentage}%`,
                      width: `${chain.percentage}%`,
                      backgroundColor: chainColors[chain.chain] || '#6B7280',
                      minWidth: chain.percentage > 8 ? 'auto' : '0', // Hide text if segment too small
                    }}
                    title={`${chainNames[chain.chain] || chain.chain}: ${formatVolume(chain.volume)} (${chain.percentage.toFixed(1)}%)`}
                  >
                    {chain.percentage > 8 && (
                      <span className="px-2">
                        {chainNames[chain.chain] || chain.chain}
                      </span>
                    )}
                  </div>
                );
                return acc;
              }, { total: 0, bars: [] as JSX.Element[] }).bars}
            </div>

            {/* Chain Details List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {evmMetrics.chainBreakdown.map((chain) => (
                <div 
                  key={chain.chain}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: chainColors[chain.chain] || '#6B7280' }}
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {chainNames[chain.chain] || chain.chain}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatVolume(chain.volume)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {chain.percentage.toFixed(1)}%
                    </div>
                  </div>
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