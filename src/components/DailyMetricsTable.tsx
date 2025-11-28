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
import { ChevronRight, Eye, EyeOff, Download, Copy } from "lucide-react";
import { cn } from "../lib/utils";
// @ts-ignore
import domtoimage from "dom-to-image";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DateNavigator } from "./DateNavigator";
import { protocolApi } from "../lib/api";
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

type MetricKey = keyof ProtocolMetrics | 'market_share' | 'projected_volume';

interface MetricDefinition {
  key: MetricKey;
  label: string;
  format: (value: number, isCategory?: boolean, protocol?: Protocol, categoryName?: string) => React.ReactNode;
  getValue?: (data: ProtocolMetrics, protocol?: Protocol) => number;
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
  const [projectedVolumeData, setProjectedVolumeData] = useState<Record<string, number>>({});
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnOrder, setColumnOrder] = useState<MetricKey[]>(() => Settings.getDailyTableColumnOrder() as MetricKey[]);
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(() => new Set(Settings.getDailyTableHiddenProtocols()));
  const [isProjectedVolumeHidden, setIsProjectedVolumeHidden] = useState<boolean>(() => Settings.getIsProjectedVolumeHidden());
  const [backendTotals, setBackendTotals] = useState<{
    totalVolume: number;
    totalUsers: number;
    totalTrades: number;
    totalFees: number;
    totalGrowth: number;
    totalWeeklyTrend: number[];
  } | null>(null);
  const { toast } = useToast();

  // Calculate total volume for market share (excluding hidden protocols)
  // Use backend totals if available and no protocols are hidden, otherwise calculate from visible protocols
  // IMPORTANT: Use adjustedVolume to match backend calculation
  const totalVolume = (backendTotals && hiddenProtocols.size === 0)
    ? backendTotals.totalVolume
    : protocols
        .filter(protocol => protocol !== 'all' && !hiddenProtocols.has(protocol))
        .reduce((sum, protocol) => sum + (dailyData[protocol]?.adjustedVolume || dailyData[protocol]?.total_volume_usd || 0), 0);

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
    { 
      key: "projected_volume" as MetricKey, 
      label: "Adj. Volume", 
      format: (value: number, isCategory?: boolean, protocol?: Protocol, categoryName?: string) => {
        if (value === 0 || value === undefined) return <span className="text-muted-foreground">-</span>;
        
        // For category rows, calculate total actual volume and show comparison
        if (isCategory && categoryName) {
          // Get protocols for this category
          const categoryProtocols = getMutableProtocolsByCategory(categoryName);
          const visibleProtocols = categoryProtocols
            .map(p => p.id)
            .filter(p => !hiddenProtocols.has(p));
          
          // Calculate total actual volume for the category
          const totalActualVolume = visibleProtocols
            .reduce((sum, p) => sum + (dailyData[p as Protocol]?.total_volume_usd || 0), 0);
          
          if (totalActualVolume === 0) {
            return (
              <div className="flex items-center gap-2 justify-end">
                <span>{formatCurrency(value)}</span>
              </div>
            );
          }
          
          // Calculate difference
          const difference = value - totalActualVolume;
          const percentageDiff = (difference / totalActualVolume) * 100;
          
          // Determine styling based on difference
          const isNeutral = Math.abs(difference) < 0.01; // Less than 1 cent difference
          const isPositive = difference > 0;
          
          let bgColor, borderColor;
          if (isNeutral) {
            bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
            borderColor = "border-l-gray-400";
          } else if (isPositive) {
            bgColor = "bg-green-100/80 dark:bg-green-950/40";
            borderColor = "border-l-green-400";
          } else {
            bgColor = "bg-red-100/80 dark:bg-red-950/40";
            borderColor = "border-l-red-400";
          }
          
          const diffText = `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;
          
          return (
            <div className={`flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
              <span>{formatCurrency(value)}</span>
              <span className="text-[9px] font-medium text-muted-foreground">
                {diffText}
              </span>
            </div>
          );
        }
        
        // Get actual volume for comparison
        const actualVolume = protocol ? dailyData[protocol]?.total_volume_usd || 0 : 0;

        // When actual volume is 0 but projected volume exists, show with green styling
        if (actualVolume === 0 && value > 0) {
          return (
            <div className="flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 bg-green-100/80 dark:bg-green-950/40 border-l-green-400">
              <span>{formatCurrency(value)}</span>
            </div>
          );
        }

        // If both are 0, show dash
        if (actualVolume === 0) {
          return <span className="text-muted-foreground">-</span>;
        }
        
        // Calculate difference
        const difference = value - actualVolume;
        const percentageDiff = (difference / actualVolume) * 100;
        
        // Determine styling based on difference
        const isNeutral = Math.abs(difference) < 0.01; // Less than 1 cent difference
        const isPositive = difference > 0;
        
        let bgColor, borderColor;
        if (isNeutral) {
          bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
          borderColor = "border-l-gray-400";
        } else if (isPositive) {
          bgColor = "bg-green-100/80 dark:bg-green-950/40";
          borderColor = "border-l-green-400";
        } else {
          bgColor = "bg-red-100/80 dark:bg-red-950/40";
          borderColor = "border-l-red-400";
        }
        
        const diffText = `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;
        
        return (
          <div className={`flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
            <span>{formatCurrency(value)}</span>
            <span className="text-[9px] font-medium text-muted-foreground">
              {diffText}
            </span>
          </div>
        );
      },
      getValue: (data, protocol) => {
        if (!protocol) return 0;

        // Check if this protocol has projected volume data
        const projectedVolume = projectedVolumeData[protocol];
        if (projectedVolume && projectedVolume > 0) {
          return projectedVolume;
        }

        // For Mobile Apps protocols, use actual volume as projected volume
        const protocolConfig = getProtocolById(protocol);
        if (protocolConfig?.category === 'Mobile Apps') {
          return dailyData[protocol]?.total_volume_usd || 0;
        }

        // For other protocols without projected data, return 0
        return 0;
      }
    },
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
            <span className="font-medium text-[9px] sm:text-sm min-w-[50px]">{percentage.toFixed(2)}%</span>
          </div>
        );
      },
      // Use adjustedVolume to match backend calculation
      getValue: (data) => (data?.adjustedVolume || data?.total_volume_usd || 0) / (totalVolume || 1)
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
            <div className="flex items-center justify-end sm:justify-between w-full">
              <div className="hidden sm:block w-[60px] h-[30px] -my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={aggregatedData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
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
                  "flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-medium ml-0.5 sm:ml-1",
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
          <div className="flex items-center justify-end sm:justify-between w-full">
            <div className="hidden sm:block w-[60px] h-[30px] -my-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getWeeklyVolumeChart(protocol)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
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
                "flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-medium ml-0.5 sm:ml-1",
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
        // Use daily_growth from backend (already calculated with fallback logic)
        return data?.daily_growth || 0;
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
  // Ensure projected_volume is always included for existing users who don't have it in their saved settings
  let effectiveColumnOrder = [...columnOrder];
  if (!effectiveColumnOrder.includes('projected_volume')) {
    // Insert projected_volume before total_volume_usd if it exists, otherwise at the beginning
    const volumeIndex = effectiveColumnOrder.indexOf('total_volume_usd');
    if (volumeIndex >= 0) {
      effectiveColumnOrder.splice(volumeIndex, 0, 'projected_volume');
    } else {
      effectiveColumnOrder.unshift('projected_volume');
    }
  }
  
  const orderedMetrics = effectiveColumnOrder
    .filter(key => key !== 'projected_volume' || !isProjectedVolumeHidden)
    .map(key => metrics.find(m => m.key === key)).filter(Boolean) as MetricDefinition[];

  // Toggle projected volume visibility
  const toggleProjectedVolumeVisibility = () => {
    const newHidden = !isProjectedVolumeHidden;
    setIsProjectedVolumeHidden(newHidden);
    Settings.setIsProjectedVolumeHidden(newHidden);
  };


  // Category-based bright coloring using shadcn theme colors
  const getCategoryRowColor = (categoryName: string): string => {
    switch (categoryName) {
      case 'Telegram Bots':
        return 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/40';
      case 'Trading Terminals':
        return 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/40';
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
        // Use the new optimized API endpoint - Solana always uses 'private' data type
        const dataType = Settings.getDataTypePreference() === 'public' ? 'private' : Settings.getDataTypePreference();
        console.log('Calling getDailyMetricsOptimized with:', { date: date.toISOString().split('T')[0], chain: 'solana', dataType });
        const optimizedData = await protocolApi.getDailyMetricsOptimized(date, 'solana', dataType);
        
        
        // Transform the optimized data to match the component's data structure
        const transformedDailyData: Record<Protocol, ProtocolMetrics> = {};
        const transformedPreviousData: Record<Protocol, ProtocolMetrics> = {};
        const transformedWeeklyData: Record<Protocol, Record<string, number>> = {};
        const projectedVolumeMap: Record<string, number> = {};
        
        // Generate last 7 days for weekly data structure
        const last7Days = eachDayOfInterval({
          start: subDays(date, 6),
          end: date
        });
        
        Object.entries(optimizedData.protocols).forEach(([protocolName, data]) => {
          const protocol = protocolName as Protocol;
          // Current day data
          transformedDailyData[protocol] = {
            total_volume_usd: data.totalVolume,
            daily_users: data.dailyUsers,
            numberOfNewUsers: data.newUsers,
            daily_trades: data.trades,
            total_fees_usd: data.fees,
            projected_volume: data.projectedVolume || 0,
            adjustedVolume: data.adjustedVolume || data.totalVolume,
            daily_growth: data.dailyGrowth || 0
          };

          // Previous day data (calculate from current volume and growth)
          // Use actual volume if projected volume is not available
          const currentVolume = (data.projectedVolume && data.projectedVolume > 0) ? data.projectedVolume : data.totalVolume;
          const previousVolume = data.dailyGrowth !== 0 && currentVolume > 0
            ? currentVolume / (1 + data.dailyGrowth)
            : 0;
          transformedPreviousData[protocol] = {
            total_volume_usd: previousVolume,
            daily_users: 0,
            numberOfNewUsers: 0,
            daily_trades: 0,
            total_fees_usd: 0,
            projected_volume: (data.projectedVolume && data.projectedVolume > 0) ? previousVolume : 0,
            daily_growth: 0
          };
          
          // Weekly volume data
          transformedWeeklyData[protocol] = {};
          last7Days.forEach((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            transformedWeeklyData[protocol][dateKey] = data.weeklyTrend[index] || 0;
          });
          
          // Projected volume data
          if (data.projectedVolume && data.projectedVolume > 0) {
            projectedVolumeMap[protocol] = data.projectedVolume;
          }
        });
        
        setDailyData(transformedDailyData);
        setPreviousDayData(transformedPreviousData);
        setWeeklyVolumeData(transformedWeeklyData);
        setProjectedVolumeData(projectedVolumeMap);
        setBackendTotals(optimizedData.totals);
        
        // Set top protocols from the backend response
        setTopProtocols(optimizedData.topProtocols as Protocol[]);
        
      } catch (error) {
        console.error('Error loading Solana daily data:', error);
        setDailyData({});
        setPreviousDayData({});
        setWeeklyVolumeData({});
        setProjectedVolumeData({});
        setBackendTotals(null);
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

  const formatValue = (metric: MetricDefinition, value: number, isCategory = false, protocol?: Protocol, categoryName?: string) => {
    if (isCategory && metric.key === 'market_share') return '—';
    return metric.format(value, isCategory, protocol, categoryName);
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
    // Always show projected volume when clicking Show All
    setIsProjectedVolumeHidden(false);
    Settings.setIsProjectedVolumeHidden(false);
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
    // Don't hide projected volume when hiding all protocols
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
    <div className="space-y-4">
      <div data-table="daily-metrics" className="space-y-2 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <h3 className="text-sm sm:text-lg font-semibold text-foreground">Daily Report</h3>
              <span className="px-1 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-md">
                SOL
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={hiddenProtocols.size > 0 ? showAllProtocols : hideAllProtocols}
                className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-1 text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                title={hiddenProtocols.size > 0 ? "Show all protocols" : "Hide all protocols"}
              >
                {hiddenProtocols.size > 0 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {hiddenProtocols.size > 0 ? "Show All" : "Hide All"}
              </button>
            </div>
          </div>
          <div className="w-full sm:w-auto flex sm:justify-end">
            <DateNavigator date={date} onDateChange={handleDateChange} />
          </div>
        </div>

          <div className="rounded-xl border bg-gradient-to-b from-background to-muted/10 overflow-x-auto">
          <Table className="min-w-[600px] sm:min-w-[800px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] sm:w-[200px] py-0.5 text-[9px] sm:text-sm px-1 sm:px-4">Protocol</TableHead>
                {orderedMetrics.map((metric, index) => (
                  <TableHead 
                    key={metric.key} 
                    className={`text-right py-0.5 transition-colors hover:bg-muted/50 text-[9px] sm:text-sm px-1 sm:px-4 ${metric.key === 'daily_growth' ? (isProjectedVolumeHidden ? 'min-w-[70px] sm:min-w-[90px]' : 'min-w-[100px] sm:min-w-[130px]') : ''} ${metric.key === 'projected_volume' ? 'group relative' : ''}`}
                  >
                    {metric.key === 'projected_volume' ? (
                      <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                        <span className="truncate">{metric.label}</span>
                        <button
                          onClick={toggleProjectedVolumeVisibility}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-0.5 hover:bg-accent rounded"
                          title="Hide Adj. Volume column"
                        >
                          <EyeOff className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="truncate">{metric.label}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>

            </TableHeader>
            <TableBody>
              {getMutableAllCategories().map((categoryName) => {
                const categoryProtocols = getMutableProtocolsByCategory(categoryName);
                const availableProtocols = categoryProtocols.map(p => p.id).filter(p => protocols.includes(p as Protocol));
                
                // Sort protocols by adjusted volume (projected volume, highest to lowest)
                const orderedProtocols = availableProtocols.sort((a, b) => {
                  const projectedA = projectedVolumeData[a] || dailyData[a as Protocol]?.total_volume_usd || 0;
                  const projectedB = projectedVolumeData[b] || dailyData[b as Protocol]?.total_volume_usd || 0;
                  return projectedB - projectedA; // Sort descending (highest first)
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
                  } else if (metric.key === 'projected_volume') {
                    // Calculate category projected volume total
                    acc[metric.key] = visibleProtocols
                      .reduce((sum, p) => {
                        // Check if this protocol has projected volume data
                        const projectedVolume = projectedVolumeData[p];
                        if (projectedVolume && projectedVolume > 0) {
                          return sum + projectedVolume;
                        }
                        
                        // For Mobile Apps protocols, use actual volume as projected volume
                        const protocolConfig = getProtocolById(p);
                        if (protocolConfig?.category === 'Mobile Apps') {
                          return sum + (dailyData[p as Protocol]?.total_volume_usd || 0);
                        }
                        
                        // For other protocols without projected data, add 0
                        return sum;
                      }, 0);
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
                      <TableCell className="font-semibold text-[9px] sm:text-sm tracking-wide py-2 sm:py-4 px-1 sm:px-4">
                        <div className="flex items-center gap-0.5 sm:gap-2">
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
                          className={`text-right font-medium py-0.5 text-[9px] sm:text-sm px-1 sm:px-4 ${metric.key === 'daily_growth' ? (isProjectedVolumeHidden ? 'min-w-[70px] sm:min-w-[90px]' : 'min-w-[100px] sm:min-w-[130px]') : ''}`}
                        >
                          {metric.key === 'market_share'
                            ? metric.format(categoryTotals[metric.key] || 0, true, undefined, categoryName)
                            : metric.key === 'daily_trades'
                            ? formatNumber(categoryTotals[metric.key] || 0)
                            : metric.key === 'daily_growth'
                            ? metric.format(categoryTotals[metric.key], true, undefined, categoryName)
                            : metric.key === 'projected_volume'
                            ? metric.format(categoryTotals[metric.key] || 0, true, undefined, categoryName)
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
                          <TableCell className="pl-1 sm:pl-6 text-muted-foreground text-[9px] sm:text-sm px-1 sm:px-4">
                            <div className="flex items-center gap-0.5 sm:gap-2">
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
                            className={`text-right py-0.5 text-[9px] sm:text-sm px-1 sm:px-4 ${metric.key === 'daily_growth'
                              ? getGrowthBackground(dailyData[protocol]?.daily_growth || 0) + (isProjectedVolumeHidden ? ' min-w-[70px] sm:min-w-[90px]' : ' min-w-[100px] sm:min-w-[130px]')
                              : !metric.skipGradient
                                ? getGradientColor(
                                    metric.getValue 
                                      ? metric.getValue(dailyData[protocol] || {} as ProtocolMetrics, protocol)
                                      : (dailyData[protocol]?.[metric.key as keyof ProtocolMetrics] || 0),
                                    0,
                                    protocols.reduce((max, p) => {
                                      const value = metric.getValue 
                                        ? metric.getValue(dailyData[p] || {} as ProtocolMetrics, p)
                                        : (dailyData[p]?.[metric.key as keyof ProtocolMetrics] || 0);
                                      return Math.max(max, value);
                                    }, 0),
                                    protocols.map(p => metric.getValue
                                      ? metric.getValue(dailyData[p] || {} as ProtocolMetrics, p)
                                      : (dailyData[p]?.[metric.key as keyof ProtocolMetrics] || 0)
                                    )
                                  )
                              : ''
                            }`}
                          >
                            <span>
                              {metric.getValue
                                ? metric.format(metric.getValue(dailyData[protocol] || {} as ProtocolMetrics, protocol), false, protocol)
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

              {/* All Trading Apps Total Row */}
              <TableRow className="font-bold bg-gray-200 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-b-xl">
                <TableCell className="font-medium text-[9px] sm:text-sm px-1 sm:px-4" style={{ paddingLeft: '2rem' }}>
                  All Trading Apps
                </TableCell>
                {orderedMetrics.map((metric) => {
                  let total: number;
                  if (metric.key === 'daily_growth') {
                    const currentVolume = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (dailyData[p]?.total_volume_usd || 0), 0);
                    const previousVolume = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (previousDayData[p]?.total_volume_usd || 0), 0);
                    total = previousVolume === 0 ? 0 : (currentVolume - previousVolume) / previousVolume;
                  } else if (metric.key === 'market_share') {
                    total = 1; // 100% by definition for all visible protocols
                  } else if (metric.key === 'projected_volume') {
                    // Calculate total projected volume for all protocols
                    total = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => {
                        // Check if this protocol has projected volume data
                        const projectedVolume = projectedVolumeData[p];
                        if (projectedVolume && projectedVolume > 0) {
                          return sum + projectedVolume;
                        }
                        
                        // For Mobile Apps protocols, use actual volume as projected volume
                        const protocolConfig = getProtocolById(p);
                        if (protocolConfig?.category === 'Mobile Apps') {
                          return sum + (dailyData[p]?.total_volume_usd || 0);
                        }
                        
                        // For other protocols without projected data, add 0
                        return sum;
                      }, 0);
                  } else {
                    total = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
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
                          .filter(p => p !== 'all' && !hiddenProtocols.has(p))
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
                        className="text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4"
                      >
                        <div className="flex items-center justify-end sm:justify-between w-full">
                          <div className="hidden sm:block w-[40px] sm:w-[50px] h-[24px] sm:h-[28px] -my-2">
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
                              "flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-medium -ml-4 sm:-ml-8",
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
                            <span className="text-muted-foreground text-[9px] sm:text-xs -ml-4 sm:-ml-8">—</span>
                          )}
                        </div>
                      </TableCell>
                    );
                  }
                  
                  if (metric.key === 'projected_volume') {
                    // Calculate total actual volume for comparison
                    const totalActualVolume = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (dailyData[p]?.total_volume_usd || 0), 0);
                    
                    if (totalActualVolume === 0) {
                      return (
                        <TableCell key={metric.key} className="text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4">
                          <div className="flex items-center gap-1 sm:gap-2 justify-end">
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </TableCell>
                      );
                    }
                    
                    // Calculate difference
                    const difference = total - totalActualVolume;
                    const percentageDiff = (difference / totalActualVolume) * 100;
                    
                    // Determine styling based on difference
                    const isNeutral = Math.abs(difference) < 0.01;
                    const isPositive = difference > 0;
                    
                    let bgColor, borderColor;
                    if (isNeutral) {
                      bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
                      borderColor = "border-l-gray-400";
                    } else if (isPositive) {
                      bgColor = "bg-green-100/80 dark:bg-green-950/40";
                      borderColor = "border-l-green-400";
                    } else {
                      bgColor = "bg-red-100/80 dark:bg-red-950/40";
                      borderColor = "border-l-red-400";
                    }
                    
                    const diffText = `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;
                    
                    return (
                      <TableCell key={metric.key} className="text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4">
                        <div className={`flex items-center gap-0.5 justify-between px-1 sm:px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
                          <span>{formatCurrency(total)}</span>
                          <span className="text-[9px] font-medium text-muted-foreground">
                            {diffText}
                          </span>
                        </div>
                      </TableCell>
                    );
                  }
                  
                  return (
                    <TableCell 
                      key={metric.key} 
                      className="text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4"
                    >
                      {metric.key === 'daily_trades' ? formatNumber(total) : metric.format(total, true)}
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
