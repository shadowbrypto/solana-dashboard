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
    <div className="space-y-4 rounded-xl border border-border/40 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-lg font-semibold">Protocol Metrics</h3>
        <div className="w-[240px]">
          <DatePicker date={date} onDateChange={handleDateChange} />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px] py-0.5">Protocol</TableHead>
              {metrics.map((metric) => (
                <TableHead key={metric.key} className="text-right py-0.5">
                  {metric.label}
                </TableHead>
              ))}
            </TableRow>

          </TableHeader>
          <TableBody>
            {protocolCategories.map((category) => {
              const categoryProtocols = category.protocols.filter(p => protocols.includes(p as Protocol));
              if (categoryProtocols.length === 0) return null;
              
              const isCollapsed = collapsedCategories.includes(category.name);
              const toggleCollapse = () => {
                setCollapsedCategories(prev =>
                  prev.includes(category.name)
                    ? prev.filter(c => c !== category.name)
                    : [...prev, category.name]
                );
              };

              // Calculate category totals for current day
              const categoryTotals = metrics.reduce((acc, metric) => {
                if (metric.key === 'daily_growth') {
                  const currentVolume = categoryProtocols
                    .reduce((sum, p) => sum + (dailyData[p as Protocol]?.total_volume_usd || 0), 0);
                  const previousVolume = categoryProtocols
                    .reduce((sum, p) => sum + (previousDayData[p as Protocol]?.total_volume_usd || 0), 0);
                  acc[metric.key] = previousVolume === 0 ? 0 : (currentVolume - previousVolume) / previousVolume;
                } else if (metric.key !== 'market_share') {
                  acc[metric.key] = categoryProtocols
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
                    <TableCell className="font-semibold text-sm uppercase tracking-wide py-4">
                      {category.name}
                    </TableCell>
                    {metrics.map((metric) => (
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
                  {categoryProtocols.map((protocol) => (
                    <TableRow 
                      key={protocol} 
                      className={`${isCollapsed ? 'hidden' : ''} transition-colors ${
                        protocol === maxVolumeProtocol 
                          ? 'bg-green-200 dark:bg-green-900/50 hover:bg-green-300 dark:hover:bg-green-800/70' 
                          : 'hover:bg-muted/20'
                      }`}
                    >
                      <TableCell className="pl-6 text-muted-foreground">
                        {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
                      </TableCell>
                      {metrics.map((metric) => (
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
              {metrics.map((metric) => {
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
