import { protocolConfigs, getProtocolLogoFilename } from "../lib/protocol-config";
import { ProtocolLogo } from './ui/logo-with-fallback';
import { StackedBarChart } from "./charts/StackedBarChart";
import { useState, useMemo, useEffect } from "react";
import { protocolApi } from "../lib/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { formatVolume } from "../lib/utils";
import { ComponentActions } from './ComponentActions';

interface MonthlyChainVolumeChartProps {
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

// Chain configuration with colors
const CHAIN_CONFIG = [
  { key: 'solana', name: 'Solana', color: 'hsl(271, 91%, 65%)', logo: 'solana.jpg' },
  { key: 'ethereum', name: 'Ethereum', color: 'hsl(217, 91%, 60%)', logo: 'ethereum.jpg' },
  { key: 'base', name: 'Base', color: 'hsl(220, 70%, 55%)', logo: 'base.jpg' },
  { key: 'bsc', name: 'BSC', color: 'hsl(45, 93%, 47%)', logo: 'bsc.jpg' },
  { key: 'avax', name: 'Avalanche', color: 'hsl(0, 84%, 60%)', logo: 'avax.jpg' },
  { key: 'arbitrum', name: 'Arbitrum', color: 'hsl(211, 70%, 50%)', logo: 'arbitrum.jpg' },
];

export function MonthlyChainVolumeChart({ endDate }: MonthlyChainVolumeChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChainVolumeData[]>([]);
  const [protocolData, setProtocolData] = useState<ProtocolVolumeData[]>([]);
  const [disabledProtocols, setDisabledProtocols] = useState<Set<string>>(new Set());
  const [isSolanaExpanded, setIsSolanaExpanded] = useState(false);
  const [isEVMExpanded, setIsEVMExpanded] = useState(false);

  // Calculate all days in the month
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(endDate);
    const monthEnd = endOfMonth(endDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [endDate]);

  // Fetch monthly data for both chains (single API call each)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch both Solana and EVM monthly data with daily breakdowns
        const [solanaResponse, evmResponse] = await Promise.all([
          protocolApi.getMonthlyChartMetrics(endDate, 'solana', 'private'),
          protocolApi.getMonthlyChartMetrics(endDate, 'evm', 'public'),
        ]);

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
        const transformedData: ChainVolumeData[] = monthDays.map(day => {
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

        setChartData(transformedData);
      } catch (err) {
        console.error('MonthlyChainVolumeChart - Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endDate, monthDays, disabledProtocols]);

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

  const monthName = format(endDate, 'MMMM yyyy');
  const dayCount = monthDays.length;

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-background">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border">
          <h3 className="text-headline font-semibold text-foreground">Chain Volume Distribution</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-destructive">
            <div className="text-lg mb-2">⚠️</div>
            <div className="text-sm">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ComponentActions
      componentName="Monthly Chain Volume Distribution"
      filename={`Monthly_Chain_Volume_${format(endDate, 'yyyy-MM')}.png`}
    >
      <div className="rounded-lg border border-border bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border">
          <div>
            <h3 className="text-headline font-semibold text-foreground">Chain Volume Distribution</h3>
            <p className="text-caption text-muted-foreground mt-0.5">
              {monthName} • {dayCount}-day volume by chain
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Stacked Bar Chart */}
            <div className="flex-1">
              <StackedBarChart
                data={chartData}
                dataKeys={CHAIN_CONFIG.map(c => c.key)}
                labels={CHAIN_CONFIG.map(c => c.name)}
                colors={CHAIN_CONFIG.map(c => c.color)}
                xAxisKey="formattedDay"
                valueFormatter={formatVolume}
                loading={loading}
                disableTimeframeSelector={true}
                hideHeader={true}
              />

              {/* Chain Share Stats - Below chart */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {/* Total Volume Card */}
                <div
                  className="relative overflow-hidden rounded-xl border px-3 py-2 flex items-center gap-2"
                  style={{
                    borderColor: 'hsl(var(--primary) / 0.4)',
                    background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.05) 50%, transparent 100%)',
                  }}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Total:</span>
                    <span className="text-sm font-bold font-mono text-foreground">{formatVolume(totalVolume)}</span>
                  </div>
                </div>

                {/* Chain Cards */}
                {[
                  { name: 'Solana', volume: solanaVolume, color: 'hsl(271, 91%, 65%)', logo: 'solana.jpg' },
                  { name: 'EVM', volume: ethereumVolume + baseVolume + bscVolume + avaxVolume + arbitrumVolume, color: 'hsl(217, 91%, 60%)', logo: 'ethereum.jpg' },
                ]
                  .filter(chain => chain.volume > 0)
                  .map(chain => (
                    <div
                      key={chain.name}
                      className="relative overflow-hidden rounded-xl border px-3 py-2 flex items-center gap-2"
                      style={{
                        borderColor: `${chain.color}60`,
                        background: `linear-gradient(135deg, ${chain.color}20, ${chain.color}10, transparent)`
                      }}
                    >
                      <img
                        src={`/assets/logos/${chain.logo}`}
                        alt={chain.name}
                        className="w-6 h-6 rounded-full object-cover ring-2 ring-white/20"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold font-mono text-foreground">{formatVolume(chain.volume)}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({totalVolume > 0 ? ((chain.volume / totalVolume) * 100).toFixed(1) : '0'}%)
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right: Protocol List - Two Columns */}
            <div className="shrink-0 w-full lg:w-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[520px]">
                {/* Solana Column */}
                {solanaProtocols.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <img src="/assets/logos/solana.jpg" alt="Solana" className="w-5 h-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-sm font-semibold text-foreground">Solana</span>
                      <span className="text-xs text-muted-foreground font-mono ml-auto">
                        {formatVolume(solanaVolume)}
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-[520px] overflow-y-auto">
                      {(isSolanaExpanded ? solanaProtocols : solanaProtocols.slice(0, 15)).map((protocol) => {
                        const isDisabled = disabledProtocols.has(protocol.protocolId);
                        const value = isDisabled ? 0 : protocol.volume;
                        const percentage = solanaVolume > 0 && !isDisabled ? ((protocol.volume / solanaVolume) * 100) : 0;

                        return (
                          <div
                            key={protocol.protocolId}
                            className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                              isDisabled
                                ? 'opacity-50 bg-muted/30'
                                : 'hover:bg-muted/50'
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
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ProtocolLogo
                                src={`/assets/logos/${getProtocolLogoFilename(protocol.protocolId)}`}
                                alt={protocol.protocolName}
                                size="sm"
                              />
                              <span className={`text-xs font-medium truncate ${isDisabled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                {protocol.protocolName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-xs font-semibold font-mono ${isDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {isDisabled ? '-' : formatVolume(value)}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">
                                {isDisabled ? '-' : `${percentage.toFixed(1)}%`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {solanaProtocols.length > 15 && (
                      <button
                        onClick={() => setIsSolanaExpanded(!isSolanaExpanded)}
                        className="w-full py-1.5 text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-md transition-colors"
                      >
                        {isSolanaExpanded ? 'Show Less ↑' : `Show More (${solanaProtocols.length - 15}) ↓`}
                      </button>
                    )}
                  </div>
                )}

                {/* EVM Column */}
                {evmProtocols.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <img src="/assets/logos/ethereum.jpg" alt="EVM" className="w-5 h-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-sm font-semibold text-foreground">EVM</span>
                      <span className="text-xs text-muted-foreground font-mono ml-auto">
                        {formatVolume(ethereumVolume + baseVolume + bscVolume + avaxVolume + arbitrumVolume)}
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-[520px] overflow-y-auto">
                      {(isEVMExpanded ? evmProtocols : evmProtocols.slice(0, 15)).map((protocol) => {
                        const isDisabled = disabledProtocols.has(protocol.protocolId);
                        const value = isDisabled ? 0 : protocol.volume;
                        const evmTotal = ethereumVolume + baseVolume + bscVolume + avaxVolume + arbitrumVolume;
                        const percentage = evmTotal > 0 && !isDisabled ? ((protocol.volume / evmTotal) * 100) : 0;

                        return (
                          <div
                            key={protocol.protocolId}
                            className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                              isDisabled
                                ? 'opacity-50 bg-muted/30'
                                : 'hover:bg-muted/50'
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
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ProtocolLogo
                                src={`/assets/logos/${getProtocolLogoFilename(protocol.protocolId)}`}
                                alt={protocol.protocolName}
                                size="sm"
                              />
                              <span className={`text-xs font-medium truncate ${isDisabled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                {protocol.protocolName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-xs font-semibold font-mono ${isDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {isDisabled ? '-' : formatVolume(value)}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">
                                {isDisabled ? '-' : `${percentage.toFixed(1)}%`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {evmProtocols.length > 15 && (
                      <button
                        onClick={() => setIsEVMExpanded(!isEVMExpanded)}
                        className="w-full py-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                      >
                        {isEVMExpanded ? 'Show Less ↑' : `Show More (${evmProtocols.length - 15}) ↓`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ComponentActions>
  );
}
