import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Eye, EyeOff, Download, Copy } from "lucide-react";
import { cn } from "../lib/utils";
import { Protocol } from "../types/protocol";
import { getProtocolLogoFilename, getProtocolName } from "../lib/protocol-config";
import { LogoWithFallback } from "./ui/logo-with-fallback";
import { Badge } from "./ui/badge";
import { DateNavigator } from "./DateNavigator";
import { useToast } from "../hooks/use-toast";
import { Settings } from "../lib/settings";
import { protocolApi } from "../lib/api";
// @ts-ignore
import domtoimage from "dom-to-image";

interface EVMDailyMetricsTableProps {
  protocols: Protocol[];
  date: Date;
  onDateChange: (date: Date) => void;
}

interface ChainVolume {
  ethereum: number;
  base: number;
  bsc: number;
  avax: number;
  arbitrum: number;
}

interface EVMProtocolData {
  protocol: Protocol;
  totalVolume: number;
  chainVolumes: ChainVolume;
  dailyGrowth: number;
  weeklyTrend: number[];
}

// Chain color mapping for consistent UI
const chainColors: Record<string, string> = {
  ethereum: '#627EEA',
  base: '#0052FF', 
  bsc: '#B8860B'
};

// Chain colors for bars (using original bright colors)
const chainBarColors: Record<string, string> = {
  ethereum: '#627EEA',
  base: '#0052FF', 
  bsc: '#F3BA2F',
  avax: '#E84142',
  arbitrum: '#28A0F0'
};

const chainNames: Record<string, string> = {
  ethereum: 'Ethereum',
  base: 'Base',
  bsc: 'BSC'
};

// Additional chains for total calculation only (not shown as columns)
const additionalChainColors: Record<string, string> = {
  avax: '#E84142',
  arbitrum: '#28A0F0'
};

const additionalChainNames: Record<string, string> = {
  avax: 'Avalanche',
  arbitrum: 'Arbitrum'
};


const formatVolume = (volume: number): string => {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
  return `$${volume.toFixed(2)}`;
};

const formatGrowthPercentage = (growth: number): string => {
  const percentage = growth * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};

const getGrowthBadgeClasses = (growth: number): string => {
  if (growth >= 0) return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
};


const WeeklyTrendChart: React.FC<{ data: number[]; growth: number }> = ({ data, growth }) => {
  // Ensure data is a valid array with 7 elements
  const safeData = Array.isArray(data) && data.length === 7 ? data : Array(7).fill(0);

  const chartData = safeData.map((value, index) => ({
    day: index,
    value: value || 0
  }));

  // Check if we have actual data to show (not all zeros)
  const hasData = chartData.some(d => d.value > 0);

  // Use daily growth to determine area chart color (should match growth badge)
  const isNeutral = Math.abs(growth) < 0.0001; // Less than 0.01%
  const isPositive = growth >= 0;
  const absPercentage = Math.abs(growth * 100);
  
  let trendColor = '#6B7280'; // neutral gray
  if (!isNeutral) {
    trendColor = isPositive ? '#22c55e' : '#ef4444'; // green for positive, red for negative
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="w-[60px] h-[30px] -my-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={trendColor}
              fill={trendColor}
              fillOpacity={0.2}
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {!isNeutral && (
        <div className={cn(
          "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ml-4",
          isPositive 
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        )}>
          {isPositive ? (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          )}
          <span>{absPercentage.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

export function EVMDailyMetricsTable({ protocols, date, onDateChange }: EVMDailyMetricsTableProps) {
  const [evmData, setEvmData] = useState<EVMProtocolData[]>([]);
  const [standaloneVolumes, setStandaloneVolumes] = useState<{ current: {avax: number, arbitrum: number} }>({ current: { avax: 0, arbitrum: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topProtocols, setTopProtocols] = useState<Protocol[]>([]);
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [backendTotals, setBackendTotals] = useState<{
    totalVolume: number;
    chainTotals: Record<string, number>;
    totalGrowth: number;
    totalWeeklyTrend: number[];
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use the new optimized API endpoint - EVM always uses 'public' data type
        const dataType = 'public';
        console.log('Calling getDailyMetricsOptimized with:', { date: date.toISOString().split('T')[0], chain: 'evm', dataType });
        const optimizedData = await protocolApi.getDailyMetricsOptimized(date, 'evm', dataType);
        
        // Transform the optimized data to match the component's data structure
        // Backend already returns protocol names with _evm suffix (e.g., "sigma_evm", "gmgnai_evm")
        const transformedData: EVMProtocolData[] = Object.entries(optimizedData.protocols).map(([protocolName, data]) => ({
          protocol: protocolName as Protocol,
          totalVolume: data.totalVolume,
          chainVolumes: data.chainVolumes as ChainVolume,
          dailyGrowth: data.dailyGrowth,
          weeklyTrend: data.weeklyTrend
        }));

        console.log('Backend protocols received:', Object.keys(optimizedData.protocols));
        console.log('Transformed protocol data:', transformedData);
        console.log('Expected protocols from props:', protocols);

        setEvmData(transformedData);
        setStandaloneVolumes({ current: optimizedData.standaloneChains });
        setBackendTotals(optimizedData.totals);

        // Set top protocols from the backend response (already have _evm suffix)
        setTopProtocols(optimizedData.topProtocols.map(p => p as Protocol));
      } catch (err) {
        console.error('Error loading EVM daily data:', err);
        setError('Failed to load data from database');
        setEvmData([]);
        setTopProtocols([]);
        setBackendTotals(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [date]);

  const chains = Object.keys(chainNames) as (keyof ChainVolume)[];

  // Calculate totals (excluding hidden protocols)
  const totals = useMemo(() => {
    // If we have backend totals and no protocols are hidden, use them directly
    if (backendTotals && hiddenProtocols.size === 0) {
      // Ensure totalWeeklyTrend is always a valid 7-element array
      return {
        ...backendTotals,
        totalWeeklyTrend: backendTotals.totalWeeklyTrend?.length === 7
          ? backendTotals.totalWeeklyTrend
          : Array(7).fill(0)
      };
    }
    
    // Otherwise, calculate totals based on visible protocols only
    const visibleData = evmData.filter(data => !hiddenProtocols.has(data.protocol));
    const totalVolume = visibleData.reduce((sum, data) => sum + data.totalVolume, 0);
    
    // Calculate chain totals including all chains (ethereum, base, bsc, avax, arbitrum)
    const chainTotals = ['ethereum', 'base', 'bsc', 'avax', 'arbitrum'].reduce((acc, chain) => {
      acc[chain] = visibleData.reduce((sum, data) => sum + (data.chainVolumes[chain] || 0), 0);
      return acc;
    }, {} as any);
    
    // Calculate total growth - if some protocols are hidden, we can't use backend's total growth
    let totalGrowth = 0;
    if (hiddenProtocols.size > 0 && visibleData.length > 0) {
      // Calculate average growth of visible protocols
      const growthSum = visibleData.reduce((sum, data) => sum + data.dailyGrowth, 0);
      totalGrowth = growthSum / visibleData.length;
    } else if (backendTotals) {
      totalGrowth = backendTotals.totalGrowth;
    }

    // Calculate total weekly trend (sum across all visible protocols for each day)
    const totalWeeklyTrend = visibleData.length > 0 && visibleData[0].weeklyTrend?.length === 7
      ? visibleData[0].weeklyTrend.map((_, dayIndex) =>
          visibleData.reduce((sum, data) => sum + (data.weeklyTrend?.[dayIndex] || 0), 0)
        )
      : Array(7).fill(0);

    return {
      totalVolume,
      chainTotals,
      totalGrowth,
      totalWeeklyTrend
    };
  }, [evmData, hiddenProtocols, backendTotals]);

  const handleDateChange = (newDate?: Date) => {
    if (newDate) {
      onDateChange(newDate);
    }
  };

  const toggleProtocolVisibility = (protocol: string) => {
    setHiddenProtocols(prev => {
      const newSet = new Set(prev);
      if (newSet.has(protocol)) {
        newSet.delete(protocol);
      } else {
        newSet.add(protocol);
      }
      return newSet;
    });
  };

  const showAllProtocols = () => {
    setHiddenProtocols(new Set());
  };

  const hideAllProtocols = () => {
    const allProtocols = new Set<string>();
    evmData.forEach(data => {
      allProtocols.add(data.protocol);
    });
    setHiddenProtocols(allProtocols);
  };

  const downloadReport = async () => {
    const tableElement = document.querySelector('[data-table="evm-daily-metrics"]') as HTMLElement;
    
    if (tableElement) {
      // Check element dimensions
      const rect = tableElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const scale = 2; // 2x resolution for higher quality
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: (tableElement.scrollWidth + 40) * scale,
            height: (tableElement.scrollHeight + 40) * scale,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              overflow: 'visible',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 10 seconds')), 10000)
          )
        ]) as string;
        
        // Create download link
        const link = document.createElement('a');
        link.download = `EVM Report - ${format(date, 'dd.MM')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Dom-to-image error:', error);
      }
    }
  };

  const copyToClipboard = async () => {
    const tableElement = document.querySelector('[data-table="evm-daily-metrics"]') as HTMLElement;
    
    if (tableElement) {
      // Check element dimensions
      const rect = tableElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const scale = 2; // 2x resolution for higher quality
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: (tableElement.scrollWidth + 40) * scale,
            height: (tableElement.scrollHeight + 40) * scale,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              overflow: 'visible',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 10 seconds')), 10000)
          )
        ]) as string;
        
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            toast({
              title: "Copied to clipboard",
              description: "EVM report image copied successfully",
              duration: 2000,
            });
          } catch (error) {
            // Handle error silently
          }
        }
      } catch (error) {
        // Handle error silently
      }
    }
  };

  return (
    <div className="space-y-4">
      <div data-table="evm-daily-metrics" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-lg font-semibold text-foreground">Daily Report</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">
                EVM
              </span>
            </div>
            <div className="flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={hiddenProtocols.size > 0 ? showAllProtocols : hideAllProtocols}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                title={hiddenProtocols.size > 0 ? "Show all protocols" : "Hide all protocols"}
              >
                {hiddenProtocols.size > 0 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {hiddenProtocols.size > 0 ? "Show All" : "Hide All"}
              </button>
            </div>
          </div>
          <div className="w-auto">
            <DateNavigator date={date} onDateChange={handleDateChange} />
          </div>
        </div>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Protocol</TableHead>
                {chains.map(chain => (
                  <TableHead key={chain} className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div
                        className="p-1 rounded-md"
                        style={{ 
                          backgroundColor: `${chainColors[chain] || '#6B7280'}15`
                        }}
                      >
                        <img
                          src={`/assets/logos/${chain}.jpg`}
                          alt={chainNames[chain] || chain}
                          className="w-5 h-5 rounded-full border border-background object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      {chainNames[chain]}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-right w-[180px]">Total Volume</TableHead>
                <TableHead className="text-center w-[140px]">Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={chains.length + 3} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                      <span className="text-muted-foreground">Loading EVM protocol data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={chains.length + 3} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <p>{error}</p>
                      <p className="text-sm mt-1">Using fallback data</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {evmData
                    .sort((a, b) => b.totalVolume - a.totalVolume)
                    .filter(data => !hiddenProtocols.has(data.protocol))
                    .map((data) => {
                const displayName = getProtocolName(data.protocol);
                const isHidden = hiddenProtocols.has(data.protocol);
                return (
                  <TableRow key={data.protocol} className="transition-colors hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProtocolVisibility(data.protocol);
                          }}
                          className="opacity-0 hover:opacity-100 transition-opacity duration-200"
                          title={isHidden ? "Show protocol" : "Hide protocol"}
                        >
                          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <LogoWithFallback
                          src={`/assets/logos/${getProtocolLogoFilename(data.protocol)}`}
                          alt={displayName}
                          size="lg"
                        />
                        <span className="font-medium">{displayName}</span>
                        {topProtocols.includes(data.protocol) && (
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "ml-2 h-4 px-2 text-xs font-medium flex-shrink-0",
                              topProtocols.indexOf(data.protocol) === 0 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                              topProtocols.indexOf(data.protocol) === 1 && "bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300",
                              topProtocols.indexOf(data.protocol) === 2 && "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                            )}
                          >
                            #{topProtocols.indexOf(data.protocol) + 1}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {chains.map(chain => (
                      <TableCell key={chain} className="text-right">
                        <Badge 
                          variant="outline" 
                          className="font-medium text-sm border-0"
                          style={{ 
                            backgroundColor: `${chainColors[chain] || '#6B7280'}15`,
                            color: chainColors[chain] || '#6B7280'
                          }}
                        >
                          {data.chainVolumes[chain] > 0 ? formatVolume(data.chainVolumes[chain]) : '-'}
                        </Badge>
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1">
                        {data.totalVolume > 0 && (
                          <div className="relative w-40 h-4 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                            {/* Display chain volumes including AVAX and ARB */}
                            {(() => {
                              console.log(`Rendering bar chart for ${data.protocol}:`, {
                                totalVolume: data.totalVolume,
                                chainVolumes: data.chainVolumes,
                                entries: Object.entries(data.chainVolumes)
                              });
                              
                              return Object.entries(data.chainVolumes).map(([chain, volume], index) => {
                                const chainVolume = volume || 0;
                                if (chainVolume === 0) {
                                  console.log(`Skipping ${chain} for ${data.protocol}: volume is 0`);
                                  return null;
                                }
                                
                                const percentage = (chainVolume / data.totalVolume) * 100;
                                const previousPercentage = Object.entries(data.chainVolumes)
                                  .slice(0, index)
                                  .reduce((sum, [prevChain, prevVolume]) => {
                                    return sum + ((prevVolume || 0) / data.totalVolume) * 100;
                                  }, 0);
                                
                                const chainDisplayName = chainNames[chain] || additionalChainNames[chain] || chain;
                                const chainColor = chainBarColors[chain] || '#6B7280';
                                
                                console.log(`Rendering ${chain} segment for ${data.protocol}:`, {
                                  volume: chainVolume,
                                  percentage: percentage.toFixed(1),
                                  color: chainColor,
                                  left: previousPercentage.toFixed(1)
                                });
                                
                                return (
                                  <div
                                    key={chain}
                                    className="absolute h-full transition-all duration-300 hover:opacity-80"
                                    style={{
                                      left: `${previousPercentage}%`,
                                      width: `${percentage}%`,
                                      backgroundColor: chainColor
                                    }}
                                    title={`${chainDisplayName}: ${formatVolume(chainVolume)} (${percentage.toFixed(1)}%)`}
                                  />
                                );
                              });
                            })()}
                          </div>
                        )}
                        <Badge variant="outline" className="font-medium ml-1 bg-background text-sm">
                          {formatVolume(data.totalVolume)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <WeeklyTrendChart data={data.weeklyTrend} growth={data.dailyGrowth} />
                    </TableCell>
                  </TableRow>
                );
                  })}
                  {/* Total Row */}
                  <TableRow className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold rounded-b-xl">
                <TableCell style={{ paddingLeft: '3rem' }} className="rounded-bl-xl">
                  <span className="font-semibold">Total</span>
                </TableCell>
                {chains.map(chain => (
                  <TableCell key={chain} className="text-right">
                    <Badge 
                      variant="outline" 
                      className="font-semibold text-sm border-0"
                      style={{ 
                        backgroundColor: `${chainColors[chain] || '#6B7280'}15`,
                        color: chainColors[chain] || '#6B7280'
                      }}
                    >
                      {totals.chainTotals[chain] > 0 ? formatVolume(totals.chainTotals[chain]) : '-'}
                    </Badge>
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex items-center gap-1">
                    {totals.totalVolume > 0 && (
                      <div className="relative w-40 h-4 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                        {/* Display all chain volumes including AVAX and ARB */}
                        {Object.entries(totals.chainTotals).map(([chain, volume], index) => {
                          const chainVolume = volume || 0;
                          if (chainVolume === 0) return null;
                          
                          const percentage = (chainVolume / totals.totalVolume) * 100;
                          const previousPercentage = Object.entries(totals.chainTotals)
                            .slice(0, index)
                            .reduce((sum, [prevChain, prevVolume]) => {
                              return sum + ((prevVolume || 0) / totals.totalVolume) * 100;
                            }, 0);
                          
                          const chainDisplayName = chainNames[chain] || additionalChainNames[chain] || chain;
                          const chainColor = chainBarColors[chain] || '#6B7280';
                          
                          return (
                            <div
                              key={chain}
                              className="absolute h-full transition-all duration-300 hover:opacity-80"
                              style={{
                                left: `${previousPercentage}%`,
                                width: `${percentage}%`,
                                backgroundColor: chainColor
                              }}
                              title={`${chainDisplayName}: ${formatVolume(chainVolume)} (${percentage.toFixed(1)}%)`}
                            />
                          );
                        })}
                      </div>
                    )}
                    <Badge variant="outline" className="font-semibold ml-1 bg-background text-sm">
                      {formatVolume(totals.totalVolume)}
                    </Badge>
                  </div>
                </TableCell>
                    <TableCell className="text-center rounded-br-xl">
                      <WeeklyTrendChart data={totals.totalWeeklyTrend || Array(7).fill(0)} growth={totals.totalGrowth || 0} />
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <button
          onClick={downloadReport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/50 border border-border rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/50 border border-border rounded-lg transition-colors"
        >
          <Copy className="h-4 w-4" />
          Copy
        </button>
      </div>
    </div>
  );
}