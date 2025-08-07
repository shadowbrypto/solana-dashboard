import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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

import { CombinedChartSkeleton } from "./CombinedChartSkeleton";

interface CombinedChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  volumeKey: string;
  feesKey: string;
  barChartLabel?: string;
  lineChartLabel?: string;
  leftAxisFormatter?: (value: number) => string;
  rightAxisFormatter?: (value: number) => string;
  colors?: string[];
  loading?: boolean;
}

export function CombinedChart({ 
  title, 
  subtitle,
  data,
  volumeKey,
  feesKey,
  barChartLabel = 'Volume',
  lineChartLabel = 'Fees',
  leftAxisFormatter = (value: number) => `$${(value / 1000000).toFixed(2)}M`,
  rightAxisFormatter = (value: number) => `$${(value / 1000).toFixed(1)}K`,
  colors = ["hsl(var(--chart-3))"],
  loading
}: CombinedChartProps) {
  if (loading) {
    return <CombinedChartSkeleton />;
  }

  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => startOfDay(subDays(new Date(), 90)));
  const [customEndDate, setCustomEndDate] = useState(() => endOfDay(new Date()));



  const filteredData = useMemo(() => {
    let processedData = [...data];
    
    if (!data || data.length === 0) return [];

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

    // Sort data in chronological order
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
      return dateA.getTime() - dateB.getTime(); // Ascending order
    });

    return processedData;
  }, [data, timeframe, isCustomRange, customStartDate, customEndDate]);

  return (
    <ComponentActions 
      componentName={`${title} Combined Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Combined_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="flex flex-row items-start sm:items-center justify-between border-b gap-2 sm:gap-0 p-3 sm:p-6">
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
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <TimeframeSelector 
              value={timeframe}
              className=""
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
            <div className="relative inline-flex items-center rounded-lg bg-muted p-0.5 sm:p-1">
              <button
                onClick={() => setShowDateRangeSelector(!showDateRangeSelector)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-1.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  showDateRangeSelector
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={`${showDateRangeSelector ? 'Hide' : 'Show'} date range selector`}
              >
                <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showDateRangeSelector ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"} />
                </svg>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3 sm:pt-6 p-3 sm:p-6">
          <ResponsiveContainer width="100%" height={250} className="sm:h-[350px] lg:h-[400px]">
            <ComposedChart data={filteredData} margin={{ top: 5, right: 5, left: 0, bottom: 2 }} className="sm:m-[20px_30px_12px_0px]">
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey="formattedDay"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
                interval={Math.ceil(filteredData.length / 6) - 1}
                className="sm:text-xs sm:!dy-[10px]"
                tickFormatter={(value: string) => {
                  const [day, month, year] = value.split('-');
                  const date = new Date(`${year}-${month}-${day}`);
                  return new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric'
                  }).format(date);
                }}
                dy={5}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value) => {
                  const absValue = Math.abs(value);
                  if (absValue >= 1e9) return `${Math.round(value / 1e9)}B`;
                  if (absValue >= 1e6) return `${Math.round(value / 1e6)}M`;
                  if (absValue >= 1e3) return `${Math.round(value / 1e3)}K`;
                  return `${Math.round(value)}`;
                }}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
                width={20}
                className="sm:text-xs sm:!w-[30px]"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => {
                  const absValue = Math.abs(value);
                  if (absValue >= 1e9) return `${Math.round(value / 1e9)}B`;
                  if (absValue >= 1e6) return `${Math.round(value / 1e6)}M`;
                  if (absValue >= 1e3) return `${Math.round(value / 1e3)}K`;
                  return `${Math.round(value)}`;
                }}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
                width={20}
                className="sm:text-xs sm:!w-[30px]"
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
                            {payload.map((entry) => (
                              <div key={entry.name} className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-lg" 
                                  style={{ 
                                    backgroundColor: entry.name === barChartLabel
                                      ? "hsl(var(--chart-1))" 
                                      : "hsl(var(--chart-2))"
                                  }}
                                />
                                <span className="text-sm text-foreground">
                                  {entry.name}: {typeof entry.value === 'number'
                                    ? entry.name === barChartLabel
                                      ? leftAxisFormatter(entry.value)
                                      : rightAxisFormatter(entry.value)
                                    : entry.value
                                  }
                                </span>
                              </div>
                            ))}
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
              <Bar
                dataKey={volumeKey}
                yAxisId="left"
                fill={colors?.[0] || "hsl(var(--chart-3))"}
                opacity={0.8}
                radius={[4, 4, 0, 0]}
                name={barChartLabel}
              />
              <Line
                type="monotone"
                dataKey={feesKey}
                yAxisId="right"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={false}
                name={lineChartLabel}
              />
              <Legend
                verticalAlign="bottom"
                height={24}
                iconType="circle"
                iconSize={6}
                wrapperStyle={{
                  paddingTop: "6px"
                }}
                formatter={(value) => (
                  <span className="text-xs sm:text-sm text-muted-foreground">{value}</span>
                )}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          {/* Date range selector - animated smooth reveal */}
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
              dataKey={volumeKey}
            />
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
