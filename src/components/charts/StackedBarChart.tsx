import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { formatCurrency, formatNumber } from "../../lib/utils";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import { ProtocolLogo } from '../ui/logo-with-fallback';
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
import { useState, useMemo, useEffect } from "react";
import { ComponentActions } from '../ComponentActions';
import { TimeframeSelector, type TimeFrame } from '../ui/timeframe-selector';
import { DateRangeSelector } from '../ui/DateRangeSelector';
import { subDays, startOfDay, endOfDay } from 'date-fns';

import { StackedBarChartSkeleton } from "./StackedBarChartSkeleton";

interface StackedBarChartProps {
  title?: string;
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
  hideHeader?: boolean;
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
  hideHeader = false,
}: StackedBarChartProps) {
  // For hideHeader mode, show simple loading or render chart directly
  // For normal mode, show full skeleton
  if (loading && !hideHeader) {
    return <StackedBarChartSkeleton />;
  }

  const [internalTimeframe, setInternalTimeframe] = useState<TimeFrame>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? "30d" : "3m";
    }
    return "30d";
  });
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => startOfDay(subDays(new Date(), 90)));
  const [customEndDate, setCustomEndDate] = useState(() => endOfDay(new Date()));
  const [disabledKeys, setDisabledKeys] = useState<string[]>(defaultDisabledKeys);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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

  // When hideHeader is true, render just the chart without any Card wrapper
  if (hideHeader) {
    // Show simple loading state without Card wrapper
    if (loading) {
      return (
        <div className={`${isDesktop ? "h-[500px]" : "h-[250px] sm:h-[400px]"} flex items-center justify-center`}>
          <div className="text-muted-foreground text-sm">Loading chart...</div>
        </div>
      );
    }

    return (
      <div className="transition-all duration-500 ease-out">
        <ResponsiveContainer width="100%" height={isDesktop ? 500 : 400} className={isDesktop ? "h-[500px]" : "h-[250px] sm:h-[400px]"}>
          <RechartsBarChart
            data={filteredData}
            margin={{ top: 20, right: 10, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.2}
              vertical={false}
              fill="none"
            />
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isDesktop ? 12 : 9 }}
              interval={isDesktop ? Math.max(1, Math.floor(filteredData.length / 8)) : "preserveStartEnd"}
              tickCount={isDesktop ? Math.min(8, filteredData.length) : Math.min(7, filteredData.length)}
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
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isDesktop ? 12 : 9 }}
              tickFormatter={(value) => formatNumber(value)}
              width={isDesktop ? 55 : 45}
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
                            const dataKeyIndex = dataKeys.indexOf(entry.dataKey as string);
                            return (
                              <div key={entry.dataKey} className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-lg"
                                  style={{ backgroundColor: colors[dataKeyIndex] }}
                                />
                                <span className="text-sm text-foreground">
                                  {labels[dataKeyIndex]}: <span className="font-mono">{entry.name?.toString().includes('volume') ? valueFormatter(entry.value || 0) : formatNumber(entry.value || 0)}</span>
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
                                return payload[0]?.name?.toString().includes('volume') ? valueFormatter(total) : formatNumber(total);
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
              cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            />
            {dataKeys
              .filter(key => !disabledKeys.includes(key))
              .map((key, index) => {
                const originalIndex = dataKeys.indexOf(key);
                const isLastEnabled = index === dataKeys.filter(k => !disabledKeys.includes(k)).length - 1;
                const isHovered = hoveredBar === key;
                const hasHoveredBar = hoveredBar !== null;

                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={colors[originalIndex]}
                    fillOpacity={hasHoveredBar ? (isHovered ? 1 : 0.3) : 1}
                    radius={isLastEnabled ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    name={labels[originalIndex]}
                    onMouseEnter={() => setHoveredBar(key)}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{
                      transition: 'fill-opacity 0.2s ease-in-out',
                      cursor: 'pointer'
                    }}
                  />
                );
              })}
            <Legend
              verticalAlign="bottom"
              height={dataKeys.length > 6 ? (isDesktop ? Math.ceil(dataKeys.length / 5) * 14 : Math.ceil(dataKeys.length / 3) * 24) : 28}
              iconType="circle"
              iconSize={8}
              content={(props) => {
                const { payload } = props;
                if (!payload) return null;

                return (
                  <ul style={{
                    paddingTop: "2px",
                    fontSize: isDesktop ? "12px" : "11px",
                    lineHeight: isDesktop ? "14px" : "16px",
                    marginBottom: "0px",
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {payload.map((entry, index) => {
                      const dataKey = entry.dataKey as string;
                      const isHovered = hoveredBar === dataKey;
                      const hasHoveredBar = hoveredBar !== null;
                      const isDisabled = disabledKeys.includes(dataKey);

                      return (
                        <li
                          key={`item-${index}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            marginRight: isDesktop ? '16px' : '12px',
                            marginBottom: isDesktop ? '2px' : '4px',
                            maxWidth: isDesktop ? '200px' : '120px',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={() => setHoveredBar(dataKey)}
                          onMouseLeave={() => setHoveredBar(null)}
                          onClick={() => {
                            setDisabledKeys((prev: string[]) =>
                              prev.includes(dataKey)
                                ? prev.filter(key => key !== dataKey)
                                : [...prev, dataKey]
                            );
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: isDisabled ? 'hsl(var(--muted-foreground))' : entry.color,
                              marginRight: '6px',
                              opacity: hasHoveredBar ? (isHovered ? 1 : 0.3) : 1,
                              transition: 'opacity 0.2s ease-in-out'
                            }}
                          />
                          <span
                            className={`text-[10px] sm:text-sm text-muted-foreground select-none ${isDisabled ? 'opacity-50 line-through' : ''}`}
                            style={{
                              display: 'inline-block',
                              verticalAlign: 'middle',
                              maxWidth: isDesktop ? '140px' : '80px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              opacity: hasHoveredBar ? (isHovered ? 1 : 0.4) : 1,
                              fontWeight: isHovered ? 600 : 400,
                              transition: 'opacity 0.2s ease-in-out, font-weight 0.2s ease-in-out'
                            }}
                          >
                            {entry.value}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <ComponentActions
      componentName={`${title || 'Chart'} Stacked Bar Chart`}
      filename={`${(title || 'Chart').replace(/\s+/g, '_')}_Stacked_Bar_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="flex flex-col border-b gap-3 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">
              <span className="sm:hidden">{(title || '').replace(/ by Category/i, '').replace(/ by Protocol/i, '')}</span>
              <span className="hidden sm:inline">{title || ''}</span>
            </CardTitle>
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                  {(() => {
                    // Check if subtitle is a protocol name
                    const protocolMatch = protocolConfigs.find(p => p.name === subtitle);
                    if (protocolMatch) {
                      return (
                        <>
                          <ProtocolLogo
                            src={`/assets/logos/${getProtocolLogoFilename(protocolMatch.id)}`}
                            alt={subtitle}
                            size="sm"
                          />
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
              
              {/* Date Range Toggle Button - Hidden on mobile */}
              <div className="relative hidden sm:inline-flex items-center rounded-lg bg-muted p-1 min-w-fit">
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
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-1 px-2 sm:pt-6 sm:pb-6 sm:px-6">
          <div className="transition-all duration-500 ease-out">
            <ResponsiveContainer width="100%" height={isDesktop ? 500 : 400} className={isDesktop ? "h-[500px]" : "h-[250px] sm:h-[400px]"}>
              <RechartsBarChart 
                data={filteredData} 
                margin={{ top: 20, right: 10, left: 5, bottom: 5 }}
              >
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
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isDesktop ? 12 : 9 }}
                interval={isDesktop ? Math.max(1, Math.floor(filteredData.length / 8)) : "preserveStartEnd"}
                tickCount={isDesktop ? Math.min(8, filteredData.length) : Math.min(7, filteredData.length)}
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
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isDesktop ? 12 : 9 }}
                tickFormatter={(value) => formatNumber(value)}
                width={isDesktop ? 55 : 45}
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
                                    {labels[dataKeyIndex]}: <span className="font-mono">{entry.name?.toString().includes('volume') ? valueFormatter(entry.value || 0) : formatNumber(entry.value || 0)}</span>
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
                                  return payload[0]?.name?.toString().includes('volume') ? valueFormatter(total) : formatNumber(total);
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
                  const isHovered = hoveredBar === key;
                  const hasHoveredBar = hoveredBar !== null;
                  
                  return (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={colors[originalIndex]}
                      fillOpacity={hasHoveredBar ? (isHovered ? 1 : 0.3) : 1}
                      radius={isLastEnabled ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      name={labels[originalIndex]}
                      onMouseEnter={() => setHoveredBar(key)}
                      onMouseLeave={() => setHoveredBar(null)}
                      style={{
                        transition: 'fill-opacity 0.2s ease-in-out',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              <Legend
                verticalAlign="bottom"
                height={dataKeys.length > 6 ? (isDesktop ? Math.ceil(dataKeys.length / 5) * 14 : Math.ceil(dataKeys.length / 3) * 24) : 28}
                iconType="circle"
                iconSize={8}
                content={(props) => {
                  const { payload } = props;
                  if (!payload) return null;
                  
                  return (
                    <ul style={{
                      paddingTop: "2px",
                      fontSize: isDesktop ? "12px" : "11px",
                      lineHeight: isDesktop ? "14px" : "16px",
                      marginBottom: "0px",
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      listStyle: 'none',
                      padding: 0,
                      margin: 0
                    }}>
                      {payload.map((entry, index) => {
                        const dataKey = entry.dataKey as string;
                        const isHovered = hoveredBar === dataKey;
                        const hasHoveredBar = hoveredBar !== null;
                        const isDisabled = disabledKeys.includes(dataKey);
                        
                        return (
                          <li
                            key={`item-${index}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              marginRight: isDesktop ? '16px' : '12px',
                              marginBottom: isDesktop ? '2px' : '4px',
                              maxWidth: isDesktop ? '200px' : '120px',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={() => setHoveredBar(dataKey)}
                            onMouseLeave={() => setHoveredBar(null)}
                            onClick={() => {
                              setDisabledKeys((prev: string[]) => 
                                prev.includes(dataKey)
                                  ? prev.filter(key => key !== dataKey)
                                  : [...prev, dataKey]
                              );
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: isDisabled ? 'hsl(var(--muted-foreground))' : entry.color,
                                marginRight: '6px',
                                opacity: hasHoveredBar ? (isHovered ? 1 : 0.3) : 1,
                                transition: 'opacity 0.2s ease-in-out'
                              }}
                            />
                            <span
                              className={`text-[10px] sm:text-sm text-muted-foreground select-none ${isDisabled ? 'opacity-50 line-through' : ''}`}
                              style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                maxWidth: isDesktop ? '140px' : '80px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: hasHoveredBar ? (isHovered ? 1 : 0.4) : 1,
                                fontWeight: isHovered ? 600 : 400,
                                transition: 'opacity 0.2s ease-in-out, font-weight 0.2s ease-in-out'
                              }}
                            >
                              {entry.value}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
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
                dataKey={timelineDataKey || dataKeys[0]} // Use specified timeline key or fallback to first
              />
            </div>
          )}
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
