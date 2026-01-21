import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format, eachDayOfInterval, subDays } from "date-fns";
import { ChevronRight, Eye, EyeOff, Download, Copy } from "lucide-react";
import { ProtocolLogo } from "./ui/logo-with-fallback";
import { cn, formatCurrency, formatNumber, formatPercentage } from "../lib/utils";
import domtoimage from "dom-to-image";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DateNavigator } from "./DateNavigator";
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolById, getProtocolName, getProtocolLogoFilename } from "../lib/protocol-config";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Settings } from "../lib/settings";
import { useToast } from "../hooks/use-toast";
import { useDailyMetrics } from "../hooks/useDailyMetrics";

interface DailyMetricsTableProps {
  protocols: Protocol[];
  date: Date;
  onDateChange: (date: Date) => void;
}

type MetricKey = keyof ProtocolMetrics | 'market_share' | 'projected_volume' | 'public_daily_users' | 'public_new_users';

interface MetricDefinition {
  key: MetricKey;
  label: string;
  format: (value: number, isCategory?: boolean, protocol?: Protocol, categoryName?: string) => React.ReactNode;
  getValue?: (data: ProtocolMetrics, protocol?: Protocol) => number;
  skipGradient?: boolean;
}

// formatCurrency, formatNumber, formatPercentage imported from utils.ts

// Trojan protocol family - special display names and badges
const TROJAN_PROTOCOLS = ['trojanonsolana', 'trojan', 'trojanterminal'] as const;

const getTrojanDisplayName = (protocol: string): string => {
  if (protocol === 'trojan') return 'Trojan Total';
  return getProtocolName(protocol);
};

const getTrojanRowStyle = (protocol: string): string => {
  if (!isTrojanProtocol(protocol)) return '';
  // Strong gradient from purple on left, fading to transparent on right
  return 'bg-gradient-to-r from-purple-200 via-purple-100 to-transparent dark:from-purple-800/50 dark:via-purple-900/30 dark:to-transparent';
};

const getTrojanFirstCellStyle = (protocol: string): string => {
  if (!isTrojanProtocol(protocol)) return '';
  // Bold left border accent
  return 'border-l-4 border-l-purple-500 dark:border-l-purple-400';
};

const isTrojanProtocol = (protocol: string): boolean => {
  return TROJAN_PROTOCOLS.includes(protocol as typeof TROJAN_PROTOCOLS[number]);
};

export function DailyMetricsTable({ protocols, date, onDateChange }: DailyMetricsTableProps) {
  // Use the custom hook for data fetching
  const {
    dailyData,
    previousDayData,
    weeklyVolumeData,
    projectedVolumeData,
    publicUserData,
    backendTotals,
    topProtocols,
    loading: dataLoading,
    error: dataError,
  } = useDailyMetrics({ date, chain: 'solana' });

  // Local UI state
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>(() => Settings.getDailyTableCollapsedCategories());
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnOrder, setColumnOrder] = useState<MetricKey[]>(() => Settings.getDailyTableColumnOrder() as MetricKey[]);
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(() => new Set(Settings.getDailyTableHiddenProtocols()));
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => new Set(Settings.getDailyTableHiddenColumns()));
  const [isProjectedVolumeHidden, setIsProjectedVolumeHidden] = useState<boolean>(() => Settings.getIsProjectedVolumeHidden());
  const { toast } = useToast();

  // Calculate total volume for market share (excluding hidden protocols)
  // Use backend totals if available and no protocols are hidden, otherwise calculate from visible protocols
  // IMPORTANT: Use adjustedVolume to match backend calculation
  const totalVolume = useMemo(() => {
    if (backendTotals && hiddenProtocols.size === 0) {
      return backendTotals.totalVolume;
    }
    return protocols
      .filter(protocol => protocol !== 'all' && !hiddenProtocols.has(protocol))
      .reduce((sum, protocol) => sum + (dailyData[protocol]?.adjustedVolume || dailyData[protocol]?.total_volume_usd || 0), 0);
  }, [backendTotals, hiddenProtocols, protocols, dailyData]);

  // Weekly trend functions
  const getWeeklyVolumeChart = useCallback((protocolId: Protocol) => {
    const protocolWeeklyData = weeklyVolumeData[protocolId];
    if (!protocolWeeklyData) return [];

    const last7Days = eachDayOfInterval({
      start: subDays(date, 6),
      end: date
    });

    return last7Days.map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        day: index,
        value: protocolWeeklyData[dateKey] || 0
      };
    });
  }, [weeklyVolumeData, date]);

  const getVolumeTrend = useCallback((protocolId: Protocol): 'up' | 'down' | 'neutral' => {
    const data = getWeeklyVolumeChart(protocolId);
    if (data.length < 2) return 'neutral';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;

    if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
    if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
    return 'neutral';
  }, [getWeeklyVolumeChart]);

  const metrics: MetricDefinition[] = [
    { 
      key: "projected_volume" as MetricKey, 
      label: "Adj. Volume", 
      format: (value: number, isCategory?: boolean, protocol?: Protocol, categoryName?: string) => {
        if (value === 0 || value === undefined) return <span className="text-muted-foreground">-</span>;
        
        // For category rows, calculate total actual volume and show comparison
        if (isCategory && categoryName) {
          // Get protocols for this category
          const categoryProtocols = getMutableProtocolsByCategory(categoryName);
          const visibleProtocols = categoryProtocols
            .map(p => p.id)
            .filter(p => !hiddenProtocols.has(p));
          
          // Calculate total actual volume for the category
          const totalActualVolume = visibleProtocols
            .reduce((sum, p) => sum + (dailyData[p as Protocol]?.total_volume_usd || 0), 0);
          
          if (totalActualVolume === 0) {
            return (
              <div className="flex items-center gap-2 justify-end">
                <span>{formatCurrency(value)}</span>
              </div>
            );
          }
          
          // Calculate difference
          const difference = value - totalActualVolume;
          const percentageDiff = (difference / totalActualVolume) * 100;
          
          // Determine styling based on difference
          const isNeutral = Math.abs(difference) < 0.01; // Less than 1 cent difference
          const isPositive = difference > 0;
          
          let bgColor, borderColor;
          if (isNeutral) {
            bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
            borderColor = "border-l-gray-400";
          } else if (isPositive) {
            bgColor = "bg-green-100/80 dark:bg-green-950/40";
            borderColor = "border-l-green-400";
          } else {
            bgColor = "bg-red-100/80 dark:bg-red-950/40";
            borderColor = "border-l-red-400";
          }
          
          const diffText = `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;
          
          return (
            <div className={`flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
              <span>{formatCurrency(value)}</span>
              <span className="text-[9px] font-medium text-muted-foreground">
                {diffText}
              </span>
            </div>
          );
        }
        
        // Get actual volume for comparison
        const actualVolume = protocol ? dailyData[protocol]?.total_volume_usd || 0 : 0;

        // When actual volume is 0 but projected volume exists, show with green styling
        if (actualVolume === 0 && value > 0) {
          return (
            <div className="flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 bg-green-100/80 dark:bg-green-950/40 border-l-green-400">
              <span>{formatCurrency(value)}</span>
            </div>
          );
        }

        // If both are 0, show dash
        if (actualVolume === 0) {
          return <span className="text-muted-foreground">-</span>;
        }
        
        // Calculate difference
        const difference = value - actualVolume;
        const percentageDiff = (difference / actualVolume) * 100;
        
        // Determine styling based on difference
        const isNeutral = Math.abs(difference) < 0.01; // Less than 1 cent difference
        const isPositive = difference > 0;
        
        let bgColor, borderColor;
        if (isNeutral) {
          bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
          borderColor = "border-l-gray-400";
        } else if (isPositive) {
          bgColor = "bg-green-100/80 dark:bg-green-950/40";
          borderColor = "border-l-green-400";
        } else {
          bgColor = "bg-red-100/80 dark:bg-red-950/40";
          borderColor = "border-l-red-400";
        }
        
        const diffText = `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;
        
        return (
          <div className={`flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
            <span>{formatCurrency(value)}</span>
            <span className="text-[9px] font-medium text-muted-foreground">
              {diffText}
            </span>
          </div>
        );
      },
      getValue: (data, protocol) => {
        if (!protocol) return 0;

        // Check if this protocol has projected volume data
        const projectedVolume = projectedVolumeData[protocol];
        if (projectedVolume && projectedVolume > 0) {
          return projectedVolume;
        }

        // For Mobile Apps protocols, use actual volume as projected volume
        const protocolConfig = getProtocolById(protocol);
        if (protocolConfig?.category === 'Mobile Apps') {
          return dailyData[protocol]?.total_volume_usd || 0;
        }

        // For other protocols without projected data, return 0
        return 0;
      }
    },
    { key: "total_volume_usd", label: "Volume", format: (value: number) => formatCurrency(value) },
    {
      key: "public_daily_users" as MetricKey,
      label: "DAUs*",
      format: (value: number, isCategory?: boolean, protocol?: Protocol, categoryName?: string) => {
        // For category rows, calculate total private DAUs for comparison
        if (isCategory && categoryName) {
          const categoryProtocols = getMutableProtocolsByCategory(categoryName);
          const visibleProtocols = categoryProtocols
            .map(p => p.id)
            .filter(p => !hiddenProtocols.has(p));

          // Calculate total private DAUs for the category
          const totalPrivateDAUs = visibleProtocols
            .reduce((sum, p) => sum + (dailyData[p as Protocol]?.daily_users || 0), 0);

          if (value === 0 && totalPrivateDAUs === 0) {
            return <span className="text-muted-foreground">-</span>;
          }

          if (totalPrivateDAUs === 0 && value > 0) {
            return (
              <div className="flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 bg-green-100/80 dark:bg-green-950/40 border-l-green-400">
                <span>{formatNumber(value)}</span>
              </div>
            );
          }

          const difference = value - totalPrivateDAUs;
          const percentageDiff = totalPrivateDAUs > 0 ? (difference / totalPrivateDAUs) * 100 : 0;

          const isNeutral = Math.abs(difference) < 1;
          const isPositive = difference > 0;

          let bgColor, borderColor;
          if (isNeutral) {
            bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
            borderColor = "border-l-gray-400";
          } else if (isPositive) {
            bgColor = "bg-green-100/80 dark:bg-green-950/40";
            borderColor = "border-l-green-400";
          } else {
            bgColor = "bg-red-100/80 dark:bg-red-950/40";
            borderColor = "border-l-red-400";
          }

          const diffText = isNeutral ? '' : `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;

          return (
            <div className={`flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
              <span>{formatNumber(value)}</span>
              {diffText && <span className="text-[9px] font-medium text-muted-foreground">{diffText}</span>}
            </div>
          );
        }

        // Get private value for comparison (individual protocol)
        const privateValue = protocol ? dailyData[protocol]?.daily_users || 0 : 0;

        if (value === 0 && privateValue === 0) {
          return <span className="text-muted-foreground">-</span>;
        }

        // If only value exists (no comparison needed)
        if (privateValue === 0 && value > 0) {
          return (
            <div className="flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 bg-green-100/80 dark:bg-green-950/40 border-l-green-400">
              <span>{formatNumber(value)}</span>
            </div>
          );
        }

        // Calculate difference
        const difference = value - privateValue;
        const percentageDiff = privateValue > 0 ? (difference / privateValue) * 100 : 0;

        // Determine styling
        const isNeutral = Math.abs(difference) < 1;
        const isPositive = difference > 0;

        let bgColor, borderColor;
        if (isNeutral) {
          bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
          borderColor = "border-l-gray-400";
        } else if (isPositive) {
          bgColor = "bg-green-100/80 dark:bg-green-950/40";
          borderColor = "border-l-green-400";
        } else {
          bgColor = "bg-red-100/80 dark:bg-red-950/40";
          borderColor = "border-l-red-400";
        }

        const diffText = isNeutral ? '' : `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;

        return (
          <div className={`flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
            <span>{formatNumber(value)}</span>
            {diffText && <span className="text-[9px] font-medium text-muted-foreground">{diffText}</span>}
          </div>
        );
      },
      getValue: (data, protocol) => {
        if (!protocol) return 0;
        return publicUserData[protocol]?.dailyUsers || 0;
      }
    },
    { key: "daily_users", label: "DAUs", format: (value: number) => formatNumber(value) },
    {
      key: "public_new_users" as MetricKey,
      label: "New Users*",
      format: (value: number, isCategory?: boolean, protocol?: Protocol, categoryName?: string) => {
        // For category rows, calculate total private new users for comparison
        if (isCategory && categoryName) {
          const categoryProtocols = getMutableProtocolsByCategory(categoryName);
          const visibleProtocols = categoryProtocols
            .map(p => p.id)
            .filter(p => !hiddenProtocols.has(p));

          // Calculate total private new users for the category
          const totalPrivateNewUsers = visibleProtocols
            .reduce((sum, p) => sum + (dailyData[p as Protocol]?.numberOfNewUsers || 0), 0);

          if (value === 0 && totalPrivateNewUsers === 0) {
            return <span className="text-muted-foreground">-</span>;
          }

          if (totalPrivateNewUsers === 0 && value > 0) {
            return (
              <div className="flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 bg-green-100/80 dark:bg-green-950/40 border-l-green-400">
                <span>{formatNumber(value)}</span>
              </div>
            );
          }

          const difference = value - totalPrivateNewUsers;
          const percentageDiff = totalPrivateNewUsers > 0 ? (difference / totalPrivateNewUsers) * 100 : 0;

          const isNeutral = Math.abs(difference) < 1;
          const isPositive = difference > 0;

          let bgColor, borderColor;
          if (isNeutral) {
            bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
            borderColor = "border-l-gray-400";
          } else if (isPositive) {
            bgColor = "bg-green-100/80 dark:bg-green-950/40";
            borderColor = "border-l-green-400";
          } else {
            bgColor = "bg-red-100/80 dark:bg-red-950/40";
            borderColor = "border-l-red-400";
          }

          const diffText = isNeutral ? '' : `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;

          return (
            <div className={`flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
              <span>{formatNumber(value)}</span>
              {diffText && <span className="text-[9px] font-medium text-muted-foreground">{diffText}</span>}
            </div>
          );
        }

        // Get private value for comparison (individual protocol)
        const privateValue = protocol ? dailyData[protocol]?.numberOfNewUsers || 0 : 0;

        if (value === 0 && privateValue === 0) {
          return <span className="text-muted-foreground">-</span>;
        }

        // If only value exists (no comparison needed)
        if (privateValue === 0 && value > 0) {
          return (
            <div className="flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 bg-green-100/80 dark:bg-green-950/40 border-l-green-400">
              <span>{formatNumber(value)}</span>
            </div>
          );
        }

        // Calculate difference
        const difference = value - privateValue;
        const percentageDiff = privateValue > 0 ? (difference / privateValue) * 100 : 0;

        // Determine styling
        const isNeutral = Math.abs(difference) < 1;
        const isPositive = difference > 0;

        let bgColor, borderColor;
        if (isNeutral) {
          bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
          borderColor = "border-l-gray-400";
        } else if (isPositive) {
          bgColor = "bg-green-100/80 dark:bg-green-950/40";
          borderColor = "border-l-green-400";
        } else {
          bgColor = "bg-red-100/80 dark:bg-red-950/40";
          borderColor = "border-l-red-400";
        }

        const diffText = isNeutral ? '' : `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;

        return (
          <div className={`flex items-center gap-0.5 justify-between px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
            <span>{formatNumber(value)}</span>
            {diffText && <span className="text-[9px] font-medium text-muted-foreground">{diffText}</span>}
          </div>
        );
      },
      getValue: (data, protocol) => {
        if (!protocol) return 0;
        return publicUserData[protocol]?.newUsers || 0;
      }
    },
    { key: "numberOfNewUsers", label: "New Users", format: (value: number) => formatNumber(value) },
    { key: "daily_trades", label: "Trades", format: (value: number) => formatNumber(value) },
    {
      key: "market_share",
      label: "Market Share",
      format: (value: number) => {
        const percentage = value * 100;
        return (
          <div className="flex items-center gap-2 justify-end">
            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
            <span className="font-medium text-[9px] sm:text-sm min-w-[50px]">{percentage.toFixed(2)}%</span>
          </div>
        );
      },
      // Use adjustedVolume to match backend calculation
      getValue: (data) => (data?.adjustedVolume || data?.total_volume_usd || 0) / (totalVolume || 1)
    },
    {
      key: "daily_growth" as MetricKey,
      label: "Daily Growth",
      format: (value, isCategory = false, protocol, categoryName?: string) => {
        const percentage = value * 100;
        const absPercentage = Math.abs(percentage);
        const isPositive = value > 0;
        const isNeutral = Math.abs(value) < 0.0001;
        
        if (isCategory && categoryName) {
          // Get protocols in this category and calculate aggregated trend
          const categoryProtocols = getMutableProtocolsByCategory(categoryName).map(p => p.id as Protocol);
          const aggregatedData: { day: number; value: number }[] = [];
          
          // Create aggregated weekly data for the category
          const last7Days = eachDayOfInterval({
            start: subDays(date, 6),
            end: date
          });
          
          last7Days.forEach((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const totalVolume = categoryProtocols.reduce((sum, protocolId) => {
              return sum + (weeklyVolumeData[protocolId]?.[dateKey] || 0);
            }, 0);
            aggregatedData.push({ day: index, value: totalVolume });
          });
          
          // Calculate trend for category
          const getCategoryTrend = (): 'up' | 'down' | 'neutral' => {
            if (aggregatedData.length < 2) return 'neutral';
            
            const firstHalf = aggregatedData.slice(0, Math.floor(aggregatedData.length / 2));
            const secondHalf = aggregatedData.slice(Math.floor(aggregatedData.length / 2));
            
            const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
            
            if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
            if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
            return 'neutral';
          };
          
          const categoryTrend = getCategoryTrend();
          const isNeutralCategory = Math.abs(value) < 0.001;
          
          return (
            <div className="flex items-center justify-end sm:justify-between w-full">
              <div className="hidden sm:block w-[60px] h-[30px] -my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={aggregatedData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={
                        categoryTrend === 'up' ? "#22c55e" :
                        categoryTrend === 'down' ? "#ef4444" :
                        "#6b7280"
                      }
                      strokeWidth={1.5}
                      fill={
                        categoryTrend === 'up' ? "#22c55e" :
                        categoryTrend === 'down' ? "#ef4444" :
                        "#6b7280"
                      }
                      fillOpacity={0.2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {!isNeutralCategory && (
                <div className={cn(
                  "flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-medium ml-0.5 sm:ml-1",
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
        }
        
        if (!protocol) {
          return (
            <div className="flex items-center justify-end gap-1">
              <span className="text-muted-foreground">—</span>
            </div>
          );
        }
        
        return (
          <div className="flex items-center justify-end sm:justify-between w-full">
            <div className="hidden sm:block w-[60px] h-[30px] -my-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getWeeklyVolumeChart(protocol)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={
                      getVolumeTrend(protocol) === 'up' ? "#22c55e" :
                      getVolumeTrend(protocol) === 'down' ? "#ef4444" :
                      "#6b7280"
                    }
                    strokeWidth={1.5}
                    fill={
                      getVolumeTrend(protocol) === 'up' ? "#22c55e" :
                      getVolumeTrend(protocol) === 'down' ? "#ef4444" :
                      "#6b7280"
                    }
                    fillOpacity={0.2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {!isNeutral && (
              <div className={cn(
                "flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-medium ml-0.5 sm:ml-1",
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
      },
      getValue: (data) => {
        // Use daily_growth from backend (already calculated with fallback logic)
        return data?.daily_growth || 0;
      }
    },
  ];

  const handleDragStart = useCallback((e: React.DragEvent, columnIndex: number) => {
    setDraggedColumn(columnIndex);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedColumn === null || draggedColumn === dropIndex) {
      setDraggedColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedItem = newOrder[draggedColumn];

    // Remove the dragged item
    newOrder.splice(draggedColumn, 1);

    // Insert at new position
    newOrder.splice(dropIndex, 0, draggedItem);

    setColumnOrder(newOrder);
    setDraggedColumn(null);
  }, [draggedColumn, columnOrder]);

  const handleDragEnd = useCallback(() => {
    setDraggedColumn(null);
  }, []);

  // Create ordered metrics based on column order
  // Ensure projected_volume is always included for existing users who don't have it in their saved settings
  const effectiveColumnOrder = useMemo(() => {
    const order = [...columnOrder];
    if (!order.includes('projected_volume')) {
      // Insert projected_volume before total_volume_usd if it exists, otherwise at the beginning
      const volumeIndex = order.indexOf('total_volume_usd');
      if (volumeIndex >= 0) {
        order.splice(volumeIndex, 0, 'projected_volume');
      } else {
        order.unshift('projected_volume');
      }
    }

    // Ensure public_daily_users is included for existing users who don't have it in their saved settings
    if (!order.includes('public_daily_users')) {
      // Insert public_daily_users before daily_users if it exists
      const dailyUsersIndex = order.indexOf('daily_users');
      if (dailyUsersIndex >= 0) {
        order.splice(dailyUsersIndex, 0, 'public_daily_users');
      } else {
        // Find total_volume_usd and insert after it
        const volumeIndex = order.indexOf('total_volume_usd');
        if (volumeIndex >= 0) {
          order.splice(volumeIndex + 1, 0, 'public_daily_users');
        }
      }
    }

    // Ensure public_new_users is included for existing users who don't have it in their saved settings
    if (!order.includes('public_new_users')) {
      // Insert public_new_users before numberOfNewUsers if it exists
      const newUsersIndex = order.indexOf('numberOfNewUsers');
      if (newUsersIndex >= 0) {
        order.splice(newUsersIndex, 0, 'public_new_users');
      } else {
        // Find daily_users and insert after it
        const dailyUsersIndex = order.indexOf('daily_users');
        if (dailyUsersIndex >= 0) {
          order.splice(dailyUsersIndex + 1, 0, 'public_new_users');
        }
      }
    }
    return order;
  }, [columnOrder]);

  const orderedMetrics = useMemo(() => {
    return effectiveColumnOrder
      .filter(key => key !== 'projected_volume' || !isProjectedVolumeHidden)
      .filter(key => !hiddenColumns.has(key))
      .map(key => metrics.find(m => m.key === key))
      .filter(Boolean) as MetricDefinition[];
  }, [effectiveColumnOrder, isProjectedVolumeHidden, hiddenColumns, metrics]);

  // Toggle projected volume visibility (legacy)
  const toggleProjectedVolumeVisibility = useCallback(() => {
    const newHidden = !isProjectedVolumeHidden;
    setIsProjectedVolumeHidden(newHidden);
    Settings.setIsProjectedVolumeHidden(newHidden);
  }, [isProjectedVolumeHidden]);

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  }, []);

  // Category-based bright coloring using shadcn theme colors
  const getCategoryRowColor = useCallback((categoryName: string): string => {
    switch (categoryName) {
      case 'Telegram Bots':
        return 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/40';
      case 'Trading Terminals':
        return 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/40';
      case 'Mobile Apps':
        return 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/40';
      default:
        return 'hover:bg-muted/30';
    }
  }, []);

  // Column group border styling for visual grouping (right border on last column of each group)
  const getColumnGroupBackground = (metricKey: string): string => {
    switch (metricKey) {
      case 'total_volume_usd':
      case 'daily_users':
      case 'numberOfNewUsers':
        return 'border-r-2 border-r-border/50';
      default:
        return '';
    }
  };

  useEffect(() => {
    // Debug: Add global click listener to detect if events are being captured
    const globalClickHandler = (e: MouseEvent) => {
      console.log('Global click detected on Daily Report page:', e.target);
    };

    const globalWheelHandler = (e: WheelEvent) => {
      console.log('Global wheel event detected on Daily Report page');
    };

    document.addEventListener('click', globalClickHandler, true);
    document.addEventListener('wheel', globalWheelHandler, true);

    return () => {
      document.removeEventListener('click', globalClickHandler, true);
      document.removeEventListener('wheel', globalWheelHandler, true);
    };
  }, []);


  // Persist settings changes with debounce to avoid excessive writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      Settings.setDailyTableCollapsedCategories(collapsedCategories);
      Settings.setDailyTableColumnOrder(columnOrder);
      Settings.setDailyTableHiddenProtocols(Array.from(hiddenProtocols));
      Settings.setDailyTableHiddenColumns(Array.from(hiddenColumns));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [collapsedCategories, columnOrder, hiddenProtocols, hiddenColumns]);

  const handleDateChange = useCallback((newDate: Date | undefined) => {
    if (newDate) {
      onDateChange(newDate);
    }
  }, [onDateChange]);

  const selectedDate = useMemo(() => format(date, "dd/MM/yyyy"), [date]);

  const formatValue = useCallback((metric: MetricDefinition, value: number, isCategory = false, protocol?: Protocol, categoryName?: string) => {
    if (isCategory && metric.key === 'market_share') return '—';
    return metric.format(value, isCategory, protocol, categoryName);
  }, []);

  const toggleCollapse = useCallback((categoryName: string) => {
    setCollapsedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  }, []);

  const toggleProtocolVisibility = useCallback((protocol: string) => {
    setHiddenProtocols(prev => {
      const newSet = new Set(prev);
      if (newSet.has(protocol)) {
        newSet.delete(protocol);
      } else {
        newSet.add(protocol);
      }
      return newSet;
    });
  }, []);

  const showAllProtocols = useCallback(() => {
    setHiddenProtocols(new Set());
    // Always show projected volume when clicking Show All
    setIsProjectedVolumeHidden(false);
    Settings.setIsProjectedVolumeHidden(false);
    // Also show all hidden columns
    setHiddenColumns(new Set());
  }, []);

  const hideAllProtocols = useCallback(() => {
    const allProtocols = new Set<string>();
    const categories = getMutableAllCategories();
    categories.forEach(categoryName => {
      const categoryProtocols = getMutableProtocolsByCategory(categoryName);
      categoryProtocols.forEach(protocol => {
        if (protocols.includes(protocol.id as Protocol)) {
          allProtocols.add(protocol.id);
        }
      });
    });
    setHiddenProtocols(allProtocols);
    // Don't hide projected volume when hiding all protocols
  }, [protocols]);

  const downloadReport = useCallback(async () => {
    const tableElement = document.querySelector('[data-table="daily-metrics"]') as HTMLElement;

    if (tableElement) {
      // Check element dimensions
      const rect = tableElement.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      try {
        const scale = 2; // 2x resolution for higher quality
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

        // Create download link
        const link = document.createElement('a');
        link.download = `Daily Report - ${format(date, 'dd.MM')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Dom-to-image error:', error);
      }
    }
  }, [date]);

  const copyToClipboard = useCallback(async () => {
    const tableElement = document.querySelector('[data-table="daily-metrics"]') as HTMLElement;

    if (!tableElement) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Table element not found",
        duration: 3000,
      });
      return;
    }

    // Check element dimensions
    const rect = tableElement.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Table is not visible",
        duration: 3000,
      });
      return;
    }

    try {
      const scale = 2; // 2x resolution for higher quality
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
          setTimeout(() => reject(new Error('Copy timeout after 10 seconds')), 10000)
        )
      ]) as string;

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Check if Clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.write) {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Clipboard API not available - try using HTTPS or localhost",
          duration: 3000,
        });
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);

      toast({
        title: "Copied to clipboard",
        description: "Daily report image copied successfully",
        duration: 2000,
      });
    } catch (error) {
      console.error('Copy to clipboard error:', error);
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: error instanceof Error ? error.message : "Failed to generate image for clipboard",
        duration: 3000,
      });
    }
  }, [toast]);

  // Get Trojan protocol stats for the highlight section
  const trojanOnSolanaData = dailyData['trojanonsolana' as Protocol];
  const trojanTerminalData = dailyData['trojanterminal' as Protocol];
  const trojanTotalData = dailyData['trojan' as Protocol];

  const hasTrojanData = trojanOnSolanaData || trojanTerminalData || trojanTotalData;

  return (
    <>
    <div data-table="daily-metrics" className="space-y-4">
      {/* Header with title, date navigator and visibility toggle */}
      <div className="flex items-center justify-between group/header">
        <div className="flex items-center gap-2">
          <h2 className="text-title-2 font-semibold text-foreground whitespace-nowrap">Daily Report</h2>
          <button
            onClick={(hiddenProtocols.size > 0 || hiddenColumns.size > 0) ? showAllProtocols : hideAllProtocols}
            className="opacity-0 group-hover/header:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all duration-200"
            title={(hiddenProtocols.size > 0 || hiddenColumns.size > 0) ? "Show all protocols and columns" : "Hide all protocols"}
          >
            {(hiddenProtocols.size > 0 || hiddenColumns.size > 0) ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>{(hiddenProtocols.size > 0 || hiddenColumns.size > 0) ? "Show All" : "Hide All"}</span>
          </button>
        </div>
        <DateNavigator date={date} onDateChange={handleDateChange} />
      </div>

      {/* Trojan Ecosystem Table */}
      {hasTrojanData && (
        <div className="rounded-lg border border-border overflow-x-auto">
            <Table className="min-w-[600px] sm:min-w-[800px]">
              <TableHeader>
                {/* Row 1: Group Headers */}
                <TableRow className="hover:bg-transparent border-b-0">
                  <TableHead rowSpan={2} className="w-[120px] sm:w-[200px] py-2 text-[9px] sm:text-sm px-2 sm:px-4 font-semibold align-bottom border-r border-border/30">
                    Trojan Ecosystem
                  </TableHead>
                  {/* Volume Group */}
                  {(orderedMetrics.some(m => m.key === 'projected_volume') || orderedMetrics.some(m => m.key === 'total_volume_usd')) && (
                    <TableHead
                      colSpan={[orderedMetrics.some(m => m.key === 'projected_volume'), orderedMetrics.some(m => m.key === 'total_volume_usd')].filter(Boolean).length}
                      className="text-center py-2 text-[9px] sm:text-sm font-semibold border-b border-border/30 border-r-2 border-r-border/50"
                    >
                      Volume
                    </TableHead>
                  )}
                  {/* Active Users Group */}
                  {(orderedMetrics.some(m => m.key === 'public_daily_users') || orderedMetrics.some(m => m.key === 'daily_users')) && (
                    <TableHead
                      colSpan={[orderedMetrics.some(m => m.key === 'public_daily_users'), orderedMetrics.some(m => m.key === 'daily_users')].filter(Boolean).length}
                      className="text-center py-2 text-[9px] sm:text-sm font-semibold border-b border-border/30 border-r-2 border-r-border/50"
                    >
                      Active Users
                    </TableHead>
                  )}
                  {/* New Users Group */}
                  {(orderedMetrics.some(m => m.key === 'public_new_users') || orderedMetrics.some(m => m.key === 'numberOfNewUsers')) && (
                    <TableHead
                      colSpan={[orderedMetrics.some(m => m.key === 'public_new_users'), orderedMetrics.some(m => m.key === 'numberOfNewUsers')].filter(Boolean).length}
                      className="text-center py-2 text-[9px] sm:text-sm font-semibold border-b border-border/30 border-r-2 border-r-border/50"
                    >
                      New Users
                    </TableHead>
                  )}
                  {/* Individual columns with rowSpan */}
                  {orderedMetrics.some(m => m.key === 'daily_trades') && (
                    <TableHead rowSpan={2} className="text-right py-2 text-[9px] sm:text-sm px-2 sm:px-4 font-semibold align-bottom border-r border-border/30 w-[70px] sm:w-[90px]">
                      Trades
                    </TableHead>
                  )}
                  {orderedMetrics.some(m => m.key === 'market_share') && (
                    <TableHead rowSpan={2} className="text-right py-2 text-[9px] sm:text-sm px-2 sm:px-4 font-semibold align-bottom border-r border-border/30 w-[100px] sm:w-[130px] whitespace-nowrap">
                      Market Share
                    </TableHead>
                  )}
                  {orderedMetrics.some(m => m.key === 'daily_growth') && (
                    <TableHead rowSpan={2} className="text-right py-2 text-[9px] sm:text-sm px-2 sm:px-4 font-semibold align-bottom w-[120px] sm:w-[160px]">
                      Daily Growth
                    </TableHead>
                  )}
                </TableRow>
                {/* Row 2: Sub-column Headers */}
                <TableRow className="hover:bg-transparent h-3">
                  {/* Volume sub-columns */}
                  {orderedMetrics.some(m => m.key === 'projected_volume') && (
                    <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground w-[55px] sm:w-[70px]">
                      Public
                    </TableHead>
                  )}
                  {orderedMetrics.some(m => m.key === 'total_volume_usd') && (
                    <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground border-r-2 border-r-border/50 w-[55px] sm:w-[70px]">
                      Filtered
                    </TableHead>
                  )}
                  {/* Active Users sub-columns */}
                  {orderedMetrics.some(m => m.key === 'public_daily_users') && (
                    <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground w-[55px] sm:w-[70px]">
                      Public
                    </TableHead>
                  )}
                  {orderedMetrics.some(m => m.key === 'daily_users') && (
                    <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground border-r-2 border-r-border/50 w-[55px] sm:w-[70px]">
                      Filtered
                    </TableHead>
                  )}
                  {/* New Users sub-columns */}
                  {orderedMetrics.some(m => m.key === 'public_new_users') && (
                    <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground w-[55px] sm:w-[70px]">
                      Public
                    </TableHead>
                  )}
                  {orderedMetrics.some(m => m.key === 'numberOfNewUsers') && (
                    <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground border-r-2 border-r-border/50 w-[55px] sm:w-[70px]">
                      Filtered
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Trojan On Solana */}
                <TableRow className="group/row transition-colors hover:bg-muted/30">
                  <TableCell className="pl-1 sm:pl-2 pr-1 sm:pr-4 text-muted-foreground text-[9px] sm:text-sm">
                    <div className="flex items-center gap-0.5 sm:gap-2">
                      <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                        <img
                          src={`/assets/logos/${getProtocolLogoFilename('trojanonsolana')}`}
                          alt="Trojan On Solana"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <span className="truncate">{getProtocolName('trojanonsolana')}</span>
                    </div>
                  </TableCell>
                  {orderedMetrics.map((metric) => (
                    <TableCell
                      key={metric.key}
                      className={`text-right py-0.5 text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)} ${metric.key === 'daily_growth' ? (isProjectedVolumeHidden ? 'min-w-[70px] sm:min-w-[90px]' : 'min-w-[100px] sm:min-w-[130px]') : ''}`}
                    >
                      <span>
                        {metric.getValue
                          ? metric.format(metric.getValue(trojanOnSolanaData || {} as ProtocolMetrics, 'trojanonsolana' as Protocol), false, 'trojanonsolana' as Protocol)
                          : metric.format(trojanOnSolanaData?.[metric.key as keyof ProtocolMetrics] || 0, false, 'trojanonsolana' as Protocol)}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
                {/* Trojan Terminal */}
                <TableRow className="group/row transition-colors hover:bg-muted/30">
                  <TableCell className="pl-1 sm:pl-2 pr-1 sm:pr-4 text-muted-foreground text-[9px] sm:text-sm">
                    <div className="flex items-center gap-0.5 sm:gap-2">
                      <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                        <img
                          src={`/assets/logos/${getProtocolLogoFilename('trojanterminal')}`}
                          alt="Trojan Terminal"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <span className="truncate">{getProtocolName('trojanterminal')}</span>
                    </div>
                  </TableCell>
                  {orderedMetrics.map((metric) => (
                    <TableCell
                      key={metric.key}
                      className={`text-right py-0.5 text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)} ${metric.key === 'daily_growth' ? (isProjectedVolumeHidden ? 'min-w-[70px] sm:min-w-[90px]' : 'min-w-[100px] sm:min-w-[130px]') : ''}`}
                    >
                      <span>
                        {metric.getValue
                          ? metric.format(metric.getValue(trojanTerminalData || {} as ProtocolMetrics, 'trojanterminal' as Protocol), false, 'trojanterminal' as Protocol)
                          : metric.format(trojanTerminalData?.[metric.key as keyof ProtocolMetrics] || 0, false, 'trojanterminal' as Protocol)}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
                {/* Trojan Total */}
                <TableRow className="group/row transition-colors hover:bg-muted/30 font-semibold">
                  <TableCell className="pl-1 sm:pl-2 pr-1 sm:pr-4 text-[9px] sm:text-sm">
                    <div className="flex items-center gap-0.5 sm:gap-2">
                      <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                        <img
                          src={`/assets/logos/${getProtocolLogoFilename('trojan')}`}
                          alt="Trojan Total"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <span className="truncate font-bold">Trojan Total</span>
                    </div>
                  </TableCell>
                  {orderedMetrics.map((metric) => (
                    <TableCell
                      key={metric.key}
                      className={`text-right py-0.5 text-[9px] sm:text-sm px-1 sm:px-4 font-bold ${getColumnGroupBackground(metric.key)} ${metric.key === 'daily_growth' ? (isProjectedVolumeHidden ? 'min-w-[70px] sm:min-w-[90px]' : 'min-w-[100px] sm:min-w-[130px]') : ''}`}
                    >
                      <span>
                        {metric.getValue
                          ? metric.format(metric.getValue(trojanTotalData || {} as ProtocolMetrics, 'trojan' as Protocol), false, 'trojan' as Protocol)
                          : metric.format(trojanTotalData?.[metric.key as keyof ProtocolMetrics] || 0, false, 'trojan' as Protocol)}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
        </div>
      )}

      {/* Main Protocol Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table className="min-w-[600px] sm:min-w-[800px]">
            <TableHeader>
              {/* Row 1: Group Headers */}
              <TableRow className="hover:bg-transparent border-b-0">
                <TableHead rowSpan={2} className="w-[120px] sm:w-[200px] py-2 text-[9px] sm:text-sm px-2 sm:px-4 font-semibold align-bottom border-r border-border/30">
                  Protocol
                </TableHead>
                {/* Volume Group */}
                {(orderedMetrics.some(m => m.key === 'projected_volume') || orderedMetrics.some(m => m.key === 'total_volume_usd')) && (
                  <TableHead
                    colSpan={[orderedMetrics.some(m => m.key === 'projected_volume'), orderedMetrics.some(m => m.key === 'total_volume_usd')].filter(Boolean).length}
                    className="text-center py-2 text-[9px] sm:text-sm font-semibold border-b border-border/30 border-r-2 border-r-border/50"
                  >
                    Volume
                  </TableHead>
                )}
                {/* Active Users Group */}
                {(orderedMetrics.some(m => m.key === 'public_daily_users') || orderedMetrics.some(m => m.key === 'daily_users')) && (
                  <TableHead
                    colSpan={[orderedMetrics.some(m => m.key === 'public_daily_users'), orderedMetrics.some(m => m.key === 'daily_users')].filter(Boolean).length}
                    className="text-center py-2 text-[9px] sm:text-sm font-semibold border-b border-border/30 border-r-2 border-r-border/50"
                  >
                    Active Users
                  </TableHead>
                )}
                {/* New Users Group */}
                {(orderedMetrics.some(m => m.key === 'public_new_users') || orderedMetrics.some(m => m.key === 'numberOfNewUsers')) && (
                  <TableHead
                    colSpan={[orderedMetrics.some(m => m.key === 'public_new_users'), orderedMetrics.some(m => m.key === 'numberOfNewUsers')].filter(Boolean).length}
                    className="text-center py-2 text-[9px] sm:text-sm font-semibold border-b border-border/30 border-r-2 border-r-border/50"
                  >
                    New Users
                  </TableHead>
                )}
                {/* Individual columns with rowSpan */}
                {orderedMetrics.some(m => m.key === 'daily_trades') && (
                  <TableHead rowSpan={2} className="text-right py-2 text-[9px] sm:text-sm px-2 sm:px-4 font-semibold align-bottom border-r border-border/30 group w-[70px] sm:w-[90px]">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                      <span>Trades</span>
                      <button
                        onClick={() => toggleColumnVisibility('daily_trades')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-0.5 hover:bg-accent rounded"
                        title="Hide Trades column"
                      >
                        <EyeOff className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </TableHead>
                )}
                {orderedMetrics.some(m => m.key === 'market_share') && (
                  <TableHead rowSpan={2} className="text-right py-2 text-[9px] sm:text-sm px-2 sm:px-4 font-semibold align-bottom border-r border-border/30 group w-[100px] sm:w-[130px] whitespace-nowrap">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                      <span>Market Share</span>
                      <button
                        onClick={() => toggleColumnVisibility('market_share')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-0.5 hover:bg-accent rounded"
                        title="Hide Market Share column"
                      >
                        <EyeOff className="h-3 w-3" />
                      </button>
                    </div>
                  </TableHead>
                )}
                {orderedMetrics.some(m => m.key === 'daily_growth') && (
                  <TableHead rowSpan={2} className="text-right py-2 text-[9px] sm:text-sm px-2 sm:px-4 font-semibold align-bottom group w-[120px] sm:w-[160px]">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                      <span>Daily Growth</span>
                      <button
                        onClick={() => toggleColumnVisibility('daily_growth')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-0.5 hover:bg-accent rounded"
                        title="Hide Daily Growth column"
                      >
                        <EyeOff className="h-3 w-3" />
                      </button>
                    </div>
                  </TableHead>
                )}
              </TableRow>
              {/* Row 2: Sub-column Headers */}
              <TableRow className="hover:bg-transparent h-3">
                {/* Volume sub-columns */}
                {orderedMetrics.some(m => m.key === 'projected_volume') && (
                  <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground w-[55px] sm:w-[70px]">
                    Public
                  </TableHead>
                )}
                {orderedMetrics.some(m => m.key === 'total_volume_usd') && (
                  <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground border-r-2 border-r-border/50 w-[55px] sm:w-[70px]">
                    Filtered
                  </TableHead>
                )}
                {/* Active Users sub-columns */}
                {orderedMetrics.some(m => m.key === 'public_daily_users') && (
                  <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground w-[55px] sm:w-[70px]">
                    Public
                  </TableHead>
                )}
                {orderedMetrics.some(m => m.key === 'daily_users') && (
                  <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground border-r-2 border-r-border/50 w-[55px] sm:w-[70px]">
                    Filtered
                  </TableHead>
                )}
                {/* New Users sub-columns */}
                {orderedMetrics.some(m => m.key === 'public_new_users') && (
                  <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground w-[55px] sm:w-[70px]">
                    Public
                  </TableHead>
                )}
                {orderedMetrics.some(m => m.key === 'numberOfNewUsers') && (
                  <TableHead className="text-center !h-auto !p-0 !py-0.5 text-[8px] sm:text-[10px] font-medium text-muted-foreground border-r-2 border-r-border/50 w-[55px] sm:w-[70px]">
                    Filtered
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {getMutableAllCategories().map((categoryName) => {
                const categoryProtocols = getMutableProtocolsByCategory(categoryName);
                const availableProtocols = categoryProtocols.map(p => p.id).filter(p => protocols.includes(p as Protocol));
                
                // Sort protocols by adjusted volume (projected volume, highest to lowest)
                const orderedProtocols = availableProtocols.sort((a, b) => {
                  const projectedA = projectedVolumeData[a] || dailyData[a as Protocol]?.total_volume_usd || 0;
                  const projectedB = projectedVolumeData[b] || dailyData[b as Protocol]?.total_volume_usd || 0;
                  return projectedB - projectedA; // Sort descending (highest first)
                });
                
                if (orderedProtocols.length === 0) return null;
                
                const isCollapsed = collapsedCategories.includes(categoryName);
                const toggleCollapse = () => {
                  setCollapsedCategories(prev =>
                    prev.includes(categoryName)
                      ? prev.filter(c => c !== categoryName)
                      : [...prev, categoryName]
                  );
                };

                // Calculate category totals for current day (excluding hidden protocols)
                const visibleProtocols = orderedProtocols.filter(p => !hiddenProtocols.has(p));
                const categoryTotals = orderedMetrics.reduce((acc, metric) => {
                  if (metric.key === 'daily_growth') {
                    const currentVolume = visibleProtocols
                      .reduce((sum, p) => sum + (dailyData[p as Protocol]?.total_volume_usd || 0), 0);
                    const previousVolume = visibleProtocols
                      .reduce((sum, p) => sum + (previousDayData[p as Protocol]?.total_volume_usd || 0), 0);
                    acc[metric.key] = previousVolume === 0 ? 0 : (currentVolume - previousVolume) / previousVolume;
                  } else if (metric.key === 'market_share') {
                    // Calculate category market share based on total volume
                    const categoryVolume = visibleProtocols
                      .reduce((sum, p) => sum + (dailyData[p as Protocol]?.total_volume_usd || 0), 0);
                    acc[metric.key] = totalVolume > 0 ? categoryVolume / totalVolume : 0;
                  } else if (metric.key === 'projected_volume') {
                    // Calculate category projected volume total
                    acc[metric.key] = visibleProtocols
                      .reduce((sum, p) => {
                        // Check if this protocol has projected volume data
                        const projectedVolume = projectedVolumeData[p];
                        if (projectedVolume && projectedVolume > 0) {
                          return sum + projectedVolume;
                        }

                        // For Mobile Apps protocols, use actual volume as projected volume
                        const protocolConfig = getProtocolById(p);
                        if (protocolConfig?.category === 'Mobile Apps') {
                          return sum + (dailyData[p as Protocol]?.total_volume_usd || 0);
                        }

                        // For other protocols without projected data, add 0
                        return sum;
                      }, 0);
                  } else if (metric.key === 'public_daily_users') {
                    // Calculate category public DAUs total
                    acc[metric.key] = visibleProtocols
                      .reduce((sum, p) => sum + (publicUserData[p]?.dailyUsers || 0), 0);
                  } else if (metric.key === 'public_new_users') {
                    // Calculate category public new users total
                    acc[metric.key] = visibleProtocols
                      .reduce((sum, p) => sum + (publicUserData[p]?.newUsers || 0), 0);
                  } else {
                    acc[metric.key] = visibleProtocols
                      .reduce((sum, p) => sum + (dailyData[p as Protocol]?.[metric.key as keyof ProtocolMetrics] || 0), 0);
                  }
                  return acc;
                }, {} as Record<MetricKey, number>);

                return (
                  <React.Fragment key={categoryName}>
                    {/* Category Header */}
                    <TableRow 
                      className={cn("border-t cursor-pointer", getCategoryRowColor(categoryName))}
                      onClick={toggleCollapse}
                    >
                      <TableCell className="font-semibold text-[9px] sm:text-sm tracking-wide py-2 sm:py-4 px-1 sm:px-4">
                        <div className="flex items-center gap-0.5 sm:gap-2">
                          <ChevronRight 
                            className={`h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground transition-transform duration-200 ${
                              !isCollapsed ? 'rotate-90' : ''
                            }`}
                          />
                          <span className="truncate">{categoryName}</span>
                        </div>
                      </TableCell>
                      {orderedMetrics.map((metric) => (
                        <TableCell
                          key={metric.key}
                          className={`text-right font-medium py-0.5 text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)} ${metric.key === 'daily_growth' ? (isProjectedVolumeHidden ? 'min-w-[70px] sm:min-w-[90px]' : 'min-w-[100px] sm:min-w-[130px]') : ''}`}
                        >
                          {metric.key === 'market_share'
                            ? metric.format(categoryTotals[metric.key] || 0, true, undefined, categoryName)
                            : metric.key === 'daily_trades'
                            ? formatNumber(categoryTotals[metric.key] || 0)
                            : metric.key === 'daily_growth'
                            ? metric.format(categoryTotals[metric.key], true, undefined, categoryName)
                            : metric.key === 'projected_volume'
                            ? metric.format(categoryTotals[metric.key] || 0, true, undefined, categoryName)
                            : metric.key === 'public_daily_users'
                            ? metric.format(categoryTotals[metric.key] || 0, true, undefined, categoryName)
                            : metric.key === 'public_new_users'
                            ? metric.format(categoryTotals[metric.key] || 0, true, undefined, categoryName)
                            : metric.getValue
                              ? metric.format(metric.getValue(categoryTotals as ProtocolMetrics), true, undefined, categoryName)
                              : metric.format(categoryTotals[metric.key] || 0, true, undefined, categoryName)}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    {/* Protocol Rows */}
                    {orderedProtocols.map((protocol) => {
                      const isHidden = hiddenProtocols.has(protocol);
                      return (
                        <TableRow
                          key={protocol}
                          className={cn(
                            "group/row transition-colors hover:bg-muted/30",
                            isCollapsed || isHidden ? 'hidden' : '',
                            getTrojanRowStyle(protocol)
                          )}
                        >
                          <TableCell className={cn(
                              "pl-1 sm:pl-2 pr-1 sm:pr-4 text-muted-foreground text-[9px] sm:text-sm",
                              getTrojanFirstCellStyle(protocol)
                            )}>
                            <div className="flex items-center gap-0.5 sm:gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProtocolVisibility(protocol);
                                }}
                                className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                                title={`Hide ${isTrojanProtocol(protocol) ? getTrojanDisplayName(protocol) : getProtocolName(protocol)}`}
                              >
                                <EyeOff className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                              </button>
                              <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                                <img
                                  src={`/assets/logos/${getProtocolLogoFilename(protocol)}`}
                                  alt={protocol}
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
                              <span className="truncate">{isTrojanProtocol(protocol) ? getTrojanDisplayName(protocol) : getProtocolName(protocol)}</span>
                              {topProtocols.includes(protocol) && (
                                <Badge 
                                  variant="secondary"
                                  className={cn(
                                    "ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs font-medium flex-shrink-0",
                                    topProtocols.indexOf(protocol) === 0 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                                    topProtocols.indexOf(protocol) === 1 && "bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300",
                                    topProtocols.indexOf(protocol) === 2 && "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                  )}
                                >
                                  #{topProtocols.indexOf(protocol) + 1}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        {orderedMetrics.map((metric) => (
                          <TableCell
                            key={metric.key}
                            className={`text-right py-0.5 text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)} ${metric.key === 'daily_growth'
                              ? (isProjectedVolumeHidden ? 'min-w-[70px] sm:min-w-[90px]' : 'min-w-[100px] sm:min-w-[130px]')
                              : ''
                            }`}
                          >
                            <span>
                              {metric.getValue
                                ? metric.format(metric.getValue(dailyData[protocol] || {} as ProtocolMetrics, protocol), false, protocol)
                                : metric.format(dailyData[protocol]?.[metric.key] || 0, false, protocol)}
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* All Trading Apps Total Row */}
              <TableRow className="font-bold bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700">
                <TableCell className="pl-3 sm:pl-4 pr-1 sm:pr-4 text-[9px] sm:text-sm">
                  <span className="font-semibold">All Trading Apps</span>
                </TableCell>
                {orderedMetrics.map((metric) => {
                  let total: number;
                  if (metric.key === 'daily_growth') {
                    const currentVolume = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (dailyData[p]?.total_volume_usd || 0), 0);
                    const previousVolume = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (previousDayData[p]?.total_volume_usd || 0), 0);
                    total = previousVolume === 0 ? 0 : (currentVolume - previousVolume) / previousVolume;
                  } else if (metric.key === 'market_share') {
                    total = 1; // 100% by definition for all visible protocols
                  } else if (metric.key === 'projected_volume') {
                    // Calculate total projected volume for all protocols
                    total = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => {
                        // Check if this protocol has projected volume data
                        const projectedVolume = projectedVolumeData[p];
                        if (projectedVolume && projectedVolume > 0) {
                          return sum + projectedVolume;
                        }

                        // For Mobile Apps protocols, use actual volume as projected volume
                        const protocolConfig = getProtocolById(p);
                        if (protocolConfig?.category === 'Mobile Apps') {
                          return sum + (dailyData[p]?.total_volume_usd || 0);
                        }

                        // For other protocols without projected data, add 0
                        return sum;
                      }, 0);
                  } else if (metric.key === 'public_daily_users') {
                    // Calculate total public DAUs for all protocols
                    total = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (publicUserData[p]?.dailyUsers || 0), 0);
                  } else if (metric.key === 'public_new_users') {
                    // Calculate total public new users for all protocols
                    total = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (publicUserData[p]?.newUsers || 0), 0);
                  } else {
                    total = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (dailyData[p]?.[metric.key as keyof ProtocolMetrics] || 0), 0);
                  }
                  
                  if (metric.key === 'daily_growth') {
                    // Calculate aggregated weekly volume data for all protocols
                    const aggregatedWeeklyData: { day: number; value: number }[] = [];
                    
                    for (let i = 0; i < 7; i++) {
                      const dayData = eachDayOfInterval({
                        start: subDays(date, 6),
                        end: date
                      })[i];
                      
                      if (dayData) {
                        const dateKey = format(dayData, 'yyyy-MM-dd');
                        const dailyTotal = protocols
                          .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                          .reduce((sum, p) => {
                            const protocolWeeklyData = weeklyVolumeData[p];
                            return sum + (protocolWeeklyData?.[dateKey] || 0);
                          }, 0);
                        
                        aggregatedWeeklyData.push({
                          day: i,
                          value: dailyTotal
                        });
                      }
                    }
                    
                    // Calculate trend for aggregated data
                    const getAggregatedTrend = (): 'up' | 'down' | 'neutral' => {
                      if (aggregatedWeeklyData.length < 2) return 'neutral';
                      
                      const firstHalf = aggregatedWeeklyData.slice(0, Math.floor(aggregatedWeeklyData.length / 2));
                      const secondHalf = aggregatedWeeklyData.slice(Math.floor(aggregatedWeeklyData.length / 2));
                      
                      const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
                      const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
                      
                      if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
                      if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
                      return 'neutral';
                    };
                    
                    const trend = getAggregatedTrend();
                    const percentage = total * 100;
                    const absPercentage = Math.abs(percentage);
                    const isPositive = total > 0;
                    const isNeutral = Math.abs(total) < 0.001;
                    
                    return (
                      <TableCell
                        key={metric.key}
                        className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}
                      >
                        <div className="flex items-center justify-end sm:justify-between w-full">
                          <div className="hidden sm:block w-[60px] h-[30px] -my-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={aggregatedWeeklyData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <Area 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke={trend === 'up' ? "#22c55e" : trend === 'down' ? "#ef4444" : "#6b7280"}
                                  strokeWidth={1.5}
                                  fill={trend === 'up' ? "#22c55e" : trend === 'down' ? "#ef4444" : "#6b7280"}
                                  fillOpacity={0.2}
                                  dot={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          {!isNeutral && (
                            <div className={cn(
                              "flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs font-medium ml-0.5 sm:ml-1",
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
                              {absPercentage.toFixed(1)}%
                            </div>
                          )}
                          {isNeutral && (
                            <span className="text-muted-foreground text-[9px] sm:text-xs ml-0.5 sm:ml-1">—</span>
                          )}
                        </div>
                      </TableCell>
                    );
                  }
                  
                  if (metric.key === 'projected_volume') {
                    // Calculate total actual volume for comparison
                    const totalActualVolume = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (dailyData[p]?.total_volume_usd || 0), 0);
                    
                    if (totalActualVolume === 0) {
                      return (
                        <TableCell key={metric.key} className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}>
                          <div className="flex items-center gap-1 sm:gap-2 justify-end">
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </TableCell>
                      );
                    }
                    
                    // Calculate difference
                    const difference = total - totalActualVolume;
                    const percentageDiff = (difference / totalActualVolume) * 100;
                    
                    // Determine styling based on difference
                    const isNeutral = Math.abs(difference) < 0.01;
                    const isPositive = difference > 0;
                    
                    let bgColor, borderColor;
                    if (isNeutral) {
                      bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
                      borderColor = "border-l-gray-400";
                    } else if (isPositive) {
                      bgColor = "bg-green-100/80 dark:bg-green-950/40";
                      borderColor = "border-l-green-400";
                    } else {
                      bgColor = "bg-red-100/80 dark:bg-red-950/40";
                      borderColor = "border-l-red-400";
                    }
                    
                    const diffText = `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;
                    
                    return (
                      <TableCell key={metric.key} className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}>
                        <div className={`flex items-center gap-0.5 justify-between px-1 sm:px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
                          <span>{formatCurrency(total)}</span>
                          <span className="text-[9px] font-medium text-muted-foreground">
                            {diffText}
                          </span>
                        </div>
                      </TableCell>
                    );
                  }

                  // Special rendering for public_daily_users with comparison styling
                  if (metric.key === 'public_daily_users') {
                    // Calculate total private daily users for comparison
                    const totalPrivateUsers = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (dailyData[p]?.daily_users || 0), 0);

                    if (total === 0 && totalPrivateUsers === 0) {
                      return (
                        <TableCell key={metric.key} className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}>
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                      );
                    }

                    if (totalPrivateUsers === 0 && total > 0) {
                      return (
                        <TableCell key={metric.key} className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}>
                          <div className="flex items-center gap-0.5 justify-between px-1 sm:px-2 py-1 rounded-md border-l-2 bg-green-100/80 dark:bg-green-950/40 border-l-green-400">
                            <span>{formatNumber(total)}</span>
                          </div>
                        </TableCell>
                      );
                    }

                    // Calculate difference
                    const difference = total - totalPrivateUsers;
                    const percentageDiff = totalPrivateUsers > 0 ? (difference / totalPrivateUsers) * 100 : 0;

                    // Determine styling based on difference
                    const isNeutral = Math.abs(difference) < 1;
                    const isPositive = difference > 0;

                    let bgColor, borderColor;
                    if (isNeutral) {
                      bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
                      borderColor = "border-l-gray-400";
                    } else if (isPositive) {
                      bgColor = "bg-green-100/80 dark:bg-green-950/40";
                      borderColor = "border-l-green-400";
                    } else {
                      bgColor = "bg-red-100/80 dark:bg-red-950/40";
                      borderColor = "border-l-red-400";
                    }

                    const diffText = isNeutral ? '' : `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;

                    return (
                      <TableCell key={metric.key} className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}>
                        <div className={`flex items-center gap-0.5 justify-between px-1 sm:px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
                          <span>{formatNumber(total)}</span>
                          {diffText && <span className="text-[9px] font-medium text-muted-foreground">{diffText}</span>}
                        </div>
                      </TableCell>
                    );
                  }

                  // Special rendering for public_new_users with comparison styling
                  if (metric.key === 'public_new_users') {
                    // Calculate total private new users for comparison
                    const totalPrivateNewUsers = protocols
                      .filter(p => p !== 'all' && !hiddenProtocols.has(p))
                      .reduce((sum, p) => sum + (dailyData[p]?.numberOfNewUsers || 0), 0);

                    if (total === 0 && totalPrivateNewUsers === 0) {
                      return (
                        <TableCell key={metric.key} className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}>
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                      );
                    }

                    if (totalPrivateNewUsers === 0 && total > 0) {
                      return (
                        <TableCell key={metric.key} className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}>
                          <div className="flex items-center gap-0.5 justify-between px-1 sm:px-2 py-1 rounded-md border-l-2 bg-green-100/80 dark:bg-green-950/40 border-l-green-400">
                            <span>{formatNumber(total)}</span>
                          </div>
                        </TableCell>
                      );
                    }

                    // Calculate difference
                    const difference = total - totalPrivateNewUsers;
                    const percentageDiff = totalPrivateNewUsers > 0 ? (difference / totalPrivateNewUsers) * 100 : 0;

                    // Determine styling based on difference
                    const isNeutral = Math.abs(difference) < 1;
                    const isPositive = difference > 0;

                    let bgColor, borderColor;
                    if (isNeutral) {
                      bgColor = "bg-gray-100/80 dark:bg-gray-950/40";
                      borderColor = "border-l-gray-400";
                    } else if (isPositive) {
                      bgColor = "bg-green-100/80 dark:bg-green-950/40";
                      borderColor = "border-l-green-400";
                    } else {
                      bgColor = "bg-red-100/80 dark:bg-red-950/40";
                      borderColor = "border-l-red-400";
                    }

                    const diffText = isNeutral ? '' : `${isPositive ? '+' : ''}${percentageDiff.toFixed(1)}%`;

                    return (
                      <TableCell key={metric.key} className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}>
                        <div className={`flex items-center gap-0.5 justify-between px-1 sm:px-2 py-1 rounded-md border-l-2 ${bgColor} ${borderColor}`}>
                          <span>{formatNumber(total)}</span>
                          {diffText && <span className="text-[9px] font-medium text-muted-foreground">{diffText}</span>}
                        </div>
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell
                      key={metric.key}
                      className={`text-right font-bold text-[9px] sm:text-sm px-1 sm:px-4 ${getColumnGroupBackground(metric.key)}`}
                    >
                      {metric.key === 'daily_trades' ? formatNumber(total) : metric.format(total, true)}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
        </Table>
      </div>
    </div>

    {/* Download/Copy buttons - outside data-table so they don't appear in screenshots */}
    <div className="flex justify-end gap-2 pt-4">
      <button
        onClick={downloadReport}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/50 border border-border rounded-lg transition-colors"
        aria-label="Download daily report as image"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download
      </button>
      <button
        onClick={copyToClipboard}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/50 border border-border rounded-lg transition-colors"
        aria-label="Copy daily report to clipboard"
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy
      </button>
    </div>
  </>
  );
}
