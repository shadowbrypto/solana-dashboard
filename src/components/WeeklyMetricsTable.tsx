import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from "date-fns";
import { GripVertical, ChevronRight, Eye, EyeOff, Download, Copy, ChevronLeft, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
// @ts-ignore
import domtoimage from "dom-to-image";

import { ProtocolMetrics, Protocol } from "../types/protocol";
import { getDailyMetrics } from "../lib/protocol";
import { getMutableAllCategories, getMutableProtocolsByCategory } from "../lib/protocol-config";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface WeeklyMetricsTableProps {
  protocols: Protocol[];
  weekStart: Date;
  onWeekChange: (date: Date) => void;
}

type MetricKey = keyof ProtocolMetrics | 'market_share' | 'weekly_growth';

interface MetricDefinition {
  key: MetricKey;
  label: string;
  format: (value: number, isCategory?: boolean) => React.ReactNode;
  getValue?: (data: ProtocolMetrics) => number;
  skipGradient?: boolean;
}

interface WeeklyData {
  [protocol: string]: {
    total_volume_usd: number;
    daily_users: number;
    numberOfNewUsers: number;
    daily_trades: number;
    total_fees_usd: number;
  };
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

export function WeeklyMetricsTable({ protocols, weekStart, onWeekChange }: WeeklyMetricsTableProps) {
  const [topProtocols, setTopProtocols] = useState<Protocol[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData>({});
  const [previousWeekData, setPreviousWeekData] = useState<WeeklyData>({});
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnOrder, setColumnOrder] = useState<MetricKey[]>(["total_volume_usd", "daily_users", "numberOfNewUsers", "daily_trades", "market_share", "weekly_growth"]);
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Calculate total volume for market share
  const totalVolume = Object.values(weeklyData)
    .reduce((sum, protocol) => sum + (protocol?.total_volume_usd || 0), 0);

  const metrics: MetricDefinition[] = [
    { key: "total_volume_usd", label: "Total Volume", format: formatCurrency },
    { key: "daily_users", label: "Avg Daily Users", format: formatNumber },
    { key: "numberOfNewUsers", label: "Total New Users", format: formatNumber },
    { key: "daily_trades", label: "Total Trades", format: formatNumber },
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
      key: "weekly_growth" as MetricKey,
      label: "Weekly Growth",
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
        const protocol = Object.keys(weeklyData).find(key => weeklyData[key] === data) as Protocol;
        const previousVolume = protocol ? (previousWeekData[protocol]?.total_volume_usd || 0) : 0;
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
    const fetchWeeklyData = async () => {
      setLoading(true);
      try {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        
        // Fetch data for current week
        const currentWeekPromises = days.map(day => getDailyMetrics(day));
        const currentWeekResults = await Promise.all(currentWeekPromises);
        
        // Fetch data for previous week
        const previousWeekStart = subWeeks(weekStart, 1);
        const previousWeekEnd = endOfWeek(previousWeekStart, { weekStartsOn: 1 });
        const previousDays = eachDayOfInterval({ start: previousWeekStart, end: previousWeekEnd });
        const previousWeekPromises = previousDays.map(day => getDailyMetrics(day));
        const previousWeekResults = await Promise.all(previousWeekPromises);
        
        // Aggregate weekly data
        const aggregatedData: WeeklyData = {};
        const previousAggregatedData: WeeklyData = {};
        
        protocols.forEach(protocol => {
          aggregatedData[protocol] = {
            total_volume_usd: 0,
            daily_users: 0,
            numberOfNewUsers: 0,
            daily_trades: 0,
            total_fees_usd: 0
          };
          
          previousAggregatedData[protocol] = {
            total_volume_usd: 0,
            daily_users: 0,
            numberOfNewUsers: 0,
            daily_trades: 0,
            total_fees_usd: 0
          };
          
          // Aggregate current week
          currentWeekResults.forEach((dayData, index) => {
            if (dayData[protocol]) {
              aggregatedData[protocol].total_volume_usd += dayData[protocol].total_volume_usd || 0;
              aggregatedData[protocol].daily_users += dayData[protocol].daily_users || 0;
              aggregatedData[protocol].numberOfNewUsers += dayData[protocol].numberOfNewUsers || 0;
              aggregatedData[protocol].daily_trades += dayData[protocol].daily_trades || 0;
              aggregatedData[protocol].total_fees_usd += dayData[protocol].total_fees_usd || 0;
            }
          });
          
          // Calculate average daily users
          aggregatedData[protocol].daily_users = Math.round(aggregatedData[protocol].daily_users / days.length);
          
          // Aggregate previous week
          previousWeekResults.forEach((dayData) => {
            if (dayData[protocol]) {
              previousAggregatedData[protocol].total_volume_usd += dayData[protocol].total_volume_usd || 0;
              previousAggregatedData[protocol].daily_users += dayData[protocol].daily_users || 0;
              previousAggregatedData[protocol].numberOfNewUsers += dayData[protocol].numberOfNewUsers || 0;
              previousAggregatedData[protocol].daily_trades += dayData[protocol].daily_trades || 0;
              previousAggregatedData[protocol].total_fees_usd += dayData[protocol].total_fees_usd || 0;
            }
          });
          
          // Calculate average daily users for previous week
          previousAggregatedData[protocol].daily_users = Math.round(previousAggregatedData[protocol].daily_users / previousDays.length);
        });
        
        setWeeklyData(aggregatedData);
        setPreviousWeekData(previousAggregatedData);
        
        // Sort protocols by volume to find the top 3
        const sortedByVolume = Object.entries(aggregatedData)
          .filter(([_, metrics]) => metrics?.total_volume_usd > 0)
          .sort((a, b) => (b[1]?.total_volume_usd || 0) - (a[1]?.total_volume_usd || 0));
        
        // Set top 3 protocols
        const top3 = sortedByVolume.slice(0, 3).map(([protocol]) => protocol as Protocol);
        setTopProtocols(top3);
        
      } catch (error) {
        console.error('Error fetching weekly data:', error);
        setWeeklyData({});
        setPreviousWeekData({});
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeeklyData();
  }, [weekStart, protocols]);

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1);
    onWeekChange(newWeek);
  };

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

  const handleProtocolVisibility = (e: React.MouseEvent, protocol: string) => {
    e.stopPropagation();
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

  const downloadReport = async () => {
    const tableElement = document.querySelector('[data-table="weekly-metrics"]') as HTMLElement;
    
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
            width: tableElement.scrollWidth,
            height: tableElement.scrollHeight,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              width: tableElement.scrollWidth + 'px',
              height: tableElement.scrollHeight + 'px'
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
        link.download = `weekly-metrics-${format(weekStart, 'yyyy-MM-dd')}.png`;
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
    const tableElement = document.querySelector('[data-table="weekly-metrics"]') as HTMLElement;
    
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
            width: tableElement.scrollWidth,
            height: tableElement.scrollHeight,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              width: tableElement.scrollWidth + 'px',
              height: tableElement.scrollHeight + 'px'
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
          } catch (error) {
            // Handle error silently
          }
        }
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleWeekChange('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/30">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleWeekChange('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadReport}
            className="no-screenshot"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="no-screenshot"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border bg-card" data-table="weekly-metrics">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px] sticky left-0 z-20 bg-background">Protocol</TableHead>
              {orderedMetrics.map((metric, index) => (
                <TableHead
                  key={metric.key}
                  className={cn(
                    "relative cursor-move hover:bg-muted/50 transition-colors text-center",
                    draggedColumn === index && "opacity-50"
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center justify-center gap-1">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <span>{metric.label}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={orderedMetrics.length + 1} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-muted-foreground">Loading weekly data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              getMutableAllCategories().map(categoryName => {
                const categoryProtocols = getMutableProtocolsByCategory(categoryName);
                const isCollapsed = collapsedCategories.includes(categoryName);
                
                // Filter out hidden protocols
                const visibleCategoryProtocols = categoryProtocols
                  .filter(p => !hiddenProtocols.has(p.id));
                
                // Calculate category totals only for visible protocols
                const categoryTotals = orderedMetrics.reduce((acc, metric) => {
                  if (metric.key === 'weekly_growth' || metric.key === 'market_share') {
                    acc[metric.key] = 0;
                  } else {
                    acc[metric.key] = visibleCategoryProtocols.reduce((sum, protocol) => {
                      const data = weeklyData[protocol.id];
                      if (data) {
                        const value = metric.getValue ? metric.getValue(data as ProtocolMetrics) : data[metric.key as keyof WeeklyData] || 0;
                        return sum + value;
                      }
                      return sum;
                    }, 0);
                  }
                  return acc;
                }, {} as Record<MetricKey, number>);

                return (
                  <React.Fragment key={categoryName}>
                    <TableRow 
                      className={cn(
                        "cursor-pointer font-medium",
                        getCategoryRowColor(categoryName),
                        "transition-all duration-200"
                      )}
                      onClick={() => toggleCollapse(categoryName)}
                    >
                      <TableCell className="sticky left-0 z-10">
                        <div className="flex items-center gap-2">
                          <ChevronRight 
                            className={cn(
                              "h-4 w-4 transition-transform",
                              !isCollapsed && "rotate-90"
                            )}
                          />
                          <span className="font-semibold">{categoryName}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {visibleCategoryProtocols.length} protocols
                          </Badge>
                        </div>
                      </TableCell>
                      {orderedMetrics.map(metric => (
                        <TableCell key={metric.key} className="text-right font-semibold">
                          {formatValue(metric, categoryTotals[metric.key] || 0, true)}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    {!isCollapsed && categoryProtocols.map(protocol => {
                      const protocolData = weeklyData[protocol.id];
                      const isHidden = hiddenProtocols.has(protocol.id);
                      const isTopProtocol = topProtocols.includes(protocol.id as Protocol);
                      
                      return (
                        <TableRow 
                          key={protocol.id}
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            isHidden && "opacity-50",
                            isTopProtocol && "bg-yellow-50 dark:bg-yellow-900/10"
                          )}
                        >
                          <TableCell className="sticky left-0 z-10 bg-background">
                            <div className="flex items-center gap-2 pl-6">
                              <button
                                onClick={(e) => handleProtocolVisibility(e, protocol.id)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                              >
                                {isHidden ? (
                                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-3 w-3 text-muted-foreground" />
                                )}
                              </button>
                              <span className={cn(isHidden && "line-through")}>
                                {protocol.name}
                              </span>
                              {isTopProtocol && (
                                <Badge variant="outline" className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
                                  Top 3
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {orderedMetrics.map(metric => {
                            const value = protocolData 
                              ? (metric.getValue ? metric.getValue(protocolData as ProtocolMetrics) : protocolData[metric.key as keyof WeeklyData] || 0)
                              : 0;
                            
                            return (
                              <TableCell key={metric.key} className="text-right">
                                {formatValue(metric, value)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}