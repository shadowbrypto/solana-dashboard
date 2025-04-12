import { DailyData } from "@/types";
import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TimeFrame = "7d" | "30d" | "3m" | "all";

interface TimelineChartProps {
  title: string;
  data: Array<{
    formattedDay: string;
    [key: string]: string | number;
  }>;
  dataKey: string;
  multipleDataKeys?: Record<string, string>;
  isMultiLine?: boolean;
}

// Color themes from shadcn/ui charts
const PALETTE_COLORS = [
  { stroke: 'hsl(4 86% 58%)', fill: 'hsl(4 86% 58% / 0.2)' },      // Red
  { stroke: 'hsl(172 66% 50%)', fill: 'hsl(172 66% 50% / 0.2)' },  // Cyan
  { stroke: 'hsl(262 83% 58%)', fill: 'hsl(262 83% 58% / 0.2)' },  // Purple
  { stroke: 'hsl(316 73% 52%)', fill: 'hsl(316 73% 52% / 0.2)' },  // Pink
  { stroke: 'hsl(221 83% 53%)', fill: 'hsl(221 83% 53% / 0.2)' },  // Blue
];

const MIDNIGHT_THEME = {
  stroke: 'hsl(217.2 91.2% 59.8%)',  // blue-400
  fill: 'hsl(217.2 91.2% 59.8% / 0.1)',
};

export function TimelineChart({ 
  title, 
  data, 
  dataKey, 
  multipleDataKeys, 
  isMultiLine = false 
}: TimelineChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");
  const [activeKeys, setActiveKeys] = useState<Set<string>>(
    new Set(multipleDataKeys ? Object.values(multipleDataKeys) : [dataKey])
  );

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
          <SelectContent className="bg-background border-border text-foreground rounded-xl">
            <SelectItem value="7d" className="text-foreground hover:bg-muted/50 focus:bg-muted/50 rounded-xl">Last 7 days</SelectItem>
            <SelectItem value="30d" className="text-foreground hover:bg-muted/50 focus:bg-muted/50 rounded-xl">Last 30 days</SelectItem>
            <SelectItem value="3m" className="text-foreground hover:bg-muted/50 focus:bg-muted/50 rounded-xl">Last 3 months</SelectItem>
            <SelectItem value="all" className="text-foreground hover:bg-muted/50 focus:bg-muted/50 rounded-xl">All time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={filteredData} margin={{ top: 20, right: 0, left: 0, bottom:  0 }}>
          <defs>
            {isMultiLine ? (
              Object.entries(multipleDataKeys || {}).map(([name, key], index) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={PALETTE_COLORS[index % PALETTE_COLORS.length].stroke}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor={PALETTE_COLORS[index % PALETTE_COLORS.length].stroke}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              ))
            ) : (
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MIDNIGHT_THEME.stroke} stopOpacity={0.2} />
                <stop offset="100%" stopColor={MIDNIGHT_THEME.stroke} stopOpacity={0.05} />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            stroke="hsl(var(--border))"
            strokeOpacity={0.2}
            vertical={false}
          />
          <XAxis
            dataKey="formattedDay"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            interval={Math.ceil(filteredData.length / 10) - 1}
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
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                compactDisplay: "short",
              }).format(value)
            }
            dx={-10}
          />
          <Tooltip
            content={({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
              if (!active || !payload || payload.length === 0) return null;
              
              // Get protocol name from the data key
              const getProtocolName = (key: string) => {
                if (isMultiLine && multipleDataKeys) {
                  // Find the protocol name by looking up the data key in multipleDataKeys
                  const protocolEntry = Object.entries(multipleDataKeys).find(([_, value]) => value === key);
                  return protocolEntry ? protocolEntry[0] : key;
                }
                return title;
              };

              return (
                <div className="rounded-lg bg-popover p-4 shadow-md border border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    {(() => {
                      const [day, month, year] = label.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date);
                    })()}
                  </p>
                  {payload.map((entry: any, index: number) => {
                    const displayName = getProtocolName(entry.dataKey);
                    return (
                      <div key={index} className="flex items-center justify-between gap-8">
                        <div className="flex items-center gap-2">
                          {isMultiLine && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                          )}
                          <p
                            className="text-sm font-medium"
                            style={{ color: entry.color }}
                          >
                            {displayName}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Intl.NumberFormat("en-US", {
                            notation: "compact",
                            compactDisplay: "short",
                          }).format(entry.value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          {isMultiLine ? (
            // Render multiple lines for different protocols
            Object.entries(multipleDataKeys || {}).map(([name, key], idx) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={PALETTE_COLORS[idx % PALETTE_COLORS.length].stroke}
                strokeWidth={1.5}
                dot={false}
                fill={`url(#gradient-${key})`}
                fillOpacity={0.1}
                hide={!activeKeys.has(key)}
              />
            ))
          ) : (
            // Render single line for specific protocol
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={MIDNIGHT_THEME.stroke}
              strokeWidth={1.5}
              dot={false}
              fill="url(#colorValue)"
            />
          )}
          {isMultiLine && (
            <Legend 
              wrapperStyle={{ 
                paddingTop: 20,
                color: '#E5E7EB',
                fontSize: '14px',
                cursor: 'pointer'
              }}
              verticalAlign="bottom"
              content={() => {
                const legendItems = Object.entries(multipleDataKeys || {}).map(([name, key], idx) => ({
                  name,
                  key,
                  color: PALETTE_COLORS[idx % PALETTE_COLORS.length].stroke,
                  active: activeKeys.has(key)
                }));

                return (
                  <div className="flex gap-4 justify-center">
                    <div 
                      className="flex items-center cursor-pointer select-none"
                      onClick={() => {
                        setActiveKeys(prev => {
                          const allKeys = Object.values(multipleDataKeys || {});
                          return prev.size === allKeys.length ? new Set() : new Set(allKeys);
                        });
                      }}
                    >
                      <div 
                        className={`w-4 h-4 rounded-xl border-2 transition-colors ${
                          activeKeys.size === Object.keys(multipleDataKeys || {}).length ? 'bg-current' : 'bg-transparent'
                        }`}
                        style={{ 
                          borderColor: 'hsl(var(--muted-foreground))',
                          color: 'hsl(var(--muted-foreground))'
                        }}
                      />
                      <span className="ml-2 text-sm text-muted-foreground">All</span>
                    </div>
                    {legendItems.map(item => (
                      <div 
                        key={item.key}
                        className="flex items-center cursor-pointer select-none"
                        onClick={() => {
                          setActiveKeys(prev => {
                            const newKeys = new Set(prev);
                            if (newKeys.has(item.key)) {
                              newKeys.delete(item.key);
                            } else {
                              newKeys.add(item.key);
                            }
                            return newKeys;
                          });
                        }}
                      >
                        <div 
                          className={`w-4 h-4 rounded-xl border-2 transition-colors ${item.active ? 'bg-current' : 'bg-transparent'}`}
                          style={{ 
                            borderColor: item.color,
                            color: item.color
                          }}
                        />
                        <span className="ml-2 text-sm text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
