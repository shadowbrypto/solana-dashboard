import { Card, Title } from "@tremor/react";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Legend,
} from "recharts";

interface TimelineChartProps {
  title: string;
  data: any[];
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
  return (
    <Card className="bg-black rounded-lg p-4 border-0 hover:bg-black/80 transition-colors duration-200">
      <Title className="text-lg font-medium mb-6 text-white/90">{title}</Title>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={[...data].reverse()}>
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
            formatter={(value: number) => [
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                maximumFractionDigits: 2,
              }).format(value),
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
          {isMultiLine && <Legend wrapperStyle={{ color: '#E5E7EB' }} />}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
