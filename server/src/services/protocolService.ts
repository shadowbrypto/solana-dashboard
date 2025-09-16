import { supabase } from '../lib/supabase.js';
import { ProtocolStats, ProtocolMetrics, Protocol, ProtocolStatsWithDay } from '../types/protocol.js';
import { format } from 'date-fns';
import { getSolanaProtocols, isEVMProtocol, getEVMProtocols } from '../config/chainProtocols.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_EXPIRY = 30 * 1000; // 30 seconds for fresh data
const protocolStatsCache = new Map<string, CacheEntry<ProtocolStats[]>>();
const totalStatsCache = new Map<string, CacheEntry<ProtocolMetrics>>();
const dailyMetricsCache = new Map<string, CacheEntry<Record<string, ProtocolMetrics>>>();
const aggregatedStatsCache = new Map<string, CacheEntry<any[]>>();
const insightsCache = new Map<string, CacheEntry<any>>();

function isCacheValid<T>(cache: CacheEntry<T>): boolean {
  return Date.now() - cache.timestamp < CACHE_EXPIRY;
}

// Clear all caches - should be called after successful data refresh
export function clearAllCaches(): void {
  protocolStatsCache.clear();
  totalStatsCache.clear();
  dailyMetricsCache.clear();
  aggregatedStatsCache.clear();
  insightsCache.clear();
  console.log('All protocol caches cleared');
}

// Clear cache for specific protocol
export function clearProtocolCache(protocolName?: string): void {
  if (!protocolName) {
    // Clear all caches if no protocol specified
    clearAllCaches();
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
  
  // Clear EVM-specific cache entries
  totalStatsCache.forEach((_, key) => {
    if (key === `evm_metrics_${protocolName}` || key === protocolName || key === 'all') {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => totalStatsCache.delete(key));
  
  // Clear related caches
  totalStatsCache.delete(protocolName);
  totalStatsCache.delete('all');
  dailyMetricsCache.clear(); // Clear all daily metrics as they might include this protocol
  aggregatedStatsCache.clear(); // Clear aggregated stats
  insightsCache.clear(); // Clear insights
  
  console.log(`Cache cleared for protocol: ${protocolName}`);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

export async function getProtocolStats(protocolName?: string | string[], chainFilter?: string, dataType?: string) {
  // STRICT chain filtering: Force proper data_type and chain combination
  const isEVMChain = chainFilter === 'evm' || ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'].includes(chainFilter || '');
  const effectiveDataType = isEVMChain ? 'public' : (dataType || 'private');
  
  // Add strict flag to cache key for separation
  const cacheKey = Array.isArray(protocolName) 
    ? protocolName.sort().join(',') + '_' + (chainFilter || 'default') + '_' + effectiveDataType + '_strict'
    : (protocolName || 'all') + '_' + (chainFilter || 'default') + '_' + effectiveDataType + '_strict';

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

    // STRICT chain filtering - no fallbacks or mixing
    if (chainFilter === 'evm') {
      console.log(`EVM STRICT filter: querying EVM chains with data_type=public for protocol ${protocolName}`);
      query = query.in('chain', ['ethereum', 'base', 'bsc', 'avax', 'arbitrum']);
      query = query.eq('data_type', 'public'); // Force public for EVM
    } else if (chainFilter === 'solana') {
      console.log(`Solana STRICT filter: querying solana chain with data_type=${effectiveDataType} for protocol ${protocolName}`);
      query = query.eq('chain', 'solana');
      query = query.eq('data_type', effectiveDataType);
    } else if (!chainFilter) {
      // Default to Solana with private data for legacy compatibility
      console.log(`Default STRICT filter: querying solana chain with data_type=private for protocol ${protocolName}`);
      query = query.eq('chain', 'solana');
      query = query.eq('data_type', 'private');
    } else {
      // For specific chain, query that exact chain
      console.log(`Specific chain STRICT filter: ${chainFilter} with data_type=${effectiveDataType}`);
      query = query.eq('chain', chainFilter);
      query = query.eq('data_type', effectiveDataType);
    }
    
    if (protocolName) {
      if (Array.isArray(protocolName)) {
        // For arrays, use case-insensitive matching with ilike
        const protocolFilters = protocolName.map(p => `protocol_name.ilike.${p}`).join(',');
        query = query.or(protocolFilters);
      } else {
        // For single protocol, use case-insensitive matching
        query = query.ilike('protocol_name', protocolName);
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
    console.log(`STRICT FILTERING: No protocol stats found for protocol=${protocolName}, chain=${chainFilter}, dataType=${effectiveDataType}`);
    return [];
  }

  console.log(`STRICT FILTERING SUCCESS: Found ${allData.length} protocol stats records for protocol=${protocolName}, chain=${chainFilter}, dataType=${effectiveDataType}`);

  // For EVM protocols, aggregate data by date (sum across all chains per date)
  let processedData = allData;
  if (chainFilter === 'evm') {
    console.log(`EVM AGGREGATION: Aggregating ${allData.length} records across chains by date`);
    
    // Group by date and sum metrics across all chains
    const dateGroups = allData.reduce((acc: Record<string, any>, row: any) => {
      const date = row.date;
      if (!acc[date]) {
        acc[date] = {
          protocol_name: row.protocol_name,
          date: date,
          volume_usd: 0,
          daily_users: 0,
          new_users: 0,
          trades: 0,
          fees_usd: 0,
          chain: 'evm', // Use 'evm' as aggregated chain identifier
          data_type: row.data_type,
          created_at: row.created_at,
          id: row.id // Use first row's ID
        };
      }
      
      // Sum metrics across all chains for this date
      acc[date].volume_usd += Number(row.volume_usd) || 0;
      acc[date].daily_users += Number(row.daily_users) || 0;
      acc[date].new_users += Number(row.new_users) || 0;
      acc[date].trades += Number(row.trades) || 0;
      acc[date].fees_usd += Number(row.fees_usd) || 0;
      
      return acc;
    }, {});
    
    processedData = Object.values(dateGroups);
    console.log(`EVM AGGREGATION: Reduced to ${processedData.length} aggregated daily records`);
  }

  // Sort by date and remove the most recent date
  const sortedData = processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Find the most recent date and filter it out
  const mostRecentDate = sortedData.length > 0 ? sortedData[0].date : null;
  const filteredData = mostRecentDate 
    ? sortedData.filter(row => row.date !== mostRecentDate)
    : sortedData;

  const formattedData = filteredData.map((row: any) => ({
    ...row,
    formattedDay: formatDate(row.date)
  }));

  protocolStatsCache.set(cacheKey, {
    data: formattedData,
    timestamp: Date.now()
  });

  return formattedData;
}

export async function getTotalProtocolStats(protocolName?: string, chainFilter?: string, dataType?: string): Promise<ProtocolMetrics> {
  // STRICT chain filtering: Force proper data_type and chain combination
  const isEVMChain = chainFilter === 'evm' || ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'].includes(chainFilter || '');
  const effectiveDataType = isEVMChain ? 'public' : (dataType || 'private');
  
  // Add chain to cache key for strict separation
  const cacheKey = `${protocolName || 'all'}_${chainFilter || 'default'}_${effectiveDataType}_strict`;
  const cachedData = totalStatsCache.get(cacheKey);

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
      .select('volume_usd, daily_users, new_users, trades, fees_usd, date, chain, protocol_name, data_type')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // STRICT chain filtering - no fallbacks
    if (chainFilter === 'evm') {
      console.log(`EVM STRICT filter: querying EVM chains with data_type=public for protocol ${protocolName}`);
      query = query.in('chain', ['ethereum', 'base', 'bsc', 'avax', 'arbitrum']);
      query = query.eq('data_type', 'public'); // Force public for EVM
    } else if (chainFilter === 'solana') {
      console.log(`Solana STRICT filter: querying solana chain with data_type=${effectiveDataType} for protocol ${protocolName}`);
      query = query.eq('chain', 'solana');
      query = query.eq('data_type', effectiveDataType);
    } else if (!chainFilter) {
      // Default to Solana with private data for legacy compatibility
      console.log(`Default STRICT filter: querying solana chain with data_type=private for protocol ${protocolName}`);
      query = query.eq('chain', 'solana');
      query = query.eq('data_type', 'private');
    } else {
      // For specific chain, query that exact chain
      console.log(`Specific chain STRICT filter: ${chainFilter} with data_type=${effectiveDataType}`);
      query = query.eq('chain', chainFilter);
      query = query.eq('data_type', effectiveDataType);
    }

    if (protocolName) {
      query = query.eq('protocol_name', protocolName);
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
    console.log(`STRICT FILTERING: No data found for protocol=${protocolName}, chain=${chainFilter}, dataType=${effectiveDataType}`);
    return {
      total_volume_usd: 0,
      daily_users: 0,
      numberOfNewUsers: 0,
      daily_trades: 0,
      total_fees_usd: 0
    };
  }

  console.log(`STRICT FILTERING SUCCESS: Found ${allData.length} records for protocol=${protocolName}, chain=${chainFilter}, dataType=${effectiveDataType}`);

  console.log(`Total records fetched: ${allData.length}`);

  // For EVM protocols, aggregate data by date (sum across all chains per date)
  let processedData = allData;
  if (chainFilter === 'evm') {
    console.log(`EVM METRICS AGGREGATION: Aggregating ${allData.length} records across chains by date`);
    
    // Group by date and sum metrics across all chains
    const dateGroups = allData.reduce((acc: Record<string, any>, row: any) => {
      const date = row.date;
      if (!acc[date]) {
        acc[date] = {
          volume_usd: 0,
          daily_users: 0,
          new_users: 0,
          trades: 0,
          fees_usd: 0,
          date: date
        };
      }
      
      // Sum metrics across all chains for this date
      acc[date].volume_usd += Number(row.volume_usd) || 0;
      acc[date].daily_users += Number(row.daily_users) || 0;
      acc[date].new_users += Number(row.new_users) || 0;
      acc[date].trades += Number(row.trades) || 0;
      acc[date].fees_usd += Number(row.fees_usd) || 0;
      
      return acc;
    }, {});
    
    processedData = Object.values(dateGroups);
    console.log(`EVM METRICS AGGREGATION: Reduced to ${processedData.length} aggregated daily records`);
  }

  // Sort by date and remove the most recent date (same logic as getProtocolStats)
  const sortedData = processedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Find the most recent date and filter it out
  const mostRecentDate = sortedData.length > 0 ? sortedData[0].date : null;
  const filteredData = mostRecentDate 
    ? sortedData.filter(row => row.date !== mostRecentDate)
    : sortedData;

  console.log(`Records after filtering out most recent date: ${filteredData.length}`);

  const metrics: ProtocolMetrics = {
    total_volume_usd: filteredData.reduce((sum, row) => sum + (Number(row.volume_usd) || 0), 0),
    daily_users: filteredData.reduce((sum, row) => sum + (Number(row.daily_users) || 0), 0),
    numberOfNewUsers: filteredData.reduce((sum, row) => sum + (Number(row.new_users) || 0), 0),
    daily_trades: filteredData.reduce((sum, row) => sum + (Number(row.trades) || 0), 0),
    total_fees_usd: filteredData.reduce((sum, row) => sum + (Number(row.fees_usd) || 0), 0)
  };

  totalStatsCache.set(cacheKey, {
    data: metrics,
    timestamp: Date.now()
  });

  return metrics;
}

// Get EVM chain breakdown for a specific protocol
export async function getEVMChainBreakdown(protocolName: string, dataType?: string): Promise<{
  lifetimeVolume: number;
  chainBreakdown: Array<{
    chain: string;
    volume: number;
    percentage: number;
  }>;
  totalChains: number;
}> {
  // Default to 'public' for EVM data
  const effectiveDataType = dataType || 'public';
  const cacheKey = `evm_breakdown_${protocolName}_${effectiveDataType}`;
  const cachedData = insightsCache.get(cacheKey);

  // DEBUG: Always skip cache for sigma to debug
  if (protocolName === 'sigma') {
    console.log(`SIGMA DEBUG: Force cache miss for ${protocolName}`);
    insightsCache.delete(cacheKey);
  } else if (cachedData && isCacheValid(cachedData)) {
    console.log(`Cache hit for EVM breakdown: ${protocolName}`);
    return cachedData.data;
  }

  let allData: any[] = [];
  let hasMore = true;
  let page = 0;
  const PAGE_SIZE = 1000;

  console.log(`Starting EVM breakdown query for ${protocolName}`);
  while (hasMore) {
    let query = supabase
      .from('protocol_stats')
      .select('chain, volume_usd')
      .eq('protocol_name', protocolName)
      .in('chain', ['ethereum', 'base', 'bsc', 'avax', 'polygon', 'arbitrum'])
      .eq('data_type', effectiveDataType)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) break;

    console.log(`EVM breakdown page ${page} for ${protocolName}: found ${data.length} rows`);
    if (page === 0) {
      console.log(`First few rows for ${protocolName}:`, data.slice(0, 3));
    }
    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    page++;
  }
  console.log(`Total data found for ${protocolName}: ${allData.length} rows`);

  // Group by chain and calculate totals
  const chainTotals = allData.reduce((acc, row) => {
    const chain = row.chain;
    const volume = Number(row.volume_usd) || 0;
    
    if (!acc[chain]) {
      acc[chain] = 0;
    }
    acc[chain] += volume;
    
    return acc;
  }, {} as Record<string, number>);

  const totalVolume: number = (Object.values(chainTotals) as number[]).reduce((sum: number, vol: number) => sum + vol, 0);
  
  const chainBreakdown = (Object.entries(chainTotals) as [string, number][])
    .map(([chain, volume]) => ({
      chain,
      volume,
      percentage: totalVolume > 0 ? (volume / totalVolume) * 100 : 0
    }))
    .sort((a, b) => b.volume - a.volume) // Sort by volume descending
    .filter(item => item.volume > 0); // Only include chains with volume

  const result = {
    lifetimeVolume: totalVolume,
    chainBreakdown,
    totalChains: chainBreakdown.length
  };

  insightsCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}

// Get EVM daily chain breakdown for a specific protocol with timeframe
export async function getEVMDailyChainBreakdown(protocolName: string, timeframe: string = '30d', dataType?: string): Promise<Array<{
  date: string;
  formattedDay: string;
  chainData: Record<string, number>;
  totalVolume: number;
}>> {
  // Default to 'public' for EVM data
  const effectiveDataType = dataType || 'public';
  const cacheKey = `evm_daily_breakdown_${protocolName}_${timeframe}_${effectiveDataType}`;
  const cachedData = insightsCache.get(cacheKey);

  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  // Calculate date range based on timeframe
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeframe) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '6m':
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  let allData: any[] = [];
  let hasMore = true;
  let page = 0;
  const PAGE_SIZE = 1000;

  while (hasMore) {
    let query = supabase
      .from('protocol_stats')
      .select('date, chain, volume_usd')
      .eq('protocol_name', protocolName)
      .in('chain', ['ethereum', 'base', 'bsc', 'avax', 'polygon', 'arbitrum'])
      .eq('data_type', effectiveDataType)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    page++;
  }

  // Group by date and chain
  const dailyData = allData.reduce((acc: Record<string, {
    date: string;
    formattedDay: string;
    chainData: Record<string, number>;
    totalVolume: number;
  }>, row: any) => {
    const date = row.date;
    const chain = row.chain;
    const volume = Number(row.volume_usd) || 0;

    if (!acc[date]) {
      acc[date] = {
        date,
        formattedDay: formatDate(date),
        chainData: {},
        totalVolume: 0
      };
    }

    if (!acc[date].chainData[chain]) {
      acc[date].chainData[chain] = 0;
    }

    acc[date].chainData[chain] += volume;
    acc[date].totalVolume += volume;

    return acc;
  }, {});

  // Convert to array and sort by date
  const result = Object.values(dailyData)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter((item) => item.totalVolume > 0); // Only include days with volume

  insightsCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}

export async function getDailyMetrics(date: Date, dataType?: string): Promise<Record<Protocol, ProtocolMetrics>> {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const cacheKey = `${formattedDate}_${dataType || 'private'}`;

  const cachedData = dailyMetricsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  // Check if requested date is the most recent date in the database
  const { data: latestDateData, error: latestDateError } = await supabase
    .from('protocol_stats')
    .select('date')
    .eq('chain', 'solana') // Filter for Solana data only
    .eq('data_type', dataType || 'private')
    .order('date', { ascending: false })
    .limit(1);

  if (latestDateError) {
    console.error('Error fetching latest date:', latestDateError);
    throw latestDateError;
  }

  const latestDate = latestDateData?.[0]?.date;
  
  // If the requested date is the latest date, return empty metrics
  if (latestDate && formattedDate === latestDate) {
    const emptyMetrics: Record<Protocol, ProtocolMetrics> = {} as Record<Protocol, ProtocolMetrics>;
    dailyMetricsCache.set(cacheKey, {
      data: emptyMetrics,
      timestamp: Date.now()
    });
    return emptyMetrics;
  }

  const { data, error } = await supabase
    .from('protocol_stats')
    .select('protocol_name, volume_usd, daily_users, new_users, trades, fees_usd')
    .eq('date', formattedDate)
    .eq('chain', 'solana') // Filter for Solana data only
    .eq('data_type', dataType || 'private');

  if (error) {
    console.error('Error fetching daily metrics:', error);
    throw error;
  }

  const metrics: Record<Protocol, ProtocolMetrics> = {} as Record<Protocol, ProtocolMetrics>;

  data?.forEach((row) => {
    // Normalize protocol name to handle case variations
    let protocol = row.protocol_name as string;
    
    
    metrics[protocol as Protocol] = {
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

export async function getAggregatedProtocolStats(dataType?: string) {
  const cacheKey = `all-protocols-aggregated_${dataType || 'private'}`;
  const cachedData = aggregatedStatsCache.get(cacheKey);
  
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  console.log('Fetching aggregated protocol stats from database with pagination...');

  // Use pagination to ensure all data is retrieved
  let allData: any[] = [];
  let hasMore = true;
  let page = 0;
  const PAGE_SIZE = 1000;

  while (hasMore) {
    const { data, error } = await supabase
      .from('protocol_stats')
      .select('*')
      .eq('chain', 'solana') // Filter for Solana data only
      .eq('data_type', dataType || 'private')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching aggregated protocol stats:', error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    page++;

    console.log(`Fetched ${allData.length} total records for aggregation (page ${page})...`);
  }

  if (allData.length === 0) {
    return [];
  }

  console.log(`Total records fetched for aggregation: ${allData.length}`);

  // Group data by date and aggregate all protocols
  // Only include Solana protocols (data is already filtered by chain='solana')
  const protocols = getSolanaProtocols();
  const dataByDate = new Map();

  // Get all unique dates
  const allDates = new Set(allData.map(item => item.date));

  // Initialize data structure for each date
  Array.from(allDates).forEach(date => {
    const entry: any = {
      date,
      formattedDay: formatDate(date)
    };

    // Initialize all protocol metrics to 0
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

  // Fill in actual values
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

  // Convert to array and sort by date
  const aggregatedData = Array.from(dataByDate.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Remove the most recent date (potentially incomplete data)
  const filteredAggregatedData = aggregatedData.length > 0 ? aggregatedData.slice(1) : aggregatedData;

  console.log(`Aggregated data for ${filteredAggregatedData.length} unique dates (excluding latest date)`);

  // Cache the result
  aggregatedStatsCache.set(cacheKey, {
    data: filteredAggregatedData,
    timestamp: Date.now()
  });

  return filteredAggregatedData;
}

export async function generateWeeklyInsights() {
  const cacheKey = 'weekly-insights';
  const cachedData = insightsCache.get(cacheKey);
  
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  console.log('Generating weekly insights...');

  // Get aggregated data
  const allData = await getAggregatedProtocolStats();
  
  if (!allData || allData.length < 14) {
    console.log('Insufficient data for weekly insights');
    return [];
  }

  // Get last 7 days and previous 7 days for comparison
  const sortedData = allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const last7Days = sortedData.slice(0, 7);
  const previous7Days = sortedData.slice(7, 14);

  // Only include Solana protocols (data is already filtered by chain='solana')
  const protocols = ["axiom", "banana", "bloom", "bonkbot", "bullx", "gmgnai", "maestro", "moonshot", "nova", "padre", "photon", "soltradingbot", "trojan", "vector"];
  
  // Calculate weekly stats for each protocol
  const weeklyStats = protocols.map(protocol => {
    const protocolKey = protocol.replace(/\s+/g, '_').toLowerCase();
    const currentWeekTotals = last7Days.reduce((acc, day) => ({
      volume: acc.volume + (day[`${protocolKey}_volume`] || 0),
      users: acc.users + (day[`${protocolKey}_users`] || 0),
      trades: acc.trades + (day[`${protocolKey}_trades`] || 0),
      fees: acc.fees + (day[`${protocolKey}_fees`] || 0)
    }), { volume: 0, users: 0, trades: 0, fees: 0 });

    const previousWeekTotals = previous7Days.reduce((acc, day) => ({
      volume: acc.volume + (day[`${protocolKey}_volume`] || 0),
      users: acc.users + (day[`${protocolKey}_users`] || 0),
      trades: acc.trades + (day[`${protocolKey}_trades`] || 0),
      fees: acc.fees + (day[`${protocolKey}_fees`] || 0)
    }), { volume: 0, users: 0, trades: 0, fees: 0 });

    // Calculate total market for market share
    const totalMarketVolume = last7Days.reduce((acc, day) => 
      acc + protocols.reduce((sum, p) => {
        const pKey = p.replace(/\s+/g, '_').toLowerCase();
        return sum + (day[`${pKey}_volume`] || 0);
      }, 0), 0);
    const totalMarketUsers = last7Days.reduce((acc, day) => 
      acc + protocols.reduce((sum, p) => {
        const pKey = p.replace(/\s+/g, '_').toLowerCase();
        return sum + (day[`${pKey}_users`] || 0);
      }, 0), 0);

    return {
      protocol,
      volume_change: previousWeekTotals.volume > 0 ? 
        ((currentWeekTotals.volume - previousWeekTotals.volume) / previousWeekTotals.volume) * 100 : 0,
      users_change: previousWeekTotals.users > 0 ? 
        ((currentWeekTotals.users - previousWeekTotals.users) / previousWeekTotals.users) * 100 : 0,
      trades_change: previousWeekTotals.trades > 0 ? 
        ((currentWeekTotals.trades - previousWeekTotals.trades) / previousWeekTotals.trades) * 100 : 0,
      fees_change: previousWeekTotals.fees > 0 ? 
        ((currentWeekTotals.fees - previousWeekTotals.fees) / previousWeekTotals.fees) * 100 : 0,
      volume_total: currentWeekTotals.volume,
      users_total: currentWeekTotals.users,
      trades_total: currentWeekTotals.trades,
      fees_total: currentWeekTotals.fees,
      market_share_volume: totalMarketVolume > 0 ? (currentWeekTotals.volume / totalMarketVolume) * 100 : 0,
      market_share_users: totalMarketUsers > 0 ? (currentWeekTotals.users / totalMarketUsers) * 100 : 0
    };
  });

  // Generate basic insights (this could be enhanced with external AI APIs)
  const insights = [];
  
  // Find top performer
  const topPerformer = weeklyStats.reduce((max, current) => 
    current.volume_change > max.volume_change ? current : max
  );

  if (topPerformer.volume_change > 10) {
    insights.push({
      type: 'trend',
      title: `${topPerformer.protocol.toUpperCase()} leads with ${topPerformer.volume_change.toFixed(1)}% growth`,
      description: `Strong performance indicates positive market momentum and user adoption`,
      impact: topPerformer.volume_change > 25 ? 'high' : 'medium',
      protocols: [topPerformer.protocol],
      confidence: 0.85
    });
  }

  // Trojan analysis
  const trojan = weeklyStats.find(s => s.protocol === 'trojan');
  if (trojan) {
    const tradingBots = weeklyStats.filter(s => ['bullx', 'photon', 'trojan'].includes(s.protocol));
    const avgGrowth = tradingBots.reduce((sum, s) => sum + s.volume_change, 0) / tradingBots.length;
    
    insights.push({
      type: 'comparison',
      title: `Trojan ${trojan.volume_change > avgGrowth ? 'outperforms' : 'underperforms'} trading bot category`,
      description: `${trojan.volume_change.toFixed(1)}% vs ${avgGrowth.toFixed(1)}% category average`,
      impact: 'medium',
      protocols: ['trojan', 'bullx', 'photon'],
      confidence: 0.8
    });
  }

  console.log(`Generated ${insights.length} weekly insights`);

  const result = { stats: weeklyStats, insights };

  // Cache the results
  insightsCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}

// Get EVM protocol data for a specific date (for daily report)
export async function getEVMDailyData(protocol: string, dateStr: string, dataType?: string) {
  console.log(`Fetching EVM daily data for ${protocol} on ${dateStr}`);
  
  const evmChains = ['ethereum', 'base', 'bsc'];
  // Default to 'public' for EVM data
  const effectiveDataType = dataType || 'public';
  
  try {
    // Query database for the specific date and protocol across all EVM chains
    const { data: dailyData, error: dailyError } = await supabase
      .from('protocol_stats')
      .select('chain, volume_usd, daily_users, new_users, trades, fees_usd')
      .eq('protocol_name', protocol)
      .eq('date', dateStr)
      .eq('data_type', effectiveDataType)
      .in('chain', evmChains);

    if (dailyError) {
      console.error('Error fetching daily data:', dailyError);
      throw dailyError;
    }

    console.log(`Found ${dailyData?.length || 0} records for ${protocol} on ${dateStr}`);

    // Query 7-day trend data (last 7 days including the selected date)
    const endDate = new Date(dateStr);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7 days total
    
    const { data: trendData, error: trendError } = await supabase
      .from('protocol_stats')
      .select('date, volume_usd')
      .eq('protocol_name', protocol)
      .eq('data_type', effectiveDataType)
      .in('chain', evmChains)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', dateStr)
      .order('date', { ascending: true });

    if (trendError) {
      console.error('Error fetching trend data:', trendError);
      throw trendError;
    }

    // Query previous day data for growth calculation
    const prevDate = new Date(endDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = format(prevDate, 'yyyy-MM-dd');
    
    const { data: prevData, error: prevError } = await supabase
      .from('protocol_stats')
      .select('volume_usd')
      .eq('protocol_name', protocol)
      .eq('date', prevDateStr)
      .eq('data_type', effectiveDataType)
      .in('chain', evmChains);

    if (prevError) {
      console.error('Error fetching previous day data:', prevError);
    }

    // Process the data
    const chainVolumes: Record<string, number> = {};
    let totalVolume = 0;

    // Initialize chain volumes to 0
    evmChains.forEach(chain => {
      chainVolumes[chain] = 0;
    });

    // Populate actual volumes from database
    if (dailyData) {
      dailyData.forEach(record => {
        const volume = Number(record.volume_usd) || 0;
        chainVolumes[record.chain] = volume;
        totalVolume += volume;
      });
    }

    // Calculate 7-day trend (aggregate by date)
    const trendByDate: Record<string, number> = {};
    if (trendData) {
      trendData.forEach(record => {
        const date = record.date;
        const volume = Number(record.volume_usd) || 0;
        trendByDate[date] = (trendByDate[date] || 0) + volume;
      });
    }

    // Create 7-day trend array
    const weeklyTrend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateKey = format(date, 'yyyy-MM-dd');
      weeklyTrend.push(trendByDate[dateKey] || 0);
    }

    // Calculate daily growth
    const prevTotalVolume = prevData ? 
      prevData.reduce((sum, record) => sum + (Number(record.volume_usd) || 0), 0) : 0;
    
    let dailyGrowth = 0;
    if (prevTotalVolume > 0) {
      dailyGrowth = (totalVolume - prevTotalVolume) / prevTotalVolume;
    }

    const result = {
      totalVolume,
      chainVolumes: {
        ethereum: chainVolumes.ethereum || 0,
        base: chainVolumes.base || 0,
        bsc: chainVolumes.bsc || 0
      },
      dailyGrowth,
      weeklyTrend
    };

    console.log(`EVM daily data for ${protocol}:`, {
      totalVolume: result.totalVolume,
      hasData: dailyData?.length > 0,
      trendPoints: weeklyTrend.length,
      dailyGrowth: result.dailyGrowth
    });

    return result;
    
  } catch (error) {
    console.error(`Error fetching EVM daily data for ${protocol}:`, error);
    throw error;
  }
}

// Get latest data dates for all protocols (SOL and EVM)
// Get optimized monthly metrics for Solana (including monthly growth)
export async function getSolanaMonthlyMetrics(endDate: Date, dataType: string = 'private') {
  const cacheKey = `solana_monthly_metrics_${format(endDate, 'yyyy-MM')}_${dataType}`;
  
  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }
  
  try {
    // Get current month and previous month boundaries
    const currentMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const currentMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
    const previousMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
    const previousMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
    
    // Get all data for current and previous month in parallel
    const [currentData, previousData] = await Promise.all([
      supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, new_users, trades, fees_usd, date')
        .eq('data_type', dataType)
        .eq('chain', 'solana')
        .gte('date', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(currentMonthEnd, 'yyyy-MM-dd')),
      supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, new_users, trades, fees_usd, date')
        .eq('data_type', dataType)
        .eq('chain', 'solana')
        .gte('date', format(previousMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(previousMonthEnd, 'yyyy-MM-dd'))
    ]);

    if (currentData.error) throw currentData.error;
    if (previousData.error) throw previousData.error;

    // Get all possible Solana protocols, not just those with current/previous data
    const allSolanaProtocols = getSolanaProtocols();
    const protocolsWithData = new Set([
      ...(currentData.data || []).map(d => d.protocol_name),
      ...(previousData.data || []).map(d => d.protocol_name)
    ]);

    // Include both protocols with data AND all defined Solana protocols
    // Create a map for case-insensitive matching
    const protocolCaseMap = new Map<string, string>();
    protocolsWithData.forEach(p => protocolCaseMap.set(p.toLowerCase(), p));
    allSolanaProtocols.forEach(p => {
      const lowerP = p.toLowerCase();
      if (!protocolCaseMap.has(lowerP)) {
        protocolCaseMap.set(lowerP, p);
      }
    });
    const protocols = new Set([...protocolCaseMap.values()]);

    const monthlyData: Record<string, any> = {};
    const previousMonthData: Record<string, any> = {};
    const monthlyVolumeData: Record<string, Record<string, number>> = {};

    for (const protocol of protocols) {
      // Aggregate current month
      const currentProtocolData = (currentData.data || []).filter(d => d.protocol_name === protocol);
      const totalVolume = currentProtocolData.reduce((sum, d) => sum + (Number(d.volume_usd) || 0), 0);
      const totalNewUsers = currentProtocolData.reduce((sum, d) => sum + (Number(d.new_users) || 0), 0);
      const totalTrades = currentProtocolData.reduce((sum, d) => sum + (Number(d.trades) || 0), 0);
      const totalFees = currentProtocolData.reduce((sum, d) => sum + (Number(d.fees_usd) || 0), 0);

      // Aggregate previous month
      const previousProtocolData = (previousData.data || []).filter(d => d.protocol_name === protocol);
      const prevTotalVolume = previousProtocolData.reduce((sum, d) => sum + (Number(d.volume_usd) || 0), 0);
      const prevTotalNewUsers = previousProtocolData.reduce((sum, d) => sum + (Number(d.new_users) || 0), 0);
      const prevTotalTrades = previousProtocolData.reduce((sum, d) => sum + (Number(d.trades) || 0), 0);
      const prevTotalFees = previousProtocolData.reduce((sum, d) => sum + (Number(d.fees_usd) || 0), 0);

      // Calculate monthly growth
      const monthlyGrowth = prevTotalVolume > 0 ? (totalVolume - prevTotalVolume) / prevTotalVolume : 0;

      monthlyData[protocol] = {
        total_volume_usd: totalVolume,
        numberOfNewUsers: totalNewUsers,
        daily_trades: totalTrades,
        total_fees_usd: totalFees,
        monthly_growth: monthlyGrowth
      };

      previousMonthData[protocol] = {
        total_volume_usd: prevTotalVolume,
        numberOfNewUsers: prevTotalNewUsers,
        daily_trades: prevTotalTrades,
        total_fees_usd: prevTotalFees,
        monthly_growth: 0
      };
    }

    // Get 6-month volume trend data with pagination to fetch ALL records
    const startDate = format(new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1), 'yyyy-MM-dd');
    console.log(`Solana: Querying 6-month data from ${startDate} to ${format(endDate, 'yyyy-MM-dd')} with data_type=${dataType}`);
    
    // Fetch all data with pagination
    let allLast6MonthsData: any[] = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
      const { data, error } = await supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, date')
        .eq('data_type', dataType)
        .eq('chain', 'solana')
        .gte('date', startDate)
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching 6-month data page', page, error);
        break;
      }

      if (data && data.length > 0) {
        allLast6MonthsData = allLast6MonthsData.concat(data);
        console.log(`Solana: Fetched page ${page}, ${data.length} records, total so far: ${allLast6MonthsData.length}`);
        page++;
        hasMore = data.length === PAGE_SIZE; // Continue if we got a full page
      } else {
        hasMore = false;
      }
    }

    console.log(`Solana: Final total 6-month records: ${allLast6MonthsData.length}`);
    const last6MonthsData = { data: allLast6MonthsData, error: null };

    // Always initialize monthlyVolumeData for all protocols, even with empty data
    for (const protocol of protocols) {
      monthlyVolumeData[protocol] = {};
    }

    if (!last6MonthsData.error && last6MonthsData.data) {
      console.log(`Solana: Found ${last6MonthsData.data.length} records for 6-month trend data`);
      
      
      // Group by protocol and month - use case-insensitive matching
      for (const protocol of protocols) {
        // Try exact match first, then case-insensitive
        let protocolTrendData = last6MonthsData.data.filter(d => d.protocol_name === protocol);
        if (protocolTrendData.length === 0) {
          protocolTrendData = last6MonthsData.data.filter(d => d.protocol_name.toLowerCase() === protocol.toLowerCase());
        }
        
        // Aggregate by month
        const monthlyAggregated: Record<string, number> = {};
        protocolTrendData.forEach(d => {
          const monthKey = d.date.substring(0, 7); // YYYY-MM
          if (!monthlyAggregated[monthKey]) monthlyAggregated[monthKey] = 0;
          monthlyAggregated[monthKey] += Number(d.volume_usd) || 0;
        });
        
        monthlyVolumeData[protocol] = monthlyAggregated;
        if (protocolTrendData.length > 0) {
          console.log(`Solana ${protocol}: found ${protocolTrendData.length} records, ${Object.keys(monthlyAggregated).length} months`, monthlyAggregated);
        } else {
          console.log(`Solana ${protocol}: NO TREND DATA FOUND`);
        }
      }
    }

    // Ensure all protocols have all 6 months, fill with zeros if missing
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      last6Months.push(format(monthDate, 'yyyy-MM'));
    }
    
    for (const protocol of protocols) {
      for (const monthKey of last6Months) {
        if (!(monthKey in monthlyVolumeData[protocol])) {
          monthlyVolumeData[protocol][monthKey] = 0;
        }
      }
    }

    const result = {
      monthlyData,
      previousMonthData,
      monthlyVolumeData,
      sortedProtocols: Array.from(protocols).sort((a, b) => 
        (monthlyData[b]?.total_volume_usd || 0) - (monthlyData[a]?.total_volume_usd || 0)
      )
    };

    insightsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
    
  } catch (error) {
    console.error('Error fetching Solana monthly metrics:', error);
    throw error;
  }
}

// Get optimized monthly metrics for EVM
export async function getEVMMonthlyMetrics(endDate: Date, dataType: string = 'public') {
  const cacheKey = `evm_monthly_metrics_${format(endDate, 'yyyy-MM')}_${dataType}`;
  
  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }
  
  try {
    // Get current month and previous month boundaries
    const currentMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const currentMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
    const previousMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
    const previousMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
    
    // Get all EVM data for current and previous month in parallel
    const [currentData, previousData] = await Promise.all([
      supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, new_users, trades, fees_usd, date, chain')
        .eq('data_type', dataType)
        .in('chain', ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'])
        .gte('date', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(currentMonthEnd, 'yyyy-MM-dd')),
      supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, new_users, trades, fees_usd, date, chain')
        .eq('data_type', dataType)
        .in('chain', ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'])
        .gte('date', format(previousMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(previousMonthEnd, 'yyyy-MM-dd'))
    ]);

    if (currentData.error) throw currentData.error;
    if (previousData.error) throw previousData.error;

    // Get all possible EVM protocols, not just those with current/previous data
    const allEVMProtocols = getEVMProtocols();
    const protocolsWithData = new Set([
      ...(currentData.data || []).map(d => d.protocol_name),
      ...(previousData.data || []).map(d => d.protocol_name)
    ]);
    // Include both protocols with data AND all defined EVM protocols
    // Create a map for case-insensitive matching
    const protocolCaseMap = new Map<string, string>();
    protocolsWithData.forEach(p => protocolCaseMap.set(p.toLowerCase(), p));
    allEVMProtocols.forEach(p => {
      const lowerP = p.toLowerCase();
      if (!protocolCaseMap.has(lowerP)) {
        protocolCaseMap.set(lowerP, p);
      }
    });
    const protocols = new Set([...protocolCaseMap.values()]);

    const monthlyData: Record<string, any> = {};
    const previousMonthData: Record<string, any> = {};
    const monthlyVolumeData: Record<string, Record<string, number>> = {};

    for (const protocol of protocols) {
      // Aggregate current month
      const currentProtocolData = (currentData.data || []).filter(d => d.protocol_name === protocol);
      const totalVolume = currentProtocolData.reduce((sum, d) => sum + (Number(d.volume_usd) || 0), 0);
      const totalNewUsers = currentProtocolData.reduce((sum, d) => sum + (Number(d.new_users) || 0), 0);
      const totalTrades = currentProtocolData.reduce((sum, d) => sum + (Number(d.trades) || 0), 0);
      const totalFees = currentProtocolData.reduce((sum, d) => sum + (Number(d.fees_usd) || 0), 0);

      // Aggregate by chain for current month
      const chainVolumes: Record<string, number> = {};
      ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'].forEach(chain => {
        chainVolumes[chain] = currentProtocolData
          .filter(d => d.chain === chain)
          .reduce((sum, d) => sum + (Number(d.volume_usd) || 0), 0);
      });

      // Aggregate previous month
      const previousProtocolData = (previousData.data || []).filter(d => d.protocol_name === protocol);
      const prevTotalVolume = previousProtocolData.reduce((sum, d) => sum + (Number(d.volume_usd) || 0), 0);
      const prevTotalNewUsers = previousProtocolData.reduce((sum, d) => sum + (Number(d.new_users) || 0), 0);
      const prevTotalTrades = previousProtocolData.reduce((sum, d) => sum + (Number(d.trades) || 0), 0);
      const prevTotalFees = previousProtocolData.reduce((sum, d) => sum + (Number(d.fees_usd) || 0), 0);

      // Calculate monthly growth
      const monthlyGrowth = prevTotalVolume > 0 ? (totalVolume - prevTotalVolume) / prevTotalVolume : 0;

      monthlyData[protocol] = {
        total_volume_usd: totalVolume,
        numberOfNewUsers: totalNewUsers,
        daily_trades: totalTrades,
        total_fees_usd: totalFees,
        monthly_growth: monthlyGrowth,
        // Add chain-specific data
        ethereum_volume: chainVolumes.ethereum || 0,
        base_volume: chainVolumes.base || 0,
        bsc_volume: chainVolumes.bsc || 0,
        avax_volume: chainVolumes.avax || 0,
        arbitrum_volume: chainVolumes.arbitrum || 0,
        polygon_volume: chainVolumes.polygon || 0
      };

      previousMonthData[protocol] = {
        total_volume_usd: prevTotalVolume,
        numberOfNewUsers: prevTotalNewUsers,
        daily_trades: prevTotalTrades,
        total_fees_usd: prevTotalFees,
        monthly_growth: 0
      };
    }

    // Get 6-month volume trend data with pagination to fetch ALL records
    const startDate = format(new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1), 'yyyy-MM-dd');
    console.log(`EVM: Querying 6-month data from ${startDate} to ${format(endDate, 'yyyy-MM-dd')} with data_type=${dataType}`);
    
    // Fetch all data with pagination
    let allLast6MonthsData: any[] = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
      const { data, error } = await supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, date')
        .eq('data_type', dataType)
        .in('chain', ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'])
        .gte('date', startDate)
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching EVM 6-month data page', page, error);
        break;
      }

      if (data && data.length > 0) {
        allLast6MonthsData = allLast6MonthsData.concat(data);
        console.log(`EVM: Fetched page ${page}, ${data.length} records, total so far: ${allLast6MonthsData.length}`);
        page++;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    console.log(`EVM: Final total 6-month records: ${allLast6MonthsData.length}`);
    const last6MonthsData = { data: allLast6MonthsData, error: null };

    // Always initialize monthlyVolumeData for all protocols, even with empty data
    for (const protocol of protocols) {
      monthlyVolumeData[protocol] = {};
    }

    if (!last6MonthsData.error && last6MonthsData.data) {
      console.log(`EVM: Found ${last6MonthsData.data.length} records for 6-month trend data`);
      
      // Group by protocol and month - use case-insensitive matching
      for (const protocol of protocols) {
        // Try exact match first, then case-insensitive
        let protocolTrendData = last6MonthsData.data.filter(d => d.protocol_name === protocol);
        if (protocolTrendData.length === 0) {
          protocolTrendData = last6MonthsData.data.filter(d => d.protocol_name.toLowerCase() === protocol.toLowerCase());
        }
        
        // Aggregate by month
        const monthlyAggregated: Record<string, number> = {};
        protocolTrendData.forEach(d => {
          const monthKey = d.date.substring(0, 7); // YYYY-MM
          if (!monthlyAggregated[monthKey]) monthlyAggregated[monthKey] = 0;
          monthlyAggregated[monthKey] += Number(d.volume_usd) || 0;
        });
        
        monthlyVolumeData[protocol] = monthlyAggregated;
        if (protocolTrendData.length > 0) {
          console.log(`EVM ${protocol}: found ${protocolTrendData.length} records, ${Object.keys(monthlyAggregated).length} months`);
        }
      }
    }

    // Ensure all protocols have all 6 months, fill with zeros if missing
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      last6Months.push(format(monthDate, 'yyyy-MM'));
    }
    
    for (const protocol of protocols) {
      for (const monthKey of last6Months) {
        if (!(monthKey in monthlyVolumeData[protocol])) {
          monthlyVolumeData[protocol][monthKey] = 0;
        }
      }
    }

    const result = {
      monthlyData,
      previousMonthData,
      monthlyVolumeData,
      sortedProtocols: Array.from(protocols).sort((a, b) => 
        (monthlyData[b]?.total_volume_usd || 0) - (monthlyData[a]?.total_volume_usd || 0)
      )
    };

    insightsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
    
  } catch (error) {
    console.error('Error fetching EVM monthly metrics:', error);
    throw error;
  }
}

// Get optimized monthly insights for highlights
export async function getMonthlyInsights(endDate: Date, dataType: string = 'private') {
  const cacheKey = `monthly_insights_${format(endDate, 'yyyy-MM')}_${dataType}`;
  
  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }
  
  try {
    // Get date boundaries for current, previous, and 3 months of historical data
    const currentMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const currentMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
    const previousMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
    const previousMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
    const threeMonthsAgoStart = new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);
    
    // Get all data in parallel queries
    const [currentData, previousData, historicalData] = await Promise.all([
      supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, new_users, trades, fees_usd, date, daily_users')
        .eq('data_type', dataType)
        .eq('chain', 'solana')
        .gte('date', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(currentMonthEnd, 'yyyy-MM-dd')),
      supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, new_users, trades, fees_usd, date, daily_users')
        .eq('data_type', dataType)
        .eq('chain', 'solana')
        .gte('date', format(previousMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(previousMonthEnd, 'yyyy-MM-dd')),
      supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, new_users, trades, fees_usd, date, daily_users')
        .eq('data_type', dataType)
        .eq('chain', 'solana')
        .gte('date', format(threeMonthsAgoStart, 'yyyy-MM-dd'))
        .lte('date', format(currentMonthEnd, 'yyyy-MM-dd'))
    ]);

    if (currentData.error) throw currentData.error;
    if (previousData.error) throw previousData.error;
    if (historicalData.error) throw historicalData.error;

    // Group data by protocol
    const protocols = new Set([
      ...(currentData.data || []).map(d => d.protocol_name),
      ...(previousData.data || []).map(d => d.protocol_name),
      ...(historicalData.data || []).map(d => d.protocol_name)
    ]);

    const performances: Record<string, any> = {};
    
    for (const protocol of protocols) {
      // Aggregate current month
      const currentProtocolData = (currentData.data || []).filter(d => d.protocol_name === protocol);
      const currentMetrics = {
        total_volume_usd: currentProtocolData.reduce((sum, d) => sum + (Number(d.volume_usd) || 0), 0),
        daily_users: currentProtocolData.reduce((max, d) => Math.max(max, Number(d.daily_users) || 0), 0),
        numberOfNewUsers: currentProtocolData.reduce((sum, d) => sum + (Number(d.new_users) || 0), 0),
        daily_trades: currentProtocolData.reduce((sum, d) => sum + (Number(d.trades) || 0), 0),
        total_fees_usd: currentProtocolData.reduce((sum, d) => sum + (Number(d.fees_usd) || 0), 0)
      };

      // Skip protocols with no current volume
      if (currentMetrics.total_volume_usd === 0) continue;

      // Aggregate previous month
      const previousProtocolData = (previousData.data || []).filter(d => d.protocol_name === protocol);
      const previousMetrics = {
        total_volume_usd: previousProtocolData.reduce((sum, d) => sum + (Number(d.volume_usd) || 0), 0),
        daily_users: previousProtocolData.reduce((max, d) => Math.max(max, Number(d.daily_users) || 0), 0),
        numberOfNewUsers: previousProtocolData.reduce((sum, d) => sum + (Number(d.new_users) || 0), 0),
        daily_trades: previousProtocolData.reduce((sum, d) => sum + (Number(d.trades) || 0), 0),
        total_fees_usd: previousProtocolData.reduce((sum, d) => sum + (Number(d.fees_usd) || 0), 0)
      };

      // Calculate trends
      const volume1m = previousMetrics.total_volume_usd > 0 ? 
        (currentMetrics.total_volume_usd - previousMetrics.total_volume_usd) / previousMetrics.total_volume_usd : 0;
      
      const users1m = previousMetrics.daily_users > 0 ? 
        (currentMetrics.daily_users - previousMetrics.daily_users) / previousMetrics.daily_users : 0;
      
      const trades1m = previousMetrics.daily_trades > 0 ? 
        (currentMetrics.daily_trades - previousMetrics.daily_trades) / previousMetrics.daily_trades : 0;

      // Calculate 3-month historical average
      const historicalProtocolData = (historicalData.data || []).filter(d => d.protocol_name === protocol);
      const avg3mVolume = historicalProtocolData.length > 0 ?
        historicalProtocolData.reduce((sum, d) => sum + (Number(d.volume_usd) || 0), 0) / historicalProtocolData.length : 0;
      
      const volume3m = avg3mVolume > 0 ? (currentMetrics.total_volume_usd - avg3mVolume) / avg3mVolume : 0;

      // Calculate monthly consistency (simplified reliability metric)
      const monthlyVolumes = [currentMetrics.total_volume_usd, previousMetrics.total_volume_usd];
      const avgMonthlyVolume = monthlyVolumes.reduce((sum, vol) => sum + vol, 0) / monthlyVolumes.length;
      const volumeVariance = monthlyVolumes.reduce((sum, vol) => sum + Math.pow(vol - avgMonthlyVolume, 2), 0) / monthlyVolumes.length;
      const consistency = avgMonthlyVolume > 0 ? avgMonthlyVolume * (1 / (1 + Math.sqrt(volumeVariance) / avgMonthlyVolume)) : 0;

      performances[protocol] = {
        current: currentMetrics,
        previous: previousMetrics,
        trends: {
          volume1m,
          volume3m,
          users1m,
          trades1m,
          consistency
        }
      };
    }

    // Generate insights
    const insights: any[] = [];
    const performancesList = Object.entries(performances).map(([protocol, perf]) => ({
      protocol,
      ...perf
    }));

    // Top Volume Leader
    if (performancesList.length > 0) {
      const topByVolume = performancesList.reduce((best, current) => 
        (current as any).current.total_volume_usd > (best as any).current.total_volume_usd ? current : best
      );
      
      insights.push({
        type: 'success',
        title: 'Monthly Volume Leader',
        description: `Dominated the month with $${((topByVolume as any).current.total_volume_usd / 1000000).toFixed(2)}M in total volume`,
        protocol: (topByVolume as any).protocol,
        value: (topByVolume as any).current.total_volume_usd,
        trend: (topByVolume as any).trends.volume1m
      });

      // Biggest Monthly Gainer
      const gainers = performancesList.filter((p: any) => p.trends.volume1m > 0.1); // > 10% growth
      if (gainers.length > 0) {
        const biggestGainer = gainers.reduce((best, current) => 
          (current as any).trends.volume1m > (best as any).trends.volume1m ? current : best
        );
        
        insights.push({
          type: 'info',
          title: 'Biggest Monthly Gainer',
          description: `Grew by ${((biggestGainer as any).trends.volume1m * 100).toFixed(1)}% month-over-month`,
          protocol: (biggestGainer as any).protocol,
          trend: (biggestGainer as any).trends.volume1m
        });
      }

      // Most Consistent Performer
      const mostConsistent = performancesList.reduce((best, current) => 
        (current as any).trends.consistency > (best as any).trends.consistency ? current : best
      );
      
      insights.push({
        type: 'success',
        title: 'Most Consistent Performer',
        description: 'Maintained steady performance throughout the month',
        protocol: (mostConsistent as any).protocol,
        value: (mostConsistent as any).trends.consistency
      });
    }

    const result = {
      performances,
      insights,
      totalProtocols: performancesList.length
    };

    insightsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
    
  } catch (error) {
    console.error('Error fetching monthly insights:', error);
    throw error;
  }
}

export async function getLatestDataDates(dataType?: string): Promise<{
  protocol_name: string;
  latest_date: string;
  is_current: boolean;
  days_behind: number;
  chain: string;
}[]> {
  try {
    // Get the latest date for each protocol (both SOL and EVM) with proper data type handling
    // EVM protocols use 'public' data by default, Solana protocols use 'private' by default
    let query = supabase
      .from('protocol_stats')
      .select('protocol_name, date, chain, data_type')
      .order('date', { ascending: false });

    // If no specific data type is requested, get both public and private
    // If a specific data type is requested, filter by it
    if (dataType) {
      query = query.eq('data_type', dataType);
    }

    const { data: latestDates, error } = await query;

    if (error) throw error;

    // Get current date (today)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Group by protocol and chain to get the latest date for each, considering proper data types
    const protocolLatestDates = new Map<string, { date: string; chain: string }>();
    
    latestDates?.forEach(row => {
      const protocol = row.protocol_name;
      const date = row.date;
      const chain = row.chain;
      const recordDataType = row.data_type;
      
      // Normalize protocol names - remove _evm suffix if present for consistency
      const normalizedProtocol = protocol.endsWith('_evm') ? protocol.slice(0, -4) : protocol;
      
      // Create unique key for each protocol/chain combination
      const key = chain === 'solana' ? normalizedProtocol : `${normalizedProtocol}_evm`;
      
      // Skip if we have a specific dataType filter and this record doesn't match
      if (dataType && recordDataType !== dataType) {
        return;
      }
      
      // For proper data type handling when no specific filter is applied:
      // - Solana protocols should use 'private' data type
      // - EVM protocols should use 'public' data type
      if (!dataType) {
        const expectedDataType = chain === 'solana' ? 'private' : 'public';
        if (recordDataType !== expectedDataType) {
          return;
        }
      }
      
      if (!protocolLatestDates.has(key) || date > protocolLatestDates.get(key)!.date) {
        protocolLatestDates.set(key, { date, chain: chain === 'solana' ? 'solana' : 'evm' });
      }
    });

    // Convert to result format
    const result = Array.from(protocolLatestDates.entries()).map(([key, { date: latestDate, chain }]) => {
      const daysBehind = Math.floor((today.getTime() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24));
      const isCurrent = latestDate === todayStr || daysBehind <= 1; // Consider current if today or yesterday
      
      // Extract protocol name (remove _evm suffix if present)
      const protocolName = key.endsWith('_evm') ? key.slice(0, -4) : key;
      
      return {
        protocol_name: protocolName,
        latest_date: latestDate,
        is_current: isCurrent,
        days_behind: Math.max(0, daysBehind),
        chain: chain
      };
    });

    // Sort by days behind (most behind first)
    result.sort((a, b) => b.days_behind - a.days_behind);

    return result;
  } catch (error) {
    console.error('Error fetching latest data dates:', error);
    throw error;
  }
}

/**
 * Get EVM weekly metrics with growth calculations (optimized single query)
 */
export async function getEVMWeeklyMetrics(endDate: Date, dataType: string = 'public') {
  try {
    // Calculate start dates for current and previous week
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6); // 7 days total including endDate
    
    const prevWeekEndDate = new Date(endDate);
    prevWeekEndDate.setDate(endDate.getDate() - 7);
    const prevWeekStartDate = new Date(prevWeekEndDate);
    prevWeekStartDate.setDate(prevWeekEndDate.getDate() - 6);

    console.log(`Fetching optimized EVM weekly metrics:
      Current week: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}
      Previous week: ${prevWeekStartDate.toISOString().split('T')[0]} to ${prevWeekEndDate.toISOString().split('T')[0]}
      Data type: ${dataType}`);

    const evmChains = ['ethereum', 'base', 'bsc', 'avax', 'arbitrum'];
    const evmProtocols = getEVMProtocols(); // Use centralized list

    // Single optimized query to get both current and previous week data
    const { data, error } = await supabase
      .from('protocol_stats')
      .select('protocol_name, date, volume_usd, chain')
      .in('chain', evmChains)
      .in('protocol_name', evmProtocols)
      .eq('data_type', dataType)
      .gte('date', prevWeekStartDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('protocol_name')
      .order('date');

    if (error) {
      console.error('Supabase error in getEVMWeeklyMetricsOptimized:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No EVM data found for the specified date range');
      return { 
        weeklyData: {}, 
        dateRange: { 
          startDate: startDate.toISOString().split('T')[0], 
          endDate: endDate.toISOString().split('T')[0] 
        },
        totalProtocols: 0
      };
    }

    // Group data by protocol and calculate metrics
    const protocolData: Record<string, any> = {};

    // Initialize all EVM protocols
    evmProtocols.forEach(protocol => {
      protocolData[protocol] = {
        dailyVolumes: {},
        chainVolumes: {
          ethereum: 0,
          base: 0,
          bsc: 0,
          avax: 0,
          arbitrum: 0
        },
        currentWeekTotal: 0,
        previousWeekTotal: 0,
        weeklyTrend: []
      };
    });

    // Process each record
    data.forEach(record => {
      const protocol = record.protocol_name;
      const date = record.date;
      const volume = Number(record.volume_usd) || 0;
      const chain = record.chain;

      // Skip if protocol not in our list
      if (!protocolData[protocol]) {
        return;
      }

      const recordDate = new Date(date);
      const isCurrentWeek = recordDate >= startDate && recordDate <= endDate;
      const isPreviousWeek = recordDate >= prevWeekStartDate && recordDate <= prevWeekEndDate;

      if (isCurrentWeek) {
        // Current week data
        if (!protocolData[protocol].dailyVolumes[date]) {
          protocolData[protocol].dailyVolumes[date] = 0;
        }
        protocolData[protocol].dailyVolumes[date] += volume;
        protocolData[protocol].currentWeekTotal += volume;
        
        // Aggregate by chain for current week
        if (protocolData[protocol].chainVolumes[chain] !== undefined) {
          protocolData[protocol].chainVolumes[chain] += volume;
        }
      } else if (isPreviousWeek) {
        // Previous week data for growth calculation
        protocolData[protocol].previousWeekTotal += volume;
      }
    });

    // Calculate growth percentages and prepare final response
    const weeklyData: Record<string, any> = {};
    const protocolTotals: Array<{ protocol: string; volume: number }> = [];

    Object.entries(protocolData).forEach(([protocol, data]) => {
      // Calculate growth percentage
      const weeklyGrowth = data.previousWeekTotal > 0 
        ? (data.currentWeekTotal - data.previousWeekTotal) / data.previousWeekTotal 
        : (data.currentWeekTotal > 0 ? 1 : 0);

      // Create weekly trend array (sorted by date)
      const dateKeys = Object.keys(data.dailyVolumes).sort();
      const weeklyTrend = dateKeys.map(date => data.dailyVolumes[date] || 0);

      weeklyData[protocol] = {
        totalVolume: data.currentWeekTotal,
        dailyVolumes: data.dailyVolumes,
        chainVolumes: data.chainVolumes,
        weeklyGrowth,
        weeklyTrend,
        previousWeekTotal: data.previousWeekTotal
      };

      // Add to totals for ranking (only protocols with data)
      if (data.currentWeekTotal > 0) {
        protocolTotals.push({
          protocol,
          volume: data.currentWeekTotal
        });
      }
    });

    // Sort protocols by volume
    const sortedProtocols = protocolTotals
      .sort((a, b) => b.volume - a.volume)
      .map(p => p.protocol);

    const result = {
      weeklyData,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      totalProtocols: protocolTotals.length,
      sortedProtocols
    };

    console.log(`Successfully processed optimized EVM weekly data for ${protocolTotals.length} protocols`);
    return result;

  } catch (error) {
    console.error('Error in getEVMWeeklyMetricsOptimized:', error);
    throw error;
  }
}

/**
 * Get cumulative volume for a protocol from inception to a specific end date
 */
export async function getCumulativeVolume(protocolName: string, endDate: Date, dataType: string = 'private'): Promise<number> {
  try {
    console.log(`Getting cumulative volume for ${protocolName} up to ${endDate.toISOString().split('T')[0]} with data type: ${dataType}`);
    
    // Query to sum all volume from inception to end date for the specific protocol
    const { data, error } = await supabase
      .from('protocol_stats')
      .select('volume_usd')
      .eq('protocol_name', protocolName)
      .eq('data_type', dataType)
      .lte('date', endDate.toISOString().split('T')[0])
      .not('volume_usd', 'is', null);

    if (error) {
      console.error(`Supabase error in getCumulativeVolume for ${protocolName}:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`No volume data found for ${protocolName} up to ${endDate.toISOString().split('T')[0]}`);
      return 0;
    }

    // Sum all volume values
    const cumulativeVolume = data.reduce((sum, record) => {
      const volume = Number(record.volume_usd) || 0;
      return sum + volume;
    }, 0);

    console.log(`Cumulative volume for ${protocolName} up to ${endDate.toISOString().split('T')[0]}: $${cumulativeVolume.toLocaleString()}`);
    
    return cumulativeVolume;

  } catch (error) {
    console.error(`Error getting cumulative volume for ${protocolName}:`, error);
    throw error;
  }
}

/**
 * Get Solana weekly metrics with growth calculations (optimized single query)
 */
export async function getSolanaWeeklyMetrics(endDate: Date, dataType: string = 'private') {
  try {
    // Calculate start dates for current and previous week
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6); // 7 days total including endDate
    
    const prevWeekEndDate = new Date(endDate);
    prevWeekEndDate.setDate(endDate.getDate() - 7);
    const prevWeekStartDate = new Date(prevWeekEndDate);
    prevWeekStartDate.setDate(prevWeekEndDate.getDate() - 6);

    console.log(`Fetching Solana weekly metrics:
      Current week: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}
      Previous week: ${prevWeekStartDate.toISOString().split('T')[0]} to ${prevWeekEndDate.toISOString().split('T')[0]}
      Data type: ${dataType}`);

    // Single optimized query to get both current and previous week data
    const { data, error } = await supabase
      .from('protocol_stats')
      .select('protocol_name, date, volume_usd, daily_users, new_users, trades, fees_usd')
      .eq('chain', 'solana')
      .eq('data_type', dataType)
      .gte('date', prevWeekStartDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('protocol_name')
      .order('date');

    if (error) {
      console.error('Supabase error in getSolanaWeeklyMetrics:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No data found for the specified date range');
      return { weeklyData: {}, topProtocols: [], dateRange: { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] } };
    }

    // Group data by protocol and calculate metrics
    const protocolData: Record<string, any> = {};
    const solanaProtocols = getSolanaProtocols();

    // Initialize all Solana protocols
    solanaProtocols.forEach(protocol => {
      protocolData[protocol] = {
        dailyMetrics: {
          volume: {},
          users: {},
          newUsers: {},
          trades: {}
        },
        currentWeekTotal: {
          volume: 0,
          users: 0,
          newUsers: 0,
          trades: 0
        },
        previousWeekTotal: {
          volume: 0,
          users: 0,
          newUsers: 0,
          trades: 0
        }
      };
    });

    // Process each record
    data.forEach(record => {
      const protocol = record.protocol_name;
      const date = record.date;
      const volume = Number(record.volume_usd) || 0;
      const users = Number(record.daily_users) || 0;
      const newUsers = Number(record.new_users) || 0;
      const trades = Number(record.trades) || 0;

      // Skip if protocol not in our list
      if (!protocolData[protocol]) {
        return;
      }

      const recordDate = new Date(date);
      const isCurrentWeek = recordDate >= startDate && recordDate <= endDate;
      const isPreviousWeek = recordDate >= prevWeekStartDate && recordDate <= prevWeekEndDate;

      if (isCurrentWeek) {
        // Current week data
        protocolData[protocol].dailyMetrics.volume[date] = volume;
        protocolData[protocol].dailyMetrics.users[date] = users;
        protocolData[protocol].dailyMetrics.newUsers[date] = newUsers;
        protocolData[protocol].dailyMetrics.trades[date] = trades;
        
        protocolData[protocol].currentWeekTotal.volume += volume;
        protocolData[protocol].currentWeekTotal.users += users;
        protocolData[protocol].currentWeekTotal.newUsers += newUsers;
        protocolData[protocol].currentWeekTotal.trades += trades;
      } else if (isPreviousWeek) {
        // Previous week data for growth calculation
        protocolData[protocol].previousWeekTotal.volume += volume;
        protocolData[protocol].previousWeekTotal.users += users;
        protocolData[protocol].previousWeekTotal.newUsers += newUsers;
        protocolData[protocol].previousWeekTotal.trades += trades;
      }
    });

    // Calculate growth percentages and prepare final response
    const weeklyData: Record<string, any> = {};
    const protocolTotals: Array<{ protocol: string; volume: number; users: number; newUsers: number; trades: number }> = [];

    Object.entries(protocolData).forEach(([protocol, data]) => {
      // Calculate growth percentages
      const volumeGrowth = data.previousWeekTotal.volume > 0 
        ? (data.currentWeekTotal.volume - data.previousWeekTotal.volume) / data.previousWeekTotal.volume 
        : (data.currentWeekTotal.volume > 0 ? 1 : 0);

      const userGrowth = data.previousWeekTotal.users > 0 
        ? (data.currentWeekTotal.users - data.previousWeekTotal.users) / data.previousWeekTotal.users 
        : (data.currentWeekTotal.users > 0 ? 1 : 0);

      const newUserGrowth = data.previousWeekTotal.newUsers > 0 
        ? (data.currentWeekTotal.newUsers - data.previousWeekTotal.newUsers) / data.previousWeekTotal.newUsers 
        : (data.currentWeekTotal.newUsers > 0 ? 1 : 0);

      const tradeGrowth = data.previousWeekTotal.trades > 0 
        ? (data.currentWeekTotal.trades - data.previousWeekTotal.trades) / data.previousWeekTotal.trades 
        : (data.currentWeekTotal.trades > 0 ? 1 : 0);

      weeklyData[protocol] = {
        dailyMetrics: data.dailyMetrics,
        weeklyTotals: data.currentWeekTotal,
        previousWeekTotals: data.previousWeekTotal,
        growth: {
          volume: volumeGrowth,
          users: userGrowth,
          newUsers: newUserGrowth,
          trades: tradeGrowth
        }
      };

      // Add to totals for ranking (only protocols with data)
      if (data.currentWeekTotal.volume > 0 || data.currentWeekTotal.users > 0) {
        protocolTotals.push({
          protocol,
          volume: data.currentWeekTotal.volume,
          users: data.currentWeekTotal.users,
          newUsers: data.currentWeekTotal.newUsers,
          trades: data.currentWeekTotal.trades
        });
      }
    });

    // Sort protocols by volume and get top 3
    const topProtocols = protocolTotals
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3)
      .map(p => p.protocol);

    const result = {
      weeklyData,
      topProtocols,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      totalProtocols: protocolTotals.length
    };

    console.log(`Successfully processed weekly data for ${protocolTotals.length} Solana protocols`);
    return result;

  } catch (error) {
    console.error('Error in getSolanaWeeklyMetrics:', error);
    throw error;
  }
}

