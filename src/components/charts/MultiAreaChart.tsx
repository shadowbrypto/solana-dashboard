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
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { useState, useMemo } from "react";

type TimeFrame = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

import { CategoryMultiAreaChartSkeleton } from "./CategoryMetricsSkeletons";

interface MultiAreaChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  keys: string[];
  labels?: string[];
  colors?: string[];
  xAxisKey?: string;
  valueFormatter?: (value: number) => string;
  loading?: boolean;
}

export function MultiAreaChart({ 
  title, 
  subtitle,
  data,
  keys,
  labels,
  colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
  xAxisKey = "formattedDay",
  valueFormatter = (value: number) => `${value.toFixed(1)}%`,
  loading
}: MultiAreaChartProps) {
  if (loading) {
    return <CategoryMultiAreaChartSkeleton />;
  }
  
  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");
  const [disabledKeys, setDisabledKeys] = useState<string[]>([]);

  const filteredData = useMemo(() => {
    // Create a copy and reverse the data array
    const reversedData = [...data].reverse();
    let timeFilteredData = reversedData;

    if (timeframe !== "all") {
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

      timeFilteredData = reversedData.filter(item => {
        const [day, month, year] = item.formattedDay.split("-");
        const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return itemDate >= cutoffDate;
      });
    }

    // For multi-area chart, just hide disabled keys, don't recalculate
    return timeFilteredData.map(item => {
      const newItem = { ...item };
      
      keys.forEach(key => {
        if (disabledKeys.includes(key)) {
          newItem[key] = 0;
        }
      });
      
      return newItem;
    });
  }, [data, timeframe, disabledKeys, keys]);

  // Convert protocol names to display labels
  const displayLabels = labels || keys.map(key => {
    const protocol = key.replace('_dominance', '').replace('_share', '');
    return protocol.charAt(0).toUpperCase() + protocol.slice(1);
  });

  return (
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
                          src={`/src/assets/logos/${getProtocolLogoFilename(protocolMatch.id)}`}
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
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
          <RechartsAreaChart data={filteredData} margin={{ top: 20, right: 30, left: 0, bottom: 12 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.2}
              vertical={false}
            />
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(value) => {
                const [day, month] = value.split('-');
                const date = new Date(2025, parseInt(month) - 1, parseInt(day));
                return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              domain={[0, 'dataMax']}
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
                          {payload.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-lg" 
                                style={{ backgroundColor: colors[index] }}
                              />
                              <span className="text-sm text-foreground">
                                {displayLabels[index]}: {valueFormatter(entry.value || 0)}
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
            {keys.map((key, index) => (
                <Area
                  key={key}
                  dataKey={key}
                  stroke={disabledKeys.includes(key) ? 'hsl(var(--muted))' : colors[index]}
                  fill={disabledKeys.includes(key) ? 'hsl(var(--muted))' : colors[index]}
                  fillOpacity={disabledKeys.includes(key) ? 0.1 : 0.3}
                  strokeWidth={2}
                  name={displayLabels[index]}
                />
            ))}
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                paddingTop: "12px"
              }}
              onClick={(e) => {
                if (e && typeof e.dataKey === 'string') {
                  setDisabledKeys((prev: string[]) => 
                    prev.includes(e.dataKey as string)
                      ? prev.filter(key => key !== e.dataKey)
                      : [...prev, e.dataKey as string]
                  );
                }
              }}
              formatter={(value, entry) => {
                const dataKey = typeof entry.dataKey === 'string' ? entry.dataKey : '';
                return (
                  <span 
                    className={`text-sm text-muted-foreground ${disabledKeys.includes(dataKey) ? 'opacity-50' : ''}`}
                  >
                    {value}
                  </span>
                );
              }}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}