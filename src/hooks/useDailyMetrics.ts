import { useState, useEffect, useCallback } from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { protocolApi } from '../lib/api';
import { Protocol, ProtocolMetrics } from '../types/protocol';
import { Settings } from '../lib/settings';

interface DailyMetricsData {
  dailyData: Record<Protocol, ProtocolMetrics>;
  previousDayData: Record<Protocol, ProtocolMetrics>;
  weeklyVolumeData: Record<Protocol, Record<string, number>>;
  projectedVolumeData: Record<string, number>;
  publicUserData: Record<string, { dailyUsers: number; newUsers: number }>;
  backendTotals: {
    totalVolume: number;
    totalFees: number;
    totalUsers: number;
    totalNewUsers: number;
    totalTrades: number;
  } | null;
  topProtocols: Protocol[];
}

interface UseDailyMetricsOptions {
  date: Date;
  chain?: 'solana' | 'evm' | 'monad';
}

interface UseDailyMetricsReturn extends DailyMetricsData {
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const emptyData: DailyMetricsData = {
  dailyData: {},
  previousDayData: {},
  weeklyVolumeData: {},
  projectedVolumeData: {},
  publicUserData: {},
  backendTotals: null,
  topProtocols: [],
};

export function useDailyMetrics({
  date,
  chain = 'solana'
}: UseDailyMetricsOptions): UseDailyMetricsReturn {
  const [data, setData] = useState<DailyMetricsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dataType, setDataType] = useState<'private' | 'public'>(Settings.getDataType());

  // Listen for dataType changes from settings
  useEffect(() => {
    const unsubscribe = Settings.addDataTypeChangeListener((newDataType) => {
      setDataType(newDataType);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch both main data and public data in parallel
      const [optimizedData, publicData] = await Promise.all([
        protocolApi.getDailyMetricsOptimized(date, chain, dataType),
        protocolApi.getDailyMetricsOptimized(date, chain, 'public')
      ]);

      // Extract public user data for DAUs* and New Users* columns
      const publicUserMap: Record<string, { dailyUsers: number; newUsers: number }> = {};
      Object.entries(publicData.protocols).forEach(([protocolName, protocolData]: [string, any]) => {
        publicUserMap[protocolName] = {
          dailyUsers: protocolData.dailyUsers || 0,
          newUsers: protocolData.newUsers || 0
        };
      });

      // Transform the optimized data to match the component's data structure
      const transformedDailyData: Record<Protocol, ProtocolMetrics> = {};
      const transformedPreviousData: Record<Protocol, ProtocolMetrics> = {};
      const transformedWeeklyData: Record<Protocol, Record<string, number>> = {};
      const projectedVolumeMap: Record<string, number> = {};

      // Generate last 7 days for weekly data structure
      const last7Days = eachDayOfInterval({
        start: subDays(date, 6),
        end: date
      });

      Object.entries(optimizedData.protocols).forEach(([protocolName, protocolData]) => {
        const protocol = protocolName as Protocol;

        // Current day data
        transformedDailyData[protocol] = {
          total_volume_usd: protocolData.totalVolume,
          daily_users: protocolData.dailyUsers,
          numberOfNewUsers: protocolData.newUsers,
          daily_trades: protocolData.trades,
          total_fees_usd: protocolData.fees,
          projected_volume: protocolData.projectedVolume || 0,
          adjustedVolume: protocolData.adjustedVolume || protocolData.totalVolume,
          daily_growth: protocolData.dailyGrowth || 0
        };

        // Previous day data (calculate from current volume and growth)
        const currentVolume = (protocolData.projectedVolume && protocolData.projectedVolume > 0)
          ? protocolData.projectedVolume
          : protocolData.totalVolume;
        const previousVolume = protocolData.dailyGrowth !== 0 && currentVolume > 0
          ? currentVolume / (1 + protocolData.dailyGrowth)
          : 0;

        transformedPreviousData[protocol] = {
          total_volume_usd: previousVolume,
          daily_users: 0,
          numberOfNewUsers: 0,
          daily_trades: 0,
          total_fees_usd: 0,
          projected_volume: (protocolData.projectedVolume && protocolData.projectedVolume > 0) ? previousVolume : 0,
          daily_growth: 0
        };

        // Weekly volume data
        transformedWeeklyData[protocol] = {};
        last7Days.forEach((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          transformedWeeklyData[protocol][dateKey] = protocolData.weeklyTrend[index] || 0;
        });

        // Projected volume data
        if (protocolData.projectedVolume && protocolData.projectedVolume > 0) {
          projectedVolumeMap[protocol] = protocolData.projectedVolume;
        }
      });

      setData({
        dailyData: transformedDailyData,
        previousDayData: transformedPreviousData,
        weeklyVolumeData: transformedWeeklyData,
        projectedVolumeData: projectedVolumeMap,
        publicUserData: publicUserMap,
        backendTotals: optimizedData.totals,
        topProtocols: optimizedData.topProtocols as Protocol[],
      });

    } catch (err) {
      console.error(`Error loading ${chain} daily data:`, err);
      setError(err instanceof Error ? err : new Error('Failed to fetch daily metrics'));
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [date, chain, dataType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchData
  };
}
