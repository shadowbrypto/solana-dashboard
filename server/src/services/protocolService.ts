import { supabase } from '../lib/supabase.js';
import { ProtocolStats, ProtocolMetrics, Protocol, ProtocolStatsWithDay } from '../types/protocol.js';
import { format } from 'date-fns';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
const protocolStatsCache = new Map<string, CacheEntry<ProtocolStats[]>>();
const totalStatsCache = new Map<string, CacheEntry<ProtocolMetrics>>();
const dailyMetricsCache = new Map<string, CacheEntry<Record<string, ProtocolMetrics>>>();

function isCacheValid<T>(cache: CacheEntry<T>): boolean {
  return Date.now() - cache.timestamp < CACHE_EXPIRY;
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

export async function getProtocolStats(protocolName?: string | string[]) {
  const cacheKey = Array.isArray(protocolName) 
    ? protocolName.sort().join(',') 
    : (protocolName || 'all');

  const cachedData = protocolStatsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  let allData: any[] = [];
  let hasMore = true;
  let page = 0;
  const PAGE_SIZE = 1000;

  while (hasMore) {
    let query = supabase
      .from('protocol_stats')
      .select('*')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (protocolName) {
      if (Array.isArray(protocolName)) {
        const normalizedProtocols = protocolName.map(p => p.toLowerCase());
        query = query.in('protocol_name', normalizedProtocols);
      } else {
        const normalizedProtocol = protocolName.toLowerCase();
        query = query.eq('protocol_name', normalizedProtocol);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching protocol stats:', error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    page++;

    console.log(`Fetched ${allData.length} protocol stats records so far...`);
  }

  if (allData.length === 0) {
    return [];
  }

  console.log(`Total protocol stats records fetched: ${allData.length}`);

  const formattedData = allData.map((row: ProtocolStats) => ({
    ...row,
    formattedDay: formatDate(row.date)
  }));

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

  let allData: any[] = [];
  let hasMore = true;
  let page = 0;
  const PAGE_SIZE = 1000;

  while (hasMore) {
    const query = supabase
      .from('protocol_stats')
      .select('volume_usd, daily_users, new_users, trades, fees_usd')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (protocolName) {
      query.eq('protocol_name', protocolName);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    page++;

    console.log(`Fetched ${allData.length} records so far...`);
  }

  if (allData.length === 0) {
    return {
      total_volume_usd: 0,
      daily_users: 0,
      numberOfNewUsers: 0,
      daily_trades: 0,
      total_fees_usd: 0
    };
  }

  console.log(`Total records fetched: ${allData.length}`);

  const metrics: ProtocolMetrics = {
    total_volume_usd: allData.reduce((sum, row) => sum + (Number(row.volume_usd) || 0), 0),
    daily_users: allData.reduce((sum, row) => sum + (Number(row.daily_users) || 0), 0),
    numberOfNewUsers: allData.reduce((sum, row) => sum + (Number(row.new_users) || 0), 0),
    daily_trades: allData.reduce((sum, row) => sum + (Number(row.trades) || 0), 0),
    total_fees_usd: allData.reduce((sum, row) => sum + (Number(row.fees_usd) || 0), 0)
  };

  totalStatsCache.set(cacheKey, {
    data: metrics,
    timestamp: Date.now()
  });

  return metrics;
}

export async function getDailyMetrics(date: Date): Promise<Record<Protocol, ProtocolMetrics>> {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const cacheKey = formattedDate;

  const cachedData = dailyMetricsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  const { data, error } = await supabase
    .from('protocol_stats')
    .select('protocol_name, volume_usd, daily_users, new_users, trades, fees_usd')
    .eq('date', formattedDate);

  if (error) {
    console.error('Error fetching daily metrics:', error);
    throw error;
  }

  const metrics: Record<Protocol, ProtocolMetrics> = {} as Record<Protocol, ProtocolMetrics>;

  data?.forEach((row) => {
    const protocol = row.protocol_name as Protocol;
    metrics[protocol] = {
      total_volume_usd: Number(row.volume_usd) || 0,
      daily_users: Number(row.daily_users) || 0,
      numberOfNewUsers: Number(row.new_users) || 0,
      daily_trades: Number(row.trades) || 0,
      total_fees_usd: Number(row.fees_usd) || 0
    };
  });

  dailyMetricsCache.set(cacheKey, {
    data: metrics,
    timestamp: Date.now()
  });

  return metrics;
}
