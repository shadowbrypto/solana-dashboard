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

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache for better performance
const protocolStatsCache = new Map<string, CacheEntry<ProtocolStats[]>>();
const totalStatsCache = new Map<string, CacheEntry<ProtocolMetrics>>();
const dailyMetricsCache = new Map<string, CacheEntry<Record<string, ProtocolMetrics>>>();
const aggregatedStatsCache = new Map<string, CacheEntry<any[]>>();

function isCacheValid<T>(cache: CacheEntry<T>): boolean {
  return Date.now() - cache.timestamp < CACHE_EXPIRY;
}

// Clear all frontend caches
export function clearAllFrontendCaches(): void {
  protocolStatsCache.clear();
  totalStatsCache.clear();
  dailyMetricsCache.clear();
  aggregatedStatsCache.clear();
  console.log('All frontend caches cleared');
}

// Clear cache for specific protocol
export function clearProtocolFrontendCache(protocolName?: string): void {
  if (!protocolName) {
    clearAllFrontendCaches();
    return;
  }

  // Clear entries that contain this protocol
  const keysToDelete: string[] = [];
  
  protocolStatsCache.forEach((_, key) => {
    if (key === protocolName || key.includes(protocolName) || key === 'all') {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => protocolStatsCache.delete(key));
  
  // Clear related caches
  totalStatsCache.delete(protocolName);
  totalStatsCache.delete('all');
  dailyMetricsCache.clear();
  aggregatedStatsCache.clear();
  
  console.log(`Frontend cache cleared for protocol: ${protocolName}`);
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
    // Return cached data if available, even if expired
    if (cachedData) {
      return cachedData.data;
    }
    
    throw error;
  }
}

export async function getTotalProtocolStats(protocolName?: string, chain?: string): Promise<ProtocolMetrics> {
  const cacheKey = protocolName || 'all';
  
  // Check local cache first
  const cachedData = totalStatsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    const totalStats = await protocolApi.getTotalProtocolStats(protocolName, chain);
    
    // Cache the results locally
    totalStatsCache.set(cacheKey, {
      data: totalStats,
      timestamp: Date.now()
    });

    return totalStats;
  } catch (error) {
    // Handle error silently
    
    // Return cached data if available, even if expired
    if (cachedData) {
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
  // Use local date components to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
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
    // Handle error silently
    
    // Return cached data if available, even if expired
    if (cachedData) {
      return cachedData.data;
    }
    
    throw error;
  }
}

export async function getAggregatedProtocolStats(): Promise<any[]> {
  const cacheKey = 'all-protocols-aggregated';
  
  // Check local cache first
  const cachedData = aggregatedStatsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    const aggregatedStats = await protocolApi.getAggregatedProtocolStats();
    
    // Cache the results locally
    aggregatedStatsCache.set(cacheKey, {
      data: aggregatedStats,
      timestamp: Date.now()
    });

    return aggregatedStats;
  } catch (error) {
    // Aggregated endpoint failed, falling back to individual protocol fetching
    
    // Fallback to the old method if the new endpoint fails
    try {
      const protocols = ["bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector", "fomo", "slingshot", "bonkbot terminal", "nova terminal"];
      const allData = await getProtocolStats(protocols);

      // Transform the data to match the aggregated format
      const dataByDate = new Map();
      const allDates = new Set(allData.map(item => item.date));

      Array.from(allDates).forEach(date => {
        const entry: any = {
          date,
          formattedDay: formatDate(date)
        };

        protocols.forEach(protocol => {
          const protocolKey = protocol.replace(/\s+/g, '_').toLowerCase();
          entry[`${protocolKey}_volume`] = 0;
          entry[`${protocolKey}_users`] = 0;
          entry[`${protocolKey}_new_users`] = 0;
          entry[`${protocolKey}_trades`] = 0;
          entry[`${protocolKey}_fees`] = 0;
        });

        dataByDate.set(date, entry);
      });

      allData.forEach(item => {
        const dateEntry = dataByDate.get(item.date);
        if (dateEntry) {
          const protocol = item.protocol_name;
          // Find matching protocol (case-insensitive)
          const matchingProtocol = protocols.find(p => p.toLowerCase() === protocol.toLowerCase());
          if (matchingProtocol) {
            const protocolKey = matchingProtocol.replace(/\s+/g, '_').toLowerCase();
            dateEntry[`${protocolKey}_volume`] = Number(item.volume_usd) || 0;
            dateEntry[`${protocolKey}_users`] = Number(item.daily_users) || 0;
            dateEntry[`${protocolKey}_new_users`] = Number(item.new_users) || 0;
            dateEntry[`${protocolKey}_trades`] = Number(item.trades) || 0;
            dateEntry[`${protocolKey}_fees`] = Number(item.fees_usd) || 0;
          }
        }
      });

      const fallbackData = Array.from(dataByDate.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Cache the fallback results
      aggregatedStatsCache.set(cacheKey, {
        data: fallbackData,
        timestamp: Date.now()
      });

      return fallbackData;
    } catch (fallbackError) {
      // Return cached data if available, even if expired
      if (cachedData) {
        return cachedData.data;
      }
      
      throw fallbackError;
    }
  }
}
