import { supabase } from '../lib/supabase.js';
import { format } from 'date-fns';
import { getSolanaProtocols, getEVMProtocols } from '../config/chainProtocols.js';

export interface StandardQueryParams {
  chain?: 'solana' | 'ethereum' | 'base' | 'bsc' | 'avax' | 'arbitrum' | 'evm';
  protocol?: string | string[];
  date?: string;
  startDate?: string;
  endDate?: string;
  timeframe?: '7d' | '30d' | '90d' | '6m' | '1y';
  dataType?: 'public' | 'private';
}

export interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    chain?: string;
    protocol?: string;
    dateRange?: { start: string; end: string };
    totalRecords?: number;
    cacheHit?: boolean;
  };
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
const unifiedCache = new Map<string, CacheEntry<any>>();

function isCacheValid<T>(cache: CacheEntry<T>): boolean {
  return Date.now() - cache.timestamp < CACHE_EXPIRY;
}

export class UnifiedProtocolService {
  // Parameter validation
  static validateParams(params: StandardQueryParams): string[] {
    const errors: string[] = [];
    
    if (params.chain && !['solana', 'ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'evm'].includes(params.chain)) {
      errors.push('Invalid chain parameter. Must be one of: solana, ethereum, base, bsc, avax, arbitrum, evm');
    }
    
    if (params.date && !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      errors.push('Invalid date format. Use YYYY-MM-DD');
    }
    
    if (params.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.startDate)) {
      errors.push('Invalid startDate format. Use YYYY-MM-DD');
    }
    
    if (params.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.endDate)) {
      errors.push('Invalid endDate format. Use YYYY-MM-DD');
    }
    
    if (params.timeframe && !['7d', '30d', '90d', '6m', '1y'].includes(params.timeframe)) {
      errors.push('Invalid timeframe. Must be one of: 7d, 30d, 90d, 6m, 1y');
    }
    
    if (params.dataType && !['public', 'private'].includes(params.dataType)) {
      errors.push('Invalid dataType. Must be one of: public, private');
    }
    
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      if (start > end) {
        errors.push('startDate must be before endDate');
      }
    }
    
    return errors;
  }
  
  // Normalize chain filter
  private static normalizeChainFilter(chain?: string): string[] | undefined {
    if (!chain) return undefined;
    
    if (chain === 'evm') return ['ethereum', 'base', 'bsc', 'avax', 'arbitrum'];
    if (chain === 'solana') return ['solana'];
    return [chain];
  }
  
  // Normalize protocol filter
  private static normalizeProtocolFilter(protocol?: string | string[]): string[] | undefined {
    if (!protocol) return undefined;
    
    if (Array.isArray(protocol)) return protocol;
    if (typeof protocol === 'string') {
      return protocol.includes(',') ? protocol.split(',').map(p => p.trim()) : [protocol];
    }
    
    return undefined;
  }
  
  // Generate cache key
  private static generateCacheKey(method: string, params: StandardQueryParams): string {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : value}`)
      .join('&');
    
    return `${method}_${sortedParams}`;
  }
  
  // Main unified metrics method
  async getMetrics(params: StandardQueryParams): Promise<StandardApiResponse<any>> {
    const errors = UnifiedProtocolService.validateParams(params);
    if (errors.length > 0) {
      return { success: false, error: errors.join('; ') };
    }
    
    const cacheKey = UnifiedProtocolService.generateCacheKey('metrics', params);
    const cachedData = unifiedCache.get(cacheKey);
    
    if (cachedData && isCacheValid(cachedData)) {
      return {
        success: true,
        data: cachedData.data,
        metadata: { cacheHit: true }
      };
    }
    
    try {
      const chainFilter = UnifiedProtocolService.normalizeChainFilter(params.chain);
      const protocolFilter = UnifiedProtocolService.normalizeProtocolFilter(params.protocol);
      
      // Implement pagination to fetch all data
      let allData: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      while (hasMore) {
        let query = supabase.from('protocol_stats').select('*')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        // Apply chain filter
        if (chainFilter) {
          query = query.in('chain', chainFilter);
        }
        
        // Apply protocol filter
        if (protocolFilter) {
          query = query.in('protocol_name', protocolFilter);
        }
        
        // Apply date filters
        if (params.date) {
          query = query.eq('date', params.date);
        } else if (params.startDate && params.endDate) {
          query = query.gte('date', params.startDate).lte('date', params.endDate);
        } else if (params.startDate) {
          query = query.gte('date', params.startDate);
        } else if (params.endDate) {
          query = query.lte('date', params.endDate);
        }
        
        // Apply timeframe filter (if no explicit date range)
        if (params.timeframe && !params.startDate && !params.endDate && !params.date) {
          const endDate = new Date();
          const startDate = new Date();
          
          switch (params.timeframe) {
            case '7d':
              startDate.setDate(startDate.getDate() - 7);
              break;
            case '30d':
              startDate.setDate(startDate.getDate() - 30);
              break;
            case '90d':
              startDate.setDate(startDate.getDate() - 90);
              break;
            case '6m':
              startDate.setMonth(startDate.getMonth() - 6);
              break;
            case '1y':
              startDate.setFullYear(startDate.getFullYear() - 1);
              break;
          }
          
          query = query.gte('date', format(startDate, 'yyyy-MM-dd'))
                      .lte('date', format(endDate, 'yyyy-MM-dd'));
        }
        
        // Apply data type filter (default to private)
        if (params.dataType) {
          query = query.eq('data_type', params.dataType);
        } else {
          query = query.eq('data_type', 'private');
        }
        
        const { data, error } = await query.order('date', { ascending: false });
        
        if (error) {
          return { success: false, error: error.message };
        }
        
        if (!data || data.length === 0) break;
        
        allData = allData.concat(data);
        hasMore = data.length === PAGE_SIZE;
        page++;
        
        console.log(`UnifiedAPI: Fetched page ${page}, records: ${data.length}, total so far: ${allData.length}`);
      }
      
      console.log(`UnifiedAPI: Total records fetched: ${allData.length}`);
      
      // Filter out the most recent date when no specific date filter is applied
      // This matches the behavior of legacy getProtocolStats/getTotalProtocolStats
      let filteredData = allData;
      if (!params.date && !params.startDate && !params.endDate && allData && allData.length > 0) {
        // Find the most recent date and filter it out
        const mostRecentDate = allData[0]?.date; // Data is already sorted by date desc
        if (mostRecentDate) {
          filteredData = allData.filter(row => row.date !== mostRecentDate);
          console.log(`UnifiedAPI: Filtered out most recent date ${mostRecentDate}. Records: ${allData.length} -> ${filteredData.length}`);
        }
      }
      
      // Cache the result
      unifiedCache.set(cacheKey, {
        data: filteredData,
        timestamp: Date.now()
      });
      
      return {
        success: true,
        data: filteredData,
        metadata: {
          chain: params.chain,
          protocol: Array.isArray(params.protocol) ? params.protocol.join(',') : params.protocol,
          dateRange: params.startDate && params.endDate 
            ? { start: params.startDate, end: params.endDate }
            : undefined,
          totalRecords: filteredData?.length || 0,
          cacheHit: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Daily metrics aggregation
  async getDailyMetrics(params: StandardQueryParams): Promise<StandardApiResponse<any>> {
    if (!params.date) {
      return { success: false, error: 'date parameter is required for daily metrics' };
    }
    
    const metricsResult = await this.getMetrics(params);
    if (!metricsResult.success || !metricsResult.data) {
      return metricsResult;
    }
    
    // Group by protocol and aggregate
    const aggregated = metricsResult.data.reduce((acc: any, row: any) => {
      const protocol = row.protocol_name;
      
      if (!acc[protocol]) {
        acc[protocol] = {
          total_volume_usd: 0,
          daily_users: 0,
          numberOfNewUsers: 0,
          daily_trades: 0,
          total_fees_usd: 0,
          chains: [],
          chainVolumes: {}
        };
      }
      
      acc[protocol].total_volume_usd += Number(row.volume_usd) || 0;
      acc[protocol].daily_users += Number(row.daily_users) || 0;
      acc[protocol].numberOfNewUsers += Number(row.new_users) || 0;
      acc[protocol].daily_trades += Number(row.trades) || 0;
      acc[protocol].total_fees_usd += Number(row.fees_usd) || 0;
      acc[protocol].chains.push(row.chain);
      
      // Add chain volumes
      const chain = row.chain;
      const volume = Number(row.volume_usd) || 0;
      acc[protocol].chainVolumes[chain] = (acc[protocol].chainVolumes[chain] || 0) + volume;
      
      return acc;
    }, {});
    
    // If single protocol requested, return legacy format
    const protocolFilter = UnifiedProtocolService.normalizeProtocolFilter(params.protocol);
    if (protocolFilter && protocolFilter.length === 1) {
      const protocolName = protocolFilter[0];
      const protocolData = aggregated[protocolName];
      
      if (protocolData) {
        // Calculate daily growth and weekly trend
        const dailyGrowth = await this.calculateDailyGrowth(protocolName, params.date, params.chain, params.dataType);
        const weeklyTrend = await this.calculateWeeklyTrend(protocolName, params.date, params.chain, params.dataType);
        
        return {
          success: true,
          data: {
            totalVolume: protocolData.total_volume_usd,
            chainVolumes: {
              ethereum: protocolData.chainVolumes.ethereum || 0,
              base: protocolData.chainVolumes.base || 0,
              bsc: protocolData.chainVolumes.bsc || 0,
              avax: protocolData.chainVolumes.avax || 0,
              arbitrum: protocolData.chainVolumes.arbitrum || 0
            },
            dailyGrowth,
            weeklyTrend
          },
          metadata: {
            ...metricsResult.metadata,
            totalRecords: 1
          }
        };
      }
    }
    
    return {
      success: true,
      data: aggregated,
      metadata: {
        ...metricsResult.metadata,
        totalRecords: Object.keys(aggregated).length
      }
    };
  }
  
  // Weekly metrics aggregation
  async getWeeklyMetrics(params: StandardQueryParams): Promise<StandardApiResponse<any>> {
    if (!params.startDate || !params.endDate) {
      return { success: false, error: 'startDate and endDate parameters are required for weekly metrics' };
    }
    
    const metricsResult = await this.getMetrics(params);
    if (!metricsResult.success || !metricsResult.data) {
      return metricsResult;
    }
    
    // Group by protocol and date
    const dailyVolumes: Record<string, Record<string, number>> = {};
    const chainDistribution: Record<string, Record<string, number>> = {};
    
    metricsResult.data.forEach((row: any) => {
      const protocol = row.protocol_name;
      const date = row.date;
      const chain = row.chain;
      const volume = Number(row.volume_usd) || 0;
      
      // Daily volumes
      if (!dailyVolumes[protocol]) {
        dailyVolumes[protocol] = {};
      }
      dailyVolumes[protocol][date] = (dailyVolumes[protocol][date] || 0) + volume;
      
      // Chain distribution
      if (!chainDistribution[protocol]) {
        chainDistribution[protocol] = {};
      }
      chainDistribution[protocol][chain] = (chainDistribution[protocol][chain] || 0) + volume;
    });
    
    return {
      success: true,
      data: {
        dailyVolumes,
        chainDistribution
      },
      metadata: {
        ...metricsResult.metadata,
        totalRecords: Object.keys(dailyVolumes).length
      }
    };
  }
  
  // Chain breakdown for EVM protocols
  async getChainBreakdown(params: StandardQueryParams): Promise<StandardApiResponse<any>> {
    if (!params.protocol) {
      return { success: false, error: 'protocol parameter is required for chain breakdown' };
    }
    
    // Force EVM chains for chain breakdown
    const evmParams = { ...params, chain: 'evm' as const };
    const metricsResult = await this.getMetrics(evmParams);
    
    if (!metricsResult.success || !metricsResult.data) {
      return metricsResult;
    }
    
    // Calculate chain breakdown
    const chainTotals = metricsResult.data.reduce((acc: Record<string, number>, row: any) => {
      const chain = row.chain;
      const volume = Number(row.volume_usd) || 0;
      
      acc[chain] = (acc[chain] || 0) + volume;
      return acc;
    }, {});
    
    const totalVolume = Object.values(chainTotals).reduce((sum: number, vol: unknown) => sum + (vol as number), 0);
    
    const chainBreakdown = Object.entries(chainTotals)
      .map(([chain, volume]) => ({
        chain,
        volume: volume as number,
        percentage: totalVolume > 0 ? (volume as number / totalVolume) * 100 : 0
      }))
      .sort((a, b) => b.volume - a.volume)
      .filter(item => item.volume > 0);
    
    return {
      success: true,
      data: {
        lifetimeVolume: totalVolume,
        chainBreakdown,
        totalChains: chainBreakdown.length
      },
      metadata: {
        ...metricsResult.metadata,
        totalRecords: chainBreakdown.length
      }
    };
  }
  
  // Calculate daily growth for a protocol
  private async calculateDailyGrowth(protocolName: string, currentDate: string, chain?: string, dataType?: string): Promise<number> {
    try {
      const currentDateObj = new Date(currentDate);
      const previousDateObj = new Date(currentDateObj);
      previousDateObj.setDate(previousDateObj.getDate() - 1);
      const previousDate = format(previousDateObj, 'yyyy-MM-dd');
      
      // Get both current and previous day data in a single query for better performance
      const startDate = format(previousDateObj, 'yyyy-MM-dd');
      const endDate = currentDate;
      
      const params = { protocol: protocolName, startDate, endDate, chain: chain as any, dataType: dataType as any };
      const result = await this.getMetrics(params);
      
      if (!result.data) return 0;
      
      const currentVolume = result.data
        .filter((row: any) => row.date === currentDate)
        .reduce((sum: number, row: any) => sum + (Number(row.volume_usd) || 0), 0);
      
      const previousVolume = result.data
        .filter((row: any) => row.date === previousDate)
        .reduce((sum: number, row: any) => sum + (Number(row.volume_usd) || 0), 0);
      
      // Calculate growth percentage
      if (previousVolume === 0) return 0;
      return (currentVolume - previousVolume) / previousVolume;
    } catch (error) {
      console.error('Error calculating daily growth:', error);
      return 0;
    }
  }
  
  // Calculate weekly trend for a protocol
  private async calculateWeeklyTrend(protocolName: string, currentDate: string, chain?: string, dataType?: string): Promise<number[]> {
    try {
      const currentDateObj = new Date(currentDate);
      const weeklyTrend: number[] = [];
      
      // Get last 7 days of data
      for (let i = 6; i >= 0; i--) {
        const dateObj = new Date(currentDateObj);
        dateObj.setDate(dateObj.getDate() - i);
        const dateStr = format(dateObj, 'yyyy-MM-dd');
        
        const params = { protocol: protocolName, date: dateStr, chain: chain as any, dataType: dataType as any };
        const result = await this.getMetrics(params);
        const volume = result.data?.reduce((sum: number, row: any) => 
          sum + (Number(row.volume_usd) || 0), 0) || 0;
        
        weeklyTrend.push(volume);
      }
      
      return weeklyTrend;
    } catch (error) {
      console.error('Error calculating weekly trend:', error);
      return Array(7).fill(0);
    }
  }

  // Clear cache
  static clearCache(pattern?: string): void {
    if (!pattern) {
      unifiedCache.clear();
      return;
    }
    
    const keysToDelete: string[] = [];
    unifiedCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => unifiedCache.delete(key));
  }
}

export const unifiedProtocolService = new UnifiedProtocolService();