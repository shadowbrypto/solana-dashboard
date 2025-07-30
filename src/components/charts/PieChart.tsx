import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
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
import { useState, useMemo } from "react";
import { ComponentActions } from '../ComponentActions';

type TimeFrame = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

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
  outerRadius = 120,
  centerLabel = "Total",
  defaultDisabledKeys = [],
}: PieChartProps) {
  if (loading) {
    return <StackedBarChartSkeleton />;
  }

  const [internalTimeframe, setInternalTimeframe] = useState<TimeFrame>("all");
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

  // Transform data for pie chart
  const pieData = useMemo(() => {
    // Sum up all values across time periods for each launchpad
    const totals: Record<string, number> = {};
    
    data.forEach(item => {
      dataKeys.forEach(key => {
        if (!totals[key]) totals[key] = 0;
        totals[key] += item[key] || 0;
      });
    });

    // Filter out disabled keys and create pie chart data
    const enabledKeys = dataKeys.filter(key => !disabledKeys.includes(key));
    
    return enabledKeys.map((key, index) => ({
      name: labels[dataKeys.indexOf(key)],
      value: totals[key] || 0,
      color: colors[dataKeys.indexOf(key)],
      key: key,
    })).filter(item => item.value > 0);
  }, [data, dataKeys, labels, colors, disabledKeys]);

  // Calculate total for percentage calculations
  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ComponentActions 
      componentName={`${title} Pie Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Pie_Chart.png`}
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
          <Select value={timeframe} onValueChange={(value: string) => handleTimeframeChange(value as TimeFrame)}>
            <SelectTrigger className="w-full sm:w-[140px] bg-background text-foreground border-border hover:bg-muted/50 transition-colors rounded-xl">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border text-foreground rounded-xl overflow-hidden">
              <SelectItem value="7d" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 7 days</SelectItem>
              <SelectItem value="30d" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 30 days</SelectItem>
              <SelectItem value="3m" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 3 months</SelectItem>
              <SelectItem value="6m" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 6 months</SelectItem>
              <SelectItem value="1y" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 1 year</SelectItem>
              <SelectItem value="all" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">All time</SelectItem>
            </SelectContent>
          </Select>
          )}
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            {/* Pie Chart */}
            <div className="flex-1 min-w-0 relative">
              <ResponsiveContainer width="100%" height={360}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
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
                                <span className="font-semibold text-popover-foreground tabular-nums">{formatNumberWithSuffix(data.value)}</span>
                              </div>
                              {showPercentages && (
                                <div className="flex justify-between gap-3">
                                  <span className="text-muted-foreground">Share:</span>
                                  <span className="font-semibold text-popover-foreground tabular-nums">{percentage}%</span>
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
              
              {/* Center Total Display */}
              {innerRadius > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <div className="text-center">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{centerLabel}</div>
                    <div className="text-2xl font-bold text-foreground tabular-nums">{formatNumberWithSuffix(total)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Legend and Statistics */}
            <div className="flex-shrink-0 w-full lg:w-56">
              {/* Legend Items */}
              <div className="space-y-2">
                {dataKeys.map((key, index) => {
                  const isDisabled = disabledKeys.includes(key);
                  const pieItem = pieData.find(item => item.key === key);
                  const value = pieItem?.value || 0;
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <div
                      key={key}
                      className={`group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-all duration-200 border ${
                        isDisabled 
                          ? 'opacity-50 grayscale bg-muted/20 border-dashed border-border' 
                          : `hover:bg-muted/30 hover:shadow-sm border-transparent hover:border-border`
                      }`}
                      style={{
                        backgroundColor: isDisabled ? undefined : `${colors[index]}20`,
                        borderLeftColor: isDisabled ? undefined : colors[index],
                        borderLeftWidth: isDisabled ? undefined : '3px'
                      }}
                      onClick={() => {
                        setDisabledKeys(prev => 
                          prev.includes(key)
                            ? prev.filter(k => k !== key)
                            : [...prev, key]
                        );
                      }}
                      title={isDisabled ? `Click to show ${labels[index]}` : `Click to hide ${labels[index]}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                            isDisabled ? 'border border-dashed border-muted-foreground' : 'shadow-sm'
                          }`}
                          style={{ 
                            backgroundColor: isDisabled ? 'transparent' : colors[index]
                          }}
                        />
                        <span className={`text-xs font-medium truncate transition-all ${
                          isDisabled ? 'text-muted-foreground line-through' : 'text-foreground'
                        }`}>
                          {labels[index]}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-right shrink-0">
                        <span className={`text-xs font-semibold transition-all ${
                          isDisabled ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {isDisabled ? '0' : formatNumberWithSuffix(value)}
                        </span>
                        {showPercentages && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({isDisabled ? '0.0%' : `${percentage}%`})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}