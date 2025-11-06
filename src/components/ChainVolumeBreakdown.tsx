import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { getProtocolLogoFilename, protocolConfigs } from "../lib/protocol-config";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from "recharts";
import { useState, useMemo, useEffect } from "react";
import { ComponentActions } from './ComponentActions';
import { protocolApi } from "../lib/api";
import { format } from 'date-fns';

interface ChainVolumeBreakdownProps {
  date: Date;
}

interface ProtocolVolumeData {
  protocolId: string;
  protocolName: string;
  volume: number;
  chain: string; // 'solana' or 'evm'
  color: string;
  chainVolumes?: Record<string, number>; // For EVM protocols: breakdown by chain (ethereum, base, bsc, avax, arbitrum)
}

function formatNumberWithSuffix(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (absValue >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (absValue >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toLocaleString()}`;
}

// Chart colors
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))",
  "hsl(var(--chart-11))",
  "hsl(var(--chart-12))",
  "hsl(var(--chart-13))",
  "hsl(var(--chart-14))",
  "hsl(var(--chart-15))",
  "hsl(var(--chart-16))",
  "hsl(var(--chart-17))",
  "hsl(var(--chart-18))",
  "hsl(var(--chart-19))",
  "hsl(var(--chart-20))",
];

export function ChainVolumeBreakdown({ date }: ChainVolumeBreakdownProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [protocolData, setProtocolData] = useState<ProtocolVolumeData[]>([]);
  const [disabledProtocols, setDisabledProtocols] = useState<Set<string>>(new Set());
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isSolanaExpanded, setIsSolanaExpanded] = useState(false);
  const [isEvmExpanded, setIsEvmExpanded] = useState(false);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Fetch data for both chains
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch both Solana and EVM data in parallel
        const [solanaResponse, evmResponse] = await Promise.all([
          protocolApi.getDailyMetricsOptimized(date, 'solana', 'private'),
          protocolApi.getDailyMetricsOptimized(date, 'evm', 'public'),
        ]);

        console.log('ChainVolumeBreakdown - Solana response:', solanaResponse);
        console.log('ChainVolumeBreakdown - EVM response:', evmResponse);

        const protocols: ProtocolVolumeData[] = [];

        // Process Solana protocols
        if (solanaResponse?.protocols) {
          console.log('ChainVolumeBreakdown - Processing Solana protocols:', Object.keys(solanaResponse.protocols).length);
          Object.entries(solanaResponse.protocols).forEach(([protocolId, metrics]: [string, any]) => {
            const volume = metrics.adjustedVolume ?? metrics.totalVolume ?? 0;
            if (volume > 0) {
              const config = protocolConfigs.find(p => p.id === protocolId);
              protocols.push({
                protocolId,
                protocolName: config?.name || protocolId,
                volume,
                chain: 'solana',
                color: '', // Will be assigned later
              });
            }
          });
        }

        // Process EVM protocols - store with chain breakdown
        if (evmResponse?.protocols) {
          console.log('ChainVolumeBreakdown - Processing EVM protocols:', Object.keys(evmResponse.protocols).length);
          Object.entries(evmResponse.protocols).forEach(([protocolId, metrics]: [string, any]) => {
            const config = protocolConfigs.find(p => p.id === protocolId);
            const totalVolume = metrics.totalVolume || 0;

            if (totalVolume > 0 && metrics.chainVolumes) {
              protocols.push({
                protocolId,
                protocolName: config?.name || protocolId,
                volume: totalVolume,
                chain: 'evm',
                chainVolumes: metrics.chainVolumes, // { ethereum: X, base: Y, bsc: Z, avax: A, arbitrum: B }
                color: '', // Will be assigned later
              });
            }
          });
        }

        // Sort by volume descending and assign colors
        protocols.sort((a, b) => b.volume - a.volume);
        protocols.forEach((p, index) => {
          p.color = CHART_COLORS[index % CHART_COLORS.length];
        });

        console.log('ChainVolumeBreakdown - Total protocols processed:', protocols.length);
        console.log('ChainVolumeBreakdown - Protocol data:', protocols);

        setProtocolData(protocols);
      } catch (err) {
        console.error('ChainVolumeBreakdown - Error fetching chain volume data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date]);

  // Calculate chain-level volumes (only enabled protocols)
  const { solanaVolume, ethereumVolume, baseVolume, bscVolume, avaxVolume, arbitrumVolume, totalVolume } = useMemo(() => {
    const enabledProtocols = protocolData.filter(p => !disabledProtocols.has(p.protocolId));

    // Solana: sum volumes of enabled Solana protocols
    const solana = enabledProtocols
      .filter(p => p.chain === 'solana')
      .reduce((sum, p) => sum + p.volume, 0);

    // EVM chains: sum volumes from enabled EVM protocols' chainVolumes
    const enabledEVMProtocols = enabledProtocols.filter(p => p.chain === 'evm');
    const ethereum = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.ethereum || 0), 0);
    const base = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.base || 0), 0);
    const bsc = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.bsc || 0), 0);
    const avax = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.avax || 0), 0);
    const arbitrum = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.arbitrum || 0), 0);

    return {
      solanaVolume: solana,
      ethereumVolume: ethereum,
      baseVolume: base,
      bscVolume: bsc,
      avaxVolume: avax,
      arbitrumVolume: arbitrum,
      totalVolume: solana + ethereum + base + bsc + avax + arbitrum
    };
  }, [protocolData, disabledProtocols]);

  // Pie chart data - Individual chains
  const pieData = useMemo(() => {
    const data = [];
    if (solanaVolume > 0) {
      data.push({
        name: 'Solana',
        value: solanaVolume,
        color: 'hsl(271, 91%, 65%)', // Purple
        chain: 'solana'
      });
    }
    if (ethereumVolume > 0) {
      data.push({
        name: 'Ethereum',
        value: ethereumVolume,
        color: 'hsl(217, 91%, 60%)', // Blue
        chain: 'ethereum'
      });
    }
    if (baseVolume > 0) {
      data.push({
        name: 'Base',
        value: baseVolume,
        color: 'hsl(220, 70%, 55%)', // Blue variant
        chain: 'base'
      });
    }
    if (bscVolume > 0) {
      data.push({
        name: 'BSC',
        value: bscVolume,
        color: 'hsl(45, 93%, 47%)', // Yellow/Gold for BSC
        chain: 'bsc'
      });
    }
    if (avaxVolume > 0) {
      data.push({
        name: 'Avalanche',
        value: avaxVolume,
        color: 'hsl(0, 84%, 60%)', // Red for Avalanche
        chain: 'avax'
      });
    }
    if (arbitrumVolume > 0) {
      data.push({
        name: 'Arbitrum',
        value: arbitrumVolume,
        color: 'hsl(211, 70%, 50%)', // Blue variant for Arbitrum
        chain: 'arbitrum'
      });
    }
    return data;
  }, [solanaVolume, ethereumVolume, baseVolume, bscVolume, avaxVolume, arbitrumVolume]);

  // Group protocols by chain for legend
  const solanaProtocols = useMemo(() =>
    protocolData.filter(p => p.chain === 'solana'),
    [protocolData]
  );

  const evmProtocols = useMemo(() =>
    protocolData.filter(p => p.chain === 'evm'),
    [protocolData]
  );

  // Responsive radius calculation
  const getResponsiveRadius = () => {
    if (windowWidth < 640) { // Mobile
      return { innerRadius: 100, outerRadius: 240 };
    } else if (windowWidth < 1024) { // Tablet
      return { innerRadius: 90, outerRadius: 140 };
    }
    // Desktop
    return { innerRadius: 110, outerRadius: 170 };
  };

  const { innerRadius, outerRadius } = getResponsiveRadius();

  if (loading) {
    return (
      <Card className="bg-card border-border rounded-xl animate-pulse">
        <CardHeader className="border-b p-3 sm:px-6 sm:py-3">
          <div className="h-6 bg-muted rounded w-48"></div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] bg-muted/20 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b p-3 sm:px-6 sm:py-3">
          <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">
            Chain Volume Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <div className="text-lg mb-2">⚠️</div>
            <div className="text-sm">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ComponentActions
      componentName="Chain Volume Distribution"
      filename={`Chain_Volume_${format(date, 'yyyy-MM-dd')}.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b p-3 sm:px-6 sm:py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">
                Chain Volume Distribution
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(date, 'MMM dd, yyyy')} • All protocols across Solana and EVM
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-0 relative sm:px-6 sm:py-0">
          <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6">
            {/* Left: Pie Chart + Chain Stats */}
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <div className="relative" style={{ width: '100%', height: '480px', minHeight: '480px' }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                    <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        paddingAngle={1}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="hsl(var(--background))"
                            strokeWidth={3}
                            className="hover:opacity-90 transition-opacity duration-200"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        wrapperStyle={{ zIndex: 1000 }}
                        content={({ active, payload }: TooltipProps<number, string>) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const percentage = totalVolume > 0 ? ((data.value / totalVolume) * 100).toFixed(1) : '0.0';

                            return (
                              <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg z-50">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: data.color }}
                                  />
                                  <span className="font-semibold text-popover-foreground">{data.name}</span>
                                </div>
                                <div className="space-y-0.5 text-xs">
                                  <div className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">Volume:</span>
                                    <span className="font-semibold text-popover-foreground font-mono">
                                      {formatNumberWithSuffix(data.value)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">Share:</span>
                                    <span className="font-semibold text-popover-foreground font-mono">{percentage}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground p-4 flex items-center justify-center h-full">
                    <div>
                      <div className="text-lg mb-2">📊</div>
                      <div className="text-sm">No volume data available for this date</div>
                    </div>
                  </div>
                )}
                {/* Center Total Display - Inside Pie Chart */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Volume</div>
                    <div className="text-2xl font-bold text-foreground font-mono">{formatNumberWithSuffix(totalVolume)}</div>
                  </div>
                </div>
              </div>

              {/* Chain Share Stats - Below Pie Chart - Sorted by Volume */}
              <div className="mt-2 mb-6 flex gap-1.5 px-4 overflow-x-auto">
                {[
                  { name: 'Solana', volume: solanaVolume, color: 'hsl(271, 91%, 65%)', textColorClass: 'text-purple-600 dark:text-purple-400' },
                  { name: 'Ethereum', volume: ethereumVolume, color: 'hsl(217, 91%, 60%)', textColorClass: 'text-blue-600 dark:text-blue-400' },
                  { name: 'Base', volume: baseVolume, color: 'hsl(220, 70%, 55%)', textColorClass: 'text-blue-500 dark:text-blue-300' },
                  { name: 'BSC', volume: bscVolume, color: 'hsl(45, 93%, 47%)', textColorClass: 'text-yellow-600 dark:text-yellow-400' },
                  { name: 'Avalanche', volume: avaxVolume, color: 'hsl(0, 84%, 60%)', textColorClass: 'text-red-600 dark:text-red-400' },
                  { name: 'Arbitrum', volume: arbitrumVolume, color: 'hsl(211, 70%, 50%)', textColorClass: 'text-blue-700 dark:text-blue-300' },
                ]
                  .filter(chain => chain.volume > 0)
                  .sort((a, b) => b.volume - a.volume)
                  .map(chain => (
                    <div
                      key={chain.name}
                      className="relative overflow-hidden rounded-lg border px-2 py-1 shadow-sm flex items-center gap-1.5"
                      style={{
                        borderColor: `${chain.color}50`,
                        background: `linear-gradient(to bottom right, ${chain.color}33, ${chain.color}1a, transparent)`,
                        boxShadow: `0 1px 2px ${chain.color}1a`
                      }}
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: chain.color }}></span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${chain.textColorClass}`}>{chain.name}</span>
                        <span className="text-sm font-bold font-mono text-foreground">{formatNumberWithSuffix(chain.volume)}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          ({totalVolume > 0 ? ((chain.volume / totalVolume) * 100).toFixed(1) : '0'}%)
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Legend and Protocol List - Grouped by Chain */}
            <div className="flex-shrink-0 w-full lg:w-96 mt-4 lg:mt-0 max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              <div className="space-y-2 pr-2">
                {/* Solana Section */}
                {solanaProtocols.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-gradient-to-r from-purple-500/10 to-transparent rounded-md border-l-2" style={{ borderLeftColor: 'hsl(271, 91%, 65%)' }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(271, 91%, 65%)' }}></span>
                      <span className="text-xs font-bold uppercase tracking-wide text-foreground">Solana</span>
                      <span className="text-[9px] text-muted-foreground font-mono ml-auto">
                        {formatNumberWithSuffix(solanaVolume)}
                      </span>
                    </div>
                    {(isSolanaExpanded ? solanaProtocols : solanaProtocols.slice(0, 5)).map((protocol) => {
                      const isDisabled = disabledProtocols.has(protocol.protocolId);
                      const value = isDisabled ? 0 : protocol.volume;
                      const percentage = solanaVolume > 0 && !isDisabled ? ((protocol.volume / solanaVolume) * 100) : 0;

                      return (
                        <div
                          key={protocol.protocolId}
                          className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all duration-200 border ${
                            isDisabled
                              ? 'opacity-50 grayscale bg-muted/20 border-dashed border-border'
                              : `hover:bg-muted/30 hover:shadow-sm border-transparent hover:border-border`
                          }`}
                          onClick={() => {
                            setDisabledProtocols(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(protocol.protocolId)) {
                                newSet.delete(protocol.protocolId);
                              } else {
                                newSet.add(protocol.protocolId);
                              }
                              return newSet;
                            });
                          }}
                          title={isDisabled ? `Click to show ${protocol.protocolName}` : `Click to hide ${protocol.protocolName}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-5 h-5 bg-muted/10 rounded overflow-hidden ring-1 shrink-0 transition-all ${
                              isDisabled ? 'ring-border/20 grayscale opacity-50' : 'ring-border/20'
                            }`}>
                              <img
                                src={`/assets/logos/${getProtocolLogoFilename(protocol.protocolId)}`}
                                alt={protocol.protocolName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const container = target.parentElement;
                                  if (container) {
                                    container.innerHTML = '';
                                    container.className = `w-5 h-5 rounded shrink-0 flex items-center justify-center transition-all ${
                                      isDisabled ? 'border border-dashed border-muted-foreground' : 'shadow-sm'
                                    }`;
                                    container.style.backgroundColor = isDisabled ? 'transparent' : 'hsl(271, 91%, 65%)';
                                    const iconEl = document.createElement('div');
                                    iconEl.innerHTML = '<svg class="h-2 w-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                    container.appendChild(iconEl);
                                  }
                                }}
                              />
                            </div>
                            <span className={`text-xs font-medium truncate transition-all ${
                              isDisabled ? 'text-muted-foreground line-through' : 'text-foreground'
                            }`}>
                              {protocol.protocolName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-right shrink-0">
                            <span className={`text-xs font-semibold font-mono transition-all ${
                              isDisabled ? 'text-muted-foreground' : 'text-foreground'
                            }`}>
                              {isDisabled ? '$0' : formatNumberWithSuffix(value)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono w-12 text-right">
                              {isDisabled ? '0%' : `${percentage.toFixed(1)}%`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {solanaProtocols.length > 5 && (
                      <button
                        onClick={() => setIsSolanaExpanded(!isSolanaExpanded)}
                        className="w-full px-2 py-1.5 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded transition-colors flex items-center justify-center gap-1"
                      >
                        {isSolanaExpanded ? (
                          <>
                            <span>Show Less</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>Show More ({solanaProtocols.length - 5})</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* EVM Section */}
                {evmProtocols.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-gradient-to-r from-blue-500/10 to-transparent rounded-md border-l-2" style={{ borderLeftColor: 'hsl(217, 91%, 60%)' }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(217, 91%, 60%)' }}></span>
                      <span className="text-xs font-bold uppercase tracking-wide text-foreground">EVM</span>
                      <span className="text-[9px] text-muted-foreground font-mono ml-auto">
                        {formatNumberWithSuffix(ethereumVolume + baseVolume + bscVolume + avaxVolume + arbitrumVolume)}
                      </span>
                    </div>
                    {(isEvmExpanded ? evmProtocols : evmProtocols.slice(0, 5)).map((protocol) => {
                      const isDisabled = disabledProtocols.has(protocol.protocolId);
                      const value = isDisabled ? 0 : protocol.volume;
                      const totalEvmVolume = ethereumVolume + baseVolume + bscVolume + avaxVolume + arbitrumVolume;
                      const percentage = totalEvmVolume > 0 && !isDisabled ? ((protocol.volume / totalEvmVolume) * 100) : 0;

                      return (
                        <div
                          key={protocol.protocolId}
                          className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all duration-200 border ${
                            isDisabled
                              ? 'opacity-50 grayscale bg-muted/20 border-dashed border-border'
                              : `hover:bg-muted/30 hover:shadow-sm border-transparent hover:border-border`
                          }`}
                          onClick={() => {
                            setDisabledProtocols(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(protocol.protocolId)) {
                                newSet.delete(protocol.protocolId);
                              } else {
                                newSet.add(protocol.protocolId);
                              }
                              return newSet;
                            });
                          }}
                          title={isDisabled ? `Click to show ${protocol.protocolName}` : `Click to hide ${protocol.protocolName}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-5 h-5 bg-muted/10 rounded overflow-hidden ring-1 shrink-0 transition-all ${
                              isDisabled ? 'ring-border/20 grayscale opacity-50' : 'ring-border/20'
                            }`}>
                              <img
                                src={`/assets/logos/${getProtocolLogoFilename(protocol.protocolId)}`}
                                alt={protocol.protocolName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const container = target.parentElement;
                                  if (container) {
                                    container.innerHTML = '';
                                    container.className = `w-5 h-5 rounded shrink-0 flex items-center justify-center transition-all ${
                                      isDisabled ? 'border border-dashed border-muted-foreground' : 'shadow-sm'
                                    }`;
                                    container.style.backgroundColor = isDisabled ? 'transparent' : 'hsl(217, 91%, 60%)';
                                    const iconEl = document.createElement('div');
                                    iconEl.innerHTML = '<svg class="h-2 w-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                    container.appendChild(iconEl);
                                  }
                                }}
                              />
                            </div>
                            <span className={`text-xs font-medium truncate transition-all ${
                              isDisabled ? 'text-muted-foreground line-through' : 'text-foreground'
                            }`}>
                              {protocol.protocolName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-right shrink-0">
                            <span className={`text-xs font-semibold font-mono transition-all ${
                              isDisabled ? 'text-muted-foreground' : 'text-foreground'
                            }`}>
                              {isDisabled ? '$0' : formatNumberWithSuffix(value)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono w-12 text-right">
                              {isDisabled ? '0%' : `${percentage.toFixed(1)}%`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {evmProtocols.length > 5 && (
                      <button
                        onClick={() => setIsEvmExpanded(!isEvmExpanded)}
                        className="w-full px-2 py-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded transition-colors flex items-center justify-center gap-1"
                      >
                        {isEvmExpanded ? (
                          <>
                            <span>Show Less</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>Show More ({evmProtocols.length - 5})</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
