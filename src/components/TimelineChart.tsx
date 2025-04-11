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
import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Legend,
} from "recharts";

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
    <Card className="bg-black/95 border-gray-800 hover:bg-black/90 transition-colors duration-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-white/90">{title}</CardTitle>
        <Select value={timeframe} onValueChange={(value: string) => setTimeframe(value as TimeFrame)}>
          <SelectTrigger className="w-[140px] bg-black/50 text-white border-gray-700">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent className="bg-black/90 border-gray-700 text-white">
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="3m">Last 3 months</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={filteredData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="25%" stopColor="#BC2AF8" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#BC2AF8" stopOpacity={0} />
            </linearGradient>
            {/* Add gradients for each protocol */}
            <linearGradient id="bullxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="25%" stopColor={PROTOCOL_COLORS['Bull X']} stopOpacity={0.7} />
              <stop offset="100%" stopColor={PROTOCOL_COLORS['Bull X']} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="photonGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="25%" stopColor={PROTOCOL_COLORS['Photon']} stopOpacity={0.7} />
              <stop offset="100%" stopColor={PROTOCOL_COLORS['Photon']} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trojanGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="25%" stopColor={PROTOCOL_COLORS['Trojan']} stopOpacity={0.7} />
              <stop offset="100%" stopColor={PROTOCOL_COLORS['Trojan']} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="formattedDay"
            tick={{ fill: "#9CA3AF" }}
            axisLine={{ stroke: "#374151" }}
            tickFormatter={(value: string) => {
              const [day, month, year] = value.split('-');
              const date = new Date(`${year}-${month}-${day}`);
              return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
            }}
          />
          <YAxis
            tick={{ fill: "#9CA3AF" }}
            axisLine={{ stroke: "#374151" }}
            tickFormatter={(value) =>
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                compactDisplay: "short",
              }).format(value)
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              border: '1px solid rgba(75, 85, 99, 0.4)',
              borderRadius: '8px',
              padding: '12px 16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
            labelStyle={{ 
              color: '#F3F4F6',
              fontSize: '16px',
              fontWeight: 500,
              marginBottom: '8px',
            }}
            itemStyle={{ 
              color: '#D1D5DB',
              fontSize: '14px',
              padding: '4px 0',
            }}
            labelFormatter={(label: string) => {
              const [day, month, year] = label.split('-');
              const date = new Date(`${year}-${month}-${day}`);
              return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
            }}
            formatter={(value: any, name: string) => [
              new Intl.NumberFormat('en-US', {
                notation: 'standard',
                maximumFractionDigits: 0,
              }).format(value),
              name
            ]}
            separator="  "
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
              stroke="#BC2AF8"
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          )}
          {isMultiLine && (
            <Legend 
              wrapperStyle={{ 
                paddingTop: '16px',
                color: '#E5E7EB',
                fontSize: '14px',
                cursor: 'pointer'
              }}
              iconType="square"
              iconSize={10}
              verticalAlign="bottom"
              onClick={(e: any) => {
                const dataKey = e.dataKey as string;
                setActiveKeys(prev => {
                  const newKeys = new Set(prev);
                  if (dataKey === 'all') {
                    if (newKeys.has('all')) {
                      // If 'all' is being deselected, keep it and clear others
                      newKeys.clear();
                      newKeys.add('all');
                    } else {
                      // If 'all' is being selected, add everything
                      newKeys.clear();
                      newKeys.add('all');
                      Object.values(multipleDataKeys || {}).forEach(key => newKeys.add(key));
                    }
                  } else {
                    // Remove 'all' when selecting individual items
                    newKeys.delete('all');
                    if (newKeys.has(dataKey)) {
                      newKeys.delete(dataKey);
                      // If nothing is selected, select 'all'
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
                { value: 'All', type: 'line' as const, color: '#9CA3AF', dataKey: 'all', inactive: !activeKeys.has('all') },
                ...Object.entries(multipleDataKeys || {}).map(([name, key]: [string, string]) => ({
                  value: name,
                  type: 'line' as const,
                  color: key.includes('bullx') ? '#BC2AF8' : key.includes('photon') ? '#FF4444' : '#00E0B0',
                  dataKey: key,
                  inactive: !activeKeys.has(key)
                }))
              ]}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
