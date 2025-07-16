import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isAfter, isBefore, subDays, addDays } from "date-fns";
import { GripVertical, ChevronRight, Eye, EyeOff, Download, Copy, ChevronLeft, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
// @ts-ignore
import domtoimage from "dom-to-image";
import { AreaChart, Area, ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Cell } from 'recharts';

import { Protocol } from "../types/protocol";
import { protocolApi } from "../lib/api";
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolLogoFilename, getProtocolsByChain } from "../lib/protocol-config";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useToast } from "../hooks/use-toast";

interface EVMWeeklyMetricsTableProps {
  protocols: Protocol[];
  endDate: Date;
  onDateChange: (date: Date) => void;
}

interface VolumeData {
  [protocol: string]: Record<string, number>; // date -> volume value
}

interface ChainVolume {
  ethereum: number;
  base: number;
  bsc: number;
  avax: number;
  arbitrum: number;
}

interface EVMProtocolWeeklyData {
  protocol: Protocol;
  totalVolume: number;
  chainVolumes: ChainVolume;
  dailyVolumes: Record<string, number>; // date -> volume
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
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData>({});
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [last7Days, setLast7Days] = useState<Date[]>([]);
  const [evmProtocolData, setEvmProtocolData] = useState<EVMProtocolWeeklyData[]>([]);
  const { toast } = useToast();

  // Date validation constants
  const MIN_DATE = new Date('2024-01-01');
  const MAX_DATE = subDays(new Date(), 1);
  
  // Check if navigation is allowed
  const canNavigatePrev = () => {
    const prev7Days = subDays(endDate, 7);
    return !isBefore(prev7Days, MIN_DATE);
  };
  
  const canNavigateNext = () => {
    const next7Days = addDays(endDate, 7);
    return !isAfter(next7Days, MAX_DATE);
  };

  // Calculate the 7-day range
  const startDate = subDays(endDate, 6);

  // Generate date labels for the week
  useEffect(() => {
    const days = eachDayOfInterval({
      start: startDate,
      end: endDate
    });
    setLast7Days(days);
  }, [startDate, endDate]);

  // Fetch EVM weekly data
  useEffect(() => {
    const fetchEVMWeeklyData = async () => {
      if (!protocols.length) return;
      
      setLoading(true);
      try {
        console.log(`Fetching EVM weekly data from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
        const data = await protocolApi.getEVMWeeklyMetrics(startDate, endDate);
        const processedData = processEVMWeeklyData(data);
        setEvmProtocolData(processedData);
      } catch (error) {
        console.error('Error fetching EVM weekly data:', error);
        // Fallback to mock data if API fails
        console.log('Falling back to mock data...');
        const mockData = generateMockEVMWeeklyData();
        setEvmProtocolData(mockData);
        
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Using sample data - EVM data sync may be needed",
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEVMWeeklyData();
  }, [protocols, startDate, endDate, toast]);

  const processEVMWeeklyData = (apiData: Record<Protocol, Record<string, number>>): EVMProtocolWeeklyData[] => {
    console.log('Processing EVM weekly data:', apiData);
    
    return Object.entries(apiData).map(([protocolName, dailyVolumes]) => {
      const totalVolume = Object.values(dailyVolumes).reduce((sum, vol) => sum + vol, 0);
      
      // Mock chain distribution for now - in future this should come from API
      const chainVolumes: ChainVolume = {
        ethereum: totalVolume * 0.4,
        base: totalVolume * 0.25,
        bsc: totalVolume * 0.15,
        avax: totalVolume * 0.1,
        arbitrum: totalVolume * 0.1
      };
      
      // Calculate weekly growth (compare first vs last day)
      const dateKeys = Object.keys(dailyVolumes).sort();
      const firstDayVolume = dailyVolumes[dateKeys[0]] || 0;
      const lastDayVolume = dailyVolumes[dateKeys[dateKeys.length - 1]] || 0;
      const weeklyGrowth = firstDayVolume > 0 ? (lastDayVolume - firstDayVolume) / firstDayVolume : 0;
      
      // Create weekly trend array
      const weeklyTrend = dateKeys.map(date => dailyVolumes[date] || 0);
      
      return {
        protocol: protocolName as Protocol,
        totalVolume,
        chainVolumes,
        dailyVolumes,
        weeklyGrowth,
        weeklyTrend
      };
    }).sort((a, b) => b.totalVolume - a.totalVolume);
  };

  const generateMockEVMWeeklyData = (): EVMProtocolWeeklyData[] => {
    const evmProtocols = getProtocolsByChain('evm');
    
    return evmProtocols.map(protocol => {
      const baseVolume = Math.random() * 5000000;
      const dailyVolumes: Record<string, number> = {};
      const weeklyTrend: number[] = [];
      
      // Generate daily volumes for the week
      last7Days.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dailyVolume = baseVolume * (0.7 + Math.random() * 0.6);
        dailyVolumes[dateStr] = dailyVolume;
        weeklyTrend.push(dailyVolume);
      });
      
      const totalVolume = Object.values(dailyVolumes).reduce((sum, vol) => sum + vol, 0);
      
      // Mock chain distribution
      const chainVolumes: ChainVolume = {
        ethereum: totalVolume * 0.4,
        base: totalVolume * 0.25,
        bsc: totalVolume * 0.15,
        avax: totalVolume * 0.1,
        arbitrum: totalVolume * 0.1
      };
      
      // Calculate weekly growth (mock)
      const weeklyGrowth = (Math.random() - 0.5) * 0.3; // -15% to +15%
      
      return {
        protocol: protocol.id as Protocol,
        totalVolume,
        chainVolumes,
        dailyVolumes,
        weeklyGrowth,
        weeklyTrend
      };
    }).sort((a, b) => b.totalVolume - a.totalVolume);
  };

  const toggleCategoryCollapse = (categoryName: string) => {
    setCollapsedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
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

  // Navigation handlers
  const handlePrevWeek = () => {
    if (canNavigatePrev()) {
      onDateChange(subDays(endDate, 7));
    }
  };

  const handleNextWeek = () => {
    if (canNavigateNext()) {
      onDateChange(addDays(endDate, 7));
    }
  };

  // Export functions
  const downloadReport = async () => {
    const tableElement = document.querySelector('[data-table="evm-weekly-metrics"]') as HTMLElement;
    
    if (tableElement) {
      try {
        const dataUrl = await domtoimage.toPng(tableElement, {
          quality: 1,
          bgcolor: '#ffffff',
          width: tableElement.scrollWidth + 40,
          height: tableElement.scrollHeight + 40,
          style: {
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }
        });
        
        const link = document.createElement('a');
        link.download = `EVM Weekly Report - ${format(endDate, 'dd.MM')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Download error:', error);
      }
    }
  };

  const copyToClipboard = async () => {
    const tableElement = document.querySelector('[data-table="evm-weekly-metrics"]') as HTMLElement;
    
    if (tableElement) {
      try {
        const dataUrl = await domtoimage.toPng(tableElement, {
          quality: 1,
          bgcolor: '#ffffff',
          width: tableElement.scrollWidth + 40,
          height: tableElement.scrollHeight + 40,
          style: {
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }
        });
        
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          toast({
            title: "Copied to clipboard",
            description: "EVM weekly report copied successfully",
            duration: 2000,
          });
        }
      } catch (error) {
        console.error('Copy error:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 rounded-xl border bg-gradient-to-b from-background to-muted/20 p-3 sm:p-4 lg:p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-gradient-to-b from-background to-muted/20 p-3 sm:p-4 lg:p-6 shadow-sm overflow-hidden">
      <div data-table="evm-weekly-metrics" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 sm:gap-0">
          <div className="flex items-center gap-4">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">EVM Weekly Volume</h3>
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Volume Only
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Date Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevWeek}
                disabled={!canNavigatePrev()}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(endDate, 'dd MMM')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3">
                    <p className="text-sm text-muted-foreground mb-2">Select week ending date</p>
                    <input
                      type="date"
                      value={format(endDate, 'yyyy-MM-dd')}
                      onChange={(e) => onDateChange(new Date(e.target.value))}
                      min={format(MIN_DATE, 'yyyy-MM-dd')}
                      max={format(MAX_DATE, 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWeek}
                disabled={!canNavigateNext()}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-gradient-to-b from-background to-muted/10 overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px] py-3 text-sm">Protocol</TableHead>
                <TableHead className="w-[120px] text-right py-3 text-sm">Total Volume</TableHead>
                <TableHead className="w-[100px] text-right py-3 text-sm">Growth</TableHead>
                <TableHead className="w-[200px] text-center py-3 text-sm">Chain Distribution</TableHead>
                <TableHead className="w-[120px] text-center py-3 text-sm">Weekly Trend</TableHead>
                {last7Days.map((day) => (
                  <TableHead key={day.toISOString()} className="w-[100px] text-right py-3 text-xs">
                    {format(day, 'MMM dd')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {evmProtocolData.map((protocolData) => (
                <TableRow 
                  key={protocolData.protocol} 
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                        <img 
                          src={`/assets/logos/${getProtocolLogoFilename(protocolData.protocol)}`}
                          alt={protocolData.protocol}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-medium text-sm capitalize">
                        {protocolData.protocol.replace('_', ' ')}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right py-3 text-sm font-medium">
                    {formatCurrency(protocolData.totalVolume)}
                  </TableCell>
                  
                  <TableCell className="text-right py-3">
                    <Badge variant="outline" className={cn("text-xs", getGrowthBadgeClasses(protocolData.weeklyGrowth))}>
                      {formatGrowthPercentage(protocolData.weeklyGrowth)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1">
                      {Object.entries(protocolData.chainVolumes).map(([chain, volume]) => {
                        const percentage = (volume / protocolData.totalVolume) * 100;
                        if (percentage < 1) return null;
                        
                        return (
                          <div
                            key={chain}
                            className="h-2 rounded-full"
                            style={{
                              backgroundColor: chainColors[chain] || '#6B7280',
                              width: `${Math.max(percentage, 8)}%`
                            }}
                            title={`${chain}: ${formatCurrency(volume)} (${percentage.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-3">
                    <div className="w-20 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={protocolData.weeklyTrend.map((value, index) => ({ day: index, value }))}>
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3B82F6" 
                            strokeWidth={1.5}
                            fill="#3B82F6" 
                            fillOpacity={0.2}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </TableCell>
                  
                  {last7Days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayVolume = protocolData.dailyVolumes[dateStr] || 0;
                    
                    return (
                      <TableCell key={dateStr} className="text-right py-3 text-sm">
                        {formatCurrency(dayVolume)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
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