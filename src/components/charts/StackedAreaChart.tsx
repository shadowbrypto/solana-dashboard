import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { formatCurrency, formatNumber } from "../../lib/utils";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import { ProtocolLogo } from '../ui/logo-with-fallback';
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

import { StackedAreaChartSkeleton } from "./StackedAreaChartSkeleton";

interface StackedAreaChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  keys: string[];
  labels?: string[];
  colors?: string[];
  xAxisKey?: string;
  valueFormatter?: (value: number) => string;
  loading?: boolean;
  timelineDataKey?: string;
}

export function StackedAreaChart({ 
  title, 
  subtitle,
  data,
  keys,
  labels,
  colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
  xAxisKey = "formattedDay",
  valueFormatter = (value: number) => `${(value * 100).toFixed(2)}%`,
  loading,
  timelineDataKey
}: StackedAreaChartProps) {
  if (loading) {
    return <StackedAreaChartSkeleton />;
  }
  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => startOfDay(subDays(new Date(), 90)));
  const [customEndDate, setCustomEndDate] = useState(() => endOfDay(new Date()));
  const [disabledKeys, setDisabledKeys] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const filteredData = useMemo(() => {
    // Use data as-is (should already be in chronological order)
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

      timeFilteredData = data.filter(item => {
        const [day, month, year] = item.formattedDay.split("-");
        const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return itemDate >= cutoffDate;
      });
    }

    // Detect if we're dealing with percentage values (0-100) or normalized values (0-1)
    const isPercentageData = (() => {
      if (timeFilteredData.length === 0 || keys.length === 0) return false;
      
      // Check a sample of data points to see if values are > 1 (indicating percentages)
      const sampleData = timeFilteredData.slice(0, Math.min(5, timeFilteredData.length));
      for (const item of sampleData) {
        for (const key of keys) {
          if (item[key] && item[key] > 1) {
            return true;
          }
        }
      }
      return false;
    })();

    // For percentage data (market share), don't recalculate shares - just disable/enable
    if (isPercentageData) {
      return timeFilteredData.map(item => {
        const newItem = { ...item };
        
        // For percentage data, just set disabled keys to 0, keep enabled ones as-is
        keys.forEach(key => {
          if (disabledKeys.includes(key)) {
            newItem[key] = 0;
          }
        });
        
        return newItem;
      });
    }

    // For normalized data (dominance), recalculate shares based on enabled protocols
    return timeFilteredData.map(item => {
      const newItem = { ...item };
      const enabledKeys = keys.filter(key => !disabledKeys.includes(key));
      
      // Calculate total of enabled protocols
      const enabledTotal = enabledKeys.reduce((sum, key) => sum + item[key], 0);
      
      // Set disabled protocols to 0 and adjust shares of enabled ones
      keys.forEach(key => {
        if (disabledKeys.includes(key)) {
          newItem[key] = 0;
        } else if (enabledTotal > 0) {
          // Recalculate share as a proportion of enabled total
          newItem[key] = item[key] / enabledTotal;
        }
      });
      
      return newItem;
    });
  }, [data, timeframe, isCustomRange, customStartDate, customEndDate, disabledKeys, keys]);

  // Convert protocol names to display labels
  const displayLabels = labels || keys.map(key => {
    const protocol = key.replace('_dominance', '').replace('_share', '');
    return protocol.charAt(0).toUpperCase() + protocol.slice(1);
  });

  // Detect if we're dealing with percentage values (0-100) or normalized values (0-1)
  const isPercentageData = useMemo(() => {
    if (filteredData.length === 0 || keys.length === 0) return false;
    
    // Check a sample of data points to see if values are > 1 (indicating percentages)
    const sampleData = filteredData.slice(0, Math.min(5, filteredData.length));
    for (const item of sampleData) {
      for (const key of keys) {
        if (item[key] && item[key] > 1) {
          return true;
        }
      }
    }
    return false;
  }, [filteredData, keys]);

  return (
    <ComponentActions 
      componentName={`${title} Stacked Area Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Stacked_Area_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b p-3 sm:p-6">
          <div className="flex flex-col gap-1 sm:gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-base font-medium text-card-foreground">
                <span className="sm:hidden">{title.replace(/ by Category/i, '').replace(/ Dominance by Category/i, ' Dominance').replace(/ by Protocol/i, '').replace(/ Dominance by Protocol/i, ' Dominance')}</span>
                <span className="hidden sm:inline">{title}</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <TimeframeSelector 
                  value={timeframe}
                  className="text-xs"
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
            </div>
            
            {subtitle && (
              <div className="flex items-center justify-between">
                <p className="text-[9px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
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
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 -mb-4 px-2 sm:pt-6 sm:pb-6 sm:px-6">
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 400}>
            <RechartsAreaChart data={filteredData} margin={{ 
              top: 20, 
              right: isMobile ? 10 : 30, 
              left: isMobile ? 5 : 0, 
              bottom: isMobile ? 0 : 12 
            }}>
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
                tick={{ 
                  fill: "hsl(var(--muted-foreground))", 
                  fontSize: isMobile ? 9 : (isDesktop ? 12 : 10)
                }}
                interval={isMobile ? Math.ceil(filteredData.length / 4) - 1 : (isDesktop ? Math.max(1, Math.floor(filteredData.length / 10)) : "preserveStart")}
                tickCount={isMobile ? 4 : (isDesktop ? Math.min(10, filteredData.length) : Math.min(8, filteredData.length))}
                angle={0}
                textAnchor="middle"
                height={30}
                tickFormatter={(value) => {
                  const [day, month] = value.split('-');
                  const date = new Date(2025, parseInt(month) - 1, parseInt(day));
                  return isMobile 
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fill: "hsl(var(--muted-foreground))", 
                  fontSize: isMobile ? 9 : (isDesktop ? 12 : 10)
                }}
                width={isMobile ? 38 : (isDesktop ? 50 : 40)}
                tickFormatter={(value) => isPercentageData ? `${value.toFixed(0)}%` : `${(value * 100).toFixed(0)}%`}
                domain={isPercentageData ? [0, 100] : [0, 1]}
              />
              <Tooltip
                content={({ active, payload, label }: TooltipProps<number, string>) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={`rounded-lg border border-border bg-card shadow-lg ${isMobile ? 'p-3 min-w-[140px]' : 'p-2'}`}>
                        <div className="grid gap-2">
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground`}>
                            {(() => {
                              const [day, month, year] = label.split('-');
                              return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: isMobile ? undefined : 'numeric'
                              });
                            })()}
                          </div>
                          <div className="space-y-1">
                            {payload.map((entry, index) => (
                              <div key={entry.name} className="flex items-center gap-2">
                                <div 
                                  className={`${isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-lg flex-shrink-0`} 
                                  style={{ backgroundColor: colors[index] }}
                                />
                                <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground leading-tight`}>
                                  {displayLabels[index]}: {valueFormatter(entry.value || 0)}
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
              {keys.map((key, index) => {
                  const isHovered = hoveredArea === key;
                  const hasHoveredArea = hoveredArea !== null;
                  
                  return (
                    <Area
                      key={key}
                      dataKey={key}
                      stackId="1"
                      stroke={disabledKeys.includes(key) ? 'hsl(var(--muted))' : colors[index]}
                      fill={disabledKeys.includes(key) ? 'hsl(var(--muted))' : colors[index]}
                      fillOpacity={disabledKeys.includes(key) ? 0.2 : (hasHoveredArea ? (isHovered ? 0.85 : 0.3) : 0.85)}
                      strokeWidth={isHovered ? 3 : 2}
                      strokeOpacity={hasHoveredArea ? (isHovered ? 1 : 0.5) : 1}
                      name={displayLabels[index]}
                      onMouseEnter={() => setHoveredArea(key)}
                      onMouseLeave={() => setHoveredArea(null)}
                      style={{
                        transition: 'fill-opacity 0.2s ease-in-out, stroke-width 0.2s ease-in-out, stroke-opacity 0.2s ease-in-out',
                        cursor: 'pointer'
                      }}
                    />
                  );
              })}
              <Legend
                verticalAlign="bottom"
                height={isMobile ? 40 : 32}
                iconType="circle"
                iconSize={isMobile ? 6 : 8}
                content={(props) => {
                  const { payload } = props;
                  if (!payload) return null;
                  
                  return (
                    <ul style={{
                      paddingTop: isMobile ? "8px" : "12px",
                      fontSize: isMobile ? "11px" : "12px",
                      lineHeight: isMobile ? "14px" : "16px",
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      listStyle: 'none',
                      padding: 0,
                      margin: 0
                    }}>
                      {payload.map((entry, index) => {
                        const dataKey = entry.dataKey as string;
                        const isHovered = hoveredArea === dataKey;
                        const hasHoveredArea = hoveredArea !== null;
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
                            onMouseEnter={() => setHoveredArea(dataKey)}
                            onMouseLeave={() => setHoveredArea(null)}
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
                                width: isMobile ? '6px' : '8px',
                                height: isMobile ? '6px' : '8px',
                                borderRadius: '50%',
                                backgroundColor: isDisabled ? 'hsl(var(--muted-foreground))' : entry.color,
                                marginRight: '6px',
                                opacity: hasHoveredArea ? (isHovered ? 1 : 0.3) : 1,
                                transition: 'opacity 0.2s ease-in-out'
                              }}
                            />
                            <span
                              className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground select-none ${isDisabled ? 'opacity-50 line-through' : ''}`}
                              style={{
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                maxWidth: isDesktop ? '140px' : '80px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: hasHoveredArea ? (isHovered ? 1 : 0.4) : 1,
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
            </RechartsAreaChart>
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
              dataKey={timelineDataKey || keys[0]} // Use specified timeline key or fallback to first
            />
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
