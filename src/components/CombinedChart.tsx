import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type TimeFrame = "7d" | "30d" | "3m" | "all";

interface CombinedChartProps {
  title: string;
  data: any[];
  volumeKey: string;
  feesKey: string;
  barChartLabel?: string;
  lineChartLabel?: string;
  leftAxisFormatter?: (value: number) => string;
  rightAxisFormatter?: (value: number) => string;
}

export function CombinedChart({ 
  title, 
  data,
  volumeKey,
  feesKey,
  barChartLabel = 'Volume',
  lineChartLabel = 'Fees',
  leftAxisFormatter = (value: number) => `$${(value / 1000000).toFixed(2)}M`,
  rightAxisFormatter = (value: number) => `$${(value / 1000).toFixed(1)}K`,
}: CombinedChartProps) {
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
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div>
          <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
        </div>
        <Select value={timeframe} onValueChange={(value: string) => setTimeframe(value as TimeFrame)}>
          <SelectTrigger className="w-[140px] bg-background text-foreground border-border hover:bg-muted/50 transition-colors rounded-xl">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border text-foreground rounded-xl overflow-hidden">
            <SelectItem value="7d" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 7 days</SelectItem>
            <SelectItem value="30d" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 30 days</SelectItem>
            <SelectItem value="3m" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Last 3 months</SelectItem>
            <SelectItem value="all" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">All time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={filteredData} margin={{ top: 20, right: 30, left: 0, bottom: 12 }}>
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
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              interval={Math.ceil(filteredData.length / 8) - 1}
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
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
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
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload, label }: TooltipProps<number, string>) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg bg-popover p-4 shadow-md border border-border">
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
            />
            <Bar
              dataKey={volumeKey}
              yAxisId="left"
              fill="hsl(var(--chart-3))"
              radius={[4, 4, 0, 0]}
              name={barChartLabel}
            />
            <Line
              type="monotone"
              dataKey={feesKey}
              yAxisId="right"
              stroke="hsl(var(--chart-1))"
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
  );
}
