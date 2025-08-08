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
import { useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolById, getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import { ComponentActions } from '../ComponentActions';
import { TimeframeSelector, type TimeFrame } from '../ui/timeframe-selector';
import { DateRangeSelector } from '../ui/DateRangeSelector';
import { subDays, startOfDay, endOfDay } from 'date-fns';
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
  const [timeframe, setTimeframe] = useState<TimeFrame>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? "30d" : "3m";
    }
    return "30d";
  });
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("volume");
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [showDateRangeSelector, setShowDateRangeSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => startOfDay(subDays(new Date(), 90)));
  const [customEndDate, setCustomEndDate] = useState(() => endOfDay(new Date()));

  // Handle window resize for responsive timeframe
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const newTimeframe = window.innerWidth < 640 ? "30d" : "3m";
        setTimeframe(newTimeframe);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Early return if no data
  if (!data || !Array.isArray(data)) {
    return null;
  }

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let timeFilteredData = data.filter(d => d && (d.date || d.formattedDay));

    if (isCustomRange) {
      // Apply custom date range filter
      timeFilteredData = timeFilteredData.filter((item) => {
        if (item.formattedDay) {
          const [day, month, year] = item.formattedDay.split("-");
          const itemDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
          );
          return itemDate >= customStartDate && itemDate <= customEndDate;
        } else if (item.date) {
          const itemDate = new Date(item.date);
          return itemDate >= customStartDate && itemDate <= customEndDate;
        }
        return false;
      });
    } else if (timeframe !== "all") {
      const now = new Date();
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
      
      timeFilteredData = timeFilteredData.filter(day => {
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

    return timeFilteredData;
  }, [data, timeframe, isCustomRange, customStartDate, customEndDate]);

  const chartData = useMemo(() => {
    const categories = getMutableAllCategories();

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
  }, [filteredData, selectedMetric]);

  if (loading) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="flex flex-col gap-3 border-b p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 sm:h-5 sm:w-40 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex justify-between items-center w-full">
            <div className="w-[90px] sm:w-32 h-8 bg-muted animate-pulse rounded-lg" />
            <div className="flex gap-1">
              <div className="w-16 sm:w-20 h-8 bg-muted animate-pulse rounded-lg" />
              <div className="w-8 h-8 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-0 px-2 sm:pt-6 sm:pb-6 sm:px-6">
          <div className="space-y-2 sm:space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-16 sm:w-20 h-3 sm:h-4 bg-muted animate-pulse rounded" />
                <div className="flex-1 h-5 sm:h-6 bg-muted animate-pulse rounded" />
                <div className="w-12 sm:w-16 h-3 sm:h-4 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ComponentActions 
      componentName={`${title} Category Horizontal Bar Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Category_Horizontal_Bar_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="flex flex-col gap-3 border-b p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 w-full">
            <div className="flex flex-col">
              <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">
                <span className="sm:hidden">Total Metrics - {metricLabels[selectedMetric]}</span>
                <span className="hidden sm:inline">Total Metrics by Category - {metricLabels[selectedMetric]}</span>
              </CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                All Trading Apps
              </p>
            </div>
            <div className="flex justify-between items-center w-full sm:w-auto sm:gap-3">
              <Select value={selectedMetric} onValueChange={(value: string) => setSelectedMetric(value as MetricType)}>
                <SelectTrigger className="w-[90px] sm:w-[120px] h-8 sm:h-9 text-xs bg-background text-foreground border-border hover:bg-muted/50 transition-colors rounded-lg">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground rounded-lg overflow-hidden">
                  <SelectItem value="volume" className="text-xs text-foreground hover:bg-muted/50 rounded focus:bg-muted/50">Volume</SelectItem>
                  <SelectItem value="new_users" className="text-xs text-foreground hover:bg-muted/50 rounded focus:bg-muted/50">New Users</SelectItem>
                  <SelectItem value="trades" className="text-xs text-foreground hover:bg-muted/50 rounded focus:bg-muted/50">Trades</SelectItem>
                  <SelectItem value="fees" className="text-xs text-foreground hover:bg-muted/50 rounded focus:bg-muted/50">Fees</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-1">
                <TimeframeSelector 
                  value={timeframe}
                  className="text-xs"
                  onChange={(value) => {
                    setTimeframe(value);
                    setIsCustomRange(false); // Switch to predefined timeframe mode
                    
                    // Update custom date range to match the selected timeframe
                    const now = new Date();
                    let daysToSubtract: number;
                    
                    switch (value) {
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
                        // For "all", use the full data range
                        if (data && data.length > 0) {
                          const dates = data.map(item => {
                            if (item.formattedDay) {
                              const [day, month, year] = item.formattedDay.split("-");
                              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            } else if (item.date) {
                              return new Date(item.date);
                            }
                            return new Date();
                          });
                          const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
                          setCustomStartDate(startOfDay(earliestDate));
                          setCustomEndDate(endOfDay(now));
                          return;
                        }
                        daysToSubtract = 90;
                    }
                    
                    const newStartDate = startOfDay(new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000));
                    setCustomStartDate(newStartDate);
                    setCustomEndDate(endOfDay(now));
                  }}
                />
                
                {/* Date Range Toggle Button - Hidden on mobile */}
                <div className="relative hidden sm:inline-flex items-center rounded-lg bg-muted p-1 min-w-fit">
                  <button
                    onClick={() => setShowDateRangeSelector(!showDateRangeSelector)}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      showDateRangeSelector
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title={`${showDateRangeSelector ? 'Hide' : 'Show'} date range selector`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showDateRangeSelector ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"} />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-0 px-2 sm:pt-6 sm:pb-6 sm:px-6">
          <ResponsiveContainer width="100%" height={Math.max(chartData.length * (window.innerWidth < 640 ? 40 : 50) + 40, 160)}>
            <RechartsBarChart
              data={chartData}
              layout="vertical"
              margin={{
                top: 15,
                right: window.innerWidth < 640 ? 120 : 180,
                bottom: 15,
                left: 5,
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
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: window.innerWidth < 640 ? 9 : 11 }}
                tickFormatter={metricFormatters[selectedMetric]}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={window.innerWidth < 640 ? false : { fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                width={window.innerWidth < 640 ? 0 : 100}
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
                barSize={window.innerWidth < 640 ? 24 : 30}
                fill="none"
                radius={[4, 4, 4, 4]}
                maxBarSize={window.innerWidth < 640 ? 24 : 30}
              >
                <LabelList
                  dataKey="protocols"
                  position="right"
                  content={(props) => {
                    const { x, y, width, height, value } = props;
                    if (!value || !Array.isArray(value)) return null;
                    
                    const isMobile = window.innerWidth < 640;
                    const protocols = value.slice(0, isMobile ? 2 : 3);
                    const avatarSize = isMobile ? 18 : 22;
                    const overlap = isMobile ? 6 : 8;
                    const startX = (x as number) + (width as number) + (isMobile ? 8 : 15);
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
                                  borderRadius: isMobile ? '6px' : '8px',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))'
                                }}>
                                  <img 
                                    src={`/assets/logos/${protocolConfig.id.includes('terminal') ? protocolConfig.id.split(' ')[0] : protocolConfig.id}.jpg`}
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
                        {value.length > (isMobile ? 2 : 3) && (
                          <g transform={`translate(${startX + (isMobile ? 2 : 3) * (avatarSize - overlap)}, ${centerY - avatarSize / 2})`}>
                            <foreignObject x="0" y="0" width={avatarSize} height={avatarSize}>
                              <div style={{
                                width: `${avatarSize}px`,
                                height: `${avatarSize}px`,
                                borderRadius: isMobile ? '6px' : '8px',
                                backgroundColor: 'hsl(var(--muted))',
                                border: '1px solid hsl(var(--border))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'hsl(var(--muted-foreground))',
                                fontSize: isMobile ? '8px' : '10px',
                                fontWeight: '500'
                              }}>
                                +{value.length - (isMobile ? 2 : 3)}
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
                  offset={window.innerWidth < 640 ? 60 : 90}
                  formatter={metricFormatters[selectedMetric]}
                  style={{
                    fill: "hsl(var(--foreground))",
                    fontSize: window.innerWidth < 640 ? "11px" : "13px",
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
          
          {/* Date range selector - animated smooth reveal */}
          <div 
            className={`transition-all duration-200 ease-out ${
              showDateRangeSelector 
                ? 'max-h-96 opacity-100 mt-2 pt-3 sm:mt-6 sm:pt-6 border-t border-border' 
                : 'max-h-0 opacity-0 overflow-hidden'
            }`}
          >
            <DateRangeSelector
              startDate={customStartDate}
              endDate={customEndDate}
              onRangeChange={(start, end) => {
                setCustomStartDate(start);
                setCustomEndDate(end);
                setIsCustomRange(true); // Switch to custom range mode
              }}
              minDate={(() => {
                // Find the earliest date in the data
                if (!data || data.length === 0) return undefined;
                const dates = data.map(item => {
                  if (item.formattedDay) {
                    const [day, month, year] = item.formattedDay.split("-");
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  } else if (item.date) {
                    return new Date(item.date);
                  }
                  return new Date();
                });
                return new Date(Math.min(...dates.map(d => d.getTime())));
              })()}
              maxDate={new Date()}
              data={data}
              dataKey={`${getMutableProtocolsByCategory(getMutableAllCategories()[0])[0]?.id.replace(/\s+/g, '_')}_${selectedMetric}`} // Use first protocol and selected metric
            />
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}