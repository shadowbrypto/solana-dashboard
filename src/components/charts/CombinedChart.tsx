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
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { useState, useMemo } from "react";
import { ComponentActions } from '../ComponentActions';

type TimeFrame = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

import { CombinedChartSkeleton } from "./CombinedChartSkeleton";

interface CombinedChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  volumeKey: string;
  feesKey: string;
  barChartLabel?: string;
  lineChartLabel?: string;
  leftAxisFormatter?: (value: number) => string;
  rightAxisFormatter?: (value: number) => string;
  colors?: string[];
  loading?: boolean;
}

export function CombinedChart({ 
  title, 
  subtitle,
  data,
  volumeKey,
  feesKey,
  barChartLabel = 'Volume',
  lineChartLabel = 'Fees',
  leftAxisFormatter = (value: number) => `$${(value / 1000000).toFixed(2)}M`,
  rightAxisFormatter = (value: number) => `$${(value / 1000).toFixed(1)}K`,
  colors = ["hsl(var(--chart-3))"],
  loading
}: CombinedChartProps) {
  if (loading) {
    return <CombinedChartSkeleton />;
  }

  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");



  const filteredData = useMemo(() => {
    if (timeframe === "all") return [...data].reverse();

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

    return [...data]
      .filter(item => {
        const [day, month, year] = item.formattedDay.split("-");
        const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return itemDate >= cutoffDate;
      })
      .reverse();
  }, [data, timeframe]);

  return (
    <ComponentActions 
      componentName={`${title} Combined Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Combined_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b gap-3 sm:gap-0 p-3 sm:p-6">
          <div className="space-y-1">
            <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">{title}</CardTitle>
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
        <CardContent className="pt-3 sm:pt-6 p-3 sm:p-6">
          <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
            <ComposedChart data={filteredData} margin={{ top: 10, right: 15, left: 0, bottom: 8 }} className="sm:m-[20px_30px_12px_0px]">
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey="formattedDay"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                interval={Math.ceil(filteredData.length / 4) - 1}
                className="sm:text-xs"
                tickFormatter={(value: string) => {
                  const [day, month, year] = value.split('-');
                  const date = new Date(`${year}-${month}-${day}`);
                  return new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric'
                  }).format(date);
                }}
                dy={10}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value) => {
                  const absValue = Math.abs(value);
                  if (absValue >= 1e9) return `${Math.round(value / 1e9)}B`;
                  if (absValue >= 1e6) return `${Math.round(value / 1e6)}M`;
                  if (absValue >= 1e3) return `${Math.round(value / 1e3)}K`;
                  return `${Math.round(value)}`;
                }}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                className="sm:text-xs"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => {
                  const absValue = Math.abs(value);
                  if (absValue >= 1e9) return `${Math.round(value / 1e9)}B`;
                  if (absValue >= 1e6) return `${Math.round(value / 1e6)}M`;
                  if (absValue >= 1e3) return `${Math.round(value / 1e3)}K`;
                  return `${Math.round(value)}`;
                }}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                className="sm:text-xs"
              />
              <Tooltip
                content={({ active, payload, label }: TooltipProps<number, string>) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            {(() => {
                              const [day, month, year] = label.split('-');
                              return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              });
                            })()}
                          </div>
                          <div className="space-y-1">
                            {payload.map((entry) => (
                              <div key={entry.name} className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-lg" 
                                  style={{ 
                                    backgroundColor: entry.name === barChartLabel
                                      ? "hsl(var(--chart-1))" 
                                      : "hsl(var(--chart-2))"
                                  }}
                                />
                                <span className="text-sm text-foreground">
                                  {entry.name}: {typeof entry.value === 'number'
                                    ? entry.name === barChartLabel
                                      ? leftAxisFormatter(entry.value)
                                      : rightAxisFormatter(entry.value)
                                    : entry.value
                                  }
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
              <Bar
                dataKey={volumeKey}
                yAxisId="left"
                fill={colors?.[0] || "hsl(var(--chart-3))"}
                opacity={0.8}
                radius={[4, 4, 0, 0]}
                name={barChartLabel}
              />
              <Line
                type="monotone"
                dataKey={feesKey}
                yAxisId="right"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={false}
                name={lineChartLabel}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  paddingTop: "12px"
                }}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}
