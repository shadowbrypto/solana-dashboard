import { ProtocolStats, ProtocolMetrics, Protocol } from '../types/protocol';
import { protocolApi } from './api';
import { format } from 'date-fns';
import { Settings } from './settings';
import { cacheManager, CACHE_NAMESPACES } from './cache-manager';

export interface ProtocolStatsWithDay extends Omit<ProtocolStats, 'formattedDay'> {
  formattedDay: string;
  [key: string]: ProtocolStats | string | number;
}

// Cache interface for consistency (though caching is now handled by the backend)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache for better performance
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes cache for better performance
const protocolStatsCache = new Map<string, CacheEntry<ProtocolStats[]>>();
const totalStatsCache = new Map<string, CacheEntry<ProtocolMetrics>>();
const dailyMetricsCache = new Map<string, CacheEntry<Record<string, ProtocolMetrics>>>();
const aggregatedStatsCache = new Map<string, CacheEntry<any[]>>();

function isCacheValid<T>(cache: CacheEntry<T>): boolean {
  return Date.now() - cache.timestamp < CACHE_EXPIRY;
}

// Clear all frontend caches
export function clearAllFrontendCaches(): void {
  cacheManager.clearAll();
  // Also clear legacy caches
  protocolStatsCache.clear();
  totalStatsCache.clear();
  dailyMetricsCache.clear();
  aggregatedStatsCache.clear();
  console.log('All frontend caches cleared');
}

// Reset all caches and settings (for after data refresh)
export function resetAllCaches(): void {
  cacheManager.reset();
  // Also clear legacy caches
  protocolStatsCache.clear();
  totalStatsCache.clear();
  dailyMetricsCache.clear();
  aggregatedStatsCache.clear();
  console.log('All caches reset to default state');
}

// Clear cache for specific protocol
export function clearProtocolFrontendCache(protocolName?: string): void {
  if (!protocolName) {
    clearAllFrontendCaches();
    return;
  }

  // Clear entries for this protocol across all namespaces
  Object.values(CACHE_NAMESPACES).forEach(namespace => {
    // Clear direct protocol entries
    cacheManager.delete(namespace, protocolName);
    cacheManager.delete(namespace, `${protocolName}_stats`);
    cacheManager.delete(namespace, `${protocolName}_metrics`);
    
    // Clear 'all' entries that would include this protocol
    cacheManager.delete(namespace, 'all');
    cacheManager.delete(namespace, 'all_protocols');
  });
  
  console.log(`Frontend cache cleared for protocol: ${protocolName}`);
}

// Clear cache for all EVM protocols
export function clearEVMProtocolsCaches(): void {
  const evmProtocols = ['sigma', 'maestro', 'bloom', 'banana', 'photon', 'terminal', 'gmgnai', 'mevx', 'axiom']; // Clean names without _evm suffix

  evmProtocols.forEach(protocol => {
    clearProtocolFrontendCache(protocol);
  });

  // Clear EVM-specific namespace
  cacheManager.clearNamespace(CACHE_NAMESPACES.EVM_DATA);

  console.log('Frontend caches cleared for all EVM protocols');
}

export async function getProtocolStats(protocolName?: string | string[], chain?: string) {
  const dataType = Settings.getDataTypePreference();
  const cacheKey = Array.isArray(protocolName) 
    ? protocolName.sort().join(',') 
    : (protocolName || 'all') + '_' + (chain || 'default') + '_' + dataType;

  // Check cache first
  const cachedData = cacheManager.get<ProtocolStats[]>(CACHE_NAMESPACES.PROTOCOL_STATS, cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const stats = await protocolApi.getProtocolStats(protocolName, chain, dataType);
    
    // Cache the results
    cacheManager.set(CACHE_NAMESPACES.PROTOCOL_STATS, cacheKey, stats, { ttl: CACHE_TTL });

    return stats;
  } catch (error) {
    throw error;
  }
}

export async function getTotalProtocolStats(protocolName?: string, chain?: string): Promise<ProtocolMetrics> {
  const dataType = Settings.getDataTypePreference();
  const cacheKey = (protocolName || 'all') + '_' + (chain || 'default') + '_' + dataType;
  
  // Check cache first
  const cachedData = cacheManager.get<ProtocolMetrics>(CACHE_NAMESPACES.TOTAL_STATS, cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const totalStats = await protocolApi.getTotalProtocolStats(protocolName, chain, dataType);
    
    // Cache the results
    cacheManager.set(CACHE_NAMESPACES.TOTAL_STATS, cacheKey, totalStats, { ttl: CACHE_TTL });

    return totalStats;
  } catch (error) {
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
  const dataType = Settings.getDataTypePreference();
  const cacheKey = `${formattedDate}_${dataType}`;

  // Check cache first
  const cachedData = cacheManager.get<Record<Protocol, ProtocolMetrics>>(CACHE_NAMESPACES.DAILY_METRICS, cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const dailyMetrics = await protocolApi.getDailyMetrics(date, dataType);
    
    // Cache the results
    cacheManager.set(CACHE_NAMESPACES.DAILY_METRICS, cacheKey, dailyMetrics, { ttl: CACHE_TTL });

    return dailyMetrics;
  } catch (error) {
    throw error;
  }
}

export async function getAggregatedProtocolStats(): Promise<any[]> {
  const dataType = Settings.getDataTypePreference();
  const cacheKey = `all-protocols-aggregated_${dataType}`;
  
  // Check centralized cache first
  const cachedData = cacheManager.get<any[]>(CACHE_NAMESPACES.AGGREGATED_STATS, cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const aggregatedStats = await protocolApi.getAggregatedProtocolStats(dataType);
    
    // Cache the results
    cacheManager.set(CACHE_NAMESPACES.AGGREGATED_STATS, cacheKey, aggregatedStats, { ttl: CACHE_TTL });

    return aggregatedStats;
  } catch (error) {
    // Aggregated endpoint failed, falling back to individual protocol fetching
    
    // Fallback to the old method if the new endpoint fails
    try {
      const protocols = ["bullx", "photon", "trojanonsolana", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "terminal", "moonshot", "vector", "fomo", "slingshot", "telemetry", "nova terminal", "rhythm", "vyper"];
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
      cacheManager.set(CACHE_NAMESPACES.AGGREGATED_STATS, cacheKey, fallbackData, { ttl: CACHE_TTL });

      return fallbackData;
    } catch (fallbackError) {
      // Return cached data if available, even if expired
      const expiredCache = cacheManager.get<any[]>(CACHE_NAMESPACES.AGGREGATED_STATS, cacheKey);
      if (expiredCache) {
        return expiredCache;
      }
      
      throw fallbackError;
    }
  }
}
