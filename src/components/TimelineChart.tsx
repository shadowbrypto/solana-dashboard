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
              backgroundColor: "#1F2937",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.5)",
              borderRadius: "0.5rem",
              padding: "1rem",
              color: "#E5E7EB",
            }}
            labelFormatter={(label: string) => {
              const [day, month, year] = label.split('-');
              const date = new Date(`${year}-${month}-${day}`);
              return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
            }}
            formatter={(value: any) => [
              typeof value === 'number' ? new Intl.NumberFormat("en-US", {
                notation: "compact",
                maximumFractionDigits: 2,
              }).format(value) : value,
            ]}
          />
          {isMultiLine && multipleDataKeys ? (
            // Render multiple lines for different protocols
            Object.entries(multipleDataKeys).map(([name, key]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={name}
                stroke={PROTOCOL_COLORS[name as keyof typeof PROTOCOL_COLORS]}
                fill={`url(#${name.toLowerCase().replace(' ', '')}Gradient)`}
                strokeWidth={2}
                fillOpacity={0.5}
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
                paddingTop: '24px',
                color: '#E5E7EB',
                fontSize: '14px',
              }}
              iconType="square"
              iconSize={10}
              verticalAlign="top"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
