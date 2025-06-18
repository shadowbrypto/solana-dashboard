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

import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DatePicker } from "./DatePicker";
import { getDailyMetrics } from "../lib/protocol";
import { protocolCategories } from "../lib/protocol-categories";

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
  const [maxVolumeProtocol, setMaxVolumeProtocol] = useState<Protocol | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [dailyData, setDailyData] = useState<Record<Protocol, ProtocolMetrics>>({});
  const [previousDayData, setPreviousDayData] = useState<Record<Protocol, ProtocolMetrics>>({});
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnOrder, setColumnOrder] = useState<MetricKey[]>(["total_volume_usd", "daily_users", "numberOfNewUsers", "daily_trades", "market_share", "daily_growth" as MetricKey]);
  const [draggedProtocol, setDraggedProtocol] = useState<{ protocol: string; category: string } | null>(null);
  const [categoryProtocolOrder, setCategoryProtocolOrder] = useState<Record<string, string[]>>({});

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
      format: formatPercentage,
      getValue: (data) => (data?.total_volume_usd || 0) / (totalVolume || 1)
    },
    {
      key: "daily_growth" as MetricKey,
      label: "Daily Growth",
      format: (value, isCategory = false) => {
        const formatted = formatPercentage(Math.abs(value));
        const isPositive = value > 0;
        const sign = isPositive ? '+' : '-';
        
        return (
          <span className={isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {sign}{formatted}
          </span>
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

  // Initialize category protocol order on mount
  useEffect(() => {
    const initialOrder: Record<string, string[]> = {};
    protocolCategories.forEach(category => {
      initialOrder[category.name] = category.protocols.filter(p => protocols.includes(p as Protocol));
    });
    setCategoryProtocolOrder(initialOrder);
  }, [protocols]);

  // Category-based bright coloring using shadcn theme colors
  const getCategoryRowColor = (categoryName: string): string => {
    switch (categoryName) {
      case 'Telegram Bots':
        return 'bg-blue-200 dark:bg-blue-800/60 hover:bg-blue-300 dark:hover:bg-blue-700/70';
      case 'Trading Terminals':
        return 'bg-green-200 dark:bg-green-800/60 hover:bg-green-300 dark:hover:bg-green-700/70';
      case 'Mobile Apps':
        return 'bg-purple-200 dark:bg-purple-800/60 hover:bg-purple-300 dark:hover:bg-purple-700/70';
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
    }

    setDraggedProtocol(null);
  };

  const handleProtocolDragEnd = () => {
    setDraggedProtocol(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setMaxVolumeProtocol(null);
      try {
        const [currentData, previousData] = await Promise.all([
          getDailyMetrics(date),
          getDailyMetrics(new Date(date.getTime() - 24 * 60 * 60 * 1000))
        ]);
        // Sort protocols by volume to find the highest one
        const sortedByVolume = Object.entries(currentData)
          .filter(([_, metrics]) => metrics?.total_volume_usd > 0)
          .sort((a, b) => (b[1]?.total_volume_usd || 0) - (a[1]?.total_volume_usd || 0));
        
        console.log('Sorted volumes:', sortedByVolume.map(([p, m]) => ({ protocol: p, volume: m.total_volume_usd })));
        
        setDailyData(currentData);
        
        if (sortedByVolume.length > 0) {
          const topProtocol = sortedByVolume[0][0] as Protocol;
          console.log('Setting max volume protocol:', topProtocol);
          setMaxVolumeProtocol(topProtocol);
        } else {
          console.log('No protocols with volume found');
        }
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
    <div className="space-y-4 rounded-xl border bg-gradient-to-b from-background to-muted/20 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-lg font-semibold text-foreground">Protocol Metrics</h3>
        <div className="w-[240px]">
          <DatePicker date={date} onDateChange={handleDateChange} />
        </div>
      </div>

      <div className="rounded-xl border bg-gradient-to-b from-background to-muted/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px] py-0.5">Protocol</TableHead>
              {orderedMetrics.map((metric, index) => (
                <TableHead 
                  key={metric.key} 
                  className={`text-right py-0.5 cursor-move select-none transition-colors hover:bg-muted/50 ${
                    draggedColumn === index ? 'opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center gap-2 justify-end">
                    <span>{metric.label}</span>
                    <GripVertical className="w-3 h-3 opacity-50" />
                  </div>
                </TableHead>
              ))}
            </TableRow>

          </TableHeader>
          <TableBody>
            {protocolCategories.map((category) => {
              const orderedProtocols = categoryProtocolOrder[category.name] || category.protocols.filter(p => protocols.includes(p as Protocol));
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
                } else if (metric.key !== 'market_share') {
                  acc[metric.key] = orderedProtocols
                    .reduce((sum, p) => sum + (dailyData[p as Protocol]?.[metric.key as keyof ProtocolMetrics] || 0), 0);
                }
                return acc;
              }, {} as Record<MetricKey, number>);

              return (
                <React.Fragment key={category.name}>
                  {/* Category Header */}
                  <TableRow 
                    className="bg-muted/50 border-t hover:bg-muted/60 cursor-pointer" 
                    onClick={toggleCollapse}
                  >
                    <TableCell className="font-semibold text-sm tracking-wide py-4">
                      <div className="flex items-center gap-2">
                        <ChevronRight 
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            !isCollapsed ? 'rotate-90' : ''
                          }`}
                        />
                        {category.name}
                      </div>
                    </TableCell>
                    {orderedMetrics.map((metric) => (
                      <TableCell 
                        key={metric.key} 
                        className="text-right font-medium py-0.5"
                      >
                        <span>
                          {metric.key === 'daily_growth'
                            ? metric.format(categoryTotals[metric.key])
                            : metric.getValue
                              ? metric.format(metric.getValue(categoryTotals as ProtocolMetrics))
                              : metric.format(categoryTotals[metric.key] || 0)}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Protocol Rows */}
                  {orderedProtocols.map((protocol) => (
                    <TableRow 
                      key={protocol} 
                      className={`${isCollapsed ? 'hidden' : ''} transition-colors ${getCategoryRowColor(category.name)} ${
                        draggedProtocol?.protocol === protocol ? 'opacity-50' : ''
                      } cursor-move`}
                      draggable
                      onDragStart={(e) => handleProtocolDragStart(e, protocol, category.name)}
                      onDragOver={handleProtocolDragOver}
                      onDrop={(e) => handleProtocolDrop(e, protocol, category.name)}
                      onDragEnd={handleProtocolDragEnd}
                    >
                      <TableCell className="pl-6 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 opacity-50" />
                          {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
                        </div>
                      </TableCell>
                      {orderedMetrics.map((metric) => (
                        <TableCell 
                          key={metric.key} 
                          className={`text-right py-0.5 ${metric.key === 'daily_growth'
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
              <TableCell className="font-medium">
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
                    className="text-right font-bold"
                  >
                    {metric.format(total)}
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
