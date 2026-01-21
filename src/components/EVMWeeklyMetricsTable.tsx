import React, { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { format, subDays, eachDayOfInterval, addDays, isBefore, isAfter } from "date-fns";
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { ChevronLeft, ChevronRight, Calendar, Download, Copy, Eye, EyeOff } from "lucide-react";
import { cn, formatCurrency, formatNumber } from "../lib/utils";
import { Protocol } from "../types/protocol";
import { protocolApi } from "../lib/api";
import { getProtocolLogoFilename, getProtocolName } from "../lib/protocol-config";
import { useToast } from "../hooks/use-toast";
// @ts-ignore
import domtoimage from "dom-to-image";

type MetricKey = 'volume' | 'users' | 'newUsers';

interface EVMWeeklyMetricsTableProps {
  protocols: Protocol[];
  endDate: Date;
  onDateChange: (date: Date) => void;
}

interface ChainVolume {
  ethereum: number;
  base: number;
  bsc: number;
  avax: number;
  arbitrum: number;
}

interface ProtocolWeeklyData {
  protocol: string;
  totalVolume: number;
  totalUsers: number;
  totalNewUsers: number;
  dailyVolumes: Record<string, number>; // date -> volume
  dailyUsers: Record<string, number>; // date -> users
  dailyNewUsers: Record<string, number>; // date -> new users
  chainVolumes: ChainVolume;
  weeklyGrowth: number;
  weeklyTrend: number[];
  previousWeekTotal?: number;
}

// Chain color mapping for consistent UI
const chainColors: Record<string, string> = {
  ethereum: '#627EEA',
  base: '#0052FF', 
  bsc: '#F3BA2F',
  avax: '#E84142',
  arbitrum: '#28A0F0'
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

export function EVMWeeklyMetricsTable({ protocols, endDate, onDateChange }: EVMWeeklyMetricsTableProps) {
  const [protocolData, setProtocolData] = useState<ProtocolWeeklyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('volume');
  const { toast } = useToast();

  const metricOptions = [
    { key: 'volume' as MetricKey, label: 'Volume', format: formatCurrency },
    { key: 'users' as MetricKey, label: 'DAUs', format: formatNumber },
    { key: 'newUsers' as MetricKey, label: 'New Users', format: formatNumber },
  ];

  const selectedMetricOption = metricOptions.find(m => m.key === selectedMetric) || metricOptions[0];

  const startDate = useMemo(() => subDays(endDate, 6), [endDate]);
  const last7Days = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const visibleData = protocolData.filter(item => !hiddenProtocols.has(item.protocol));
    const totalVolume = visibleData.reduce((sum, item) => sum + item.totalVolume, 0);
    const totalUsers = visibleData.reduce((sum, item) => sum + item.totalUsers, 0);
    const totalNewUsers = visibleData.reduce((sum, item) => sum + item.totalNewUsers, 0);
    const totalPreviousWeekVolume = visibleData.reduce((sum, item) => sum + (item.previousWeekTotal || 0), 0);
    const totalChainVolumes: ChainVolume = {
      ethereum: visibleData.reduce((sum, item) => sum + item.chainVolumes.ethereum, 0),
      base: visibleData.reduce((sum, item) => sum + item.chainVolumes.base, 0),
      bsc: visibleData.reduce((sum, item) => sum + item.chainVolumes.bsc, 0),
      avax: visibleData.reduce((sum, item) => sum + item.chainVolumes.avax, 0),
      arbitrum: visibleData.reduce((sum, item) => sum + item.chainVolumes.arbitrum, 0)
    };
    const totalDailyVolumes: Record<string, number> = {};
    const totalDailyUsers: Record<string, number> = {};
    const totalDailyNewUsers: Record<string, number> = {};
    last7Days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      totalDailyVolumes[dateStr] = visibleData.reduce((sum, item) => sum + (item.dailyVolumes[dateStr] || 0), 0);
      totalDailyUsers[dateStr] = visibleData.reduce((sum, item) => sum + (item.dailyUsers[dateStr] || 0), 0);
      totalDailyNewUsers[dateStr] = visibleData.reduce((sum, item) => sum + (item.dailyNewUsers[dateStr] || 0), 0);
    });

    // Get daily values based on selected metric
    const getDailyValue = (dateStr: string) => {
      switch (selectedMetric) {
        case 'users': return totalDailyUsers[dateStr] || 0;
        case 'newUsers': return totalDailyNewUsers[dateStr] || 0;
        default: return totalDailyVolumes[dateStr] || 0;
      }
    };

    const totalWeeklyTrend = last7Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return getDailyValue(dateStr);
    });
    const totalWeeklyGrowth = totalPreviousWeekVolume > 0
      ? (totalVolume - totalPreviousWeekVolume) / totalPreviousWeekVolume
      : 0;

    return {
      totalVolume,
      totalUsers,
      totalNewUsers,
      totalChainVolumes,
      totalDailyVolumes,
      totalDailyUsers,
      totalDailyNewUsers,
      totalWeeklyTrend,
      totalWeeklyGrowth
    };
  }, [protocolData, last7Days, hiddenProtocols, selectedMetric]);

  useEffect(() => {
    const fetchOptimizedData = async () => {
      setLoading(true);
      try {
        console.log('Fetching optimized EVM weekly data...');
        
        // Single optimized API call instead of 2 separate calls
        const optimizedData = await protocolApi.getWeeklyMetrics(endDate, 'evm', 'public');
        
        console.log('Received optimized EVM weekly data:', optimizedData);
        
        // Transform backend data to match existing frontend structure
        const processedData: ProtocolWeeklyData[] = optimizedData.sortedProtocols.map(protocol => {
          const protocolWeeklyData = optimizedData.weeklyData[protocol];

          if (!protocolWeeklyData) {
            return {
              protocol,
              totalVolume: 0,
              totalUsers: 0,
              totalNewUsers: 0,
              dailyVolumes: {},
              dailyUsers: {},
              dailyNewUsers: {},
              chainVolumes: {
                ethereum: 0,
                base: 0,
                bsc: 0,
                avax: 0,
                arbitrum: 0
              },
              weeklyGrowth: 0,
              weeklyTrend: [],
              previousWeekTotal: 0
            };
          }

          return {
            protocol,
            totalVolume: protocolWeeklyData.totalVolume,
            totalUsers: protocolWeeklyData.totalUsers || 0,
            totalNewUsers: protocolWeeklyData.totalNewUsers || 0,
            dailyVolumes: protocolWeeklyData.dailyVolumes,
            dailyUsers: protocolWeeklyData.dailyUsers || {},
            dailyNewUsers: protocolWeeklyData.dailyNewUsers || {},
            chainVolumes: protocolWeeklyData.chainVolumes,
            weeklyGrowth: protocolWeeklyData.weeklyGrowth,
            weeklyTrend: protocolWeeklyData.weeklyTrend,
            previousWeekTotal: protocolWeeklyData.previousWeekTotal || 0
          };
        });

        console.log('Processed optimized data:', processedData);
        setProtocolData(processedData);
        console.log('Optimized EVM weekly data loaded:', processedData.length, 'protocols');
      } catch (error) {
        console.error('Error fetching optimized EVM weekly data:', error);
        setProtocolData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOptimizedData();
  }, [endDate, selectedMetric]);

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
    protocolData.forEach(data => {
      allProtocols.add(data.protocol);
    });
    setHiddenProtocols(allProtocols);
  };

  const downloadReport = async () => {
    const tableElement = document.querySelector('[data-screenshot-content="true"]') as HTMLElement;
    
    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const scale = 2;
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
              paddingTop: '20px',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingBottom: '20px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            },
            filter: (node: any) => {
              return !node.classList?.contains('no-screenshot');
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 10 seconds')), 10000)
          )
        ]) as string;
        
        const link = document.createElement('a');
        link.download = `EVM Weekly Report - ${selectedMetricOption.label} - ${format(endDate, 'dd.MM')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const copyToClipboard = async () => {
    const tableElement = document.querySelector('[data-screenshot-content="true"]') as HTMLElement;
    
    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const scale = 2;
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
              paddingTop: '20px',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingBottom: '20px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            },
            filter: (node: any) => {
              return !node.classList?.contains('no-screenshot');
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 10 seconds')), 10000)
          )
        ]) as string;
        
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
              description: "EVM weekly report image copied successfully",
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="relative space-y-4" data-table="evm-weekly-metrics">
      <div data-screenshot-content="true">
        {/* Header with title, date navigator and visibility toggle */}
        <div className="flex items-center justify-between group/header">
          <div className="flex items-center gap-2">
            <h2 className="text-title-2 font-semibold text-foreground whitespace-nowrap">Weekly Report</h2>
            <button
              onClick={hiddenProtocols.size > 0 ? showAllProtocols : hideAllProtocols}
              className="opacity-0 group-hover/header:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all duration-200"
              title={hiddenProtocols.size > 0 ? "Show all protocols" : "Hide all protocols"}
            >
              {hiddenProtocols.size > 0 ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span>{hiddenProtocols.size > 0 ? "Show All" : "Hide All"}</span>
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              onClick={() => {
                const prev7Days = subDays(endDate, 7);
                const MIN_DATE = new Date('2024-01-01');
                if (!isBefore(prev7Days, MIN_DATE)) {
                  onDateChange(prev7Days);
                }
              }}
              disabled={(() => {
                const prev7Days = subDays(endDate, 7);
                const MIN_DATE = new Date('2024-01-01');
                return isBefore(prev7Days, MIN_DATE);
              })()}
              className={cn(
                "h-10 w-10 p-0 flex items-center justify-center transition-all duration-200",
                (() => {
                  const prev7Days = subDays(endDate, 7);
                  const MIN_DATE = new Date('2024-01-01');
                  return isBefore(prev7Days, MIN_DATE);
                })()
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 px-4 h-10 border border-border rounded-sm bg-background">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-normal text-sm">
                {format(subDays(endDate, 6), 'MMMM d')} - {format(endDate, 'd, yyyy')}
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                const next7Days = addDays(endDate, 7);
                const MAX_DATE = subDays(new Date(), 1);
                if (!isAfter(next7Days, MAX_DATE)) {
                  onDateChange(next7Days);
                }
              }}
              disabled={(() => {
                const next7Days = addDays(endDate, 7);
                const MAX_DATE = subDays(new Date(), 1);
                return isAfter(next7Days, MAX_DATE);
              })()}
              className={cn(
                "h-10 w-10 p-0 flex items-center justify-center transition-all duration-200",
                (() => {
                  const next7Days = addDays(endDate, 7);
                  const MAX_DATE = subDays(new Date(), 1);
                  return isAfter(next7Days, MAX_DATE);
                })()
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Metric Tabs */}
        <div className="flex items-center mt-4">
          <Tabs value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricKey)} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-3">
              {metricOptions.map((option) => (
                <TabsTrigger key={option.key} value={option.key} className="text-sm">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="rounded-lg border border-border overflow-x-auto mt-4">
          <Table className="w-full [&_th]:px-2 [&_td]:px-2">
          <TableHeader>
            <TableRow className="h-16">
              <TableHead className="w-[120px]">Protocol</TableHead>
              {last7Days.map((day) => {
                const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <TableHead key={day.toISOString()} className="text-right w-[100px] px-2">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-sm font-medium whitespace-nowrap">{format(day, 'MMM dd')}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs font-normal px-2 py-0.5 min-w-[36px] justify-center ${
                          isWeekend
                            ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                            : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                        }`}
                      >
                        {format(day, 'EEE')}
                      </Badge>
                    </div>
                  </TableHead>
                );
              })}
              {selectedMetric !== 'users' && (
                <TableHead className={cn("text-right", selectedMetric === 'volume' ? "w-[180px]" : "w-[120px]")}>
                  Weekly Total
                </TableHead>
              )}
              <TableHead className={cn(selectedMetric === 'users' ? "text-center" : "text-right", "w-[160px]")}>
                {selectedMetric === 'users' ? 'Weekly Trend' : 'Trend & Growth'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {protocolData.length > 0 ? (
              protocolData
                .filter(item => !hiddenProtocols.has(item.protocol))
                .map((item) => {
                  const isHidden = hiddenProtocols.has(item.protocol);
                  return (
                    <TableRow key={item.protocol} className="transition-colors hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProtocolVisibility(item.protocol);
                            }}
                            className="opacity-0 hover:opacity-100 transition-opacity duration-200"
                            title={isHidden ? "Show protocol" : "Hide protocol"}
                          >
                            {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <div className="w-5 h-5 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                            <img 
                              src={`/assets/logos/${getProtocolLogoFilename(item.protocol as Protocol)}`}
                              alt={item.protocol}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-medium text-sm">
                            {getProtocolName(item.protocol)}
                          </span>
                        </div>
                      </TableCell>
                  
                  {last7Days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const getDayValue = () => {
                      switch (selectedMetric) {
                        case 'users': return item.dailyUsers[dateStr] || 0;
                        case 'newUsers': return item.dailyNewUsers[dateStr] || 0;
                        default: return item.dailyVolumes[dateStr] || 0;
                      }
                    };
                    const dayValue = getDayValue();
                    return (
                      <TableCell key={dateStr} className="text-right text-sm">
                        {selectedMetricOption.format(dayValue)}
                      </TableCell>
                    );
                  })}
                  
                  {selectedMetric !== 'users' && (
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Badge variant="outline" className="font-medium text-sm bg-background">
                          {selectedMetric === 'volume' ? formatCurrency(item.totalVolume) : formatNumber(item.totalNewUsers)}
                        </Badge>
                        {selectedMetric === 'volume' && item.totalVolume > 0 && (
                          <div className="relative w-24 h-3 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                            {Object.entries(item.chainVolumes).map(([chain, volume], index) => {
                              const chainVolume = volume || 0;
                              if (chainVolume === 0) return null;

                              const percentage = (chainVolume / item.totalVolume) * 100;
                              const previousPercentage = Object.entries(item.chainVolumes)
                                .slice(0, index)
                                .reduce((sum, [prevChain, prevVolume]) => {
                                  return sum + ((prevVolume || 0) / item.totalVolume) * 100;
                                }, 0);

                              const chainColor = chainColors[chain] || '#6B7280';

                              return (
                                <div
                                  key={chain}
                                  className="absolute top-0 h-full"
                                  style={{
                                    left: `${previousPercentage}%`,
                                    width: `${percentage}%`,
                                    backgroundColor: chainColor,
                                  }}
                                  title={`${chain}: ${formatCurrency(chainVolume)} (${percentage.toFixed(1)}%)`}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  
                  <TableCell>
                    {selectedMetric === 'users' ? (
                      <div className="flex items-center justify-center">
                        <div className="w-[80px] h-[32px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={item.weeklyTrend.map((value, index) => ({ day: index, value }))} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={1.5}
                                fill="#3b82f6"
                                fillOpacity={0.2}
                                dot={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-[50px] h-[32px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={item.weeklyTrend.map((value, index) => ({ day: index, value }))} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke={item.weeklyGrowth >= 0 ? "#22c55e" : "#ef4444"}
                                strokeWidth={1.5}
                                fill={item.weeklyGrowth >= 0 ? "#22c55e" : "#ef4444"}
                                fillOpacity={0.2}
                                dot={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                          item.weeklyGrowth >= 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {item.weeklyGrowth >= 0 ? (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          ) : (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                          )}
                          <span>{Math.abs(item.weeklyGrowth * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
                })
            ) : (
              <TableRow>
                <TableCell colSpan={last7Days.length + (selectedMetric === 'users' ? 2 : 3)} className="text-center text-muted-foreground py-8">
                  No data available for the selected period
                </TableCell>
              </TableRow>
            )}
            
            {/* All Trading Apps Total Row */}
            {protocolData.length > 0 && (
              <TableRow className="font-bold bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700">
                <TableCell className="font-semibold text-sm px-4">All Trading Apps</TableCell>
                
                {last7Days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const getDayValue = () => {
                    switch (selectedMetric) {
                      case 'users': return totals.totalDailyUsers[dateStr] || 0;
                      case 'newUsers': return totals.totalDailyNewUsers[dateStr] || 0;
                      default: return totals.totalDailyVolumes[dateStr] || 0;
                    }
                  };
                  const dayValue = getDayValue();
                  return (
                    <TableCell key={dateStr} className="text-right font-bold text-sm">
                      {selectedMetricOption.format(dayValue)}
                    </TableCell>
                  );
                })}
                
                {selectedMetric !== 'users' && (
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Badge variant="outline" className="font-bold text-sm bg-background">
                        {selectedMetric === 'volume' ? formatCurrency(totals.totalVolume) : formatNumber(totals.totalNewUsers)}
                      </Badge>
                      {selectedMetric === 'volume' && totals.totalVolume > 0 && (
                        <div className="relative w-24 h-3 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                          {Object.entries(totals.totalChainVolumes).map(([chain, volume], index) => {
                            const chainVolume = volume || 0;
                            if (chainVolume === 0) return null;

                            const percentage = (chainVolume / totals.totalVolume) * 100;
                            const previousPercentage = Object.entries(totals.totalChainVolumes)
                              .slice(0, index)
                              .reduce((sum, [prevChain, prevVolume]) => {
                                return sum + ((prevVolume || 0) / totals.totalVolume) * 100;
                              }, 0);

                            const chainColor = chainColors[chain] || '#6B7280';

                            return (
                              <div
                                key={chain}
                                className="absolute top-0 h-full"
                                style={{
                                  left: `${previousPercentage}%`,
                                  width: `${percentage}%`,
                                  backgroundColor: chainColor,
                                }}
                                title={`${chain}: ${formatCurrency(chainVolume)} (${percentage.toFixed(1)}%)`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </TableCell>
                )}
                
                <TableCell>
                  {selectedMetric === 'users' ? (
                    <div className="flex items-center justify-center">
                      <div className="w-[80px] h-[32px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={totals.totalWeeklyTrend.map((value, index) => ({ day: index, value }))} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#3b82f6"
                              strokeWidth={1.5}
                              fill="#3b82f6"
                              fillOpacity={0.2}
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-[50px] h-[32px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={totals.totalWeeklyTrend.map((value, index) => ({ day: index, value }))} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={totals.totalWeeklyGrowth >= 0 ? "#22c55e" : "#ef4444"}
                              strokeWidth={1.5}
                              fill={totals.totalWeeklyGrowth >= 0 ? "#22c55e" : "#ef4444"}
                              fillOpacity={0.2}
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                        totals.totalWeeklyGrowth >= 0
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}>
                        {totals.totalWeeklyGrowth >= 0 ? (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                          </svg>
                        ) : (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                          </svg>
                        )}
                        <span>{Math.abs(totals.totalWeeklyGrowth * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>
      
    </div>

    {/* Download/Copy buttons - outside data-table so they don't appear in screenshots */}
    <div className="flex justify-end gap-2 pt-4">
      <button
        onClick={downloadReport}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/50 border border-border rounded-lg transition-colors"
        aria-label="Download weekly report as image"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download
      </button>
      <button
        onClick={copyToClipboard}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/50 border border-border rounded-lg transition-colors"
        aria-label="Copy weekly report to clipboard"
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy
      </button>
    </div>
    </>
  );
}