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
  // Default to 'public' for EVM chains, 'private' for others
  const effectiveDataType = dataType || (chainFilter === 'evm' || ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'].includes(chainFilter || '') ? 'public' : 'private');
  const cacheKey = Array.isArray(protocolName) 
    ? protocolName.sort().join(',') + '_' + (chainFilter || 'default') + '_' + effectiveDataType
    : (protocolName || 'all') + '_' + (chainFilter || 'default') + '_' + effectiveDataType;

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

    // Determine which chains to query based on chain parameter
    if (chainFilter === 'evm') {
      // For EVM, query specific EVM chains (same as working EVM metrics query)
      query = query.in('chain', ['ethereum', 'base', 'bsc', 'avax']);
    } else if (chainFilter === 'solana' || !chainFilter) {
      // For Solana or default, query Solana chain
      query = query.eq('chain', 'solana');
    } else {
      // For specific chain, query that exact chain
      query = query.eq('chain', chainFilter);
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

    // Filter by data type (use effectiveDataType which defaults to public for EVM, private for others)
    query = query.eq('data_type', effectiveDataType);

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

  // Sort by date and remove the most recent date
  const sortedData = allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Find the most recent date and filter it out
  const mostRecentDate = sortedData.length > 0 ? sortedData[0].date : null;
  const filteredData = mostRecentDate 
    ? sortedData.filter(row => row.date !== mostRecentDate)
    : sortedData;

  const formattedData = filteredData.map((row: ProtocolStats) => ({
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
  // Default to 'public' for EVM chains, 'private' for others
  const effectiveDataType = dataType || (chainFilter === 'evm' || ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'].includes(chainFilter || '') ? 'public' : 'private');
  const cacheKey = `${protocolName || 'all'}_${chainFilter || 'default'}_${effectiveDataType}`;
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
      .select('volume_usd, daily_users, new_users, trades, fees_usd, date')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // Determine which chains to query based on chain parameter
    if (chainFilter === 'evm') {
      // For EVM, query specific EVM chains (same as working EVM metrics query)
      console.log(`EVM filter detected, querying EVM chains`);
      query = query.in('chain', ['ethereum', 'base', 'bsc', 'avax']);
    } else if (chainFilter === 'solana' || !chainFilter) {
      // For Solana or default, query Solana chain
      console.log(`Solana filter, querying Solana chain`);
      query = query.eq('chain', 'solana');
    } else {
      // For specific chain, query that exact chain
      console.log(`Specific chain filter: ${chainFilter}`);
      query = query.eq('chain', chainFilter);
    }

    if (protocolName) {
      query = query.eq('protocol_name', protocolName);
    }

    // Filter by data type (use effectiveDataType which defaults to public for EVM, private for others)
    query = query.eq('data_type', effectiveDataType);

    console.log(`Query for protocol: ${protocolName}, chain: ${chainFilter}`);
    const { data, error } = await query;
    console.log(`Query returned ${data?.length || 0} rows`);
    if (data && data.length > 0) {
      console.log(`Sample data:`, data.slice(0, 2));
      const totalVol = data.reduce((sum, row) => sum + (Number(row.volume_usd) || 0), 0);
      console.log(`Total volume from this batch: ${totalVol}`);
    }

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

  // Sort by date and remove the most recent date (same logic as getProtocolStats)
  const sortedData = allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
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

export async function getEVMWeeklyMetrics(startDate: string, endDate: string, dataType?: string): Promise<{
  dailyVolumes: Record<string, Record<string, number>>;
  chainDistribution: Record<string, Record<string, number>>;
}> {
  console.log(`Fetching EVM weekly metrics from ${startDate} to ${endDate}`);
  
  const evmChains = ['ethereum', 'base', 'bsc', 'avax', 'arbitrum'];
  const evmProtocols = ['banana', 'bloom', 'maestro', 'sigma']; // Hard-coded for now
  // Default to 'public' for EVM data
  const effectiveDataType = dataType || 'public';
  
  console.log(`EVM Chains:`, evmChains);
  console.log(`EVM Protocols:`, evmProtocols);
  console.log(`Effective Data Type:`, effectiveDataType);
  
  try {
    // Query database for the date range across all EVM chains and protocols
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('protocol_stats')
      .select('protocol_name, date, chain, volume_usd')
      .in('chain', evmChains)
      .in('protocol_name', evmProtocols)
      .eq('data_type', effectiveDataType)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('protocol_name')
      .order('date');

    if (weeklyError) {
      console.error('Error fetching EVM weekly data:', weeklyError);
      throw weeklyError;
    }

    console.log(`Found ${weeklyData?.length || 0} EVM weekly records`);
    if (weeklyData && weeklyData.length > 0) {
      console.log(`Sample data:`, weeklyData.slice(0, 3));
    } else {
      console.log(`No data found for query with:`, {
        chains: evmChains,
        protocols: evmProtocols,
        dataType: effectiveDataType,
        startDate,
        endDate
      });
    }

    // Process the data by protocol and date
    const dailyVolumes: Record<string, Record<string, number>> = {};
    const chainDistribution: Record<string, Record<string, number>> = {};

    if (weeklyData) {
      weeklyData.forEach(record => {
        const protocolName = record.protocol_name;
        const date = record.date;
        const chain = record.chain;
        const volume = Number(record.volume_usd) || 0;

        // Initialize protocol if not exists
        if (!dailyVolumes[protocolName]) {
          dailyVolumes[protocolName] = {};
        }
        if (!chainDistribution[protocolName]) {
          chainDistribution[protocolName] = {};
        }

        // Aggregate volume by date (sum across all chains for that protocol)
        dailyVolumes[protocolName][date] = (dailyVolumes[protocolName][date] || 0) + volume;
        
        // Aggregate volume by chain for the entire period
        chainDistribution[protocolName][chain] = (chainDistribution[protocolName][chain] || 0) + volume;
      });
    }

    console.log(`Processed EVM weekly data for ${Object.keys(dailyVolumes).length} protocols`);
    return { dailyVolumes, chainDistribution };

  } catch (error) {
    console.error('Error in getEVMWeeklyMetrics:', error);
    throw error;
  }
}

