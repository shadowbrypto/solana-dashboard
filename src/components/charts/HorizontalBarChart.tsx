import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ProtocolLogo } from '../ui/logo-with-fallback';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { ComponentActions } from '../ComponentActions';
import { useState, useMemo, useEffect } from "react";
import { getProtocolById, getProtocolLogoFilename, protocolConfigs } from "../../lib/protocol-config";
import { TimeframeSelector, type TimeFrame } from '../ui/timeframe-selector';

import { HorizontalBarChartSkeleton } from "./HorizontalBarChartSkeleton";

interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  data: {
    name: string;
    value: number;
    color?: string;
    values?: {
      value: number;
      date: string;
    }[];
  }[];
  valueFormatter?: (value: number) => string;
  loading?: boolean;
}

const formatNumber = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return (value / 1e9).toFixed(2) + 'b';
  } else if (absValue >= 1e6) {
    return (value / 1e6).toFixed(2) + 'm';
  } else if (absValue >= 1e3) {
    return (value / 1e3).toFixed(2) + 'k';
  }
  return value.toFixed(2);
};

export function HorizontalBarChart({ 
  title, 
  subtitle,
  data,
  valueFormatter = formatNumber,
  loading
}: HorizontalBarChartProps) {
  if (loading) {
    return <HorizontalBarChartSkeleton />;
  }
  const [timeframe, setTimeframe] = useState<TimeFrame>("3m");
  const [isMobile, setIsMobile] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredData = useMemo(() => {
    if (timeframe === "all") {
      return data
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);
    }

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
      case "6m":
        daysToSubtract = 180;
        break;
      case "1y":
        daysToSubtract = 365;
        break;
      default:
        daysToSubtract = 90;
    }

    const cutoffDate = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));

    return data.map(item => {
      if (!item.values) return item;
      const filteredValues = item.values.filter(v => {
        if (!v.date) return false;
        const [year, month, day] = v.date.split('-').map(Number);
        const itemDate = new Date(year, month - 1, day);
        return itemDate >= cutoffDate;
      });
      return {
        ...item,
        value: filteredValues.reduce((sum, v) => sum + v.value, 0)
      };
    })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, timeframe]);

  const displayData = useMemo(() => {
    if (!isMobile || showAll) {
      return filteredData;
    }
    return filteredData.slice(0, 5);
  }, [filteredData, isMobile, showAll]);
  return (
    <ComponentActions 
      componentName={`${title} Horizontal Bar Chart`}
      filename={`${title.replace(/\s+/g, '_')}_Horizontal_Bar_Chart.png`}
    >
      <Card className="bg-card border-border rounded-xl">
      <CardHeader className="border-b p-3 sm:p-6">
        <div className="flex flex-col -gap-1 sm:gap-3">
          <div className="flex items-start sm:items-center justify-between">
            <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">
              <span className="sm:hidden">Total Volume</span>
              <span className="hidden sm:inline">{title}</span>
            </CardTitle>
            <div className="flex items-start sm:items-center">
              <TimeframeSelector 
                value={timeframe}
                className="text-xs"
                onChange={setTimeframe}
              />
            </div>
          </div>
          
          {subtitle && (
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
                {(() => {
                  // Check if subtitle is a protocol name
                  const protocolMatch = protocolConfigs.find(p => p.name === subtitle);
                  if (protocolMatch) {
                    return (
                      <>
                        <ProtocolLogo
                          src={`/assets/logos/${getProtocolLogoFilename(protocolMatch.id)}`}
                          alt={subtitle}
                          size="sm"
                        />
                        {subtitle}
                      </>
                    );
                  }
                  return subtitle;
                })()}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-1 px-2 sm:pt-2 sm:pb-6 sm:px-6">
        <ResponsiveContainer width="100%" height={displayData.length * (isMobile ? 30 : 35) + 20}>
          <RechartsBarChart
            data={displayData}
            layout="vertical"
            margin={{
              top: 0,
              right: isMobile ? 80 : 100,
              bottom: 0,
              left: isMobile ? 8 : 50,
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
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 9 : 11 }}
              tickFormatter={valueFormatter}
              tickCount={isMobile ? 3 : 5}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={(props) => {
                const { x, y, payload } = props;
                // Try to find protocol by name (payload.value contains the protocol name)
                const protocolName = payload.value?.toLowerCase();
                const protocolConfig = getProtocolById(protocolName);
                
                if (isMobile) {
                  // Mobile: Show only logos
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <g transform={`translate(${-18}, ${-8})`}>
                        <foreignObject x="0" y="0" width="16" height="16">
                          <ProtocolLogo
                            src={`/assets/logos/${getProtocolLogoFilename(protocolName)}`}
                            alt={payload.value}
                            size="sm"
                          />
                        </foreignObject>
                      </g>
                    </g>
                  );
                }

                // Desktop: Show both text and logos
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={-30}
                      y={4}
                      textAnchor="end"
                      fill="hsl(var(--muted-foreground))"
                      fontSize="11"
                    >
                      {payload.value}
                    </text>
                    <g transform={`translate(${-25}, ${-8})`}>
                      <foreignObject x="0" y="0" width="16" height="16">
                        <ProtocolLogo
                          src={`/assets/logos/${getProtocolLogoFilename(protocolName)}`}
                          alt={payload.value}
                          size="sm"
                        />
                      </foreignObject>
                    </g>
                  </g>
                );
              }}
              width={isMobile ? 30 : 100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">
                            {payload[0].payload.name}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {valueFormatter(payload[0].value as number)}
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
              barSize={isMobile ? 16 : 20}
              fill="none"
              radius={[4, 4, 4, 4]}
              maxBarSize={isMobile ? 16 : 20}
            >
              <LabelList
                dataKey="value"
                position="right"
                offset={8}
                formatter={valueFormatter}
                style={{
                  fill: "hsl(var(--foreground))",
                  fontSize: isMobile ? "10px" : "12px",
                  fontWeight: "500",
                }}
              />
              {displayData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || "hsl(var(--primary))"}
                  fillOpacity={0.8}
                  className="transition-opacity duration-200 hover:opacity-90"
                />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
        
        {/* Show More/Less Button - Mobile Only */}
        {isMobile && filteredData.length > 5 && (
          <div className="flex justify-center pt-3 pb-1 border-t border-border mt-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted/80 rounded-lg transition-colors duration-200"
            >
              <span>{showAll ? 'Show Less' : `Show More (${filteredData.length - 5} more)`}</span>
              <svg 
                className={`h-3 w-3 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
    </ComponentActions>
  );
}
