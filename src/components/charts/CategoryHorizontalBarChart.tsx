import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
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
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolById, getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";

type TimeFrame = "7d" | "30d" | "3m" | "6m" | "1y" | "all";
type MetricType = "volume" | "new_users" | "trades" | "fees";

interface CategoryHorizontalBarChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  loading?: boolean;
}

const metricLabels: Record<MetricType, string> = {
  volume: "Volume",
  new_users: "New Users", 
  trades: "Trades",
  fees: "Fees"
};

const metricFormatters: Record<MetricType, (value: number) => string> = {
  volume: (value) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  },
  new_users: (value) => value.toLocaleString(),
  trades: (value) => value.toLocaleString(),
  fees: (value) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  }
};

const categoryColors = [
  "hsl(210 100% 50%)", // Blue for Trading Terminals
  "hsl(120 100% 40%)", // Green for Telegram Bots  
  "hsl(45 100% 50%)"   // Yellow for Mobile Apps
];

export function CategoryHorizontalBarChart({ 
  title, 
  subtitle,
  data,
  loading
}: CategoryHorizontalBarChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("volume");

  // Early return if no data
  if (!data || !Array.isArray(data)) {
    return null;
  }

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    const categories = getMutableAllCategories();
    const now = new Date();
    let filteredData = data.filter(d => d && (d.date || d.formattedDay));

    // Filter data by timeframe
    if (timeframe !== "all") {
      let daysToSubtract: number;
      switch (timeframe) {
        case "7d": daysToSubtract = 7; break;
        case "30d": daysToSubtract = 30; break;
        case "3m": daysToSubtract = 90; break;
        case "6m": daysToSubtract = 180; break;
        case "1y": daysToSubtract = 365; break;
        default: daysToSubtract = 90;
      }

      const cutoffDate = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
      
      filteredData = filteredData.filter(day => {
        // For aggregated data, we need to parse the formattedDay (DD-MM-YYYY format)
        if (day.formattedDay) {
          const [dayPart, monthPart, yearPart] = day.formattedDay.split('-');
          const dayDate = new Date(parseInt(yearPart), parseInt(monthPart) - 1, parseInt(dayPart));
          return dayDate >= cutoffDate;
        } else if (day.date) {
          const dayDate = new Date(day.date);
          return dayDate >= cutoffDate;
        }
        return false;
      });
    }

    // Calculate totals for each category
    const categoryTotals = categories.map((category, index) => {
      const protocolsInCategory = getMutableProtocolsByCategory(category);
      
      const total = filteredData.reduce((sum, day) => {
        if (!day) return sum;
        
        const categoryValue = protocolsInCategory.reduce((categorySum, protocol) => {
          const key = `${protocol.id.replace(/\s+/g, '_')}_${selectedMetric}`;
          const value = day[key];
          return categorySum + (typeof value === 'number' ? value : 0);
        }, 0);
        return sum + categoryValue;
      }, 0);

      return {
        name: category,
        value: total,
        color: categoryColors[index] || `hsl(${index * 120} 70% 50%)`,
        protocols: protocolsInCategory
      };
    });

    return categoryTotals
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, timeframe, selectedMetric]);

  if (loading) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-20 h-4 bg-muted animate-pulse rounded" />
                <div className="flex-1 h-6 bg-muted animate-pulse rounded" />
                <div className="w-16 h-4 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b gap-3 sm:gap-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium text-card-foreground">
            {title} - {metricLabels[selectedMetric]}
          </CardTitle>
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={selectedMetric} onValueChange={(value: string) => setSelectedMetric(value as MetricType)}>
            <SelectTrigger className="w-full sm:w-[120px] bg-background text-foreground border-border hover:bg-muted/50 transition-colors rounded-xl">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border text-foreground rounded-xl overflow-hidden">
              <SelectItem value="volume" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Volume</SelectItem>
              <SelectItem value="new_users" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">New Users</SelectItem>
              <SelectItem value="trades" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Trades</SelectItem>
              <SelectItem value="fees" className="text-foreground hover:bg-muted/50 rounded-xl focus:bg-muted/50">Fees</SelectItem>
            </SelectContent>
          </Select>
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
        </div>
      </CardHeader>
      <CardContent className="pt-2 px-2">
        <ResponsiveContainer width="100%" height={Math.max(chartData.length * 50 + 40, 200)}>
          <RechartsBarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 20,
              right: 100,
              bottom: 20,
              left: 10,
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
              tickFormatter={metricFormatters[selectedMetric]}
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
                  const categoryData = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">
                            {categoryData.name}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {metricFormatters[selectedMetric](categoryData.value as number)}
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
              barSize={30}
              fill="none"
              radius={[4, 4, 4, 4]}
              maxBarSize={30}
            >
              <LabelList
                dataKey="protocols"
                position="right"
                content={(props) => {
                  const { x, y, width, height, value } = props;
                  if (!value || !Array.isArray(value)) return null;
                  
                  const protocols = value.slice(0, 3);
                  const avatarSize = 22;
                  const overlap = 8; // How much avatars overlap
                  const startX = (x as number) + (width as number) + 10; // Position outside bar with less gap
                  const centerY = (y as number) + (height as number) / 2;
                  
                  return (
                    <g>
                      {protocols.map((protocolConfig, index) => {
                        const avatarX = startX + index * (avatarSize - overlap);
                        const avatarY = centerY - avatarSize / 2;
                        
                        return (
                          <g key={protocolConfig.id} transform={`translate(${avatarX}, ${avatarY})`} style={{ zIndex: 10 - index }}>
                            <foreignObject x="0" y="0" width={avatarSize} height={avatarSize}>
                              <div style={{
                                width: `${avatarSize}px`,
                                height: `${avatarSize}px`,
                                borderRadius: '8px',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))'
                              }}>
                                <img 
                                  src={`/src/assets/logos/${protocolConfig.id.includes('terminal') ? protocolConfig.id.split(' ')[0] : protocolConfig.id}.jpg`}
                                  alt={protocolConfig.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            </foreignObject>
                          </g>
                        );
                      })}
                      {value.length > 3 && (
                        <g transform={`translate(${startX + 3 * (avatarSize - overlap)}, ${centerY - avatarSize / 2})`}>
                          <foreignObject x="0" y="0" width={avatarSize} height={avatarSize}>
                            <div style={{
                              width: `${avatarSize}px`,
                              height: `${avatarSize}px`,
                              borderRadius: '8px',
                              backgroundColor: 'hsl(var(--muted))',
                              border: '1px solid hsl(var(--border))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'hsl(var(--muted-foreground))',
                              fontSize: '10px',
                              fontWeight: '500'
                            }}>
                              +{value.length - 3}
                            </div>
                          </foreignObject>
                        </g>
                      )}
                    </g>
                  );
                }}
              />
              <LabelList
                dataKey="value"
                position="right"
                offset={80}
                formatter={metricFormatters[selectedMetric]}
                style={{
                  fill: "hsl(var(--foreground))",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              />
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
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