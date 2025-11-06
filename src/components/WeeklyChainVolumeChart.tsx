import { Card, CardContent } from "./ui/card";
import { protocolConfigs, getProtocolLogoFilename } from "../lib/protocol-config";
import { StackedBarChart } from "./charts/StackedBarChart";
import { useState, useMemo, useEffect } from "react";
import { protocolApi } from "../lib/api";
import { format, subDays } from 'date-fns';

interface WeeklyChainVolumeChartProps {
  endDate: Date;
}

interface ChainVolumeData {
  formattedDay: string;
  solana: number;
  ethereum: number;
  base: number;
  bsc: number;
  avax: number;
  arbitrum: number;
}

interface ProtocolVolumeData {
  protocolId: string;
  protocolName: string;
  volume: number;
  chain: string;
  color: string;
  chainVolumes?: Record<string, number>;
}

function formatNumberWithSuffix(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (absValue >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (absValue >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toLocaleString()}`;
}

// Chain configuration with colors
const CHAIN_CONFIG = [
  { key: 'solana', name: 'Solana', color: 'hsl(271, 91%, 65%)', logo: 'solana.jpg' },
  { key: 'ethereum', name: 'Ethereum', color: 'hsl(217, 91%, 60%)', logo: 'ethereum.jpg' },
  { key: 'base', name: 'Base', color: 'hsl(220, 70%, 55%)', logo: 'base.jpg' },
  { key: 'bsc', name: 'BSC', color: 'hsl(45, 93%, 47%)', logo: 'bsc.jpg' },
  { key: 'avax', name: 'Avalanche', color: 'hsl(0, 84%, 60%)', logo: 'avax.jpg' },
  { key: 'arbitrum', name: 'Arbitrum', color: 'hsl(211, 70%, 50%)', logo: 'arbitrum.jpg' },
];

export function WeeklyChainVolumeChart({ endDate }: WeeklyChainVolumeChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChainVolumeData[]>([]);
  const [protocolData, setProtocolData] = useState<ProtocolVolumeData[]>([]);
  const [disabledProtocols, setDisabledProtocols] = useState<Set<string>>(new Set());
  const [isSolanaExpanded, setIsSolanaExpanded] = useState(false);
  const [isEVMExpanded, setIsEVMExpanded] = useState(false);

  // Calculate last 7 days
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => subDays(endDate, 6 - i));
  }, [endDate]);

  // Fetch weekly data for both chains
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('WeeklyChainVolumeChart - Fetching data for 7 days ending:', format(endDate, 'yyyy-MM-dd'));

        // Fetch both Solana and EVM weekly data
        const [solanaResponse, evmResponse] = await Promise.all([
          protocolApi.getWeeklyMetrics(endDate, 'solana', 'private'),
          protocolApi.getWeeklyMetrics(endDate, 'evm', 'public'),
        ]);

        console.log('WeeklyChainVolumeChart - Solana response:', solanaResponse);
        console.log('WeeklyChainVolumeChart - EVM response:', evmResponse);

        // Build protocol list for legend
        const protocols: ProtocolVolumeData[] = [];

        // Process Solana protocols
        if (solanaResponse?.weeklyData) {
          Object.entries(solanaResponse.weeklyData).forEach(([protocolId, protocolData]: [string, any]) => {
            const config = protocolConfigs.find(p => p.id === protocolId);

            // Calculate total volume by summing daily volumes
            let totalVolume = 0;
            if (protocolData.dailyMetrics?.volume) {
              totalVolume = Object.values(protocolData.dailyMetrics.volume).reduce((sum: number, vol: any) => sum + (vol || 0), 0);
            }

            if (totalVolume > 0) {
              protocols.push({
                protocolId,
                protocolName: config?.name || protocolId,
                volume: totalVolume,
                chain: 'solana',
                color: 'hsl(271, 91%, 65%)',
              });
            }
          });
        }

        // Process EVM protocols
        if (evmResponse?.weeklyData) {
          Object.entries(evmResponse.weeklyData).forEach(([protocolId, protocolData]: [string, any]) => {
            const config = protocolConfigs.find(p => p.id === protocolId);

            // Calculate total volume by summing daily volumes
            let totalVolume = 0;
            if (protocolData.dailyVolumes) {
              totalVolume = Object.values(protocolData.dailyVolumes).reduce((sum: number, vol: any) => sum + (vol || 0), 0);
            }

            if (totalVolume > 0 && protocolData.chainVolumes) {
              protocols.push({
                protocolId,
                protocolName: config?.name || protocolId,
                volume: totalVolume,
                chain: 'evm',
                chainVolumes: protocolData.chainVolumes,
                color: 'hsl(217, 91%, 60%)',
              });
            }
          });
        }

        setProtocolData(protocols);

        // Transform data into stacked format
        const transformedData: ChainVolumeData[] = last7Days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const formattedDay = format(day, 'dd-MM-yyyy');

          // Calculate Solana volume for this day
          let solanaVolume = 0;
          if (solanaResponse?.weeklyData) {
            Object.entries(solanaResponse.weeklyData).forEach(([protocolId, protocolData]: [string, any]) => {
              if (!disabledProtocols.has(protocolId) && protocolData.dailyMetrics?.volume?.[dateKey]) {
                solanaVolume += protocolData.dailyMetrics.volume[dateKey];
              }
            });
          }

          // Calculate EVM chain volumes for this day
          const evmChainVolumes = {
            ethereum: 0,
            base: 0,
            bsc: 0,
            avax: 0,
            arbitrum: 0,
          };

          if (evmResponse?.weeklyData) {
            Object.entries(evmResponse.weeklyData).forEach(([protocolId, protocolData]: [string, any]) => {
              if (disabledProtocols.has(protocolId)) return;

              // Get daily volume for this protocol on this day
              const dailyVolume = protocolData.dailyVolumes?.[dateKey] || 0;

              if (dailyVolume > 0 && protocolData.chainVolumes) {
                // Calculate total volume to get proportions
                const totalProtocolVolume = protocolData.totalVolume || 1;

                // Distribute daily volume across chains proportionally
                Object.keys(evmChainVolumes).forEach(chain => {
                  const chainVolume = protocolData.chainVolumes[chain] || 0;
                  const proportion = chainVolume / totalProtocolVolume;
                  evmChainVolumes[chain as keyof typeof evmChainVolumes] += dailyVolume * proportion;
                });
              }
            });
          }

          return {
            formattedDay,
            solana: solanaVolume,
            ethereum: evmChainVolumes.ethereum,
            base: evmChainVolumes.base,
            bsc: evmChainVolumes.bsc,
            avax: evmChainVolumes.avax,
            arbitrum: evmChainVolumes.arbitrum,
          };
        });

        console.log('WeeklyChainVolumeChart - Transformed data:', transformedData);
        setChartData(transformedData);
      } catch (err) {
        console.error('WeeklyChainVolumeChart - Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endDate, last7Days, disabledProtocols]);

  // Calculate chain volumes
  const { solanaVolume, ethereumVolume, baseVolume, bscVolume, avaxVolume, arbitrumVolume, totalVolume } = useMemo(() => {
    const enabledProtocols = protocolData.filter(p => !disabledProtocols.has(p.protocolId));

    const solana = enabledProtocols
      .filter(p => p.chain === 'solana')
      .reduce((sum, p) => sum + p.volume, 0);

    const enabledEVMProtocols = enabledProtocols.filter(p => p.chain === 'evm');
    const ethereum = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.ethereum || 0), 0);
    const base = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.base || 0), 0);
    const bsc = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.bsc || 0), 0);
    const avax = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.avax || 0), 0);
    const arbitrum = enabledEVMProtocols.reduce((sum, p) => sum + (p.chainVolumes?.arbitrum || 0), 0);

    const total = solana + ethereum + base + bsc + avax + arbitrum;

    return {
      solanaVolume: solana,
      ethereumVolume: ethereum,
      baseVolume: base,
      bscVolume: bsc,
      avaxVolume: avax,
      arbitrumVolume: arbitrum,
      totalVolume: total,
    };
  }, [protocolData, disabledProtocols]);

  // Separate and sort protocols
  const solanaProtocols = useMemo(() => {
    return protocolData
      .filter(p => p.chain === 'solana')
      .sort((a, b) => b.volume - a.volume);
  }, [protocolData]);

  const evmProtocols = useMemo(() => {
    return protocolData
      .filter(p => p.chain === 'evm')
      .sort((a, b) => b.volume - a.volume);
  }, [protocolData]);

  const startDateStr = format(last7Days[0], 'MMM dd, yyyy');
  const endDateStr = format(last7Days[6], 'MMM dd, yyyy');

  if (error) {
    return (
      <Card className="bg-card border-border rounded-xl">
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
    <div className="space-y-4">
      {/* Chart and Legend Side by Side */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Stacked Bar Chart using existing component */}
        <div className="flex-1">
          <StackedBarChart
            title="Weekly Chain Volume Distribution"
            subtitle={`${startDateStr} - ${endDateStr} • 7-day volume by chain`}
            data={chartData}
            dataKeys={CHAIN_CONFIG.map(c => c.key)}
            labels={CHAIN_CONFIG.map(c => c.name)}
            colors={CHAIN_CONFIG.map(c => c.color)}
            xAxisKey="formattedDay"
            valueFormatter={formatNumberWithSuffix}
            loading={loading}
            disableTimeframeSelector={true}
          />
        </div>

        {/* Protocol Legend */}
        <Card className="bg-card border-border rounded-xl flex-shrink-0 w-full lg:w-80 h-full flex flex-col">
          <CardContent className="p-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent pr-2">
              <div className="space-y-2">
                {/* Solana Section */}
                {solanaProtocols.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-gradient-to-r from-purple-500/10 to-transparent rounded-md border-l-2" style={{ borderLeftColor: 'hsl(271, 91%, 65%)' }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(271, 91%, 65%)' }}></span>
                      <span className="text-sm font-bold uppercase tracking-wide text-foreground">Solana</span>
                      <span className="text-[9px] text-muted-foreground font-mono ml-auto">
                        {formatNumberWithSuffix(solanaVolume)}
                      </span>
                    </div>
                    {(isSolanaExpanded ? solanaProtocols : solanaProtocols.slice(0, 7)).map((protocol) => {
                      const isDisabled = disabledProtocols.has(protocol.protocolId);
                      const value = isDisabled ? 0 : protocol.volume;
                      const percentage = solanaVolume > 0 && !isDisabled ? ((protocol.volume / solanaVolume) * 100) : 0;

                      return (
                        <div
                          key={protocol.protocolId}
                          className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all duration-200 border ${
                            isDisabled
                              ? 'opacity-50 grayscale bg-muted/20 border-dashed border-border'
                              : `bg-muted/30 border-transparent hover:border-border`
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
                                      isDisabled ? 'border border-dashed border-muted-foreground' : ''
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
                    {solanaProtocols.length > 7 && (
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
                            <span>Show More ({solanaProtocols.length - 7})</span>
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
                      <span className="text-sm font-bold uppercase tracking-wide text-foreground">EVM</span>
                      <span className="text-[9px] text-muted-foreground font-mono ml-auto">
                        {formatNumberWithSuffix(ethereumVolume + baseVolume + bscVolume + avaxVolume + arbitrumVolume)}
                      </span>
                    </div>
                    {(isEVMExpanded ? evmProtocols : evmProtocols.slice(0, 7)).map((protocol) => {
                      const isDisabled = disabledProtocols.has(protocol.protocolId);
                      const value = isDisabled ? 0 : protocol.volume;
                      const evmTotal = ethereumVolume + baseVolume + bscVolume + avaxVolume + arbitrumVolume;
                      const percentage = evmTotal > 0 && !isDisabled ? ((protocol.volume / evmTotal) * 100) : 0;

                      return (
                        <div
                          key={protocol.protocolId}
                          className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all duration-200 border ${
                            isDisabled
                              ? 'opacity-50 grayscale bg-muted/20 border-dashed border-border'
                              : `bg-muted/30 border-transparent hover:border-border`
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
                                      isDisabled ? 'border border-dashed border-muted-foreground' : ''
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
                    {evmProtocols.length > 7 && (
                      <button
                        onClick={() => setIsEVMExpanded(!isEVMExpanded)}
                        className="w-full px-2 py-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded transition-colors flex items-center justify-center gap-1"
                      >
                        {isEVMExpanded ? (
                          <>
                            <span>Show Less</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>Show More ({evmProtocols.length - 7})</span>
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
          </CardContent>
        </Card>
      </div>

      {/* Chain Badges */}
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-4">
          <div className="flex gap-2 overflow-x-auto">
            {/* Total Volume Card */}
            <div
              className="relative overflow-hidden rounded-xl border px-4 py-2 flex items-center gap-2 min-w-fit shadow-md"
              style={{
                borderColor: 'hsl(var(--primary) / 0.4)',
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.05) 50%, transparent 100%)',
              }}
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Total Volume:</span>
                <span className="text-base font-bold font-mono text-foreground">
                  {formatNumberWithSuffix(totalVolume)}
                </span>
              </div>
            </div>

            {/* Chain Cards */}
            {CHAIN_CONFIG
                .map(chain => ({
                  ...chain,
                  volume: (() => {
                    switch (chain.key) {
                      case 'solana': return solanaVolume;
                      case 'ethereum': return ethereumVolume;
                      case 'base': return baseVolume;
                      case 'bsc': return bscVolume;
                      case 'avax': return avaxVolume;
                      case 'arbitrum': return arbitrumVolume;
                      default: return 0;
                    }
                  })(),
                }))
                .filter(chain => chain.volume > 0)
                .sort((a, b) => b.volume - a.volume)
                .map(chain => (
                  <div
                    key={chain.key}
                    className="relative overflow-hidden rounded-xl border px-3 py-1 flex items-center gap-2 min-w-fit"
                    style={{
                      borderColor: `${chain.color}60`,
                      background: `linear-gradient(135deg, ${chain.color}20, ${chain.color}10, transparent)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative shrink-0">
                        <img
                          src={`/assets/logos/${chain.logo}`}
                          alt={chain.name}
                          className="w-6 h-6 rounded-full object-cover ring-2 ring-white/20"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div
                          className="w-6 h-6 rounded-full hidden items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: chain.color, display: 'none' }}
                        >
                          {chain.name.charAt(0)}
                        </div>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: chain.color }}>
                        {chain.name}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold font-mono text-foreground">
                        {formatNumberWithSuffix(chain.volume)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({totalVolume > 0 ? ((chain.volume / totalVolume) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
