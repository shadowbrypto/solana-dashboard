import { supabase } from './supabase';
import { ProtocolStats, ProtocolMetrics } from '../types/protocol';

type ProtocolStatsWithDay = ProtocolStats & { formattedDay: string };

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_EXPIRY = 60 * 60 * 1000; // 5 in milliseconds
const protocolStatsCache = new Map<string, CacheEntry<ProtocolStats[]>>();
const totalStatsCache = new Map<string, CacheEntry<ProtocolMetrics>>();

function isCacheValid<T>(cache: CacheEntry<T>): boolean {
  return Date.now() - cache.timestamp < CACHE_EXPIRY;
}

export async function getProtocolStats(protocolName?: string) {
  const cacheKey = protocolName || 'all';
  const cachedData = protocolStatsCache.get(cacheKey);

  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  let query = supabase
    .from('protocol_stats')
    .select('*')
    .order('date', { ascending: false });
  
  if (protocolName) {
    query = query.eq('protocol_name', protocolName);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching protocol stats:', error);
    return [];
  }

  let formattedData;
  
  if (!protocolName) {
    // For all protocols, group by date
    const dateMap = new Map<string, Record<string, ProtocolStatsWithDay>>();
    
    data.forEach((row: ProtocolStats) => {
      const formattedDay = formatDate(row.date);
      if (!dateMap.has(formattedDay)) {
        dateMap.set(formattedDay, {});
      }
      const dateEntry = dateMap.get(formattedDay)!;
      // Store complete protocol stats for each protocol
      dateEntry[row.protocol_name] = {
        ...row,
        formattedDay
      };
    });

    // Convert to array format expected by TimelineChart
    formattedData = Array.from(dateMap.entries()).map(([formattedDay, protocols]) => ({
      formattedDay,
      ...protocols
    })) as ProtocolStatsWithDay[];
  } else {
    formattedData = data.map((row: ProtocolStats) => ({
      ...row,
      formattedDay: formatDate(row.date),
    }));
  }

  protocolStatsCache.set(cacheKey, {
    data: formattedData,
    timestamp: Date.now()
  });

  return formattedData;
}

export async function getTotalProtocolStats(protocolName?: string): Promise<ProtocolMetrics> {
  const cacheKey = protocolName || 'all';
  const cachedData = totalStatsCache.get(cacheKey);

  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }
  let query = supabase
    .from('protocol_stats')
    .select('volume_usd, daily_users, new_users, trades, fees_usd');

  if (protocolName) {
    query = query.eq('protocol_name', protocolName);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    console.error('Error fetching total protocol stats:', error);
    return {
      total_volume_usd: 0,
      daily_users: 0,
      numberOfNewUsers: 0,
      daily_trades: 0,
      total_fees_usd: 0
    };
  }

  const metrics: ProtocolMetrics = {
    total_volume_usd: data.reduce((sum, row) => sum + (Number(row.volume_usd) || 0), 0),
    daily_users: data.reduce((sum, row) => sum + (Number(row.daily_users) || 0), 0),
    numberOfNewUsers: data.reduce((sum, row) => sum + (Number(row.new_users) || 0), 0),
    daily_trades: data.reduce((sum, row) => sum + (Number(row.trades) || 0), 0),
    total_fees_usd: data.reduce((sum, row) => sum + (Number(row.fees_usd) || 0), 0)
  };

  totalStatsCache.set(cacheKey, {
    data: metrics,
    timestamp: Date.now()
  });

  return metrics;
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}
