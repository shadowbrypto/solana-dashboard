import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface GradientBarCardProps {
  title: string;
  subtitle: string;
  data: Array<{ name: string; value: number }>;
  growth?: number;
  barColor?: string;
  gradientId?: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  className?: string;
}

export function GradientBarCard({
  title,
  subtitle,
  data,
  growth,
  barColor = '#8b5cf6',
  gradientId = 'barGradient',
  gradientStartColor = '#8b5cf6',
  gradientEndColor = '#8b5cf6',
  className
}: GradientBarCardProps) {
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
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientStartColor} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={gradientEndColor} stopOpacity={0.3} />
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
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => {
                  if (value >= 1000000) {
                    return [`$${(value / 1000000).toFixed(2)}M`, 'Value'];
                  } else if (value >= 1000) {
                    return [`$${(value / 1000).toFixed(2)}K`, 'Value'];
                  }
                  return [`$${value.toFixed(2)}`, 'Value'];
                }}
              />
              <Bar
                dataKey="value"
                fill={`url(#${gradientId})`}
                radius={[2, 2, 0, 0]}
                minPointSize={2}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}