import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumber } from '../lib/utils';

interface LaunchpadData {
  launchpad: string;
  name: string;
  color: string;
  data: any[];
}

interface LaunchpadComparisonChartProps {
  title: string;
  data: LaunchpadData[];
  dataKey: string;
  formatter: (value: number) => string;
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
}

export function LaunchpadComparisonChart({
  title,
  data,
  dataKey,
  formatter,
  timeframe = "3m",
  onTimeframeChange
}: LaunchpadComparisonChartProps) {
  // Merge and align data by date
  const mergedData = React.useMemo(() => {
    const dataMap = new Map();
    
    // Collect all unique dates first
    data.forEach(launchpadData => {
      launchpadData.data?.forEach(item => {
        const date = item.date;
        if (!dataMap.has(date)) {
          dataMap.set(date, {
            date,
            formattedDate: new Date(date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })
          });
        }
      });
    });
    
    // Add launchpad data to each date
    data.forEach(launchpadData => {
      launchpadData.data?.forEach(item => {
        const date = item.date;
        const existing = dataMap.get(date);
        if (existing) {
          existing[`${launchpadData.launchpad}_${dataKey}`] = item[dataKey] || 0;
        }
      });
    });
    
    // Convert to array and sort by date
    return Array.from(dataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, dataKey]);

  const timeframeOptions = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "3m", label: "3 Months" },
    { value: "6m", label: "6 Months" },
    { value: "1y", label: "1 Year" },
    { value: "all", label: "All Time" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const launchpadName = data.find(d => entry.dataKey.startsWith(d.launchpad))?.name || entry.dataKey;
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                <span className="font-medium">{launchpadName}:</span> {formatter(entry.value)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {onTimeframeChange && (
            <Select value={timeframe} onValueChange={onTimeframeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeframeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="formattedDate" 
                className="text-muted-foreground"
                fontSize={12}
              />
              <YAxis 
                className="text-muted-foreground"
                fontSize={12}
                tickFormatter={formatter}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {data.map((launchpadData) => (
                <Line
                  key={launchpadData.launchpad}
                  type="monotone"
                  dataKey={`${launchpadData.launchpad}_${dataKey}`}
                  stroke={launchpadData.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={launchpadData.name}
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