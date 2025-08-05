import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import { ProtocolStats, ProtocolMetrics } from '../../types/protocol';
import { ComponentActions } from '../ComponentActions';
import { TimeframeSelector, type TimeFrame } from '../ui/timeframe-selector';
import { DateRangeSelector } from '../ui/date-range-selector';
import { subDays, startOfDay, endOfDay } from 'date-fns';

type ChartDataKey = string;

import { TimelineChartSkeleton } from "./TimelineChartSkeleton";

interface TimelineChartProps {
  title: string;
  subtitle?: string;
  data: Array<ProtocolStats & { formattedDay: string }>;
  dataKey: string;
  multipleDataKeys?: Record<string, string>;
  isMultiLine?: boolean;
  color?: string;
  valueFormatter?: (value: number) => string;
  loading?: boolean;
}

// Color themes from shadcn/ui charts
const PALETTE_COLORS = [
  { stroke: "hsl(4 86% 58%)", fill: "hsl(4 86% 58% / 0.2)" }, // Red
  { stroke: "hsl(172 66% 50%)", fill: "hsl(172 66% 50% / 0.2)" }, // Cyan
  { stroke: "hsl(262 83% 58%)", fill: "hsl(262 83% 58% / 0.2)" }, // Purple
  { stroke: "hsl(316 73% 52%)", fill: "hsl(316 73% 52% / 0.2)" }, // Pink
  { stroke: "hsl(221 83% 53%)", fill: "hsl(221 83% 53% / 0.2)" }, // Blue
];

const MIDNIGHT_THEME = {
  stroke: "hsl(var(--primary))",
  fill: "hsl(var(--primary))",
};

export function TimelineChart({
  title,
  subtitle,
  data,
  dataKey,
  multipleDataKeys,
  isMultiLine = false,
  color = "hsl(var(--chart-1))",
  valueFormatter,
  loading,
}: TimelineChartProps) {
  if (loading) {
    return <TimelineChartSkeleton />;
  }

  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => startOfDay(subDays(new Date(), 90)));
  const [customEndDate, setCustomEndDate] = useState(() => endOfDay(new Date()));
  const [selectedDataKeys, setSelectedDataKeys] = useState<Set<ChartDataKey>>(
    new Set(multipleDataKeys ? Object.values(multipleDataKeys) : [dataKey])
  );

  const filteredData = useMemo(() => {
    let processedData = [...data];

    if (isCustomRange) {
      // Apply custom date range filter
      processedData = processedData.filter((item) => {
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

        const cutoffDate = new Date(
          now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000
        );

        processedData = processedData.filter((item) => {
          const [day, month, year] = item.formattedDay.split("-");
          const itemDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
          );
          return itemDate >= cutoffDate;
        });
      }
    }

    // Sort data in chronological order if it's not a multi-line chart
    if (!isMultiLine) {
      processedData = processedData.sort((a, b) => {
        const [dayA, monthA, yearA] = a.formattedDay.split("-");
        const [dayB, monthB, yearB] = b.formattedDay.split("-");
        const dateA = new Date(
          parseInt(yearA),
          parseInt(monthA) - 1,
          parseInt(dayA)
        );
        const dateB = new Date(
          parseInt(yearB),
          parseInt(monthB) - 1,
          parseInt(dayB)
        );
        return dateA.getTime() - dateB.getTime(); // Changed to ascending order
      });
    }

    return processedData;
  }, [data, timeframe, isCustomRange, customStartDate, customEndDate]);

  return (
    <ComponentActions 
      componentName={`${title} Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b gap-3 sm:gap-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium text-card-foreground">
            {title}
          </CardTitle>
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
        <div className="flex items-center gap-2">
          <TimeframeSelector 
            value={timeframe}
            onChange={(value) => {
              setTimeframe(value);
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
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showDateRangeSelector ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
              </svg>
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
          <AreaChart
            data={filteredData}
            margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              {isMultiLine ? (
                Object.entries(multipleDataKeys || {}).map(
                  ([name, key], index) => (
                    <linearGradient
                      key={key}
                      id={`gradient-${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={
                          PALETTE_COLORS[index % PALETTE_COLORS.length].stroke
                        }
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          PALETTE_COLORS[index % PALETTE_COLORS.length].stroke
                        }
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  )
                )
              ) : (
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={MIDNIGHT_THEME.stroke}
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="100%"
                    stopColor={MIDNIGHT_THEME.stroke}
                    stopOpacity={0.01}
                  />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              stroke={color || "hsl(var(--chart-1))"}
              strokeOpacity={0.2}
              vertical={false}
            />
            <XAxis
              dataKey="formattedDay"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              interval={Math.ceil(filteredData.length / 10) - 1}
              tickFormatter={(value: string) => {
                const [day, month, year] = value.split("-");
                const date = new Date(`${year}-${month}-${day}`);
                return new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                }).format(date);
              }}
              dy={10}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) =>
                new Intl.NumberFormat("en-US", {
                  notation: "compact",
                  compactDisplay: "short",
                }).format(value)
              }
              dx={-10}
            />
            <Tooltip
              content={({
                active,
                payload,
                label,
              }: TooltipProps<ValueType, NameType>) => {
                if (!active || !payload || payload.length === 0) return null;

                return (
                  <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {(() => {
                          const [day, month, year] = label.split("-");
                          return new Date(
                            `${year}-${month}-${day}`
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                        })()}
                      </div>
                      <div className="space-y-1">
                        {payload.map((entry) => {
                          const dataKey = entry.dataKey as string;
                          const name = isMultiLine
                            ? Object.entries(multipleDataKeys || {}).find(
                                ([_, key]) => key === dataKey
                              )?.[0] || dataKey
                            : title;
                          const tooltipColor = isMultiLine
                            ? PALETTE_COLORS[
                                Object.values(multipleDataKeys || {}).indexOf(
                                  dataKey
                                ) % PALETTE_COLORS.length
                              ].stroke
                            : color;

                          return (
                            <div
                              key={dataKey}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-2 h-2 rounded-lg"
                                style={{ backgroundColor: tooltipColor }}
                              />
                              <span className="text-sm text-foreground">
                                {name}:{" "}
                                {typeof entry.value === "number"
                                  ? new Intl.NumberFormat("en-US", {
                                      notation: "compact",
                                      compactDisplay: "short",
                                    }).format(entry.value)
                                  : entry.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            />
            {isMultiLine ? (
              // Render multiple lines for different protocols
              Object.entries(multipleDataKeys || {}).map(([name, key], idx) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={PALETTE_COLORS[idx % PALETTE_COLORS.length].stroke}
                  strokeWidth={1.5}
                  dot={false}
                  fill={`url(#gradient-${key})`}
                  fillOpacity={1}
                  hide={!selectedDataKeys.has(key)}
                />
              ))
            ) : (
              // Render single line for specific protocol
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
                fill={color}
                fillOpacity={0.2}
              />
            )}
            {isMultiLine && (
              <Legend
                wrapperStyle={{
                  paddingTop: 20,
                  color: "#E5E7EB",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
                verticalAlign="bottom"
                content={() => {
                  const legendItems = Object.entries(
                    multipleDataKeys || {}
                  ).map(([name, key], idx) => ({
                    name,
                    key,
                    color: PALETTE_COLORS[idx % PALETTE_COLORS.length].stroke,
                    active: selectedDataKeys.has(key),
                  }));

                  return (
                    <div className="flex gap-4 justify-center">
                      <div
                        className="flex items-center cursor-pointer select-none"
                        onClick={() => {
                          setSelectedDataKeys((prev) => {
                            const allKeys = Object.values(
                              multipleDataKeys || {}
                            );
                            return prev.size === allKeys.length
                              ? new Set()
                              : new Set(allKeys);
                          });
                        }}
                      >
                        <div
                          className={`w-4 h-4 rounded-xl border-2 transition-colors ${
                            selectedDataKeys.size ===
                            Object.keys(multipleDataKeys || {}).length
                              ? "bg-current"
                              : "bg-transparent"
                          }`}
                          style={{
                            borderColor: "hsl(var(--muted-foreground))",
                            color: "hsl(var(--muted-foreground))",
                          }}
                        />
                        <span className="ml-2 text-sm text-muted-foreground">
                          All
                        </span>
                      </div>
                      {legendItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center cursor-pointer select-none"
                          onClick={() => {
                            const handleDataKeyToggle = (key: ChartDataKey) => {
                              setSelectedDataKeys((prev) => {
                                const newSet = new Set(prev);
                                if (newSet.has(key)) {
                                  newSet.delete(key);
                                } else {
                                  newSet.add(key);
                                }
                                return newSet;
                              });
                            };
                            handleDataKeyToggle(item.key);
                          }}
                        >
                          <div
                            className={`w-4 h-4 rounded-xl border-2 transition-colors ${
                              item.active ? "bg-current" : "bg-transparent"
                            }`}
                            style={{
                              borderColor: item.color,
                              color: item.color,
                            }}
                          />
                          <span className="ml-2 text-sm text-muted-foreground">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Date range selector - conditionally visible below the chart */}
        {showDateRangeSelector && (
          <div className="mt-6 pt-6 border-t border-border animate-in slide-in-from-top-2 duration-200">
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
            />
          </div>
        )}
      </CardContent>
    </Card>
    </ComponentActions>
  );
}
