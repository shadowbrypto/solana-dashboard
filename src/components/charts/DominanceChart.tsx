import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { useState, useMemo, useEffect } from "react";
import { ComponentActions } from '../ComponentActions';
import { TimeframeSelector, type TimeFrame } from '../ui/timeframe-selector';
import { DateRangeSelector } from '../ui/DateRangeSelector';
import { subDays, startOfDay, endOfDay } from 'date-fns';

import { StackedBarChartSkeleton } from "./StackedBarChartSkeleton";

interface DominanceChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  dataKeys: string[];
  labels: string[];
  colors?: string[];
  xAxisKey?: string;
  loading?: boolean;
  timeframe?: TimeFrame;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
  disableTimeframeSelector?: boolean;
  defaultDisabledKeys?: string[];
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function DominanceChart({ 
  title, 
  subtitle,
  data,
  dataKeys,
  labels,
  colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
  xAxisKey = "formattedDay",
  loading,
  timeframe: externalTimeframe,
  onTimeframeChange,
  disableTimeframeSelector = false,
  defaultDisabledKeys = [],
}: DominanceChartProps) {
  if (loading) {
    return <StackedBarChartSkeleton />;
  }

  const [internalTimeframe, setInternalTimeframe] = useState<TimeFrame>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? "30d" : "3m";
    }
    return "30d";
  });
  const [disabledKeys, setDisabledKeys] = useState<string[]>(defaultDisabledKeys);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => startOfDay(subDays(new Date(), 90)));
  const [customEndDate, setCustomEndDate] = useState(() => endOfDay(new Date()));
  
  // Handle window resize for responsive timeframe
  useEffect(() => {
    const handleResize = () => {
      if (!externalTimeframe && typeof window !== 'undefined') {
        const newTimeframe = window.innerWidth < 640 ? "30d" : "3m";
        setInternalTimeframe(newTimeframe);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [externalTimeframe]);
  
  // Use external timeframe if provided, otherwise use internal
  const timeframe = externalTimeframe || internalTimeframe;
  
  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe);
    } else {
      setInternalTimeframe(newTimeframe);
    }
    
    setIsCustomRange(false); // Switch to predefined timeframe mode
    
    // Update custom date range to match the selected timeframe
    const now = new Date();
    let daysToSubtract: number;
    
    switch (newTimeframe) {
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
  };

  // Transform data to percentages with proper legend filtering
  const filteredData = useMemo(() => {
    // First filter by timeframe
    let timeFilteredData = data;
    
    if (isCustomRange) {
      // Apply custom date range filter
      timeFilteredData = data.filter((item) => {
        const [day, month, year] = item.formattedDay.split("-");
        const itemDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        return itemDate >= customStartDate && itemDate <= customEndDate;
      });
    } else {
      // Apply predefined timeframe filter
      if (timeframe !== "all") {
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

        timeFilteredData = data.filter(item => {
          const [day, month, year] = item.formattedDay.split("-");
          const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return itemDate >= cutoffDate;
        });
      }
    }

    // Convert absolute values to percentages, excluding disabled keys from total calculation
    return timeFilteredData.map(item => {
      // Calculate total only from enabled keys
      const enabledKeys = dataKeys.filter(key => !disabledKeys.includes(key));
      const total = enabledKeys.reduce((sum, key) => sum + (item[key] || 0), 0);
      
      const dominanceItem: any = {
        formattedDay: item.formattedDay,
        date: item.date
      };

      dataKeys.forEach(key => {
        if (disabledKeys.includes(key)) {
          dominanceItem[key] = 0;
        } else if (total > 0) {
          dominanceItem[key] = ((item[key] || 0) / total) * 100;
        } else {
          dominanceItem[key] = 0;
        }
      });

      return dominanceItem;
    });
  }, [data, timeframe, dataKeys, disabledKeys, isCustomRange, customStartDate, customEndDate]);

  return (
    <ComponentActions 
      componentName={`${title} Dominance Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Dominance_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="flex flex-col border-b gap-3 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">{title}</CardTitle>
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                  {(() => {
                    // Check if subtitle is a protocol name
                    const protocolMatch = protocolConfigs.find(p => p.name === subtitle);
                    if (protocolMatch) {
                      return (
                        <>
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                            <img 
                              src={`/assets/logos/${getProtocolLogoFilename(protocolMatch.id)}`}
                              alt={subtitle} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const container = target.parentElement;
                                if (container) {
                                  container.innerHTML = '';
                                  container.className = 'w-3 h-3 sm:w-4 sm:h-4 bg-muted/20 rounded flex items-center justify-center';
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
              <div className="flex items-center gap-1 sm:gap-2">
                <TimeframeSelector 
                  value={timeframe}
                  className="text-xs"
                  onChange={handleTimeframeChange}
                />
                
                {/* Date Range Toggle Button */}
                <button
                  onClick={() => setShowDateRangeSelector(!showDateRangeSelector)}
                  className={`inline-flex items-center justify-center rounded-md px-2 py-1 sm:py-1.5 text-xs font-medium bg-muted transition-colors duration-200 ${
                    showDateRangeSelector
                      ? 'bg-background text-foreground shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  }`}
                  title={`${showDateRangeSelector ? 'Hide' : 'Show'} date range selector`}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showDateRangeSelector ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"} />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-1 px-1 sm:pt-6 sm:pb-6 sm:px-6">
          <ResponsiveContainer width="100%" height={400} className="h-[300px] sm:h-[400px]">
            <RechartsAreaChart data={filteredData} margin={{ top: 20, right: 10, left: 5, bottom: 8 }}>
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
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
                interval="preserveStartEnd"
                tickCount={Math.min(5, filteredData.length)}
                tickFormatter={(value) => {
                  const [day, month] = value.split('-');
                  const date = new Date(2025, parseInt(month) - 1, parseInt(day));
                  return date.toLocaleDateString('en-US', { 
                    day: 'numeric', 
                    month: 'short' 
                  });
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                domain={[0, 100]}
                width={45}
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
                                    {labels[dataKeyIndex]}: {formatPercentage(entry.value || 0)}
                                  </span>
                                </div>
                              );
                            })}
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
                  return (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="1"
                      stroke={colors[originalIndex]}
                      fill={colors[originalIndex]}
                      fillOpacity={0.8}
                      strokeWidth={2}
                      name={labels[originalIndex]}
                    />
                  );
                })}
              <Legend
                verticalAlign="bottom"
                height={28}
                iconType="circle"
                iconSize={7}
                wrapperStyle={{
                  paddingTop: "4px"
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
                      className={`text-[7px] sm:text-sm text-muted-foreground cursor-pointer select-none ${disabledKeys.includes(dataKey) ? 'opacity-50 line-through' : ''}`}
                    >
                      {value}
                    </span>
                  );
                }}
              />
            </RechartsAreaChart>
          </ResponsiveContainer>
          
          {/* Date range selector - animated smooth reveal */}
          <div 
            className={`transition-all duration-200 ease-out ${
              showDateRangeSelector 
                ? 'max-h-96 opacity-100 mt-2 pt-3 sm:mt-6 sm:pt-6 border-t border-border' 
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
              dataKey={dataKeys[0]}
            />
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}