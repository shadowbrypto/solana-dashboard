import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import { Badge } from "../ui/badge";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { useState, useMemo } from "react";
import { ComponentActions } from '../ComponentActions';
import { TimeframeSelector, type TimeFrame } from '../ui/timeframe-selector';
import { DateRangeSelector } from '../ui/DateRangeSelector';
import { subDays, startOfDay, endOfDay } from 'date-fns';

import { StackedBarChartSkeleton } from "./StackedBarChartSkeleton";

interface StackedBarChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  dataKeys: string[];
  labels: string[];
  colors?: string[];
  xAxisKey?: string;
  valueFormatter?: (value: number) => string;
  loading?: boolean;
  timeframe?: TimeFrame;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
  disableTimeframeSelector?: boolean;
  defaultDisabledKeys?: string[];
  timelineDataKey?: string;
}

function formatNumberWithSuffix(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

export function StackedBarChart({ 
  title, 
  subtitle,
  data,
  dataKeys,
  labels,
  colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
  xAxisKey = "formattedDay",
  valueFormatter = (value: number) => `${value.toLocaleString()}`,
  loading,
  timeframe: externalTimeframe,
  onTimeframeChange,
  disableTimeframeSelector = false,
  defaultDisabledKeys = [],
  timelineDataKey,
}: StackedBarChartProps) {
  if (loading) {
    return <StackedBarChartSkeleton />;
  }

  const [internalTimeframe, setInternalTimeframe] = useState<TimeFrame>("3m");
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => startOfDay(subDays(new Date(), 90)));
  const [customEndDate, setCustomEndDate] = useState(() => endOfDay(new Date()));
  const [disabledKeys, setDisabledKeys] = useState<string[]>(defaultDisabledKeys);
  
  // Use external timeframe if provided, otherwise use internal
  const timeframe = externalTimeframe || internalTimeframe;
  
  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe);
    } else {
      setInternalTimeframe(newTimeframe);
    }
  };

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Create a copy of the data array (already sorted chronologically)
    const sortedData = [...data];
    let timeFilteredData = sortedData;

    if (isCustomRange) {
      // Apply custom date range filter
      timeFilteredData = sortedData.filter((item) => {
        const [day, month, year] = item.formattedDay.split("-");
        const itemDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        return itemDate >= customStartDate && itemDate <= customEndDate;
      });
    } else if (timeframe !== "all") {
      const now = new Date();
      let daysToSubtract: number;

      switch (timeframe) {
        case "7d":
          daysToSubtract = 7;
          break;
        case "30d":
          daysToSubtract = 30;
          break;
        case "3m":
          daysToSubtract = 90;
          break;
        case "6m":
          daysToSubtract = 180;
          break;
        case "1y":
          daysToSubtract = 365;
          break;
        default:
          daysToSubtract = 90;
      }

      const cutoffDate = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));

      timeFilteredData = sortedData.filter(item => {
        const [day, month, year] = item.formattedDay.split("-");
        const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return itemDate >= cutoffDate;
      });
    }

    // Then handle disabled keys by setting their values to 0
    if (disabledKeys.length === 0) {
      return timeFilteredData;
    }

    return timeFilteredData.map(item => {
      const modifiedItem = { ...item };
      disabledKeys.forEach(key => {
        modifiedItem[key] = 0;
      });
      return modifiedItem;
    });
  }, [data, timeframe, isCustomRange, customStartDate, customEndDate, disabledKeys]);

  return (
    <ComponentActions 
      componentName={`${title} Stacked Bar Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Stacked_Bar_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b gap-3 sm:gap-0">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {(() => {
                  // Check if subtitle is a protocol name
                  const protocolMatch = protocolConfigs.find(p => p.name === subtitle);
                  if (protocolMatch) {
                    return (
                      <>
                        <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                          <img 
                            src={`/assets/logos/${getProtocolLogoFilename(protocolMatch.id)}`}
                            alt={subtitle} 
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
                        {subtitle}
                      </>
                    );
                  }
                  return subtitle;
                })()}
              </p>
            )}
          </div>
          {!disableTimeframeSelector && (
            <div className="flex items-center gap-2">
              <TimeframeSelector 
                value={timeframe}
                onChange={(value) => {
                  if (onTimeframeChange) {
                    onTimeframeChange(value);
                  } else {
                    setInternalTimeframe(value);
                  }
                  setIsCustomRange(false); // Switch to predefined timeframe mode
                  
                  // Update custom date range to match the selected timeframe
                  const now = new Date();
                  let daysToSubtract: number;
                  
                  switch (value) {
                    case "7d":
                      daysToSubtract = 7;
                      break;
                    case "30d":
                      daysToSubtract = 30;
                      break;
                    case "3m":
                      daysToSubtract = 90;
                      break;
                    case "6m":
                      daysToSubtract = 180;
                      break;
                    case "1y":
                      daysToSubtract = 365;
                      break;
                    default:
                      // For "all", use the full data range
                      if (data.length > 0) {
                        const dates = data.map(item => {
                          const [day, month, year] = item.formattedDay.split("-");
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        });
                        const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
                        setCustomStartDate(startOfDay(earliestDate));
                        setCustomEndDate(endOfDay(now));
                        return;
                      }
                      daysToSubtract = 90;
                  }
                  
                  const newStartDate = startOfDay(new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000));
                  setCustomStartDate(newStartDate);
                  setCustomEndDate(endOfDay(now));
                }}
              />
              
              {/* Date Range Toggle Button */}
              <div className="relative inline-flex items-center rounded-lg bg-muted p-1 min-w-fit">
                <button
                  onClick={() => setShowDateRangeSelector(!showDateRangeSelector)}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                    showDateRangeSelector
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={`${showDateRangeSelector ? 'Hide' : 'Show'} date range selector`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showDateRangeSelector ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"} />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="transition-all duration-500 ease-out">
            <ResponsiveContainer width="100%" height={400}>
              <RechartsBarChart data={filteredData} margin={{ top: 20, right: 30, left: 0, bottom: 12 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey={xAxisKey}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                interval="preserveStartEnd"
                tickCount={Math.min(8, filteredData.length)}
                tickFormatter={(value) => {
                  const [day, month] = value.split('-');
                  const date = new Date(2025, parseInt(month) - 1, parseInt(day));
                  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(value) => formatNumberWithSuffix(value)}
              />
              <Tooltip
                content={({ active, payload, label }: TooltipProps<number, string>) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            {(() => {
                              const [day, month, year] = label.split('-');
                              return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              });
                            })()}
                          </div>
                          <div className="space-y-1">
                            {payload.map((entry) => {
                              // Find the correct index in dataKeys for this entry
                              const dataKeyIndex = dataKeys.indexOf(entry.dataKey as string);
                              return (
                                <div key={entry.dataKey} className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-lg" 
                                    style={{ backgroundColor: colors[dataKeyIndex] }}
                                  />
                                  <span className="text-sm text-foreground">
                                    {labels[dataKeyIndex]}: <span className="font-mono">{entry.name?.toString().includes('volume') ? valueFormatter(entry.value || 0) : formatNumberWithSuffix(entry.value || 0)}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="bg-muted-foreground/20 rounded px-2 py-1 mt-0">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="text-foreground font-mono">
                                {(() => {
                                  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
                                  return payload[0]?.name?.toString().includes('volume') ? valueFormatter(total) : formatNumberWithSuffix(total);
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
              />
              {dataKeys
                .filter(key => !disabledKeys.includes(key))
                .map((key, index) => {
                  const originalIndex = dataKeys.indexOf(key);
                  const isLastEnabled = index === dataKeys.filter(k => !disabledKeys.includes(k)).length - 1;
                  return (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={colors[originalIndex]}
                      radius={isLastEnabled ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      name={labels[originalIndex]}
                    />
                  );
                })}
              <Legend
                verticalAlign="bottom"
                height={32}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  paddingTop: "12px"
                }}
                payload={dataKeys.map((key, index) => ({
                  value: labels[index],
                  type: 'circle',
                  color: disabledKeys.includes(key) ? 'hsl(var(--muted-foreground))' : colors[index],
                  dataKey: key
                }))}
                onClick={(e) => {
                  if (e && typeof e.dataKey === 'string') {
                    setDisabledKeys((prev: string[]) => 
                      prev.includes(e.dataKey as string)
                        ? prev.filter(key => key !== e.dataKey)
                        : [...prev, e.dataKey as string]
                    );
                  }
                }}
                formatter={(value, entry) => {
                  const dataKey = typeof entry.dataKey === 'string' ? entry.dataKey : '';
                  return (
                    <span 
                      className={`text-sm text-muted-foreground cursor-pointer select-none ${disabledKeys.includes(dataKey) ? 'opacity-50 line-through' : ''}`}
                    >
                      {value}
                    </span>
                  );
                }}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
          </div>
          
          {/* Date range selector - animated smooth reveal */}
          {!disableTimeframeSelector && (
            <div 
              className={`transition-all duration-200 ease-out ${
                showDateRangeSelector 
                  ? 'max-h-96 opacity-100 mt-6 pt-6 border-t border-border' 
                  : 'max-h-0 opacity-0 overflow-hidden'
              }`}
            >
              <DateRangeSelector
                startDate={customStartDate}
                endDate={customEndDate}
                onRangeChange={(start, end) => {
                  setCustomStartDate(start);
                  setCustomEndDate(end);
                  setIsCustomRange(true); // Switch to custom range mode
                }}
                minDate={(() => {
                  // Find the earliest date in the data
                  if (data.length === 0) return undefined;
                  const dates = data.map(item => {
                    const [day, month, year] = item.formattedDay.split("-");
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  });
                  return new Date(Math.min(...dates.map(d => d.getTime())));
                })()}
                maxDate={new Date()}
                data={data}
                dataKey={timelineDataKey || dataKeys[0]} // Use specified timeline key or fallback to first
              />
            </div>
          )}
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
