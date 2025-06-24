import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
}

export function MultiComparisonChart({
  title,
  data,
  dataKey,
  formatter,
  timeframe = "3m"
}: MultiComparisonChartProps) {
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
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          <div className="space-y-1">
            {payload
              .sort((a: any, b: any) => b.value - a.value) // Sort by value descending
              .map((entry: any, index: number) => {
                const protocolName = data.find(d => 
                  entry.dataKey.startsWith(d.protocol)
                )?.name || 'Unknown';
                
                return (
                  <div key={index} className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">{protocolName}:</span>
                    </div>
                    <span className="font-semibold">{formatter(entry.value)}</span>
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
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 px-4">
        {payload.map((entry: any, index: number) => {
          const protocolName = data.find(d => 
            entry.dataKey.startsWith(d.protocol)
          )?.name || 'Unknown';
          
          return (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{protocolName}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparing {data.length} protocol{data.length !== 1 ? 's' : ''} - {timeframe === "7d" ? "Last 7 days" : timeframe === "30d" ? "Last 30 days" : timeframe === "3m" ? "Last 3 months" : timeframe === "6m" ? "Last 6 months" : timeframe === "1y" ? "Last 1 year" : "All time"}
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis 
                dataKey="formattedDate"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                axisLine={false}
                tickLine={false}
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
                  strokeWidth={2}
                  dot={{ fill: protocolData.color, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: protocolData.color, strokeWidth: 2, fill: protocolData.color }}
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