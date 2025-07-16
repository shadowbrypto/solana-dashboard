import React, { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { format, subDays, eachDayOfInterval, addDays, isBefore, isAfter } from "date-fns";
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ChevronLeft, ChevronRight, Calendar, Download, Copy } from "lucide-react";
import { cn } from "../lib/utils";
import { Protocol } from "../types/protocol";
import { protocolApi } from "../lib/api";
import { getProtocolLogoFilename } from "../lib/protocol-config";
import { useToast } from "../hooks/use-toast";
// @ts-ignore
import domtoimage from "dom-to-image";

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
  dailyVolumes: Record<string, number>; // date -> volume
  chainVolumes: ChainVolume;
  weeklyGrowth: number;
  weeklyTrend: number[];
}

// Chain color mapping for consistent UI
const chainColors: Record<string, string> = {
  ethereum: '#627EEA',
  base: '#0052FF', 
  bsc: '#B8860B',
  avax: '#E84142',
  arbitrum: '#28A0F0'
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
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
  const { toast } = useToast();

  const startDate = useMemo(() => subDays(endDate, 6), [endDate]);
  const last7Days = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalVolume = protocolData.reduce((sum, item) => sum + item.totalVolume, 0);
    const totalChainVolumes: ChainVolume = {
      ethereum: protocolData.reduce((sum, item) => sum + item.chainVolumes.ethereum, 0),
      base: protocolData.reduce((sum, item) => sum + item.chainVolumes.base, 0),
      bsc: protocolData.reduce((sum, item) => sum + item.chainVolumes.bsc, 0),
      avax: protocolData.reduce((sum, item) => sum + item.chainVolumes.avax, 0),
      arbitrum: protocolData.reduce((sum, item) => sum + item.chainVolumes.arbitrum, 0)
    };
    const totalDailyVolumes: Record<string, number> = {};
    last7Days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      totalDailyVolumes[dateStr] = protocolData.reduce((sum, item) => sum + (item.dailyVolumes[dateStr] || 0), 0);
    });
    const totalWeeklyTrend = last7Days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return totalDailyVolumes[dateStr] || 0;
    });
    const totalWeeklyGrowth = totalWeeklyTrend.length > 1 && totalWeeklyTrend[0] > 0 
      ? (totalWeeklyTrend[totalWeeklyTrend.length - 1] - totalWeeklyTrend[0]) / totalWeeklyTrend[0] 
      : 0;

    return { totalVolume, totalChainVolumes, totalDailyVolumes, totalWeeklyTrend, totalWeeklyGrowth };
  }, [protocolData, last7Days]);

  useEffect(() => {
    console.log('EVM Weekly useEffect triggered with:', {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    });

    const fetchData = async () => {
      setLoading(true);
      try {
        console.log(`Fetching EVM weekly data from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
        const data = await protocolApi.getEVMWeeklyMetrics(startDate, endDate);
        console.log('Raw API response:', data);
        
        // Convert API data to display format
        const processedData: ProtocolWeeklyData[] = Object.entries(data.dailyVolumes).map(([protocol, dailyVolumes]) => {
          const totalVolume = Object.values(dailyVolumes).reduce((sum, vol) => sum + vol, 0);
          
          // Use real chain distribution data from API
          const protocolChainData = data.chainDistribution[protocol] || {};
          const chainVolumes: ChainVolume = {
            ethereum: protocolChainData.ethereum || 0,
            base: protocolChainData.base || 0,
            bsc: protocolChainData.bsc || 0,
            avax: protocolChainData.avax || 0,
            arbitrum: protocolChainData.arbitrum || 0
          };
          
          // Calculate weekly growth (compare first vs last day)
          const dateKeys = Object.keys(dailyVolumes).sort();
          const firstDayVolume = dailyVolumes[dateKeys[0]] || 0;
          const lastDayVolume = dailyVolumes[dateKeys[dateKeys.length - 1]] || 0;
          const weeklyGrowth = firstDayVolume > 0 ? (lastDayVolume - firstDayVolume) / firstDayVolume : 0;
          
          // Create weekly trend array
          const weeklyTrend = dateKeys.map(date => dailyVolumes[date] || 0);
          
          return { protocol, totalVolume, dailyVolumes, chainVolumes, weeklyGrowth, weeklyTrend };
        }).sort((a, b) => b.totalVolume - a.totalVolume);

        console.log('Processed data:', processedData);
        setProtocolData(processedData);
        console.log('EVM weekly data loaded:', processedData.length, 'protocols');
      } catch (error) {
        console.error('Error fetching EVM weekly data:', error);
        setProtocolData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const downloadReport = async () => {
    const tableElement = document.querySelector('[data-table="evm-weekly-metrics"]') as HTMLElement;
    
    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: tableElement.scrollWidth + 40,
            height: tableElement.scrollHeight + 10,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              overflow: 'visible',
              paddingTop: '20px',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingBottom: '0px',
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
        link.download = `EVM Weekly Report - ${format(endDate, 'dd.MM')}.png`;
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
    const tableElement = document.querySelector('[data-table="evm-weekly-metrics"]') as HTMLElement;
    
    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: tableElement.scrollWidth + 40,
            height: tableElement.scrollHeight + 10,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              overflow: 'visible',
              paddingTop: '20px',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingBottom: '0px',
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
      <div className="space-y-4 rounded-xl border bg-gradient-to-b from-background to-muted/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-gradient-to-b from-background to-muted/20 p-3" data-table="evm-weekly-metrics">
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-lg font-semibold text-foreground">EVM Weekly Volume</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
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
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {format(subDays(endDate, 6), 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <div className="p-3">
                <p className="text-sm text-muted-foreground mb-2">Select week ending date</p>
                <input
                  type="date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  onChange={(e) => onDateChange(new Date(e.target.value))}
                  min={format(new Date('2024-01-01'), 'yyyy-MM-dd')}
                  max={format(subDays(new Date(), 1), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            size="sm"
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
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-gradient-to-b from-background to-muted/10 overflow-x-auto">
        <Table className="w-full [&_th]:px-2 [&_td]:px-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Protocol</TableHead>
              {last7Days.map((day) => (
                <TableHead key={day.toISOString()} className="text-right w-[75px]">
                  {format(day, 'MMM dd')}
                </TableHead>
              ))}
              <TableHead className="text-right w-[180px]">Total Volume</TableHead>
              <TableHead className="text-center w-[160px]">Weekly Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {protocolData.length > 0 ? (
              protocolData.map((item) => (
                <TableRow key={item.protocol}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                        <img 
                          src={`/assets/logos/${getProtocolLogoFilename(item.protocol as Protocol)}`}
                          alt={item.protocol}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-medium text-sm capitalize">
                        {item.protocol.replace('_', ' ')}
                      </span>
                    </div>
                  </TableCell>
                  
                  {last7Days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayVolume = item.dailyVolumes[dateStr] || 0;
                    return (
                      <TableCell key={dateStr} className="text-right text-sm">
                        {formatCurrency(dayVolume)}
                      </TableCell>
                    );
                  })}
                  
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Badge variant="outline" className="font-medium text-sm bg-background">
                        {formatCurrency(item.totalVolume)}
                      </Badge>
                      {item.totalVolume > 0 && (
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
                  
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-[50px] h-[20px]">
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
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={last7Days.length + 3} className="text-center text-muted-foreground py-8">
                  No data available for the selected period
                </TableCell>
              </TableRow>
            )}
            
            {/* Total Row */}
            {protocolData.length > 0 && (
              <TableRow className="border-t-2 border-primary/20 bg-primary/10 hover:bg-primary/20 font-semibold">
                <TableCell className="font-bold text-sm">Total</TableCell>
                
                {last7Days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayVolume = totals.totalDailyVolumes[dateStr] || 0;
                  return (
                    <TableCell key={dateStr} className="text-right font-bold text-sm">
                      {formatCurrency(dayVolume)}
                    </TableCell>
                  );
                })}
                
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Badge variant="outline" className="font-bold text-sm bg-background">
                      {formatCurrency(totals.totalVolume)}
                    </Badge>
                    {totals.totalVolume > 0 && (
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
                
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-[50px] h-[20px]">
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
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Action buttons below the table */}
      <div className="flex justify-end gap-2 mt-4 no-screenshot">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadReport}
          className="shadow-sm"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="shadow-sm"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
      </div>
    </div>
  );
}