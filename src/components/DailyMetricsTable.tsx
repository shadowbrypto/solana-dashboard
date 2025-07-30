import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { GripVertical, ChevronRight, Eye, EyeOff, Download, Copy } from "lucide-react";
import { cn } from "../lib/utils";
// @ts-ignore
import domtoimage from "dom-to-image";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DatePicker } from "./DatePicker";
import { getDailyMetrics } from "../lib/protocol";
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolById } from "../lib/protocol-config";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Settings } from "../lib/settings";
import { useToast } from "../hooks/use-toast";

interface DailyMetricsTableProps {
  protocols: Protocol[];
  date: Date;
  onDateChange: (date: Date) => void;
}

type MetricKey = keyof ProtocolMetrics | 'market_share';

interface MetricDefinition {
  key: MetricKey;
  label: string;
  format: (value: number, isCategory?: boolean, protocol?: Protocol, categoryName?: string) => React.ReactNode;
  getValue?: (data: ProtocolMetrics) => number;
  skipGradient?: boolean;
}

function getGradientColor(value: number, min: number, max: number, allValues: number[]): string {
  return '';
}

function getGrowthBackground(value: number): string {
  return '';
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};

export function DailyMetricsTable({ protocols, date, onDateChange }: DailyMetricsTableProps) {
  const [topProtocols, setTopProtocols] = useState<Protocol[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>(() => Settings.getDailyTableCollapsedCategories());
  const [dailyData, setDailyData] = useState<Record<Protocol, ProtocolMetrics>>({});
  const [previousDayData, setPreviousDayData] = useState<Record<Protocol, ProtocolMetrics>>({});
  const [weeklyVolumeData, setWeeklyVolumeData] = useState<Record<Protocol, Record<string, number>>>({});
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnOrder, setColumnOrder] = useState<MetricKey[]>(() => Settings.getDailyTableColumnOrder() as MetricKey[]);
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(() => new Set(Settings.getDailyTableHiddenProtocols()));
  const { toast } = useToast();

  // Calculate total volume for market share
  const totalVolume = Object.values(dailyData)
    .reduce((sum, protocol) => sum + (protocol?.total_volume_usd || 0), 0);

  // Weekly trend functions
  const getWeeklyVolumeChart = (protocolId: Protocol) => {
    const protocolWeeklyData = weeklyVolumeData[protocolId];
    if (!protocolWeeklyData) return [];
    
    const last7Days = eachDayOfInterval({
      start: subDays(date, 6),
      end: date
    });
    
    return last7Days.map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        day: index,
        value: protocolWeeklyData[dateKey] || 0
      };
    });
  };
  
  const getVolumeTrend = (protocolId: Protocol): 'up' | 'down' | 'neutral' => {
    const data = getWeeklyVolumeChart(protocolId);
    if (data.length < 2) return 'neutral';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
    
    if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
    if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
    return 'neutral';
  };

  const metrics: MetricDefinition[] = [
    { key: "total_volume_usd", label: "Volume", format: formatCurrency },
    { key: "daily_users", label: "Daily Users", format: formatNumber },
    { key: "numberOfNewUsers", label: "New Users", format: formatNumber },
    { key: "daily_trades", label: "Trades", format: formatNumber },
    {
      key: "market_share",
      label: "Market Share",
      format: (value: number) => {
        const percentage = value * 100;
        return (
          <div className="flex items-center gap-2 justify-end">
            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
            <span className="font-medium text-sm min-w-[50px]">{percentage.toFixed(2)}%</span>
          </div>
        );
      },
      getValue: (data) => (data?.total_volume_usd || 0) / (totalVolume || 1)
    },
    {
      key: "daily_growth" as MetricKey,
      label: "Daily Growth",
      format: (value, isCategory = false, protocol, categoryName?: string) => {
        const percentage = value * 100;
        const absPercentage = Math.abs(percentage);
        const isPositive = value > 0;
        const isNeutral = Math.abs(value) < 0.0001;
        
        if (isCategory && categoryName) {
          // Get protocols in this category and calculate aggregated trend
          const categoryProtocols = getMutableProtocolsByCategory(categoryName).map(p => p.id as Protocol);
          const aggregatedData: { day: number; value: number }[] = [];
          
          // Create aggregated weekly data for the category
          const last7Days = eachDayOfInterval({
            start: subDays(date, 6),
            end: date
          });
          
          last7Days.forEach((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const totalVolume = categoryProtocols.reduce((sum, protocolId) => {
              return sum + (weeklyVolumeData[protocolId]?.[dateKey] || 0);
            }, 0);
            aggregatedData.push({ day: index, value: totalVolume });
          });
          
          // Calculate trend for category
          const getCategoryTrend = (): 'up' | 'down' | 'neutral' => {
            if (aggregatedData.length < 2) return 'neutral';
            
            const firstHalf = aggregatedData.slice(0, Math.floor(aggregatedData.length / 2));
            const secondHalf = aggregatedData.slice(Math.floor(aggregatedData.length / 2));
            
            const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
            
            if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
            if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
            return 'neutral';
          };
          
          const categoryTrend = getCategoryTrend();
          const isNeutralCategory = Math.abs(value) < 0.001;
          
          return (
            <div className="flex items-center justify-between w-full">
              <div className="w-[50px] h-[20px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={aggregatedData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={
                        categoryTrend === 'up' ? "#22c55e" :
                        categoryTrend === 'down' ? "#ef4444" :
                        "#6b7280"
                      }
                      strokeWidth={1.5}
                      fill={
                        categoryTrend === 'up' ? "#22c55e" :
                        categoryTrend === 'down' ? "#ef4444" :
                        "#6b7280"
                      }
                      fillOpacity={0.2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {!isNeutralCategory && (
                <div className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium -ml-8",
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
        }
        
        if (!protocol) {
          return (
            <div className="flex items-center justify-end gap-1">
              <span className="text-muted-foreground">—</span>
            </div>
          );
        }
        
        return (
          <div className="flex items-center justify-between w-full">
            <div className="w-[50px] h-[20px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getWeeklyVolumeChart(protocol)} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={
                      getVolumeTrend(protocol) === 'up' ? "#22c55e" :
                      getVolumeTrend(protocol) === 'down' ? "#ef4444" :
                      "#6b7280"
                    }
                    strokeWidth={1.5}
                    fill={
                      getVolumeTrend(protocol) === 'up' ? "#22c55e" :
                      getVolumeTrend(protocol) === 'down' ? "#ef4444" :
                      "#6b7280"
                    }
                    fillOpacity={0.2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {!isNeutral && (
              <div className={cn(
                "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium -ml-8",
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
      },
      getValue: (data) => {
        const currentVolume = data?.total_volume_usd || 0;
        const protocol = Object.keys(dailyData).find(key => dailyData[key] === data) as Protocol;
        const previousVolume = protocol ? (previousDayData[protocol]?.total_volume_usd || 0) : 0;
        if (previousVolume === 0) return 0;
        return (currentVolume - previousVolume) / previousVolume;
      }
    },
  ];

  const handleDragStart = (e: React.DragEvent, columnIndex: number) => {
    setDraggedColumn(columnIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedColumn === null || draggedColumn === dropIndex) {
      setDraggedColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedItem = newOrder[draggedColumn];
    
    // Remove the dragged item
    newOrder.splice(draggedColumn, 1);
    
    // Insert at new position
    newOrder.splice(dropIndex, 0, draggedItem);
    
    setColumnOrder(newOrder);
    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  // Create ordered metrics based on column order
  const orderedMetrics = columnOrder.map(key => metrics.find(m => m.key === key)).filter(Boolean) as MetricDefinition[];


  // Category-based bright coloring using shadcn theme colors
  const getCategoryRowColor = (categoryName: string): string => {
    switch (categoryName) {
      case 'Telegram Bots':
        return 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/40';
      case 'Trading Terminals':
        return 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/40';
      case 'Mobile Apps':
        return 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/40';
      default:
        return 'hover:bg-muted/30';
    }
  };


  useEffect(() => {
    // Debug: Add global click listener to detect if events are being captured
    const globalClickHandler = (e: MouseEvent) => {
      console.log('Global click detected on Daily Report page:', e.target);
    };
    
    const globalWheelHandler = (e: WheelEvent) => {
      console.log('Global wheel event detected on Daily Report page');
    };
    
    document.addEventListener('click', globalClickHandler, true);
    document.addEventListener('wheel', globalWheelHandler, true);
    
    return () => {
      document.removeEventListener('click', globalClickHandler, true);
      document.removeEventListener('wheel', globalWheelHandler, true);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setTopProtocols([]);
      try {
        // Fetch current and previous day data
        const [currentData, previousData] = await Promise.all([
          getDailyMetrics(date),
          getDailyMetrics(new Date(date.getTime() - 24 * 60 * 60 * 1000))
        ]);

        // Fetch weekly volume data for trend charts
        const last7Days = eachDayOfInterval({
          start: subDays(date, 6),
          end: date
        });
        
        const weeklyPromises = last7Days.map(day => getDailyMetrics(day));
        const weeklyResults = await Promise.all(weeklyPromises);
        
        // Organize weekly volume data by protocol
        const organizedWeeklyData: Record<Protocol, Record<string, number>> = {};
        protocols.forEach(protocol => {
          organizedWeeklyData[protocol] = {};
          weeklyResults.forEach((dayData, index) => {
            const dateKey = format(last7Days[index], 'yyyy-MM-dd');
            if (dayData[protocol]) {
              organizedWeeklyData[protocol][dateKey] = dayData[protocol].total_volume_usd || 0;
            } else {
              organizedWeeklyData[protocol][dateKey] = 0;
            }
          });
        });

        setWeeklyVolumeData(organizedWeeklyData);
        
        // Sort protocols by volume to find the top 3
        const sortedByVolume = Object.entries(currentData)
          .filter(([_, metrics]) => metrics?.total_volume_usd > 0)
          .sort((a, b) => (b[1]?.total_volume_usd || 0) - (a[1]?.total_volume_usd || 0));
        
        setDailyData(currentData);
        
        // Set top 3 protocols
        const top3 = sortedByVolume.slice(0, 3).map(([protocol]) => protocol as Protocol);
        setTopProtocols(top3);
        
        setPreviousDayData(previousData);
      } catch (error) {
        setDailyData({});
        setPreviousDayData({});
        setWeeklyVolumeData({});
      }
    };
    fetchData();
  }, [date]);

  // Persist settings changes
  useEffect(() => {
    Settings.setDailyTableCollapsedCategories(collapsedCategories);
  }, [collapsedCategories]);

  useEffect(() => {
    Settings.setDailyTableColumnOrder(columnOrder);
  }, [columnOrder]);

  useEffect(() => {
    Settings.setDailyTableHiddenProtocols(Array.from(hiddenProtocols));
  }, [hiddenProtocols]);

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      onDateChange(newDate);
    }
  };

  const selectedDate = format(date, "dd/MM/yyyy");

  const formatValue = (metric: MetricDefinition, value: number, isCategory = false) => {
    if (isCategory && metric.key === 'market_share') return '—';
    return metric.format(value, isCategory);
  };

  const toggleCollapse = (categoryName: string) => {
    setCollapsedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
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

  const showAllProtocols = () => {
    setHiddenProtocols(new Set());
  };

  const hideAllProtocols = () => {
    const allProtocols = new Set<string>();
    const categories = getMutableAllCategories();
    categories.forEach(categoryName => {
      const categoryProtocols = getMutableProtocolsByCategory(categoryName);
      categoryProtocols.forEach(protocol => {
        if (protocols.includes(protocol.id as Protocol)) {
          allProtocols.add(protocol.id);
        }
      });
    });
    setHiddenProtocols(allProtocols);
  };

  const downloadReport = async () => {
    console.log('Download report clicked - checking if this interferes with navigation');
    const tableElement = document.querySelector('[data-table="daily-metrics"]') as HTMLElement;
    
    if (tableElement) {
      // Check element dimensions
      const rect = tableElement.getBoundingClientRect();
      console.log('Table element dimensions:', rect);
      
      if (rect.width === 0 || rect.height === 0) {
        console.log('Table element has zero dimensions, skipping dom-to-image');
        return;
      }
      
      try {
        console.log('Starting dom-to-image conversion...');
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: tableElement.scrollWidth + 40,
            height: tableElement.scrollHeight + 40,
            style: {
              transform: 'scale(1)',
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
        
        console.log('Dom-to-image conversion completed');
        // Create download link
        const link = document.createElement('a');
        link.download = `Daily Report - ${format(date, 'dd.MM')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('Download completed');
      } catch (error) {
        console.error('Dom-to-image error:', error);
        // Handle error silently or show user-friendly message
      }
    }
  };

  const copyToClipboard = async () => {
    const tableElement = document.querySelector('[data-table="daily-metrics"]') as HTMLElement;
    
    if (tableElement) {
      // Check element dimensions
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
            height: tableElement.scrollHeight + 40,
            style: {
              transform: 'scale(1)',
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
              description: "Daily report image copied successfully",
              duration: 2000,
            });
          } catch (error) {
            // Handle error silently or show user-friendly message
          }
        }
      } catch (error) {
        // Handle error silently or show user-friendly message
      }
    }
  };

  return (
    <div className="space-y-4 rounded-xl border bg-gradient-to-b from-background to-muted/20 p-3 sm:p-4 lg:p-6 shadow-sm overflow-hidden">
        <div data-table="daily-metrics" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 sm:gap-0">
          <div className="flex items-center gap-4">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Protocol Metrics</h3>
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
          <div className="w-full sm:w-[240px] flex sm:justify-end">
            <DatePicker date={date} onDateChange={handleDateChange} />
          </div>
        </div>

          <div className="rounded-xl border bg-gradient-to-b from-background to-muted/10 overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[150px] sm:w-[200px] py-0.5 text-xs sm:text-sm">Protocol</TableHead>
                {orderedMetrics.map((metric, index) => (
                  <TableHead 
                    key={metric.key} 
                    className={`text-right py-0.5 transition-colors hover:bg-muted/50 text-xs sm:text-sm`}
                  >
                    <div className="flex items-center gap-1 sm:gap-2 justify-end">
                      <span className="truncate">{metric.label}</span>
                      <GripVertical className="w-2 h-2 sm:w-3 sm:h-3 opacity-50 flex-shrink-0" />
                    </div>
                  </TableHead>
                ))}
              </TableRow>

            </TableHeader>
            <TableBody>
              {getMutableAllCategories().map((categoryName) => {
                const categoryProtocols = getMutableProtocolsByCategory(categoryName);
                const availableProtocols = categoryProtocols.map(p => p.id).filter(p => protocols.includes(p as Protocol));
                
                // Sort protocols by volume (highest to lowest)
                const orderedProtocols = availableProtocols.sort((a, b) => {
                  const volumeA = dailyData[a as Protocol]?.total_volume_usd || 0;
                  const volumeB = dailyData[b as Protocol]?.total_volume_usd || 0;
                  return volumeB - volumeA; // Sort descending (highest first)
                });
                
                if (orderedProtocols.length === 0) return null;
                
                const isCollapsed = collapsedCategories.includes(categoryName);
                const toggleCollapse = () => {
                  setCollapsedCategories(prev =>
                    prev.includes(categoryName)
                      ? prev.filter(c => c !== categoryName)
                      : [...prev, categoryName]
                  );
                };

                // Calculate category totals for current day (excluding hidden protocols)
                const visibleProtocols = orderedProtocols.filter(p => !hiddenProtocols.has(p));
                const categoryTotals = orderedMetrics.reduce((acc, metric) => {
                  if (metric.key === 'daily_growth') {
                    const currentVolume = visibleProtocols
                      .reduce((sum, p) => sum + (dailyData[p as Protocol]?.total_volume_usd || 0), 0);
                    const previousVolume = visibleProtocols
                      .reduce((sum, p) => sum + (previousDayData[p as Protocol]?.total_volume_usd || 0), 0);
                    acc[metric.key] = previousVolume === 0 ? 0 : (currentVolume - previousVolume) / previousVolume;
                  } else if (metric.key === 'market_share') {
                    // Calculate category market share based on total volume
                    const categoryVolume = visibleProtocols
                      .reduce((sum, p) => sum + (dailyData[p as Protocol]?.total_volume_usd || 0), 0);
                    acc[metric.key] = totalVolume > 0 ? categoryVolume / totalVolume : 0;
                  } else {
                    acc[metric.key] = visibleProtocols
                      .reduce((sum, p) => sum + (dailyData[p as Protocol]?.[metric.key as keyof ProtocolMetrics] || 0), 0);
                  }
                  return acc;
                }, {} as Record<MetricKey, number>);

                return (
                  <React.Fragment key={categoryName}>
                    {/* Category Header */}
                    <TableRow 
                      className={cn("border-t cursor-pointer", getCategoryRowColor(categoryName))}
                      onClick={toggleCollapse}
                    >
                      <TableCell className="font-semibold text-xs sm:text-sm tracking-wide py-3 sm:py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <ChevronRight 
                            className={`h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground transition-transform duration-200 ${
                              !isCollapsed ? 'rotate-90' : ''
                            }`}
                          />
                          <span className="truncate">{categoryName}</span>
                        </div>
                      </TableCell>
                      {orderedMetrics.map((metric) => (
                        <TableCell 
                          key={metric.key} 
                          className="text-right font-medium py-0.5 text-xs sm:text-sm"
                        >
                          {metric.key === 'market_share'
                            ? metric.format(categoryTotals[metric.key] || 0, true, undefined, categoryName)
                            : metric.key === 'daily_trades'
                            ? formatNumber(categoryTotals[metric.key] || 0)
                            : metric.key === 'daily_growth'
                            ? metric.format(categoryTotals[metric.key], true, undefined, categoryName)
                            : metric.getValue
                              ? metric.format(metric.getValue(categoryTotals as ProtocolMetrics), true, undefined, categoryName)
                              : metric.format(categoryTotals[metric.key] || 0, true, undefined, categoryName)}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    {/* Protocol Rows */}
                    {orderedProtocols.map((protocol) => {
                      const isHidden = hiddenProtocols.has(protocol);
                      return (
                        <TableRow 
                          key={protocol} 
                          className={`${isCollapsed || isHidden ? 'hidden' : ''} transition-colors hover:bg-muted/30`}
                        >
                          <TableCell className="pl-3 sm:pl-6 text-muted-foreground text-xs sm:text-sm">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <button
                                onClick={(e) => {
                                  console.log('Protocol visibility button clicked');
                                  e.stopPropagation();
                                  toggleProtocolVisibility(protocol);
                                }}
                                className="opacity-0 hover:opacity-100 transition-opacity duration-200"
                                title={isHidden ? "Show protocol" : "Hide protocol"}
                              >
                                {isHidden ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                              </button>
                              <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                                <img 
                                  src={`/assets/logos/${protocol.includes('terminal') ? protocol.split(' ')[0] : protocol === 'bull x' ? 'bullx' : protocol}.jpg`}
                                  alt={protocol} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const container = target.parentElement;
                                    if (container) {
                                      container.innerHTML = '';
                                      container.className = 'w-4 h-4 bg-muted/20 rounded flex items-center justify-center';
                                      const iconEl = document.createElement('div');
                                      iconEl.innerHTML = '<svg class="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                      container.appendChild(iconEl);
                                    }
                                  }}
                                />
                              </div>
                              <span className="truncate">{protocol.charAt(0).toUpperCase() + protocol.slice(1)}</span>
                              {topProtocols.includes(protocol) && (
                                <Badge 
                                  variant="secondary"
                                  className={cn(
                                    "ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs font-medium flex-shrink-0",
                                    topProtocols.indexOf(protocol) === 0 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                                    topProtocols.indexOf(protocol) === 1 && "bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300",
                                    topProtocols.indexOf(protocol) === 2 && "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                  )}
                                >
                                  #{topProtocols.indexOf(protocol) + 1}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        {orderedMetrics.map((metric) => (
                          <TableCell 
                            key={metric.key} 
                            className={`text-right py-0.5 text-xs sm:text-sm ${metric.key === 'daily_growth'
                              ? getGrowthBackground(dailyData[protocol]?.daily_growth || 0)
                              : !metric.skipGradient
                                ? getGradientColor(
                                    metric.getValue 
                                      ? metric.getValue(dailyData[protocol] || {} as ProtocolMetrics)
                                      : (dailyData[protocol]?.[metric.key as keyof ProtocolMetrics] || 0),
                                    0,
                                    protocols.reduce((max, p) => {
                                      const value = metric.getValue 
                                        ? metric.getValue(dailyData[p] || {} as ProtocolMetrics)
                                        : (dailyData[p]?.[metric.key as keyof ProtocolMetrics] || 0);
                                      return Math.max(max, value);
                                    }, 0),
                                    protocols.map(p => metric.getValue
                                      ? metric.getValue(dailyData[p] || {} as ProtocolMetrics)
                                      : (dailyData[p]?.[metric.key as keyof ProtocolMetrics] || 0)
                                    )
                                  )
                              : ''
                            }`}
                          >
                            <span>
                              {metric.getValue
                                ? metric.format(metric.getValue(dailyData[protocol] || {} as ProtocolMetrics), false, protocol)
                                : metric.format(dailyData[protocol]?.[metric.key] || 0, false, protocol)}
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* All Protocols Total Row */}
              <TableRow className="font-bold bg-primary/10 border-t-2 border-primary/20 hover:bg-primary/20">
                <TableCell className="font-medium text-xs sm:text-sm">
                  All Protocols
                </TableCell>
                {orderedMetrics.map((metric) => {
                  let total: number;
                  if (metric.key === 'daily_growth') {
                    const currentVolume = protocols
                      .filter(p => p !== 'all')
                      .reduce((sum, p) => sum + (dailyData[p]?.total_volume_usd || 0), 0);
                    const previousVolume = protocols
                      .filter(p => p !== 'all')
                      .reduce((sum, p) => sum + (previousDayData[p]?.total_volume_usd || 0), 0);
                    total = previousVolume === 0 ? 0 : (currentVolume - previousVolume) / previousVolume;
                  } else if (metric.key === 'market_share') {
                    total = 1; // 100% by definition for all protocols
                  } else {
                    total = protocols
                      .filter(p => p !== 'all')
                      .reduce((sum, p) => sum + (dailyData[p]?.[metric.key as keyof ProtocolMetrics] || 0), 0);
                  }
                  
                  if (metric.key === 'daily_growth') {
                    // Calculate aggregated weekly volume data for all protocols
                    const aggregatedWeeklyData: { day: number; value: number }[] = [];
                    
                    for (let i = 0; i < 7; i++) {
                      const dayData = eachDayOfInterval({
                        start: subDays(date, 6),
                        end: date
                      })[i];
                      
                      if (dayData) {
                        const dateKey = format(dayData, 'yyyy-MM-dd');
                        const dailyTotal = protocols
                          .filter(p => p !== 'all')
                          .reduce((sum, p) => {
                            const protocolWeeklyData = weeklyVolumeData[p];
                            return sum + (protocolWeeklyData?.[dateKey] || 0);
                          }, 0);
                        
                        aggregatedWeeklyData.push({
                          day: i,
                          value: dailyTotal
                        });
                      }
                    }
                    
                    // Calculate trend for aggregated data
                    const getAggregatedTrend = (): 'up' | 'down' | 'neutral' => {
                      if (aggregatedWeeklyData.length < 2) return 'neutral';
                      
                      const firstHalf = aggregatedWeeklyData.slice(0, Math.floor(aggregatedWeeklyData.length / 2));
                      const secondHalf = aggregatedWeeklyData.slice(Math.floor(aggregatedWeeklyData.length / 2));
                      
                      const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
                      const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
                      
                      if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
                      if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
                      return 'neutral';
                    };
                    
                    const trend = getAggregatedTrend();
                    const percentage = total * 100;
                    const absPercentage = Math.abs(percentage);
                    const isPositive = total > 0;
                    const isNeutral = Math.abs(total) < 0.001;
                    
                    return (
                      <TableCell 
                        key={metric.key} 
                        className="text-right font-bold text-xs sm:text-sm"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="w-[50px] h-[20px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={aggregatedWeeklyData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                                <Area 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke={trend === 'up' ? "#22c55e" : trend === 'down' ? "#ef4444" : "#6b7280"}
                                  strokeWidth={1.5}
                                  fill={trend === 'up' ? "#22c55e" : trend === 'down' ? "#ef4444" : "#6b7280"}
                                  fillOpacity={0.2}
                                  dot={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          {!isNeutral && (
                            <div className={cn(
                              "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium -ml-8",
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
                              {absPercentage.toFixed(2)}%
                            </div>
                          )}
                          {isNeutral && (
                            <span className="text-muted-foreground text-xs -ml-8">—</span>
                          )}
                        </div>
                      </TableCell>
                    );
                  }
                  
                  return (
                    <TableCell 
                      key={metric.key} 
                      className="text-right font-bold text-xs sm:text-sm"
                    >
                      {metric.key === 'daily_trades' ? formatNumber(total) : metric.format(total)}
                    </TableCell>
                  );
                })}
              </TableRow>
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
