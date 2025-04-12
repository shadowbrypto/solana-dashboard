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

// Color palette for different protocols
const PROTOCOL_COLORS = {
  'Bull X': 'hsl(var(--chart-1))',  // Blue
  'Photon': 'hsl(var(--chart-2))',  // Green
  'Trojan': 'hsl(var(--chart-3))',  // Orange
};

export function TimelineChart({ 
  title, 
  data, 
  dataKey, 
  multipleDataKeys, 
  isMultiLine = false 
}: TimelineChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set(['all', ...(multipleDataKeys ? Object.values(multipleDataKeys) : [dataKey])]));

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
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
            </linearGradient>
            {/* Add gradients for each protocol */}
            <linearGradient id="bullxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="photonGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.05} />
            </linearGradient>
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
              
              // Map data keys to display names
              const displayNames: Record<string, string> = isMultiLine && multipleDataKeys ? multipleDataKeys : { [dataKey]: title };

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
                    const displayName = displayNames[entry.dataKey] || entry.dataKey;
                    return (
                      <div key={index} className="flex items-center justify-between gap-8">
                        <p
                          className="text-sm font-medium"
                          style={{ color: entry.color }}
                        >
                          {displayName}
                        </p>
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
          {isMultiLine && multipleDataKeys ? (
            // Render multiple lines for different protocols
            Object.entries(multipleDataKeys).map(([name, key]: [string, string]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={activeKeys.has(key) ? key : ''}
                name={name}
                stroke={key.includes('bullx') ? PROTOCOL_COLORS['Bull X'] : key.includes('photon') ? PROTOCOL_COLORS['Photon'] : PROTOCOL_COLORS['Trojan']}
                fill={key.includes('bullx') ? PROTOCOL_COLORS['Bull X'] : key.includes('photon') ? PROTOCOL_COLORS['Photon'] : PROTOCOL_COLORS['Trojan']}
                fillOpacity={0.1}
              />
            ))
          ) : (
            // Render single line for specific protocol
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="hsl(var(--chart-1))"
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
              iconType="square"
              iconSize={16}
              verticalAlign="bottom"
              onClick={(e: any) => {
                const dataKey = e.dataKey as string;
                if (dataKey === 'all') {
                  // Toggle all keys
                  setActiveKeys(prev => {
                    const newKeys = new Set<string>();
                    if (prev.size === (multipleDataKeys ? Object.keys(multipleDataKeys).length : 1)) {
                      // If all keys are active, clear them
                      return newKeys;
                    } else {
                      // If not all keys are active, add all keys
                      Object.values(multipleDataKeys || {}).forEach(key => newKeys.add(key));
                      return newKeys;
                    }
                  });
                } else {
                  // Toggle individual key
                  setActiveKeys(prev => {
                    const newKeys = new Set(prev);
                    if (newKeys.has(dataKey)) {
                      newKeys.delete(dataKey);
                    } else {
                      newKeys.add(dataKey);
                    }
                    return newKeys;
                  });
                }
              }}
              payload={[
                {
                  value: 'All',
                  type: 'rect' as const,
                  color: 'hsl(var(--muted-foreground))',
                  dataKey: 'all',
                  inactive: activeKeys.size !== (multipleDataKeys ? Object.keys(multipleDataKeys).length : 1)
                },
                ...Object.entries(multipleDataKeys || {}).map(([name, key]: [string, string]) => ({
                  value: name,
                  type: 'rect' as const,
                  color: key.includes('bullx') ? PROTOCOL_COLORS['Bull X'] : key.includes('photon') ? PROTOCOL_COLORS['Photon'] : PROTOCOL_COLORS['Trojan'],
                  dataKey: key,
                  inactive: !activeKeys.has(key)
                }))
              ]}
              content={({ payload }) => {
                if (!payload) return null;
                return (
                  <div className="flex gap-4">
                    {payload.map((entry: any) => (
                      <div 
                        key={entry.dataKey}
                        className="flex items-center cursor-pointer select-none"
                        onClick={() => {
                          const e = { dataKey: entry.dataKey };
                          if (typeof entry.onClick === 'function') {
                            entry.onClick(e);
                          }
                        }}
                      >
                        <div 
                          className={`w-4 h-4 rounded-xl border-2 transition-colors ${entry.inactive ? 'bg-transparent' : 'bg-current'}`}
                          style={{ 
                            borderColor: entry.color,
                            color: entry.color
                          }}
                        />
                        <span className="ml-2 text-sm text-muted-foreground">{entry.value}</span>
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
