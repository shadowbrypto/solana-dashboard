import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProtocolStats } from '../types/protocol';
import { formatDate } from '../lib/protocol';
import { formatNumber, formatCurrency } from '../lib/utils';

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

export function MultiComparisonChart({
  title,
  data,
  dataKey,
  formatter,
  timeframe = "3m",
  onTimeframeChange
}: MultiComparisonChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  // Merge and align data by date
  const mergedData = React.useMemo(() => {
    const dataMap = new Map();
    
    // Collect all unique dates first
    data.forEach(protocolData => {
      protocolData.stats?.forEach(item => {
        const date = item.date;
        if (!dataMap.has(date)) {
          dataMap.set(date, {
            date,
            formattedDate: formatDate(date)
          });
        }
      });
    });
    
    // Add protocol data to each date
    data.forEach(protocolData => {
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
  }, [data, dataKey]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg ${isMobile ? 'p-2 min-w-[120px]' : 'p-3'}`}>
          <p className={`font-medium mb-2 text-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>{label}</p>
          <div className="space-y-1">
            {payload
              .sort((a: any, b: any) => b.value - a.value) // Sort by value descending
              .map((entry: any, index: number) => {
                const protocolName = data.find(d => 
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

    return (
      <div className={`flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 px-2 sm:px-4`}>
        {payload.map((entry: any, index: number) => {
          const protocolName = data.find(d => 
            entry.dataKey.startsWith(d.protocol)
          )?.name || 'Unknown';
          
          return (
            <div key={index} className="flex items-center gap-1.5 sm:gap-2">
              <div 
                className={`rounded-full ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`}
                style={{ backgroundColor: entry.color }}
              />
              <span className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>{isMobile ? protocolName.slice(0, 8) : protocolName}</span>
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
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'}`}>
          <div className="space-y-1">
            <CardTitle className={`font-medium text-card-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>{title}</CardTitle>
            <p className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
              {getTimeframeText()}
            </p>
          </div>
          {onTimeframeChange && (
            <Select value={timeframe} onValueChange={onTimeframeChange}>
              <SelectTrigger className={`bg-background/50 backdrop-blur-sm ${isMobile ? 'w-full text-xs' : 'w-[140px]'}`}>
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
      </CardHeader>
      <CardContent className={`${isMobile ? 'pt-2 p-3' : 'pt-2 p-6'}`}>
        <div className={isMobile ? 'h-64' : 'h-80'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData} margin={{ 
              top: 5, 
              right: isMobile ? 10 : 20, 
              left: isMobile ? 5 : 0, 
              bottom: isMobile ? 0 : 5 
            }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-muted/20"
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="formattedDate"
                tick={{ fontSize: isMobile ? 9 : 11, className: "fill-muted-foreground" }}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? Math.max(Math.ceil(mergedData.length / 3) - 1, 0) : "preserveStartEnd"}
                angle={isMobile ? 0 : 0}
                textAnchor="middle"
              />
              <YAxis 
                tick={{ fontSize: isMobile ? 9 : 11, className: "fill-muted-foreground" }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 35 : 45}
                tickFormatter={(value) => {
                  // Use appropriate formatting based on data type
                  if (typeof value === 'number') {
                    // Check if this looks like currency data (contains 'usd' or 'fee')
                    const isCurrency = title.toLowerCase().includes('volume') || 
                                     title.toLowerCase().includes('fee') || 
                                     title.toLowerCase().includes('revenue');
                    return isCurrency ? formatCurrency(value) : formatNumber(value);
                  }
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              {data.map(protocolData => (
                <Line
                  key={protocolData.protocol}
                  type="monotone"
                  dataKey={`${protocolData.protocol}_${dataKey}`}
                  stroke={protocolData.color}
                  strokeWidth={isMobile ? 2 : 2.5}
                  dot={{ fill: protocolData.color, strokeWidth: 0, r: isMobile ? 2 : 3 }}
                  activeDot={{ 
                    r: isMobile ? 4 : 6, 
                    stroke: protocolData.color, 
                    strokeWidth: 2, 
                    fill: "hsl(var(--background))",
                    className: "drop-shadow-sm"
                  }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}