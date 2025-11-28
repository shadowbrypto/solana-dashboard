import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format } from "date-fns";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Eye, EyeOff, Download, Copy } from "lucide-react";
import { cn } from "../lib/utils";
import { Protocol } from "../types/protocol";
import { getProtocolLogoFilename } from "../lib/protocol-config";
import { Badge } from "./ui/badge";
import { DateNavigator } from "./DateNavigator";
import { useToast } from "../hooks/use-toast";
import { protocolApi } from "../lib/api";
// @ts-ignore
import domtoimage from "dom-to-image";

interface MonadDailyMetricsTableProps {
  protocols: Protocol[];
  date: Date;
  onDateChange: (date: Date) => void;
}

interface MonadProtocolData {
  protocol: Protocol;
  totalVolume: number;
  dailyGrowth: number;
  weeklyTrend: number[];
  dailyUsers: number;
  trades: number;
  fees: number;
  lifetimeVolume: number;
}

const formatVolume = (volume: number): string => {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
  return `$${volume.toFixed(2)}`;
};

const WeeklyTrendChart: React.FC<{ data: number[]; growth: number }> = ({ data, growth }) => {
  const chartData = data.map((value, index) => ({
    day: index,
    value
  }));

  const isNeutral = Math.abs(growth) < 0.0001;
  const isPositive = growth >= 0;
  const absPercentage = Math.abs(growth * 100);

  let trendColor = '#6B7280';
  if (!isNeutral) {
    trendColor = isPositive ? '#22c55e' : '#ef4444';
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="w-[60px] h-[30px] -my-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={trendColor}
              fill={trendColor}
              fillOpacity={0.2}
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {!isNeutral && (
        <div className={cn(
          "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ml-4",
          isPositive
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        )}>
          {isPositive ? (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          )}
          <span>{absPercentage.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

export function MonadDailyMetricsTable({ protocols, date, onDateChange }: MonadDailyMetricsTableProps) {
  const [monadData, setMonadData] = useState<MonadProtocolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topProtocols, setTopProtocols] = useState<Protocol[]>([]);
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [backendTotals, setBackendTotals] = useState<{
    totalVolume: number;
    totalUsers: number;
    totalTrades: number;
    totalFees: number;
    totalGrowth: number;
    totalWeeklyTrend: number[];
    totalLifetimeVolume: number;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Monad uses 'private' data type (same as Solana)
        const dataType = 'private';
        console.log('Calling getDailyMetricsOptimized with:', { date: date.toISOString().split('T')[0], chain: 'monad', dataType });
        const optimizedData = await protocolApi.getDailyMetricsOptimized(date, 'monad', dataType);

        // Transform the optimized data to match the component's data structure
        const transformedData: MonadProtocolData[] = Object.entries(optimizedData.protocols).map(([protocolName, data]: [string, any]) => ({
          protocol: protocolName as Protocol,
          totalVolume: data.totalVolume || 0,
          dailyGrowth: data.dailyGrowth || 0,
          weeklyTrend: data.weeklyTrend || [],
          dailyUsers: data.dailyUsers || 0,
          trades: data.trades || 0,
          fees: data.fees || 0,
          lifetimeVolume: data.lifetimeVolume || 0
        }));

        console.log('Backend protocols received:', Object.keys(optimizedData.protocols));
        console.log('Transformed Monad protocol data:', transformedData);

        setMonadData(transformedData);
        setBackendTotals(optimizedData.totals);
        setTopProtocols(optimizedData.topProtocols?.map((p: string) => p as Protocol) || []);
      } catch (err) {
        console.error('Error loading Monad daily data:', err);
        setError('Failed to load data from database');
        setMonadData([]);
        setTopProtocols([]);
        setBackendTotals(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [date]);

  // Calculate totals (excluding hidden protocols)
  const totals = useMemo(() => {
    if (backendTotals && hiddenProtocols.size === 0) {
      return backendTotals;
    }

    const visibleData = monadData.filter(data => !hiddenProtocols.has(data.protocol));
    const totalVolume = visibleData.reduce((sum, data) => sum + data.totalVolume, 0);
    const totalUsers = visibleData.reduce((sum, data) => sum + data.dailyUsers, 0);
    const totalTrades = visibleData.reduce((sum, data) => sum + data.trades, 0);
    const totalFees = visibleData.reduce((sum, data) => sum + data.fees, 0);
    const totalLifetimeVolume = visibleData.reduce((sum, data) => sum + data.lifetimeVolume, 0);

    let totalGrowth = 0;
    if (hiddenProtocols.size > 0 && visibleData.length > 0) {
      const growthSum = visibleData.reduce((sum, data) => sum + data.dailyGrowth, 0);
      totalGrowth = growthSum / visibleData.length;
    } else if (backendTotals) {
      totalGrowth = backendTotals.totalGrowth;
    }

    const totalWeeklyTrend = visibleData.length > 0
      ? visibleData[0].weeklyTrend.map((_, dayIndex) =>
          visibleData.reduce((sum, data) => sum + (data.weeklyTrend[dayIndex] || 0), 0)
        )
      : [];

    return {
      totalVolume,
      totalUsers,
      totalTrades,
      totalFees,
      totalGrowth,
      totalWeeklyTrend,
      totalLifetimeVolume
    };
  }, [monadData, hiddenProtocols, backendTotals]);

  const handleDateChange = (newDate?: Date) => {
    if (newDate) {
      onDateChange(newDate);
    }
  };

  const toggleProtocolVisibility = (protocol: string) => {
    setHiddenProtocols(prev => {
      const newSet = new Set(prev);
      if (newSet.has(protocol)) {
        newSet.delete(protocol);
      } else {
        newSet.add(protocol);
      }
      return newSet;
    });
  };

  const showAllProtocols = () => {
    setHiddenProtocols(new Set());
  };

  const hideAllProtocols = () => {
    const allProtocols = new Set<string>();
    monadData.forEach(data => {
      allProtocols.add(data.protocol);
    });
    setHiddenProtocols(allProtocols);
  };

  const downloadReport = async () => {
    const tableElement = document.querySelector('[data-table="monad-daily-metrics"]') as HTMLElement;

    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      try {
        const scale = 2;
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: (tableElement.scrollWidth + 40) * scale,
            height: (tableElement.scrollHeight + 40) * scale,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              overflow: 'visible',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('dom-to-image timeout after 10 seconds')), 10000)
          )
        ]) as string;

        const link = document.createElement('a');
        link.download = `Monad Report - ${format(date, 'dd.MM')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Dom-to-image error:', error);
      }
    }
  };

  const copyToClipboard = async () => {
    const tableElement = document.querySelector('[data-table="monad-daily-metrics"]') as HTMLElement;

    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      try {
        const scale = 2;
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: (tableElement.scrollWidth + 40) * scale,
            height: (tableElement.scrollHeight + 40) * scale,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              overflow: 'visible',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('dom-to-image timeout after 10 seconds')), 10000)
          )
        ]) as string;

        const response = await fetch(dataUrl);
        const blob = await response.blob();

        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            toast({
              title: "Copied to clipboard",
              description: "Monad report image copied successfully",
              duration: 2000,
            });
          } catch (error) {
            // Handle error silently
          }
        }
      } catch (error) {
        // Handle error silently
      }
    }
  };

  // Get display name by removing _monad suffix
  const getDisplayName = (protocolId: string): string => {
    return protocolId.replace('_monad', '').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <div data-table="monad-daily-metrics" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-lg font-semibold text-foreground">Daily Report</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 rounded-md">
                Monad
              </span>
            </div>
            <div className="flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={hiddenProtocols.size > 0 ? showAllProtocols : hideAllProtocols}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                title={hiddenProtocols.size > 0 ? "Show all protocols" : "Hide all protocols"}
              >
                {hiddenProtocols.size > 0 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {hiddenProtocols.size > 0 ? "Show All" : "Hide All"}
              </button>
            </div>
          </div>
          <div className="w-auto">
            <DateNavigator date={date} onDateChange={handleDateChange} />
          </div>
        </div>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Protocol</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Lifetime Volume</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-center w-[140px]">Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                      <span className="text-muted-foreground">Loading Monad protocol data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <p>{error}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : monadData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <p>No Monad protocol data available for this date</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {monadData
                    .sort((a, b) => b.totalVolume - a.totalVolume)
                    .filter(data => !hiddenProtocols.has(data.protocol))
                    .map((data) => {
                      const isTop = topProtocols.includes(data.protocol);
                      const rank = topProtocols.indexOf(data.protocol) + 1;

                      return (
                        <TableRow
                          key={data.protocol}
                          className={cn(
                            "transition-colors hover:bg-muted/30",
                            isTop && "bg-muted/20"
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleProtocolVisibility(data.protocol)}
                                className="opacity-0 hover:opacity-100 transition-opacity"
                                title="Hide protocol"
                              >
                                <EyeOff className="w-3 h-3 text-muted-foreground" />
                              </button>
                              <div className="w-6 h-6 bg-muted/10 rounded-md overflow-hidden ring-1 ring-border/20">
                                <img
                                  src={`/assets/logos/${getProtocolLogoFilename(data.protocol)}`}
                                  alt={getDisplayName(data.protocol)}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                              <span className="font-medium">{getDisplayName(data.protocol)}</span>
                              {isTop && rank <= 3 && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "ml-2 h-4 px-2 text-xs font-medium",
                                    rank === 1 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  )}
                                >
                                  #{rank}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatVolume(data.totalVolume)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-semibold text-sm py-0">
                              {formatVolume(data.lifetimeVolume)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatVolume(data.fees)}</TableCell>
                          <TableCell className="text-center">
                            <WeeklyTrendChart data={data.weeklyTrend} growth={data.dailyGrowth} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {/* Total Row */}
                  <TableRow className="border-t-2 bg-muted/40 font-semibold">
                    <TableCell>
                      <div className="flex items-center gap-3 pl-6">
                        <span>Total</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatVolume(totals.totalVolume)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-semibold text-sm py-0">
                        {formatVolume(totals.totalLifetimeVolume)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatVolume(totals.totalFees)}</TableCell>
                    <TableCell className="text-center">
                      <WeeklyTrendChart data={totals.totalWeeklyTrend} growth={totals.totalGrowth} />
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted/50 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <button
            onClick={downloadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted/50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
