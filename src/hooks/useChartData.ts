import { useState, useEffect, useCallback } from 'react';
import { getProtocolStats, getAggregatedProtocolStats } from '../lib/protocol';
import { ProtocolStats } from '../types/protocol';

type TimeFrame = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

interface UseChartDataOptions {
  protocol?: string | string[];
  timeframe?: TimeFrame;
  isAggregated?: boolean;
}

interface UseChartDataReturn {
  data: any[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useChartData({
  protocol,
  timeframe = '3m',
  isAggregated = false
}: UseChartDataOptions): UseChartDataReturn {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    console.log(`🎯 useChartData fetchData called with: protocol=${protocol}, timeframe=${timeframe}, isAggregated=${isAggregated}`);
    setLoading(true);
    setError(null);
    
    try {
      let result: any[];
      
      if (isAggregated) {
        // Fetch aggregated data for all protocols
        console.log(`📊 Fetching aggregated data for timeframe: ${timeframe}`);
        result = await getAggregatedProtocolStats(timeframe);
      } else {
        // Fetch individual protocol data
        console.log(`📈 Fetching individual protocol data for: ${protocol}, timeframe: ${timeframe}`);
        result = await getProtocolStats(protocol, timeframe);
      }
      
      console.log(`✅ Data fetched successfully, ${result.length} records`);
      setData(result);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch chart data'));
    } finally {
      setLoading(false);
    }
  }, [protocol, timeframe, isAggregated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}