import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { ComponentActions } from '../ComponentActions';
import { TimeframeSelector } from '../ui/timeframe-selector';

type EVMTimeFrame = "7d" | "30d" | "90d" | "1y";

interface EVMDailyChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  dataKeys: string[];
  labels: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  loading?: boolean;
  timeframe: EVMTimeFrame;
  onTimeframeChange: (timeframe: EVMTimeFrame) => void;
}

function formatNumberWithSuffix(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

export function EVMDailyChart({ 
  title, 
  subtitle,
  data,
  dataKeys,
  labels,
  colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
  valueFormatter = (value: number) => `${value.toLocaleString()}`,
  loading,
  timeframe,
  onTimeframeChange,
}: EVMDailyChartProps) {
  if (loading) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ComponentActions 
      componentName={`${title} EVM Daily Chart`}
      filename={`${title.replace(/\s+/g, '_')}_EVM_Daily_Chart.png`}
    >
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
                            src={`/assets/logos/${getProtocolLogoFilename(protocolMatch.id)}`}
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
          <TimeframeSelector 
            value={timeframe as any}
            onChange={(value) => onTimeframeChange(value as EVMTimeFrame)}
            options={["7d", "30d", "90d", "1y" as any]}
          />
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="formattedDay" 
                tick={{ fontSize: 11 }}
                tickMargin={8}
                interval={'preserveStartEnd'}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={formatNumberWithSuffix}
              />
              <Tooltip
                content={({ active, payload, label }: TooltipProps<any, any>) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                        <p className="text-sm font-medium mb-2">{label}</p>
                        <div className="space-y-1">
                          {payload.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <div 
                                className="w-3 h-3 rounded-sm" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-muted-foreground">
                                {labels[dataKeys.indexOf(entry.dataKey as string)] || entry.dataKey}:
                              </span>
                              <span className="font-medium">
                                {valueFormatter(entry.value || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-border pt-2 mt-2">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="text-muted-foreground">Total:</span>
                            <span>
                              {valueFormatter(
                                payload.reduce((sum, entry) => sum + (entry.value || 0), 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">
                    {labels[dataKeys.indexOf(value)] || value}
                  </span>
                )}
              />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="volume"
                  fill={colors[index % colors.length]}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}