import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface GradientAreaCardProps {
  title: string;
  subtitle: string;
  data: Array<{ name: string; value: number; date?: string }>;
  growth?: number;
  gradientId?: string;
  strokeColor?: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  className?: string;
}

export function GradientAreaCard({
  title,
  subtitle,
  data,
  growth,
  gradientId = 'colorGradient',
  strokeColor = '#8b5cf6',
  gradientStartColor = '#8b5cf6',
  gradientEndColor = '#8b5cf6',
  className
}: GradientAreaCardProps) {
  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      <CardHeader className="p-4 pb-2 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardDescription className="text-sm text-muted-foreground">
              {title}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {subtitle}
            </CardTitle>
          </div>
          {growth !== undefined && (
            <Badge 
              variant={growth >= 0 ? "default" : "destructive"}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5",
                growth >= 0 
                  ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400" 
                  : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              {growth >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span className="text-xs font-medium">
                {Math.abs(growth).toFixed(1)}%
              </span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[108px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientStartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={gradientEndColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                hide={true}
              />
              <YAxis
                hide={true}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const value = payload[0].value as number;
                    const dataPoint = data.find(d => d.name === label);
                    
                    // Format date from backend date or label
                    const formatDate = (dateStr: string, fallbackLabel: string) => {
                      try {
                        if (dateStr) {
                          // If we have the full date from backend, format it properly
                          const date = new Date(dateStr);
                          const day = date.getDate();
                          const month = date.toLocaleDateString('en-US', { month: 'short' });
                          const year = date.getFullYear();
                          return `${day} ${month}, ${year}`;
                        } else {
                          // Fallback to parsing the label (e.g., "Aug 25" -> "25 Aug, 2024")
                          const [month, day] = fallbackLabel.split(' ');
                          const currentYear = new Date().getFullYear();
                          return `${day} ${month}, ${currentYear}`;
                        }
                      } catch {
                        return fallbackLabel;
                      }
                    };

                    const formatValue = (val: number) => {
                      if (val >= 1000000) {
                        return `$${(val / 1000000).toFixed(2)}M`;
                      } else if (val >= 1000) {
                        return `$${(val / 1000).toFixed(2)}K`;
                      }
                      return `$${val.toFixed(2)}`;
                    };

                    return (
                      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg min-w-[150px]">
                        <div className="text-xs font-bold text-foreground mb-2">
                          {formatDate(dataPoint?.date || '', label)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-1 h-3 rounded-sm"
                            style={{ backgroundColor: strokeColor }}
                          />
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground">
                              {title === "Trading Volume" ? "Volume" : 
                               title === "Daily Active Users" ? "DAUs" : 
                               title === "New Users" ? "New Users" : 
                               title === "Trades" ? "Trades" : 
                               title === "Token Launches" ? "Launches" : title}
                            </span>
                            <span className="text-xs font-medium text-foreground">
                              {formatValue(value)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}