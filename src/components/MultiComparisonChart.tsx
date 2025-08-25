import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProtocolStats } from '../types/protocol';
import { formatDate } from '../lib/protocol';
import { formatNumber, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

interface ProtocolData {
  protocol: string;
  name: string;
  color: string;
  stats: ProtocolStats[];
}

interface MultiComparisonChartProps {
  title: string;
  data: ProtocolData[];
  dataKey: keyof ProtocolStats;
  formatter: (value: number) => string;
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
}

// Format date for chart display (28 Jul format)
function formatChartDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return format(date, 'd MMM');
  } catch (error) {
    // Fallback to original format if parsing fails
    return formatDate(isoDate);
  }
}

export function MultiComparisonChart({
  title,
  data,
  dataKey,
  formatter,
  timeframe = "3m",
  onTimeframeChange
}: MultiComparisonChartProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toggle protocol visibility
  const toggleProtocol = (protocolId: string) => {
    setHiddenProtocols(prev => {
      const next = new Set(prev);
      if (next.has(protocolId)) {
        next.delete(protocolId);
      } else {
        next.add(protocolId);
      }
      return next;
    });
  };

  // Filter visible data
  const visibleData = data.filter(protocolData => !hiddenProtocols.has(protocolData.protocol));
  // Merge and align data by date
  const mergedData = React.useMemo(() => {
    const dataMap = new Map();
    
    // Collect all unique dates first
    visibleData.forEach(protocolData => {
      protocolData.stats?.forEach(item => {
        const date = item.date;
        if (!dataMap.has(date)) {
          dataMap.set(date, {
            date,
            formattedDate: formatChartDate(date)
          });
        }
      });
    });
    
    // Add protocol data to each date
    visibleData.forEach(protocolData => {
      protocolData.stats?.forEach(item => {
        const date = item.date;
        const existing = dataMap.get(date);
        if (existing) {
          existing[`${protocolData.protocol}_${dataKey}`] = item[dataKey] || 0;
        }
      });
    });
    
    // Convert to array and sort by date
    return Array.from(dataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [visibleData, dataKey]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the original date for this formatted label
      const originalDate = mergedData.find(item => item.formattedDate === label)?.date;
      const tooltipDate = originalDate ? format(new Date(originalDate), 'd MMM yyyy') : label;
      
      return (
        <div className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${isMobile ? 'p-2 min-w-[120px]' : 'p-3'}`}>
          <p className={`font-medium mb-2 text-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>{tooltipDate}</p>
          <div className="space-y-1">
            {payload
              .sort((a: any, b: any) => b.value - a.value) // Sort by value descending
              .map((entry: any, index: number) => {
                const protocolName = visibleData.find(d => 
                  entry.dataKey.startsWith(d.protocol)
                )?.name || 'Unknown';
                
                return (
                  <div key={index} className={`flex items-center justify-between gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <div className="flex items-center gap-1.5">
                      <div 
                        className={`rounded-full ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`}
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground truncate">{isMobile ? protocolName.slice(0, 8) : protocolName}:</span>
                    </div>
                    <span className="font-semibold text-foreground">{formatter(entry.value)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null;

    // Show all protocols in legend (both visible and hidden) but get from original data
    const allLegendItems = data.map(protocolData => {
      const isHidden = hiddenProtocols.has(protocolData.protocol);
      const chartDataKey = `${protocolData.protocol}_${dataKey}`;
      
      return {
        protocol: protocolData.protocol,
        name: protocolData.name,
        color: protocolData.color,
        dataKey: chartDataKey,
        isHidden
      };
    });

    return (
      <div className={`flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-1 sm:mt-2 px-2 sm:px-4 mb-0`}>
        {allLegendItems.map((item, index) => {
          const displayName = isMobile ? item.name.slice(0, 8) : item.name;
          
          return (
            <div 
              key={item.protocol}
              className={`flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all hover:opacity-80 ${
                item.isHidden ? 'opacity-40' : 'opacity-100'
              }`}
              onClick={() => toggleProtocol(item.protocol)}
              title={item.isHidden ? `Show ${item.name}` : `Hide ${item.name}`}
            >
              <div 
                className={`rounded-full ${isMobile ? 'w-2 h-2' : 'w-3 h-3'} ${
                  item.isHidden ? 'ring-1 ring-muted-foreground/30' : ''
                }`}
                style={{ 
                  backgroundColor: item.isHidden ? 'transparent' : item.color,
                  border: item.isHidden ? `2px solid ${item.color}` : 'none'
                }}
              />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                item.isHidden ? 'text-muted-foreground line-through' : 'text-muted-foreground'
              }`}>
                {displayName}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Get timeframe display text
  const getTimeframeText = () => {
    switch (timeframe) {
      case "7d": return "Last 7 days";
      case "30d": return "Last 30 days";
      case "3m": return "Last 3 months";
      case "6m": return "Last 6 months";
      case "1y": return "Last 1 year";
      default: return "All time";
    }
  };

  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className={`border-b ${isMobile ? 'p-3' : 'p-6'}`}>
        <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'}`}>
          {isMobile ? (
            <>
              {/* Mobile: Title row with timeframe selector on the right */}
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="font-medium text-card-foreground text-sm flex-1">{title}</CardTitle>
                {onTimeframeChange && (
                  <Select value={timeframe} onValueChange={onTimeframeChange}>
                    <SelectTrigger className="bg-background/50 backdrop-blur-sm w-32 text-xs h-7 relative top-0.5">
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="3m">Last 3 months</SelectItem>
                      <SelectItem value="6m">Last 6 months</SelectItem>
                      <SelectItem value="1y">Last 1 year</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {/* Mobile: Subtitle below title row */}
              <p className="text-muted-foreground text-[10px]">
                {getTimeframeText()}
              </p>
            </>
          ) : (
            <>
              {/* Desktop: Title on left, timeframe selector on right */}
              <div className="space-y-1">
                <CardTitle className="font-medium text-card-foreground text-base">{title}</CardTitle>
                <p className="text-muted-foreground text-xs">
                  {getTimeframeText()}
                </p>
              </div>
              {onTimeframeChange && (
                <Select value={timeframe} onValueChange={onTimeframeChange}>
                  <SelectTrigger className="bg-background/50 backdrop-blur-sm w-[140px]">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="3m">Last 3 months</SelectItem>
                    <SelectItem value="6m">Last 6 months</SelectItem>
                    <SelectItem value="1y">Last 1 year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className={`${isMobile ? 'pt-2 px-3 pb-2' : 'pt-2 px-6 pb-3'}`}>
        <div className={isMobile ? 'h-[350px]' : 'h-[500px]'}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mergedData} margin={{ 
              top: 5, 
              right: isMobile ? 10 : 20, 
              left: isMobile ? 5 : 0, 
              bottom: isMobile ? 20 : 25
            }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-muted/20"
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="formattedDate"
                tick={{ fontSize: isMobile ? 10 : 12, className: "fill-muted-foreground" }}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? Math.max(Math.ceil(mergedData.length / 6) - 1, 0) : Math.max(Math.ceil(mergedData.length / 12) - 1, 0)}
                angle={0}
                textAnchor="middle"
                height={isMobile ? 40 : 50}
              />
              <YAxis 
                tick={{ fontSize: isMobile ? 9 : 11, className: "fill-muted-foreground" }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 35 : 45}
                domain={[0, 'dataMax']}
                tickCount={6}
                tickFormatter={(value, index) => {
                  // Add padding from bottom by not showing values too close to 0
                  if (value === 0) return '';
                  
                  // Use appropriate formatting based on data type
                  if (typeof value === 'number') {
                    // Check if this looks like currency data (contains 'usd' or 'fee')
                    const isCurrency = title.toLowerCase().includes('volume') || 
                                     title.toLowerCase().includes('fee') || 
                                     title.toLowerCase().includes('revenue');
                    
                    // Format with 0 decimals
                    if (isCurrency) {
                      // For currency, show abbreviated format with no decimals
                      if (value >= 1000000000) return `$${Math.round(value / 1000000000)}B`;
                      if (value >= 1000000) return `$${Math.round(value / 1000000)}M`;
                      if (value >= 1000) return `$${Math.round(value / 1000)}K`;
                      return `$${Math.round(value)}`;
                    } else {
                      // For non-currency numbers, show abbreviated format with no decimals
                      if (value >= 1000000000) return `${Math.round(value / 1000000000)}B`;
                      if (value >= 1000000) return `${Math.round(value / 1000000)}M`;
                      if (value >= 1000) return `${Math.round(value / 1000)}K`;
                      return Math.round(value).toString();
                    }
                  }
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              {visibleData.map((protocolData, index) => (
                <Area
                  key={protocolData.protocol}
                  type="monotone"
                  dataKey={`${protocolData.protocol}_${dataKey}`}
                  stroke={protocolData.color}
                  strokeWidth={isMobile ? 2.5 : 3}
                  fill={protocolData.color}
                  fillOpacity={0.08} // Lower consistent opacity to reduce overlap issues
                  dot={{ fill: protocolData.color, strokeWidth: 0, r: isMobile ? 2 : 3 }}
                  activeDot={{ 
                    r: isMobile ? 5 : 7, 
                    stroke: protocolData.color, 
                    strokeWidth: 2, 
                    fill: "hsl(var(--background))",
                    className: "drop-shadow-sm"
                  }}
                  connectNulls={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}