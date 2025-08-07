import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
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
import { useMemo } from "react";
import { CalendarDays, TrendingUp, Clock } from "lucide-react";
import { ComponentActions } from '../ComponentActions';

interface VolumeMilestoneChartProps {
  title: string;
  subtitle?: string;
  data: {
    date: string;
    volume_usd: number;
    [key: string]: any;
  }[];
  protocolColor?: string;
  loading?: boolean;
}

interface MilestoneData {
  milestone: string;
  volume: number;
  date: string;
  daysToReach: number;
  daysSincePrevious: number;
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
};

const calculateDaysBetween = (date1: string, date2: string): number => {
  if (!date1 || !date2) return 0;
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

export function VolumeMilestoneChart({ 
  title, 
  subtitle,
  data,
  protocolColor = "hsl(var(--primary))",
  loading
}: VolumeMilestoneChartProps) {
  // Early return if no data or loading
  if (loading || !data || !Array.isArray(data) || data.length === 0) {
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
                  <div className="w-24 h-4 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const milestoneData = useMemo(() => {
    try {
      // Filter out any entries without required data
      const validData = data.filter(d => d && d.date && typeof d.volume_usd === 'number');
      if (validData.length === 0) {
        return [];
      }

      // Sort data by date to ensure chronological order
      const sortedData = [...validData].sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch {
          return 0;
        }
      });

      let cumulativeVolume = 0;
      const milestones: MilestoneData[] = [];
      let nextMilestone = 1_000_000_000; // Start at 1 billion
      const firstDate = sortedData[0]?.date;
      let lastMilestoneDate = firstDate;

      if (!firstDate) return [];

      for (const day of sortedData) {
        if (!day || !day.date || typeof day.volume_usd !== 'number') continue;
        
        cumulativeVolume += day.volume_usd;
        
        while (cumulativeVolume >= nextMilestone) {
          const daysToReach = calculateDaysBetween(firstDate, day.date);
          const daysSincePrevious = calculateDaysBetween(lastMilestoneDate, day.date);
          
          milestones.push({
            milestone: `$${nextMilestone / 1_000_000_000}B`,
            volume: nextMilestone,
            date: day.date,
            daysToReach,
            daysSincePrevious: milestones.length === 0 ? daysToReach : daysSincePrevious
          });
          
          lastMilestoneDate = day.date;
          nextMilestone += 1_000_000_000;
        }
      }

      // Add current total if it's significant (at least 100M above last milestone)
      if (cumulativeVolume > (milestones.length > 0 ? milestones[milestones.length - 1].volume + 100_000_000 : 100_000_000)) {
        const lastDate = sortedData[sortedData.length - 1]?.date;
        if (lastDate) {
          const daysToReach = calculateDaysBetween(firstDate, lastDate);
          const daysSincePrevious = milestones.length > 0 
            ? calculateDaysBetween(lastMilestoneDate, lastDate)
            : daysToReach;

          milestones.push({
            milestone: `$${(cumulativeVolume / 1_000_000_000).toFixed(2)}B`,
            volume: cumulativeVolume,
            date: lastDate,
            daysToReach,
            daysSincePrevious
          });
        }
      }

      return milestones;
    } catch (error) {
      return [];
    }
  }, [data]);

  if (milestoneData.length === 0) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No volume milestones reached yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ComponentActions 
      componentName={`${title} Volume Milestone Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Volume_Milestone_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">{title}</CardTitle>
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
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
            <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1 sm:gap-2 bg-muted/30 px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full border">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-[10px] sm:text-sm">Active since {(milestoneData[milestoneData.length - 1]?.daysToReach || 0) + 1} days</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 px-1 pb-0 sm:pt-4 sm:px-4 sm:pb-2">
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart
              data={milestoneData}
              margin={{
                top: 10,
                right: 5,
                bottom: 12,
                left: 0,
              }}
              className="sm:m-[20px_10px_45px_10px]"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border"
                stroke="hsl(var(--border))"
                strokeOpacity={0.2}
              />
              <XAxis
                dataKey="milestone"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }}
                angle={0}
                textAnchor="middle"
                height={20}
                className="sm:!h-[25px]"
                interval="preserveStartEnd"
                dy={5}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                className="sm:!w-[40px]"
                tickFormatter={(value) => `${value}`}
                width={20}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MilestoneData;
                    return (
                      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
                        <div className="space-y-2">
                          <div className="font-semibold text-foreground">{data.milestone} Milestone</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Date reached:</span>
                              <span className="font-medium">{formatDate(data.date)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Days from start:</span>
                              <span className="font-medium">{data.daysToReach} days</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Days since previous:</span>
                              <span className="font-medium text-primary">{data.daysSincePrevious} days</span>
                            </div>
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
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              />
              <Bar
                dataKey="daysSincePrevious"
                fill={protocolColor}
                fillOpacity={0.8}
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              >
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
          
          {/* Summary Stats */}
          <div className="mt-0 grid grid-cols-3 gap-2 sm:gap-4 border-t pt-0">
            <div className="text-center py-2 sm:py-4">
              <div className="text-lg sm:text-2xl font-bold text-foreground">
                {milestoneData.length}
              </div>
              <div className="text-[10px] sm:text-sm text-muted-foreground">Milestones</div>
            </div>
            <div className="text-center py-2 sm:py-4">
              <div className="text-lg sm:text-2xl font-bold text-foreground">
                {milestoneData.length > 0 ? Math.round((milestoneData[milestoneData.length - 1]?.daysToReach || 0) / milestoneData.length) : 0}
              </div>
              <div className="text-[10px] sm:text-sm text-muted-foreground">Avg Days/Billion</div>
            </div>
            <div className="text-center py-2 sm:py-4">
              <div className="text-lg sm:text-2xl font-bold text-foreground">
                ${((milestoneData[milestoneData.length - 1]?.volume || 0) / 1e9).toFixed(2)}B
              </div>
              <div className="text-[10px] sm:text-sm text-muted-foreground">Total Volume</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}