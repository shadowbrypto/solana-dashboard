import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format } from "date-fns";
import { GripVertical, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DatePicker } from "./DatePicker";
import { getDailyMetrics } from "../lib/protocol";
import { protocolCategories } from "../lib/protocol-categories";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

interface DailyMetricsTableProps {
  protocols: Protocol[];
}

type MetricKey = keyof ProtocolMetrics | 'market_share';

interface MetricDefinition {
  key: MetricKey;
  label: string;
  format: (value: number, isCategory?: boolean) => React.ReactNode;
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

export function DailyMetricsTable({ protocols }: DailyMetricsTableProps) {
  const [topProtocols, setTopProtocols] = useState<Protocol[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [dailyData, setDailyData] = useState<Record<Protocol, ProtocolMetrics>>({});
  const [previousDayData, setPreviousDayData] = useState<Record<Protocol, ProtocolMetrics>>({});
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnOrder, setColumnOrder] = useState<MetricKey[]>(["total_volume_usd", "daily_users", "numberOfNewUsers", "daily_trades", "market_share", "daily_growth" as MetricKey]);
  const [draggedProtocol, setDraggedProtocol] = useState<{ protocol: string; category: string } | null>(null);
  const [categoryProtocolOrder, setCategoryProtocolOrder] = useState<Record<string, string[]>>({});
  const [hasManualReordering, setHasManualReordering] = useState<Record<string, boolean>>({});

  // Calculate total volume for market share
  const totalVolume = Object.values(dailyData)
    .reduce((sum, protocol) => sum + (protocol?.total_volume_usd || 0), 0);

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
      format: (value, isCategory = false) => {
        const percentage = value * 100;
        const absPercentage = Math.abs(percentage);
        const isPositive = value > 0;
        const isNeutral = Math.abs(value) < 0.001;
        
        if (isNeutral) {
          return (
            <div className="flex items-center justify-end gap-1">
              <span className="text-muted-foreground">—</span>
            </div>
          );
        }
        
        return (
          <div className="flex items-center justify-end gap-1">
            <div className={cn(
              "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
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

  // Initialize category protocol order on mount with volume-based sorting
  useEffect(() => {
    const initialOrder: Record<string, string[]> = {};
    protocolCategories.forEach(category => {
      const categoryProtocols = category.protocols.filter(p => protocols.includes(p as Protocol));
      // Sort by volume on initial load
      const sortedProtocols = categoryProtocols.sort((a, b) => {
        const volumeA = dailyData[a as Protocol]?.total_volume_usd || 0;
        const volumeB = dailyData[b as Protocol]?.total_volume_usd || 0;
        return volumeB - volumeA;
      });
      initialOrder[category.name] = sortedProtocols;
    });
    setCategoryProtocolOrder(initialOrder);
  }, [protocols, dailyData]);

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

  // Protocol row drag handlers
  const handleProtocolDragStart = (e: React.DragEvent, protocol: string, category: string) => {
    setDraggedProtocol({ protocol, category });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleProtocolDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedProtocol) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleProtocolDrop = (e: React.DragEvent, targetProtocol: string, targetCategory: string) => {
    e.preventDefault();
    
    if (!draggedProtocol || draggedProtocol.category !== targetCategory) {
      // Don't allow dropping in different categories
      setDraggedProtocol(null);
      return;
    }

    if (draggedProtocol.protocol === targetProtocol) {
      setDraggedProtocol(null);
      return;
    }

    const newOrder = [...(categoryProtocolOrder[targetCategory] || [])];
    const draggedIndex = newOrder.indexOf(draggedProtocol.protocol);
    const targetIndex = newOrder.indexOf(targetProtocol);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove dragged item
      newOrder.splice(draggedIndex, 1);
      // Insert at new position
      newOrder.splice(targetIndex, 0, draggedProtocol.protocol);
      
      setCategoryProtocolOrder({
        ...categoryProtocolOrder,
        [targetCategory]: newOrder
      });
      
      // Mark this category as having manual reordering
      setHasManualReordering({
        ...hasManualReordering,
        [targetCategory]: true
      });
    }

    setDraggedProtocol(null);
  };

  const handleProtocolDragEnd = () => {
    setDraggedProtocol(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setTopProtocols([]);
      try {
        const [currentData, previousData] = await Promise.all([
          getDailyMetrics(date),
          getDailyMetrics(new Date(date.getTime() - 24 * 60 * 60 * 1000))
        ]);
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
        console.error('Error fetching metrics:', error);
        setDailyData({});
        setPreviousDayData({});
      }
    };
    fetchData();
  }, [date]);

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
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

  return (
    <div className="space-y-4 rounded-xl border bg-gradient-to-b from-background to-muted/20 p-3 sm:p-4 lg:p-6 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 sm:gap-0">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Protocol Metrics</h3>
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
                  className={`text-right py-0.5 cursor-move select-none transition-colors hover:bg-muted/50 text-xs sm:text-sm ${
                    draggedColumn === index ? 'opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
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
            {protocolCategories.map((category) => {
              const availableProtocols = categoryProtocolOrder[category.name] || category.protocols.filter(p => protocols.includes(p as Protocol));
              
              // Sort protocols by volume (highest to lowest) unless manually reordered
              const orderedProtocols = hasManualReordering[category.name] 
                ? availableProtocols // Use manual order if it exists
                : availableProtocols.sort((a, b) => {
                    const volumeA = dailyData[a as Protocol]?.total_volume_usd || 0;
                    const volumeB = dailyData[b as Protocol]?.total_volume_usd || 0;
                    return volumeB - volumeA; // Sort descending (highest first)
                  });
              
              if (orderedProtocols.length === 0) return null;
              
              const isCollapsed = collapsedCategories.includes(category.name);
              const toggleCollapse = () => {
                setCollapsedCategories(prev =>
                  prev.includes(category.name)
                    ? prev.filter(c => c !== category.name)
                    : [...prev, category.name]
                );
              };

              // Calculate category totals for current day
              const categoryTotals = orderedMetrics.reduce((acc, metric) => {
                if (metric.key === 'daily_growth') {
                  const currentVolume = orderedProtocols
                    .reduce((sum, p) => sum + (dailyData[p as Protocol]?.total_volume_usd || 0), 0);
                  const previousVolume = orderedProtocols
                    .reduce((sum, p) => sum + (previousDayData[p as Protocol]?.total_volume_usd || 0), 0);
                  acc[metric.key] = previousVolume === 0 ? 0 : (currentVolume - previousVolume) / previousVolume;
                } else if (metric.key === 'market_share') {
                  // Calculate category market share based on total volume
                  const categoryVolume = orderedProtocols
                    .reduce((sum, p) => sum + (dailyData[p as Protocol]?.total_volume_usd || 0), 0);
                  acc[metric.key] = totalVolume > 0 ? categoryVolume / totalVolume : 0;
                } else {
                  acc[metric.key] = orderedProtocols
                    .reduce((sum, p) => sum + (dailyData[p as Protocol]?.[metric.key as keyof ProtocolMetrics] || 0), 0);
                }
                return acc;
              }, {} as Record<MetricKey, number>);

              return (
                <React.Fragment key={category.name}>
                  {/* Category Header */}
                  <TableRow 
                    className={cn("border-t cursor-pointer", getCategoryRowColor(category.name))}
                    onClick={toggleCollapse}
                  >
                    <TableCell className="font-semibold text-xs sm:text-sm tracking-wide py-3 sm:py-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <ChevronRight 
                          className={`h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground transition-transform duration-200 ${
                            !isCollapsed ? 'rotate-90' : ''
                          }`}
                        />
                        <span className="truncate">{category.name}</span>
                      </div>
                    </TableCell>
                    {orderedMetrics.map((metric) => (
                      <TableCell 
                        key={metric.key} 
                        className="text-right font-medium py-0.5 text-xs sm:text-sm"
                      >
                        {metric.key === 'market_share'
                          ? metric.format(categoryTotals[metric.key] || 0)
                          : metric.key === 'daily_trades'
                          ? formatNumber(categoryTotals[metric.key] || 0)
                          : metric.key === 'daily_growth'
                          ? metric.format(categoryTotals[metric.key])
                          : metric.getValue
                            ? metric.format(metric.getValue(categoryTotals as ProtocolMetrics))
                            : metric.format(categoryTotals[metric.key] || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Protocol Rows */}
                  {orderedProtocols.map((protocol) => (
                    <TableRow 
                      key={protocol} 
                      className={`${isCollapsed ? 'hidden' : ''} transition-colors hover:bg-muted/30 ${
                        draggedProtocol?.protocol === protocol ? 'opacity-50' : ''
                      } cursor-move`}
                      draggable
                      onDragStart={(e) => handleProtocolDragStart(e, protocol, category.name)}
                      onDragOver={handleProtocolDragOver}
                      onDrop={(e) => handleProtocolDrop(e, protocol, category.name)}
                      onDragEnd={handleProtocolDragEnd}
                    >
                      <TableCell className="pl-3 sm:pl-6 text-muted-foreground text-xs sm:text-sm">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <GripVertical className="w-3 h-3 sm:w-4 sm:h-4 opacity-50 flex-shrink-0" />
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
                              ? metric.format(metric.getValue(dailyData[protocol] || {} as ProtocolMetrics))
                              : metric.format(dailyData[protocol]?.[metric.key] || 0)}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
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
  );
}
