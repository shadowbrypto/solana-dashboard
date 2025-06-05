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
      break;
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
  // Initialize empty array to store all records
  let allData: any[] = [];
  let hasMore = true;
  let page = 0;
  const PAGE_SIZE = 1000;

  // Fetch all records using pagination
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

    // Log progress
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

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}
