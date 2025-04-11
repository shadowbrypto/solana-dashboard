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
  'Bull X': '#BC2AF8',  // Purple
  'Photon': '#FF6B6B',  // Red
  'Trojan': '#4ECDC4',  // Teal
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
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-0">
        <div>
          <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
        </div>
        <Select value={timeframe} onValueChange={(value: string) => setTimeframe(value as TimeFrame)}>
          <SelectTrigger className="w-[140px] bg-background text-foreground border-border hover:bg-muted transition-colors">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            <SelectItem value="7d" className="text-foreground hover:bg-muted focus:bg-muted focus:text-foreground">Last 7 days</SelectItem>
            <SelectItem value="30d" className="text-foreground hover:bg-muted focus:bg-muted focus:text-foreground">Last 30 days</SelectItem>
            <SelectItem value="3m" className="text-foreground hover:bg-muted focus:bg-muted focus:text-foreground">Last 3 months</SelectItem>
            <SelectItem value="all" className="text-foreground hover:bg-muted focus:bg-muted focus:text-foreground">All time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={filteredData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
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
            content={({ active, payload, label }: TooltipProps<number, string>) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border border-border bg-popover p-2 shadow-md">
                    <div className="text-sm text-muted-foreground mb-1">
                      {(() => {
                        const [rawDay, rawMonth, rawYear] = label.split('-');
                        const date = new Date(`${rawYear}-${rawMonth}-${rawDay}`);
                        return new Intl.DateTimeFormat('en-US', { 
                          day: 'numeric', 
                          month: 'short',
                          year: 'numeric'
                        }).format(date);
                      })()}
                    </div>
                    <div className="space-y-1">
                      {payload.map((entry: any, index: number) => {
                        const color = isMultiLine
                          ? (typeof entry.dataKey === 'string' && entry.dataKey.includes('bullx')
                            ? '#BC2AF8'
                            : typeof entry.dataKey === 'string' && entry.dataKey.includes('photon')
                            ? '#FF4444'
                            : '#00E0B0')
                          : 'hsl(var(--chart-1))';
                        
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-sm" 
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm text-foreground">
                              {title}: {typeof entry.value === 'number'
                                ? new Intl.NumberFormat('en-US', {
                                    notation: 'compact',
                                    maximumFractionDigits: 0,
                                    compactDisplay: 'short'
                                  }).format(entry.value)
                                : '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            }}
            labelFormatter={(label: string) => {
              const [day, month, year] = label.split('-');
              const date = new Date(`${year}-${month}-${day}`);
              return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date);
            }}

          />
          {isMultiLine && multipleDataKeys ? (
            // Render multiple lines for different protocols
            Object.entries(multipleDataKeys).map(([name, key]: [string, string]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={activeKeys.has('all') || activeKeys.has(key) ? key : ''}
                name={name}
                stroke={key.includes('bullx') ? '#BC2AF8' : key.includes('photon') ? '#FF4444' : '#00E0B0'}
                fill={key.includes('bullx') ? '#BC2AF8' : key.includes('photon') ? '#FF4444' : '#00E0B0'}
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
              formatter={(value: string) => (
                <span className="text-foreground ml-2">{value}</span>
              )}
              onClick={(e: any) => {
                const dataKey = e.dataKey as string;
                setActiveKeys(prev => {
                  const newKeys = new Set(prev);
                  if (dataKey === 'all') {
                    if (newKeys.has('all')) {
                      newKeys.clear();
                      newKeys.add('all');
                    } else {
                      newKeys.clear();
                      newKeys.add('all');
                      Object.values(multipleDataKeys || {}).forEach(key => newKeys.add(key));
                    }
                  } else {
                    newKeys.delete('all');
                    if (newKeys.has(dataKey)) {
                      newKeys.delete(dataKey);
                      if (newKeys.size === 0) {
                        newKeys.add('all');
                        Object.values(multipleDataKeys || {}).forEach(key => newKeys.add(key));
                      }
                    } else {
                      newKeys.add(dataKey);
                    }
                  }
                  return newKeys;
                });
              }}
              payload={[
                ...Object.entries(multipleDataKeys || {}).map(([name, key]: [string, string]) => ({
                  value: name,
                  type: 'rect' as const,
                  color: key.includes('bullx') ? '#BC2AF8' : key.includes('photon') ? '#FF4444' : '#00E0B0',
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
                          className={`w-4 h-4 rounded border-2 transition-colors ${entry.inactive ? 'bg-transparent' : 'bg-current'}`}
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
