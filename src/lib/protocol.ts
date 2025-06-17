import { ProtocolStats, ProtocolMetrics, Protocol } from '../types/protocol';
import { protocolApi } from './api';
import { format } from 'date-fns';

export interface ProtocolStatsWithDay extends Omit<ProtocolStats, 'formattedDay'> {
  formattedDay: string;
  [key: string]: ProtocolStats | string | number;
}

// Cache interface for consistency (though caching is now handled by the backend)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds (shorter since backend has its own cache)
const protocolStatsCache = new Map<string, CacheEntry<ProtocolStats[]>>();
const totalStatsCache = new Map<string, CacheEntry<ProtocolMetrics>>();
const dailyMetricsCache = new Map<string, CacheEntry<Record<string, ProtocolMetrics>>>();

function isCacheValid<T>(cache: CacheEntry<T>): boolean {
  return Date.now() - cache.timestamp < CACHE_EXPIRY;
}

export async function getProtocolStats(protocolName?: string | string[]) {
  const cacheKey = Array.isArray(protocolName) 
    ? protocolName.sort().join(',') 
    : (protocolName || 'all');

  // Check local cache first
  const cachedData = protocolStatsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    const stats = await protocolApi.getProtocolStats(protocolName);
    
    // Cache the results locally
    protocolStatsCache.set(cacheKey, {
      data: stats,
      timestamp: Date.now()
    });

    return stats;
  } catch (error) {
    console.error('Error fetching protocol stats from API:', error);
    
    // Return cached data if available, even if expired
    if (cachedData) {
      console.warn('Returning expired cached data due to API error');
      return cachedData.data;
    }
    
    throw error;
  }
}

export async function getTotalProtocolStats(protocolName?: string): Promise<ProtocolMetrics> {
  const cacheKey = protocolName || 'all';
  
  // Check local cache first
  const cachedData = totalStatsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    const totalStats = await protocolApi.getTotalProtocolStats(protocolName);
    
    // Cache the results locally
    totalStatsCache.set(cacheKey, {
      data: totalStats,
      timestamp: Date.now()
    });

    return totalStats;
  } catch (error) {
    console.error('Error fetching total protocol stats from API:', error);
    
    // Return cached data if available, even if expired
    if (cachedData) {
      console.warn('Returning expired cached data due to API error');
      return cachedData.data;
    }
    
    throw error;
  }
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

export async function getDailyMetrics(date: Date): Promise<Record<Protocol, ProtocolMetrics>> {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const cacheKey = formattedDate;

  // Check local cache first
  const cachedData = dailyMetricsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    const dailyMetrics = await protocolApi.getDailyMetrics(date);
    
    // Cache the results locally
    dailyMetricsCache.set(cacheKey, {
      data: dailyMetrics,
      timestamp: Date.now()
    });

    return dailyMetrics;
  } catch (error) {
    console.error('Error fetching daily metrics from API:', error);
    
    // Return cached data if available, even if expired
    if (cachedData) {
      console.warn('Returning expired cached data due to API error');
      return cachedData.data;
    }
    
    throw error;
  }
}
