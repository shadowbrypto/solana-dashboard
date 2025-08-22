import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import { getLaunchpadLogoFilename, getLaunchpadById } from "../../lib/launchpad-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  Legend,
} from "recharts";
import { useState, useMemo, useEffect } from "react";
import { ComponentActions } from '../ComponentActions';

type TimeFrame = "1d" | "7d" | "30d" | "3m" | "6m" | "1y" | "all";

import { StackedBarChartSkeleton } from "./StackedBarChartSkeleton";

interface PieChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  dataKeys: string[];
  labels: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  loading?: boolean;
  timeframe?: TimeFrame;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
  disableTimeframeSelector?: boolean;
  showPercentages?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  centerLabel?: string;
  defaultDisabledKeys?: string[];
}

function formatNumberWithSuffix(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

export function PieChart({ 
  title, 
  subtitle,
  data,
  dataKeys,
  labels,
  colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
  valueFormatter = (value: number) => `${value.toLocaleString()}`,
  loading,
  timeframe: externalTimeframe,
  onTimeframeChange,
  disableTimeframeSelector = false,
  showPercentages = true,
  innerRadius = 0,
  outerRadius,
  centerLabel = "Total",
  defaultDisabledKeys = [],
}: PieChartProps) {
  if (loading) {
    return <StackedBarChartSkeleton />;
  }

  const [internalTimeframe, setInternalTimeframe] = useState<TimeFrame>("all");
  const [disabledKeys, setDisabledKeys] = useState<string[]>(defaultDisabledKeys);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  // Use external timeframe if provided, otherwise use internal
  const timeframe = externalTimeframe || internalTimeframe;
  
  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // Responsive radius calculation based on screen size
  const getResponsiveRadius = () => {
    if (windowWidth < 640) { // Mobile
      return {
        innerRadius: Math.max(0, innerRadius ? innerRadius * 1.2 : 65),
        outerRadius: Math.max(160, outerRadius ? outerRadius : 190)
      };
    } else if (windowWidth < 1024) { // Tablet
      return {
        innerRadius: Math.max(0, innerRadius * 0.85),
        outerRadius: Math.max(80, outerRadius ? outerRadius * 0.85 : 100)
      };
    }
    // Desktop or fallback
    return {
      innerRadius: Math.max(0, innerRadius),
      outerRadius: Math.max(100, outerRadius || 120)
    };
  };

  const { innerRadius: responsiveInnerRadius, outerRadius: responsiveOuterRadius } = getResponsiveRadius();

  console.log('PieChart - Window width:', windowWidth);
  console.log('PieChart - Responsive radii:', { responsiveInnerRadius, responsiveOuterRadius });
  console.log('PieChart - Original radii:', { innerRadius, outerRadius });
  
  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe);
    } else {
      setInternalTimeframe(newTimeframe);
    }
  };

  // Transform data for pie chart
  const pieData = useMemo(() => {
    console.log('PieChart - Input data:', data);
    console.log('PieChart - DataKeys:', dataKeys);
    console.log('PieChart - Timeframe:', timeframe);
    
    let totals: Record<string, number> = {};
    
    if (timeframe === "1d" && data.length > 0) {
      // For "Last day", use only the most recent day's data
      const mostRecentItem = data[data.length - 1]; // Data should be sorted by date
      console.log('PieChart 1d - Using most recent item:', mostRecentItem);
      
      dataKeys.forEach(key => {
        totals[key] = mostRecentItem[key] || 0;
      });
    } else {
      // For other timeframes, sum up all values across time periods
      data.forEach(item => {
        dataKeys.forEach(key => {
          if (!totals[key]) totals[key] = 0;
          totals[key] += item[key] || 0;
        });
      });
    }

    // Filter out disabled keys and create pie chart data
    const enabledKeys = dataKeys.filter(key => !disabledKeys.includes(key));
    
    const result = enabledKeys.map((key, index) => ({
      name: labels[dataKeys.indexOf(key)],
      value: totals[key] || 0,
      color: colors[dataKeys.indexOf(key)],
      key: key,
    })).filter(item => item.value > 0);
    
    if (timeframe === "1d") {
      console.log('PieChart 1d - Final result:', result);
    }
    
    return result;
  }, [data, dataKeys, labels, colors, disabledKeys, timeframe]);

  // Calculate total for percentage calculations
  const total = pieData.reduce((sum, item) => sum + item.value, 0);
  
  console.log('PieChart - Final pieData:', pieData);
  console.log('PieChart - Total:', total);
  console.log('PieChart - innerRadius:', innerRadius, 'outerRadius:', outerRadius);

  // Generate date range text based on timeframe
  const getDateRangeText = () => {
    if (timeframe === "all") return "All time";
    
    const now = new Date();
    
    if (timeframe === "1d") {
      // Find the most recent date from the data
      if (data.length > 0) {
        const sortedData = data.sort((a, b) => new Date(b.date || b.formattedDay).getTime() - new Date(a.date || a.formattedDay).getTime());
        const mostRecentDate = sortedData[0]?.date || sortedData[0]?.formattedDay;
        if (mostRecentDate) {
          const dateObj = new Date(mostRecentDate);
          return dateObj.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
        }
      }
      return "Last day";
    }
    
    let daysToSubtract: number;
    switch (timeframe) {
      case "7d": daysToSubtract = 7; break;
      case "30d": daysToSubtract = 30; break;
      case "3m": daysToSubtract = 90; break;
      case "6m": daysToSubtract = 180; break;
      case "1y": daysToSubtract = 365; break;
      default: daysToSubtract = 90;
    }
    
    const startDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    
    return `${formatDate(startDate)} - ${formatDate(now)}`;
  };

  return (
    <ComponentActions 
      componentName={`${title} Pie Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Pie_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b p-3 sm:px-6 sm:py-3">
          <div className="flex items-start justify-between gap-2">
            {/* Title and subtitle in one column */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">{title}</CardTitle>
              {subtitle && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
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
            {/* Dropdown on the right */}
            {!disableTimeframeSelector && (
              <Select value={timeframe} onValueChange={(value: string) => handleTimeframeChange(value as TimeFrame)}>
                <SelectTrigger className="w-24 sm:w-[140px] bg-background text-foreground border-border hover:bg-muted/50 transition-colors rounded-xl text-xs sm:text-sm h-7 sm:h-10 flex-shrink-0">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground rounded-xl overflow-hidden">
                  <SelectItem value="1d" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last day</SelectItem>
                  <SelectItem value="7d" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 7 days</SelectItem>
                  <SelectItem value="30d" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 30 days</SelectItem>
                  <SelectItem value="3m" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 3 months</SelectItem>
                  <SelectItem value="6m" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 6 months</SelectItem>
                  <SelectItem value="1y" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 1 year</SelectItem>
                  <SelectItem value="all" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">All time</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-0 relative sm:px-6 sm:py-0">
          <div className="flex flex-col lg:flex-row items-center gap-0 sm:gap-4">
            {/* Pie Chart */}
            <div className="flex-1 min-w-0 relative w-full sm:w-auto">
              <div style={{ width: '100%', height: '450px', minHeight: '450px', backgroundColor: 'transparent' }} className="sm:h-[150px] lg:h-[160px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                  <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={responsiveInnerRadius}
                      outerRadius={responsiveOuterRadius}
                      paddingAngle={1}
                      dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="hsl(var(--background))"
                        strokeWidth={3}
                        className="hover:opacity-90 transition-opacity duration-200"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 1000 }}
                    content={({ active, payload }: TooltipProps<number, string>) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0.0';
                        
                        return (
                          <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg z-50" style={{ zIndex: 1000 }}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <div 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: data.color }}
                              />
                              <span className="font-semibold text-popover-foreground">{data.name}</span>
                            </div>
                            <div className="space-y-0.5 text-xs">
                              <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">Value:</span>
                                <span className="font-semibold text-popover-foreground font-mono">{formatNumberWithSuffix(data.value)}</span>
                              </div>
                              {showPercentages && (
                                <div className="flex justify-between gap-3">
                                  <span className="text-muted-foreground">Share:</span>
                                  <span className="font-semibold text-popover-foreground font-mono">{percentage}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RechartsPieChart>
                </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground p-4">
                    <div className="text-lg mb-2">📊</div>
                    <div className="text-sm mb-2">No data available</div>
                    <div className="text-xs">Data items: {pieData.length}</div>
                    <div className="text-xs">Input data: {data.length}</div>
                    <div className="text-xs">DataKeys: {dataKeys.length}</div>
                    <div className="text-xs">Total: {total}</div>
                    <div className="text-xs">Window: {windowWidth}px</div>
                    <div className="text-xs">Radii: {responsiveInnerRadius}/{responsiveOuterRadius}</div>
                  </div>
                )}
              </div>
              
              {/* Center Total Display */}
              {innerRadius > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <div className="text-center">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{centerLabel}</div>
                    <div className="text-2xl font-bold text-foreground font-mono">{formatNumberWithSuffix(total)}</div>
                  </div>
                </div>
              )}
              
            </div>

            {/* Legend and Statistics */}
            <div className="flex-shrink-0 w-full lg:w-56 mt-0 lg:mt-0">
              {/* Legend Items */}
              <div className="space-y-2">
                {dataKeys
                  .map((key, index) => {
                    const isDisabled = disabledKeys.includes(key);
                    const pieItem = pieData.find(item => item.key === key);
                    const value = pieItem?.value || 0;
                    const percentage = total > 0 ? ((value / total) * 100) : 0;
                    return {
                      key,
                      index,
                      isDisabled,
                      value,
                      percentage,
                      originalIndex: index
                    };
                  })
                  .sort((a, b) => b.percentage - a.percentage) // Sort by percentage descending
                  .map(({ key, index, isDisabled, value, percentage, originalIndex }) => {
                  
                  return (
                    <div
                      key={key}
                      className={`group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-all duration-200 border ${
                        isDisabled 
                          ? 'opacity-50 grayscale bg-muted/20 border-dashed border-border' 
                          : `hover:bg-muted/30 hover:shadow-sm border-transparent hover:border-border`
                      }`}
                      style={{
                        backgroundColor: isDisabled ? undefined : `${colors[originalIndex]}20`,
                        borderLeftColor: isDisabled ? undefined : colors[originalIndex],
                        borderLeftWidth: isDisabled ? undefined : '3px'
                      }}
                      onClick={() => {
                        setDisabledKeys(prev => 
                          prev.includes(key)
                            ? prev.filter(k => k !== key)
                            : [...prev, key]
                        );
                      }}
                      title={isDisabled ? `Click to show ${labels[originalIndex]}` : `Click to hide ${labels[originalIndex]}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {(() => {
                          // Check if this is a launchpad (try to find launchpad by key or label)
                          const launchpad = getLaunchpadById(key) || getLaunchpadById(labels[originalIndex].toLowerCase());
                          
                          if (launchpad) {
                            // Show launchpad logo
                            return (
                              <div className={`w-4 h-4 bg-muted/10 rounded-full overflow-hidden ring-1 shrink-0 transition-all ${
                                isDisabled ? 'ring-border/20 grayscale opacity-50' : 'ring-border/20'
                              }`}>
                                <img 
                                  src={`/assets/logos/${getLaunchpadLogoFilename(launchpad.id)}`}
                                  alt={launchpad.name} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const container = target.parentElement;
                                    if (container) {
                                      container.innerHTML = '';
                                      container.className = `w-4 h-4 rounded-full shrink-0 transition-all ${
                                        isDisabled ? 'border border-dashed border-muted-foreground' : 'shadow-sm'
                                      }`;
                                      container.style.backgroundColor = isDisabled ? 'transparent' : colors[originalIndex];
                                    }
                                  }}
                                />
                              </div>
                            );
                          } else {
                            // Fallback to colored dot for non-launchpad items
                            return (
                              <div 
                                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                                  isDisabled ? 'border border-dashed border-muted-foreground' : 'shadow-sm'
                                }`}
                                style={{ 
                                  backgroundColor: isDisabled ? 'transparent' : colors[originalIndex]
                                }}
                              />
                            );
                          }
                        })()}
                        <span className={`text-xs font-medium truncate transition-all ${
                          isDisabled ? 'text-muted-foreground line-through' : 'text-foreground'
                        }`}>
                          {labels[originalIndex]}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-right shrink-0">
                        <span className={`text-xs font-semibold font-mono transition-all ${
                          isDisabled ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {isDisabled ? '0' : formatNumberWithSuffix(value)}
                        </span>
                        {showPercentages && (
                          <span className="text-[10px] text-muted-foreground font-mono ml-1">
                            ({isDisabled ? '0.0%' : `${percentage.toFixed(1)}%`})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Date Range Tile - Top Right of entire component */}
          <div className="absolute top-4 right-4 lg:right-6 px-2.5 py-1.5 bg-muted/30 border border-border/50 rounded-md">
            <div className="text-[10px] font-medium text-foreground">
              {getDateRangeText()}
            </div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}