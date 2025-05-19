import { supabase } from './supabase';
import { ProtocolStats, ProtocolMetrics } from '../types/protocol';

export interface ProtocolStatsWithDay extends Omit<ProtocolStats, 'formattedDay'> {
  formattedDay: string;
  [key: string]: ProtocolStats | string | number;
}

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

export async function getProtocolStats(protocolName?: string | string[]) {
  // If array of protocol names is provided, create a cache key from sorted names
  const cacheKey = Array.isArray(protocolName) 
    ? protocolName.sort().join(',') 
    : (protocolName || 'all');

  const cachedData = protocolStatsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  let query = supabase
    .from('protocol_stats')
    .select('*')
    .order('date', { ascending: false });
  
  if (protocolName) {
    if (Array.isArray(protocolName)) {
      // For multiple protocols, use in query
      const normalizedProtocols = protocolName.map(p => p.toLowerCase());
      query = query.in('protocol_name', normalizedProtocols);

    } else {
      // For single protocol
      const normalizedProtocol = protocolName.toLowerCase();
      query = query.eq('protocol_name', normalizedProtocol);

    }
  } else {

  }

  const { data, error } = await query;
  
  if (error) {

    return [];
  }

  const formattedData = data.map((row: ProtocolStats) => ({
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
  let query = supabase
    .from('protocol_stats')
    .select('volume_usd, daily_users, new_users, trades, fees_usd');

  if (protocolName) {
    query = query.eq('protocol_name', protocolName);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {

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

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}
