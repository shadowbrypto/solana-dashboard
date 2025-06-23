import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type TimeFrame = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

import { HorizontalBarChartSkeleton } from "./HorizontalBarChartSkeleton";

interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  data: {
    name: string;
    value: number;
    color?: string;
    values?: {
      value: number;
      date: string;
    }[];
  }[];
  valueFormatter?: (value: number) => string;
  loading?: boolean;
}

const formatNumber = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return (value / 1e9).toFixed(2) + 'b';
  } else if (absValue >= 1e6) {
    return (value / 1e6).toFixed(2) + 'm';
  } else if (absValue >= 1e3) {
    return (value / 1e3).toFixed(2) + 'k';
  }
  return value.toFixed(2);
};

export function HorizontalBarChart({ 
  title, 
  subtitle,
  data,
  valueFormatter = formatNumber,
  loading
}: HorizontalBarChartProps) {
  if (loading) {
    return <HorizontalBarChartSkeleton />;
  }
  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");

  const filteredData = useMemo(() => {
    if (timeframe === "all") {
      return data
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);
    }

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

    return data.map(item => {
      if (!item.values) return item;
      const filteredValues = item.values.filter(v => {
        if (!v.date) return false;
        const [year, month, day] = v.date.split('-').map(Number);
        const itemDate = new Date(year, month - 1, day);
        return itemDate >= cutoffDate;
      });
      return {
        ...item,
        value: filteredValues.reduce((sum, v) => sum + v.value, 0)
      };
    })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, timeframe]);
  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b gap-3 sm:gap-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Select value={timeframe} onValueChange={(value: string) => setTimeframe(value as TimeFrame)}>
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
      </CardHeader>
      <CardContent className="pt-2 px-2">
        <ResponsiveContainer width="100%" height={filteredData.length * 35 + 20}>
          <RechartsBarChart
            data={filteredData}
            layout="vertical"
            margin={{
              top: 0,
              right: 60,
              bottom: 0,
              left: 20,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              className="stroke-border"
              stroke="hsl(var(--border))"
              strokeOpacity={0.2}
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={valueFormatter}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">
                            {payload[0].payload.name}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {valueFormatter(payload[0].value as number)}
                          </span>
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
              dataKey="value"
              barSize={20}
              fill="none"
              radius={[4, 4, 4, 4]}
              maxBarSize={20}
            >
              <LabelList
                dataKey="value"
                position="right"
                formatter={valueFormatter}
                style={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: "12px",
                }}
              />
              {filteredData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || "hsl(var(--primary))"}
                  fillOpacity={0.8}
                  className="transition-opacity duration-200 hover:opacity-90"
                />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
