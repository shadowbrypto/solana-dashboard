import { db } from '../lib/db.js';
import { ProtocolStats, ProtocolMetrics, Protocol, ProtocolStatsWithDay } from '../types/protocol.js';
import { format } from 'date-fns';
import { getSolanaProtocols, isEVMProtocol, getEVMProtocols, isMonadProtocol, getMonadProtocols } from '../config/chainProtocols.js';

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
  dailyMetricsCache.clear();
  aggregatedStatsCache.clear();
  insightsCache.clear();

  console.log(`Cache cleared for protocol: ${protocolName}`);
}

export function formatDate(isoDate: string | Date): string {
  // Handle MySQL Date objects and strings
  if (isoDate instanceof Date) {
    const year = isoDate.getFullYear();
    const month = String(isoDate.getMonth() + 1).padStart(2, '0');
    const day = String(isoDate.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
  }
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

// OPTIMIZED: Single query with optional EVM aggregation
export async function getProtocolStats(protocolName?: string | string[], chainFilter?: string, dataType?: string) {
  const isEVMChain = chainFilter === 'evm' || ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'].includes(chainFilter || '');
  const effectiveDataType = isEVMChain ? 'public' : (dataType || 'private');

  const cacheKey = Array.isArray(protocolName)
    ? protocolName.sort().join(',') + '_' + (chainFilter || 'default') + '_' + effectiveDataType + '_strict'
    : (protocolName || 'all') + '_' + (chainFilter || 'default') + '_' + effectiveDataType + '_strict';

  const cachedData = protocolStatsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    let sql: string;
    let params: any[] = [];

    if (chainFilter === 'evm') {
      // OPTIMIZED: EVM aggregation in SQL - single query instead of pagination + JS aggregation
      sql = `
        WITH max_date AS (
          SELECT MAX(date) as latest_date
          FROM protocol_stats
          WHERE ${protocolName ? (Array.isArray(protocolName) ? `protocol_name IN (${protocolName.map(() => '?').join(',')})` : 'protocol_name = ?') : '1=1'}
            AND chain IN ('ethereum', 'base', 'bsc', 'avax', 'arbitrum')
            AND data_type = 'public'
        )
        SELECT
          protocol_name,
          date,
          'evm' as chain,
          SUM(volume_usd) as volume_usd,
          SUM(daily_users) as daily_users,
          SUM(new_users) as new_users,
          SUM(trades) as trades,
          SUM(fees_usd) as fees_usd,
          data_type,
          MIN(created_at) as created_at
        FROM protocol_stats, max_date
        WHERE chain IN ('ethereum', 'base', 'bsc', 'avax', 'arbitrum')
          AND data_type = 'public'
          AND date < max_date.latest_date
          ${protocolName ? (Array.isArray(protocolName) ? `AND protocol_name IN (${protocolName.map(() => '?').join(',')})` : 'AND protocol_name = ?') : ''}
        GROUP BY protocol_name, date, data_type
        ORDER BY date DESC
      `;

      if (protocolName) {
        if (Array.isArray(protocolName)) {
          params = [...protocolName, ...protocolName];
        } else {
          params = [protocolName, protocolName];
        }
      }
    } else {
      // Solana or specific chain - OPTIMIZED single query
      const chain = chainFilter || 'solana';

      sql = `
        SELECT
          protocol_name,
          date,
          chain,
          volume_usd,
          daily_users,
          new_users,
          trades,
          fees_usd,
          data_type,
          created_at
        FROM protocol_stats
        WHERE chain = ?
          AND data_type = ?
          AND date < (SELECT MAX(date) FROM protocol_stats WHERE chain = ? AND data_type = ?)
          ${protocolName ? (Array.isArray(protocolName) ? `AND LOWER(protocol_name) IN (${protocolName.map(() => 'LOWER(?)').join(',')})` : 'AND LOWER(protocol_name) = LOWER(?)') : ''}
        ORDER BY date DESC
      `;

      params = [chain, effectiveDataType, chain, effectiveDataType];
      if (protocolName) {
        if (Array.isArray(protocolName)) {
          params.push(...protocolName);
        } else {
          params.push(protocolName);
        }
      }
    }

    const data = await db.query<any>(sql, params);

    if (!data || data.length === 0) {
      console.log(`STRICT FILTERING: No protocol stats found for protocol=${protocolName}, chain=${chainFilter}, dataType=${effectiveDataType}`);
      return [];
    }

    console.log(`STRICT FILTERING SUCCESS: Found ${data.length} protocol stats records for protocol=${protocolName}, chain=${chainFilter}, dataType=${effectiveDataType}`);

    const formattedData = data.map((row: any) => ({
      ...row,
      volume_usd: Number(row.volume_usd) || 0,
      daily_users: Number(row.daily_users) || 0,
      new_users: Number(row.new_users) || 0,
      trades: Number(row.trades) || 0,
      fees_usd: Number(row.fees_usd) || 0,
      formattedDay: formatDate(row.date)
    }));

    protocolStatsCache.set(cacheKey, {
      data: formattedData,
      timestamp: Date.now()
    });

    return formattedData;
  } catch (error) {
    console.error('Error fetching protocol stats:', error);
    throw error;
  }
}

// OPTIMIZED: Single aggregated query for total stats
export async function getTotalProtocolStats(protocolName?: string, chainFilter?: string, dataType?: string): Promise<ProtocolMetrics> {
  const isEVMChain = chainFilter === 'evm' || ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'].includes(chainFilter || '');
  const effectiveDataType = isEVMChain ? 'public' : (dataType || 'private');

  const cacheKey = `${protocolName || 'all'}_${chainFilter || 'default'}_${effectiveDataType}_strict`;
  const cachedData = totalStatsCache.get(cacheKey);

  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    let sql: string;
    let params: any[] = [];

    if (chainFilter === 'evm') {
      // OPTIMIZED: EVM aggregation with subquery for max date exclusion
      sql = `
        SELECT
          SUM(volume_usd) as total_volume,
          SUM(daily_users) as total_users,
          SUM(new_users) as total_new_users,
          SUM(trades) as total_trades,
          SUM(fees_usd) as total_fees
        FROM protocol_stats
        WHERE chain IN ('ethereum', 'base', 'bsc', 'avax', 'arbitrum')
          AND data_type = 'public'
          AND date < (SELECT MAX(date) FROM protocol_stats WHERE chain IN ('ethereum', 'base', 'bsc', 'avax', 'arbitrum') AND data_type = 'public')
          ${protocolName ? 'AND protocol_name = ?' : ''}
      `;
      if (protocolName) params.push(protocolName);
    } else {
      const chain = chainFilter || 'solana';

      sql = `
        SELECT
          SUM(volume_usd) as total_volume,
          SUM(daily_users) as total_users,
          SUM(new_users) as total_new_users,
          SUM(trades) as total_trades,
          SUM(fees_usd) as total_fees
        FROM protocol_stats
        WHERE chain = ?
          AND data_type = ?
          AND date < (SELECT MAX(date) FROM protocol_stats WHERE chain = ? AND data_type = ?)
          ${protocolName ? 'AND protocol_name = ?' : ''}
      `;
      params = [chain, effectiveDataType, chain, effectiveDataType];
      if (protocolName) params.push(protocolName);
    }

    const result = await db.queryOne<any>(sql, params);

    const metrics: ProtocolMetrics = {
      total_volume_usd: Number(result?.total_volume) || 0,
      daily_users: Number(result?.total_users) || 0,
      numberOfNewUsers: Number(result?.total_new_users) || 0,
      daily_trades: Number(result?.total_trades) || 0,
      total_fees_usd: Number(result?.total_fees) || 0
    };

    totalStatsCache.set(cacheKey, {
      data: metrics,
      timestamp: Date.now()
    });

    return metrics;
  } catch (error) {
    console.error('Error fetching total protocol stats:', error);
    throw error;
  }
}

// OPTIMIZED: EVM chain breakdown with SQL aggregation
export async function getEVMChainBreakdown(protocolName: string, dataType?: string): Promise<{
  lifetimeVolume: number;
  chainBreakdown: Array<{
    chain: string;
    volume: number;
    percentage: number;
  }>;
  totalChains: number;
}> {
  const effectiveDataType = dataType || 'public';
  const cacheKey = `evm_breakdown_${protocolName}_${effectiveDataType}`;
  const cachedData = insightsCache.get(cacheKey);

  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    // OPTIMIZED: Single GROUP BY query instead of pagination loop
    const data = await db.query<{ chain: string; total_volume: number }>(
      `SELECT chain, SUM(volume_usd) as total_volume
       FROM protocol_stats
       WHERE protocol_name = ?
         AND chain IN ('ethereum', 'base', 'bsc', 'avax', 'polygon', 'arbitrum')
         AND data_type = ?
       GROUP BY chain
       HAVING SUM(volume_usd) > 0
       ORDER BY total_volume DESC`,
      [protocolName, effectiveDataType]
    );

    const totalVolume = data.reduce((sum, row) => sum + Number(row.total_volume), 0);

    const chainBreakdown = data.map(row => ({
      chain: row.chain,
      volume: Number(row.total_volume),
      percentage: totalVolume > 0 ? (Number(row.total_volume) / totalVolume) * 100 : 0
    }));

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
  } catch (error) {
    console.error('Error fetching EVM chain breakdown:', error);
    throw error;
  }
}

// OPTIMIZED: EVM daily chain breakdown with date range
export async function getEVMDailyChainBreakdown(protocolName: string, timeframe: string = '30d', dataType?: string): Promise<Array<{
  date: string;
  formattedDay: string;
  chainData: Record<string, number>;
  totalVolume: number;
}>> {
  const effectiveDataType = dataType || 'public';
  const cacheKey = `evm_daily_breakdown_${protocolName}_${timeframe}_${effectiveDataType}`;
  const cachedData = insightsCache.get(cacheKey);

  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  // Calculate days based on timeframe
  let days: number;
  switch (timeframe) {
    case '7d': days = 7; break;
    case '30d': days = 30; break;
    case '90d': days = 90; break;
    case '6m': days = 180; break;
    case '1y': days = 365; break;
    default: days = 30;
  }

  try {
    // OPTIMIZED: Single query with date filter
    const data = await db.query<{ date: string; chain: string; volume_usd: number }>(
      `SELECT date, chain, volume_usd
       FROM protocol_stats
       WHERE protocol_name = ?
         AND chain IN ('ethereum', 'base', 'bsc', 'avax', 'polygon', 'arbitrum')
         AND data_type = ?
         AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date DESC`,
      [protocolName, effectiveDataType, days]
    );

    // Group by date
    const dailyData: Record<string, { date: string; chainData: Record<string, number>; totalVolume: number }> = {};

    data.forEach(row => {
      // Format MySQL Date object to string for consistent key lookup
      const dateKey = format(new Date(row.date), 'yyyy-MM-dd');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          chainData: {},
          totalVolume: 0
        };
      }
      const volume = Number(row.volume_usd) || 0;
      dailyData[dateKey].chainData[row.chain] = volume;
      dailyData[dateKey].totalVolume += volume;
    });

    const result = Object.values(dailyData)
      .map(item => ({
        ...item,
        formattedDay: formatDate(item.date)
      }))
      .filter(item => item.totalVolume > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    insightsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Error fetching EVM daily chain breakdown:', error);
    throw error;
  }
}

// OPTIMIZED: Daily metrics with single query
export async function getDailyMetrics(date: Date, dataType?: string): Promise<Record<Protocol, ProtocolMetrics>> {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const cacheKey = `${formattedDate}_${dataType || 'private'}`;

  const cachedData = dailyMetricsCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  try {
    // Check if requested date is the most recent date
    const latestDateResult = await db.queryOne<{ latest_date: string }>(
      `SELECT MAX(date) as latest_date FROM protocol_stats WHERE chain = 'solana' AND data_type = ?`,
      [dataType || 'private']
    );

    if (latestDateResult?.latest_date === formattedDate) {
      const emptyMetrics: Record<Protocol, ProtocolMetrics> = {} as Record<Protocol, ProtocolMetrics>;
      dailyMetricsCache.set(cacheKey, {
        data: emptyMetrics,
        timestamp: Date.now()
      });
      return emptyMetrics;
    }

    // OPTIMIZED: Single query for all protocols on the date
    const data = await db.query<any>(
      `SELECT protocol_name, volume_usd, daily_users, new_users, trades, fees_usd
       FROM protocol_stats
       WHERE date = ? AND chain = 'solana' AND data_type = ?`,
      [formattedDate, dataType || 'private']
    );

    const metrics: Record<Protocol, ProtocolMetrics> = {} as Record<Protocol, ProtocolMetrics>;

    data.forEach((row) => {
      metrics[row.protocol_name as Protocol] = {
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
  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    throw error;
  }
}

// OPTIMIZED: Aggregated stats with single query
export async function getAggregatedProtocolStats(dataType?: string) {
  const cacheKey = `all-protocols-aggregated_${dataType || 'private'}`;
  const cachedData = aggregatedStatsCache.get(cacheKey);

  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  console.log('Fetching aggregated protocol stats from database...');

  try {
    const protocols = getSolanaProtocols();

    // OPTIMIZED: Single query instead of pagination
    const data = await db.query<any>(
      `SELECT
         protocol_name,
         date,
         volume_usd,
         daily_users,
         new_users,
         trades,
         fees_usd
       FROM protocol_stats
       WHERE chain = 'solana'
         AND data_type = ?
         AND date < (SELECT MAX(date) FROM protocol_stats WHERE chain = 'solana' AND data_type = ?)
       ORDER BY date DESC`,
      [dataType || 'private', dataType || 'private']
    );

    if (!data || data.length === 0) {
      return [];
    }

    console.log(`Fetched ${data.length} records for aggregation`);

    // Group data by date
    const dataByDate = new Map();
    const allDates = new Set(data.map(item => item.date));

    // Initialize data structure for each date
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

    // Fill in actual values
    data.forEach(item => {
      const dateEntry = dataByDate.get(item.date);
      if (dateEntry) {
        const matchingProtocol = protocols.find(p => p.toLowerCase() === item.protocol_name.toLowerCase());
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

    const aggregatedData = Array.from(dataByDate.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`Aggregated data for ${aggregatedData.length} unique dates`);

    aggregatedStatsCache.set(cacheKey, {
      data: aggregatedData,
      timestamp: Date.now()
    });

    return aggregatedData;
  } catch (error) {
    console.error('Error fetching aggregated protocol stats:', error);
    throw error;
  }
}

// Generate weekly insights
export async function generateWeeklyInsights() {
  const cacheKey = 'weekly-insights';
  const cachedData = insightsCache.get(cacheKey);

  if (cachedData && isCacheValid(cachedData)) {
    return cachedData.data;
  }

  console.log('Generating weekly insights...');

  const allData = await getAggregatedProtocolStats();

  if (!allData || allData.length < 14) {
    console.log('Insufficient data for weekly insights');
    return [];
  }

  const sortedData = allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const last7Days = sortedData.slice(0, 7);
  const previous7Days = sortedData.slice(7, 14);

  const protocols = ["axiom", "banana", "bloom", "bonkbot", "bullx", "gmgnai", "maestro", "moonshot", "nova", "terminal", "photon", "soltradingbot", "trojanonsolana", "vector"];

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

  const insights = [];

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

  const trojan = weeklyStats.find(s => s.protocol === 'trojanonsolana');
  if (trojan) {
    const tradingBots = weeklyStats.filter(s => ['bullx', 'photon', 'trojanonsolana'].includes(s.protocol));
    const avgGrowth = tradingBots.reduce((sum, s) => sum + s.volume_change, 0) / tradingBots.length;

    insights.push({
      type: 'comparison',
      title: `Trojan ${trojan.volume_change > avgGrowth ? 'outperforms' : 'underperforms'} trading bot category`,
      description: `${trojan.volume_change.toFixed(1)}% vs ${avgGrowth.toFixed(1)}% category average`,
      impact: 'medium',
      protocols: ['trojanonsolana', 'bullx', 'photon'],
      confidence: 0.8
    });
  }

  console.log(`Generated ${insights.length} weekly insights`);

  const result = { stats: weeklyStats, insights };

  insightsCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}

// Get EVM protocol data for a specific date
export async function getEVMDailyData(protocol: string, dateStr: string, dataType?: string) {
  console.log(`Fetching EVM daily data for ${protocol} on ${dateStr}`);

  const evmChains = ['ethereum', 'base', 'bsc'];
  const effectiveDataType = dataType || 'public';

  try {
    // OPTIMIZED: Parallel queries using Promise.all
    const [dailyData, trendData, prevData] = await Promise.all([
      // Current day data
      db.query<any>(
        `SELECT chain, volume_usd, daily_users, new_users, trades, fees_usd
         FROM protocol_stats
         WHERE protocol_name = ? AND date = ? AND data_type = ? AND chain IN (?, ?, ?)`,
        [protocol, dateStr, effectiveDataType, ...evmChains]
      ),
      // 7-day trend data
      db.query<any>(
        `SELECT date, SUM(volume_usd) as volume_usd
         FROM protocol_stats
         WHERE protocol_name = ? AND data_type = ? AND chain IN (?, ?, ?)
           AND date >= DATE_SUB(?, INTERVAL 6 DAY) AND date <= ?
         GROUP BY date
         ORDER BY date ASC`,
        [protocol, effectiveDataType, ...evmChains, dateStr, dateStr]
      ),
      // Previous day data
      db.query<any>(
        `SELECT SUM(volume_usd) as total_volume
         FROM protocol_stats
         WHERE protocol_name = ? AND date = DATE_SUB(?, INTERVAL 1 DAY)
           AND data_type = ? AND chain IN (?, ?, ?)`,
        [protocol, dateStr, effectiveDataType, ...evmChains]
      )
    ]);

    // Process chain volumes
    const chainVolumes: Record<string, number> = { ethereum: 0, base: 0, bsc: 0 };
    let totalVolume = 0;

    dailyData.forEach(record => {
      const volume = Number(record.volume_usd) || 0;
      chainVolumes[record.chain] = volume;
      totalVolume += volume;
    });

    // Build weekly trend
    const trendByDate: Record<string, number> = {};
    trendData.forEach(record => {
      trendByDate[record.date] = Number(record.volume_usd) || 0;
    });

    const weeklyTrend: number[] = [];
    const endDate = new Date(dateStr);
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateKey = format(date, 'yyyy-MM-dd');
      weeklyTrend.push(trendByDate[dateKey] || 0);
    }

    // Calculate growth
    const prevTotalVolume = Number(prevData[0]?.total_volume) || 0;
    let dailyGrowth = 0;
    if (prevTotalVolume > 0) {
      dailyGrowth = (totalVolume - prevTotalVolume) / prevTotalVolume;
    }

    return {
      totalVolume,
      chainVolumes,
      dailyGrowth,
      weeklyTrend
    };
  } catch (error) {
    console.error(`Error fetching EVM daily data for ${protocol}:`, error);
    throw error;
  }
}

// OPTIMIZED: Solana daily metrics with parallel queries
export async function getSolanaDailyMetrics(date: Date, dataType: string = 'private') {
  const cacheKey = `solana_daily_metrics_${format(date, 'yyyy-MM-dd')}_${dataType}`;

  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  try {
    const dateStr = format(date, 'yyyy-MM-dd');
    const previousDateStr = format(new Date(date.getTime() - 86400000), 'yyyy-MM-dd');
    const startDateStr = format(new Date(date.getTime() - 6 * 86400000), 'yyyy-MM-dd');

    const solanaProtocols = getSolanaProtocols();
    const mobileAppProtocols = ['moonshot', 'vector', 'slingshot', 'fomo'];

    // OPTIMIZED: Parallel queries
    const [currentDayData, previousDayData, trendData, projectedData, previousProjectedData, projectedTrendData] = await Promise.all([
      db.query<any>(
        `SELECT protocol_name, volume_usd, daily_users, new_users, trades, fees_usd
         FROM protocol_stats
         WHERE date = ? AND data_type = ? AND chain = 'solana'`,
        [dateStr, dataType]
      ),
      db.query<any>(
        `SELECT protocol_name, volume_usd
         FROM protocol_stats
         WHERE date = ? AND data_type = ? AND chain = 'solana'`,
        [previousDateStr, dataType]
      ),
      db.query<any>(
        `SELECT protocol_name, date, volume_usd
         FROM protocol_stats
         WHERE date >= ? AND date <= ? AND data_type = ? AND chain = 'solana'
         ORDER BY date ASC`,
        [startDateStr, dateStr, dataType]
      ),
      db.query<any>(
        `SELECT protocol_name, volume_usd, fees_usd
         FROM projected_stats
         WHERE formatted_day = ?`,
        [dateStr]
      ),
      db.query<any>(
        `SELECT protocol_name, volume_usd
         FROM projected_stats
         WHERE formatted_day = ?`,
        [previousDateStr]
      ),
      db.query<any>(
        `SELECT protocol_name, formatted_day, volume_usd
         FROM projected_stats
         WHERE formatted_day >= ? AND formatted_day <= ?`,
        [startDateStr, dateStr]
      )
    ]);

    // Initialize protocol data
    const protocolData: Record<string, any> = {};
    solanaProtocols.forEach(protocol => {
      protocolData[protocol] = {
        totalVolume: 0,
        dailyUsers: 0,
        newUsers: 0,
        trades: 0,
        fees: 0,
        dailyGrowth: 0,
        weeklyTrend: Array(7).fill(0),
        marketShare: 0,
        projectedVolume: 0,
        projectedFees: 0,
        adjustedVolume: 0
      };
    });

    // Process current day data
    currentDayData.forEach(record => {
      const protocol = record.protocol_name;
      if (!protocolData[protocol]) {
        protocolData[protocol] = {
          totalVolume: 0, dailyUsers: 0, newUsers: 0, trades: 0, fees: 0,
          dailyGrowth: 0, weeklyTrend: Array(7).fill(0), marketShare: 0,
          projectedVolume: 0, projectedFees: 0, adjustedVolume: 0
        };
      }
      protocolData[protocol].totalVolume = Number(record.volume_usd) || 0;
      protocolData[protocol].dailyUsers = Number(record.daily_users) || 0;
      protocolData[protocol].newUsers = Number(record.new_users) || 0;
      protocolData[protocol].trades = Number(record.trades) || 0;
      protocolData[protocol].fees = Number(record.fees_usd) || 0;
    });

    // Process projected data
    projectedData.forEach(record => {
      const protocol = record.protocol_name;
      if (protocolData[protocol]) {
        protocolData[protocol].projectedVolume = Number(record.volume_usd) || 0;
        protocolData[protocol].projectedFees = Number(record.fees_usd) || 0;
      }
    });

    // Mobile apps use actual volume
    mobileAppProtocols.forEach(protocol => {
      if (protocolData[protocol]) {
        protocolData[protocol].projectedVolume = protocolData[protocol].totalVolume;
      }
    });

    // Calculate growth using projected volume
    const previousProjectedMap = new Map(previousProjectedData.map((r: any) => [r.protocol_name, Number(r.volume_usd) || 0]));
    const previousVolumeMap = new Map(previousDayData.map(r => [r.protocol_name, Number(r.volume_usd) || 0]));

    Object.keys(protocolData).forEach(protocol => {
      const previousProjected = previousProjectedMap.get(protocol) || 0;
      if (previousProjected > 0 && protocolData[protocol].projectedVolume > 0) {
        protocolData[protocol].dailyGrowth = (protocolData[protocol].projectedVolume - previousProjected) / previousProjected;
      } else {
        const previousVolume = previousVolumeMap.get(protocol) || 0;
        if (previousVolume > 0 && protocolData[protocol].totalVolume > 0) {
          protocolData[protocol].dailyGrowth = (protocolData[protocol].totalVolume - previousVolume) / previousVolume;
        }
      }
    });

    // Build weekly trends
    const projectedTrendByProtocolDate: Record<string, Record<string, number>> = {};
    projectedTrendData.forEach((record: any) => {
      if (!projectedTrendByProtocolDate[record.protocol_name]) {
        projectedTrendByProtocolDate[record.protocol_name] = {};
      }
      // Format date to string to ensure consistent key matching
      const formattedDayKey = record.formatted_day instanceof Date
        ? format(record.formatted_day, 'yyyy-MM-dd')
        : record.formatted_day;
      projectedTrendByProtocolDate[record.protocol_name][formattedDayKey] = Number(record.volume_usd) || 0;
    });

    const actualTrendByProtocolDate: Record<string, Record<string, number>> = {};
    trendData.forEach(record => {
      if (!actualTrendByProtocolDate[record.protocol_name]) {
        actualTrendByProtocolDate[record.protocol_name] = {};
      }
      // Format date to string to ensure consistent key matching
      const dateKey = record.date instanceof Date
        ? format(record.date, 'yyyy-MM-dd')
        : record.date;
      actualTrendByProtocolDate[record.protocol_name][dateKey] = Number(record.volume_usd) || 0;
    });

    Object.keys(protocolData).forEach(protocol => {
      const weeklyTrend: number[] = [];
      let hasProjectedData = false;

      for (let i = 6; i >= 0; i--) {
        const trendDate = new Date(date);
        trendDate.setDate(trendDate.getDate() - i);
        const trendDateStr = format(trendDate, 'yyyy-MM-dd');

        const projectedVolume = projectedTrendByProtocolDate[protocol]?.[trendDateStr] || 0;
        if (projectedVolume > 0) hasProjectedData = true;
        weeklyTrend.push(projectedVolume || actualTrendByProtocolDate[protocol]?.[trendDateStr] || 0);
      }

      protocolData[protocol].weeklyTrend = weeklyTrend;
    });

    // Calculate totals
    const totalVolume = Object.values(protocolData).reduce((sum, data: any) => {
      const adjustedVolume = data.projectedVolume > 0 ? data.projectedVolume : data.totalVolume;
      return sum + adjustedVolume;
    }, 0);
    const totalUsers = Object.values(protocolData).reduce((sum, data: any) => sum + data.dailyUsers, 0);
    const totalNewUsers = Object.values(protocolData).reduce((sum, data: any) => sum + data.newUsers, 0);
    const totalTrades = Object.values(protocolData).reduce((sum, data: any) => sum + data.trades, 0);
    const totalFees = Object.values(protocolData).reduce((sum, data: any) => sum + data.fees, 0);

    // Calculate total growth
    let totalGrowth = 0;
    const previousTotalProjected = previousProjectedData.reduce((sum: number, r: any) => sum + (Number(r.volume_usd) || 0), 0);
    if (previousTotalProjected > 0) {
      totalGrowth = (totalVolume - previousTotalProjected) / previousTotalProjected;
    }

    // Total weekly trend
    const totalWeeklyTrend = Array(7).fill(0);
    Object.values(protocolData).forEach((data: any) => {
      data.weeklyTrend.forEach((value: number, index: number) => {
        totalWeeklyTrend[index] += value;
      });
    });

    // Top protocols
    const topProtocols = Object.entries(protocolData)
      .filter(([_, data]: [string, any]) => {
        const adjustedVolume = data.projectedVolume > 0 ? data.projectedVolume : data.totalVolume;
        return adjustedVolume > 0;
      })
      .sort(([_, a]: [string, any], [__, b]: [string, any]) => {
        const adjustedVolumeA = a.projectedVolume > 0 ? a.projectedVolume : a.totalVolume;
        const adjustedVolumeB = b.projectedVolume > 0 ? b.projectedVolume : b.totalVolume;
        return adjustedVolumeB - adjustedVolumeA;
      })
      .slice(0, 3)
      .map(([protocol, _]) => protocol);

    // Calculate market share
    Object.keys(protocolData).forEach(protocol => {
      const adjustedVolume = protocolData[protocol].projectedVolume > 0
        ? protocolData[protocol].projectedVolume
        : protocolData[protocol].totalVolume;
      protocolData[protocol].adjustedVolume = adjustedVolume;
      protocolData[protocol].marketShare = totalVolume > 0 ? adjustedVolume / totalVolume : 0;
    });

    const result = {
      date: dateStr,
      protocols: protocolData,
      topProtocols,
      totals: {
        totalVolume,
        totalUsers,
        totalNewUsers,
        totalTrades,
        totalFees,
        totalGrowth,
        totalWeeklyTrend
      }
    };

    insightsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Error fetching Solana daily metrics:', error);
    throw error;
  }
}

// Helper function for currency formatting
function formatCurrencyShort(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

// OPTIMIZED: Solana daily highlights
export async function getSolanaDailyHighlights(date: Date, dataType: string = 'private') {
  const cacheKey = `solana_daily_highlights_${format(date, 'yyyy-MM-dd')}_${dataType}`;

  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  try {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startDate30d = new Date(date);
    startDate30d.setDate(startDate30d.getDate() - 30);

    const solanaProtocols = getSolanaProtocols();

    // OPTIMIZED: Single query for 30 days of historical data
    const historicalData = await db.query<any>(
      `SELECT protocol_name, date, volume_usd, daily_users, new_users, trades, fees_usd
       FROM protocol_stats
       WHERE date >= ? AND date <= ?
         AND data_type = ? AND chain = 'solana'
       ORDER BY date ASC`,
      [format(startDate30d, 'yyyy-MM-dd'), dateStr, dataType]
    );

    // Process data
    const protocolData: Record<string, any> = {};
    const dataByDate: Record<string, Record<string, any>> = {};

    solanaProtocols.forEach(protocol => {
      protocolData[protocol] = {
        current: null,
        yesterday: null,
        historical7d: [],
        historical30d: [],
        trends: {
          volume1d: 0, volume7d: 0, volume30d: 0,
          users1d: 0, users7d: 0, trades1d: 0, consistency: 0
        }
      };
    });

    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    const startDate7d = new Date(date);
    startDate7d.setDate(startDate7d.getDate() - 7);

    historicalData.forEach((record: any) => {
      const protocol = record.protocol_name;
      const recordDate = record.date;

      if (!dataByDate[recordDate]) {
        dataByDate[recordDate] = {};
      }

      const processedRecord = {
        total_volume_usd: Number(record.volume_usd) || 0,
        daily_users: Number(record.daily_users) || 0,
        numberOfNewUsers: Number(record.new_users) || 0,
        daily_trades: Number(record.trades) || 0,
        total_fees_usd: Number(record.fees_usd) || 0
      };

      dataByDate[recordDate][protocol] = processedRecord;

      if (protocolData[protocol]) {
        if (recordDate === dateStr) {
          protocolData[protocol].current = processedRecord;
        } else if (recordDate === yesterdayStr) {
          protocolData[protocol].yesterday = processedRecord;
        }

        const recordDateObj = new Date(recordDate);
        if (recordDateObj >= startDate7d && recordDateObj < date) {
          protocolData[protocol].historical7d.push(processedRecord);
        }
        if (recordDateObj >= startDate30d && recordDateObj < date) {
          protocolData[protocol].historical30d.push(processedRecord);
        }
      }
    });

    // Calculate trends
    Object.keys(protocolData).forEach(protocol => {
      const data = protocolData[protocol];
      const current = data.current;
      const yesterday = data.yesterday;

      if (!current || current.total_volume_usd === 0) return;

      if (yesterday && yesterday.total_volume_usd > 0) {
        data.trends.volume1d = (current.total_volume_usd - yesterday.total_volume_usd) / yesterday.total_volume_usd;
        data.trends.users1d = yesterday.daily_users > 0 ? (current.daily_users - yesterday.daily_users) / yesterday.daily_users : 0;
        data.trends.trades1d = yesterday.daily_trades > 0 ? (current.daily_trades - yesterday.daily_trades) / yesterday.daily_trades : 0;
      }

      if (data.historical7d.length > 0) {
        const avg7dVolume = data.historical7d.reduce((sum: number, d: any) => sum + d.total_volume_usd, 0) / data.historical7d.length;
        data.trends.volume7d = avg7dVolume > 0 ? (current.total_volume_usd - avg7dVolume) / avg7dVolume : 0;

        const avg7dUsers = data.historical7d.reduce((sum: number, d: any) => sum + d.daily_users, 0) / data.historical7d.length;
        data.trends.users7d = avg7dUsers > 0 ? (current.daily_users - avg7dUsers) / avg7dUsers : 0;

        const volumeVariance = data.historical7d.length > 1 ?
          data.historical7d.reduce((sum: number, d: any) => sum + Math.pow(d.total_volume_usd - avg7dVolume, 2), 0) / data.historical7d.length : 0;
        const coefficientOfVariation = avg7dVolume > 0 ? Math.sqrt(volumeVariance) / avg7dVolume : 1;
        data.trends.consistency = avg7dVolume * (1 / (1 + coefficientOfVariation));
      }

      if (data.historical30d.length > 0) {
        const avg30dVolume = data.historical30d.reduce((sum: number, d: any) => sum + d.total_volume_usd, 0) / data.historical30d.length;
        data.trends.volume30d = avg30dVolume > 0 ? (current.total_volume_usd - avg30dVolume) / avg30dVolume : 0;
      }
    });

    // Generate insights
    const performances = Object.entries(protocolData)
      .filter(([_, data]: [string, any]) => data.current && data.current.total_volume_usd > 0)
      .map(([protocol, data]: [string, any]) => ({
        protocol,
        current: data.current,
        trends: data.trends,
        historical7d: data.historical7d,
        historical30d: data.historical30d
      }));

    const totalVolume = performances.reduce((sum, p) => sum + p.current.total_volume_usd, 0);
    const totalUsers = performances.reduce((sum, p) => sum + p.current.daily_users, 0);
    const totalTrades = performances.reduce((sum, p) => sum + p.current.daily_trades, 0);
    const totalNewUsers = performances.reduce((sum, p) => sum + p.current.numberOfNewUsers, 0);

    const insights = [];

    if (performances.length > 0) {
      const topByVolume = performances.reduce((best, current) =>
        current.current.total_volume_usd > best.current.total_volume_usd ? current : best
      );

      insights.push({
        type: 'success',
        title: 'Volume Leader',
        description: `Dominates with $${formatCurrencyShort(topByVolume.current.total_volume_usd)} in daily volume`,
        protocol: topByVolume.protocol,
        value: formatCurrencyShort(topByVolume.current.total_volume_usd),
        trend: topByVolume.trends.volume1d
      });
    }

    const gainers = performances.filter(p => p.trends.volume1d > 0.05);
    if (gainers.length > 0) {
      const biggestGainer = gainers.reduce((best, current) =>
        current.trends.volume1d > best.trends.volume1d ? current : best
      );

      insights.push({
        type: 'success',
        title: 'Breakout Performance',
        description: `Surged ${(biggestGainer.trends.volume1d * 100).toFixed(1)}% in volume from yesterday`,
        protocol: biggestGainer.protocol,
        trend: biggestGainer.trends.volume1d
      });
    }

    const result = {
      date: dateStr,
      insights: insights.slice(0, 4),
      marketTotals: {
        totalVolume,
        totalUsers,
        totalTrades,
        totalNewUsers,
        avgTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0
      },
      topProtocols: performances
        .sort((a, b) => b.current.total_volume_usd - a.current.total_volume_usd)
        .slice(0, 5)
        .map(p => p.protocol)
    };

    insightsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Error fetching Solana daily highlights:', error);
    throw error;
  }
}

// OPTIMIZED: EVM daily metrics with parallel queries
export async function getEVMDailyMetrics(date: Date, dataType: string = 'public') {
  const cacheKey = `evm_daily_metrics_${format(date, 'yyyy-MM-dd')}_${dataType}`;

  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  try {
    const dateStr = format(date, 'yyyy-MM-dd');
    const previousDateStr = format(new Date(date.getTime() - 86400000), 'yyyy-MM-dd');
    const startDateStr = format(new Date(date.getTime() - 6 * 86400000), 'yyyy-MM-dd');

    const evmProtocols = getEVMProtocols();
    const evmChains = ['ethereum', 'base', 'bsc', 'avax', 'arbitrum'];

    // Build protocol placeholders for SQL IN clause
    const protocolPlaceholders = evmProtocols.map(() => '?').join(',');

    // OPTIMIZED: Parallel queries - filter by both chain AND protocol name
    const [currentDayData, previousDayData, trendData] = await Promise.all([
      db.query<any>(
        `SELECT protocol_name, chain, volume_usd, daily_users, new_users, trades, fees_usd
         FROM protocol_stats
         WHERE date = ? AND data_type = ? AND chain IN (?, ?, ?, ?, ?) AND protocol_name IN (${protocolPlaceholders})`,
        [dateStr, dataType, ...evmChains, ...evmProtocols]
      ),
      db.query<any>(
        `SELECT protocol_name, chain, volume_usd
         FROM protocol_stats
         WHERE date = ? AND data_type = ? AND chain IN (?, ?, ?, ?, ?) AND protocol_name IN (${protocolPlaceholders})`,
        [previousDateStr, dataType, ...evmChains, ...evmProtocols]
      ),
      db.query<any>(
        `SELECT protocol_name, date, SUM(volume_usd) as volume_usd
         FROM protocol_stats
         WHERE date >= ? AND date <= ? AND data_type = ? AND chain IN (?, ?, ?, ?, ?) AND protocol_name IN (${protocolPlaceholders})
         GROUP BY protocol_name, date
         ORDER BY date ASC`,
        [startDateStr, dateStr, dataType, ...evmChains, ...evmProtocols]
      )
    ]);

    // Initialize protocol data
    const protocolData: Record<string, any> = {};
    evmProtocols.forEach(protocol => {
      protocolData[protocol] = {
        totalVolume: 0,
        chainVolumes: { ethereum: 0, base: 0, bsc: 0, avax: 0, arbitrum: 0 },
        dailyGrowth: 0,
        weeklyTrend: Array(7).fill(0)
      };
    });

    // Process current day data
    currentDayData.forEach((record: any) => {
      const protocol = record.protocol_name;
      const chain = record.chain;
      const volume = Number(record.volume_usd) || 0;

      if (!protocolData[protocol]) {
        protocolData[protocol] = {
          totalVolume: 0,
          chainVolumes: { ethereum: 0, base: 0, bsc: 0, avax: 0, arbitrum: 0 },
          dailyGrowth: 0,
          weeklyTrend: Array(7).fill(0)
        };
      }

      protocolData[protocol].chainVolumes[chain] = volume;
      protocolData[protocol].totalVolume += volume;
    });

    // Calculate growth
    const previousVolumes: Record<string, number> = {};
    previousDayData.forEach((record: any) => {
      previousVolumes[record.protocol_name] = (previousVolumes[record.protocol_name] || 0) + (Number(record.volume_usd) || 0);
    });

    Object.keys(protocolData).forEach(protocol => {
      const currentVolume = protocolData[protocol].totalVolume;
      const previousVolume = previousVolumes[protocol] || 0;
      if (previousVolume > 0) {
        protocolData[protocol].dailyGrowth = (currentVolume - previousVolume) / previousVolume;
      }
    });

    // Build trends
    const trendByProtocolDate: Record<string, Record<string, number>> = {};
    trendData.forEach((record: any) => {
      if (!trendByProtocolDate[record.protocol_name]) {
        trendByProtocolDate[record.protocol_name] = {};
      }
      // Format date to string for consistent key lookup (MySQL returns Date objects)
      const dateKey = format(new Date(record.date), 'yyyy-MM-dd');
      trendByProtocolDate[record.protocol_name][dateKey] = Number(record.volume_usd) || 0;
    });

    Object.keys(protocolData).forEach(protocol => {
      const weeklyTrend: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const trendDate = new Date(date);
        trendDate.setDate(trendDate.getDate() - i);
        const trendDateStr = format(trendDate, 'yyyy-MM-dd');
        weeklyTrend.push(trendByProtocolDate[protocol]?.[trendDateStr] || 0);
      }
      protocolData[protocol].weeklyTrend = weeklyTrend;
    });

    // Calculate totals
    const totalVolume = Object.values(protocolData).reduce((sum, data: any) => sum + data.totalVolume, 0);
    const allChainVolumes: Record<string, number> = { ethereum: 0, base: 0, bsc: 0, avax: 0, arbitrum: 0 };
    Object.values(protocolData).forEach((data: any) => {
      Object.entries(data.chainVolumes).forEach(([chain, volume]) => {
        allChainVolumes[chain] = (allChainVolumes[chain] || 0) + (volume as number);
      });
    });

    let totalGrowth = 0;
    const previousTotalVolume = previousDayData.reduce((sum: number, r: any) => sum + (Number(r.volume_usd) || 0), 0);
    if (previousTotalVolume > 0) {
      totalGrowth = (totalVolume - previousTotalVolume) / previousTotalVolume;
    }

    const totalWeeklyTrend = Array(7).fill(0);
    Object.values(protocolData).forEach((data: any) => {
      data.weeklyTrend.forEach((value: number, index: number) => {
        totalWeeklyTrend[index] += value;
      });
    });

    // Filter out protocols with no data
    const protocolsWithData = Object.fromEntries(
      Object.entries(protocolData).filter(([_, data]: [string, any]) => data.totalVolume > 0)
    );

    const topProtocols = Object.entries(protocolsWithData)
      .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.totalVolume - a.totalVolume)
      .slice(0, 3)
      .map(([protocol, _]) => protocol);

    const result = {
      date: dateStr,
      protocols: protocolsWithData,
      standaloneChains: { avax: allChainVolumes.avax, arbitrum: allChainVolumes.arbitrum },
      topProtocols,
      totals: {
        totalVolume,
        chainTotals: allChainVolumes,
        totalGrowth,
        totalWeeklyTrend
      }
    };

    insightsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Error fetching EVM daily metrics:', error);
    throw error;
  }
}

// OPTIMIZED: Monad daily metrics
export async function getMonadDailyMetrics(date: Date, dataType: string = 'private') {
  const cacheKey = `monad_daily_metrics_${format(date, 'yyyy-MM-dd')}_${dataType}`;

  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  try {
    const dateStr = format(date, 'yyyy-MM-dd');
    const previousDateStr = format(new Date(date.getTime() - 86400000), 'yyyy-MM-dd');
    const startDateStr = format(new Date(date.getTime() - 6 * 86400000), 'yyyy-MM-dd');

    const monadProtocols = getMonadProtocols();

    // OPTIMIZED: Parallel queries
    const [currentDayData, previousDayData, trendData, lifetimeData] = await Promise.all([
      db.query<any>(
        `SELECT protocol_name, volume_usd, daily_users, new_users, trades, fees_usd
         FROM protocol_stats
         WHERE date = ? AND data_type = ? AND chain = 'monad'`,
        [dateStr, dataType]
      ),
      db.query<any>(
        `SELECT protocol_name, volume_usd
         FROM protocol_stats
         WHERE date = ? AND data_type = ? AND chain = 'monad'`,
        [previousDateStr, dataType]
      ),
      db.query<any>(
        `SELECT protocol_name, date, volume_usd
         FROM protocol_stats
         WHERE date >= ? AND date <= ? AND data_type = ? AND chain = 'monad'
         ORDER BY date ASC`,
        [startDateStr, dateStr, dataType]
      ),
      db.query<any>(
        `SELECT protocol_name, SUM(volume_usd) as lifetime_volume
         FROM protocol_stats
         WHERE data_type = ? AND chain = 'monad'
         GROUP BY protocol_name`,
        [dataType]
      )
    ]);

    // Lifetime volume map
    const lifetimeVolumeByProtocol: Record<string, number> = {};
    lifetimeData.forEach((record: any) => {
      lifetimeVolumeByProtocol[record.protocol_name] = Number(record.lifetime_volume) || 0;
    });

    // Initialize protocol data
    const protocolData: Record<string, any> = {};
    monadProtocols.forEach(protocol => {
      protocolData[protocol] = {
        totalVolume: 0,
        dailyUsers: 0,
        newUsers: 0,
        trades: 0,
        fees: 0,
        dailyGrowth: 0,
        weeklyTrend: Array(7).fill(0),
        marketShare: 0,
        lifetimeVolume: lifetimeVolumeByProtocol[protocol] || 0
      };
    });

    // Process current day data
    currentDayData.forEach((record: any) => {
      const protocol = record.protocol_name;
      if (!protocolData[protocol]) {
        protocolData[protocol] = {
          totalVolume: 0, dailyUsers: 0, newUsers: 0, trades: 0, fees: 0,
          dailyGrowth: 0, weeklyTrend: Array(7).fill(0), marketShare: 0,
          lifetimeVolume: lifetimeVolumeByProtocol[protocol] || 0
        };
      }
      protocolData[protocol].totalVolume = Number(record.volume_usd) || 0;
      protocolData[protocol].dailyUsers = Number(record.daily_users) || 0;
      protocolData[protocol].newUsers = Number(record.new_users) || 0;
      protocolData[protocol].trades = Number(record.trades) || 0;
      protocolData[protocol].fees = Number(record.fees_usd) || 0;
    });

    // Calculate growth
    previousDayData.forEach((record: any) => {
      const protocol = record.protocol_name;
      const previousVolume = Number(record.volume_usd) || 0;
      if (protocolData[protocol] && previousVolume > 0) {
        protocolData[protocol].dailyGrowth = (protocolData[protocol].totalVolume - previousVolume) / previousVolume;
      }
    });

    // Build trends
    const trendByProtocolDate: Record<string, Record<string, number>> = {};
    trendData.forEach((record: any) => {
      if (!trendByProtocolDate[record.protocol_name]) {
        trendByProtocolDate[record.protocol_name] = {};
      }
      // Format date to string for consistent key lookup (MySQL returns Date objects)
      const dateKey = format(new Date(record.date), 'yyyy-MM-dd');
      trendByProtocolDate[record.protocol_name][dateKey] = Number(record.volume_usd) || 0;
    });

    Object.keys(protocolData).forEach(protocol => {
      const weeklyTrend: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const trendDate = new Date(date);
        trendDate.setDate(trendDate.getDate() - i);
        const trendDateStr = format(trendDate, 'yyyy-MM-dd');
        weeklyTrend.push(trendByProtocolDate[protocol]?.[trendDateStr] || 0);
      }
      protocolData[protocol].weeklyTrend = weeklyTrend;
    });

    // Calculate totals
    const totalVolume = Object.values(protocolData).reduce((sum, data: any) => sum + data.totalVolume, 0);
    const totalUsers = Object.values(protocolData).reduce((sum, data: any) => sum + data.dailyUsers, 0);
    const totalNewUsers = Object.values(protocolData).reduce((sum, data: any) => sum + data.newUsers, 0);
    const totalTrades = Object.values(protocolData).reduce((sum, data: any) => sum + data.trades, 0);
    const totalFees = Object.values(protocolData).reduce((sum, data: any) => sum + data.fees, 0);
    const totalLifetimeVolume = Object.values(protocolData).reduce((sum, data: any) => sum + data.lifetimeVolume, 0);

    let totalGrowth = 0;
    const previousTotalVolume = previousDayData.reduce((sum: number, r: any) => sum + (Number(r.volume_usd) || 0), 0);
    if (previousTotalVolume > 0) {
      totalGrowth = (totalVolume - previousTotalVolume) / previousTotalVolume;
    }

    const totalWeeklyTrend = Array(7).fill(0);
    Object.values(protocolData).forEach((data: any) => {
      data.weeklyTrend.forEach((value: number, index: number) => {
        totalWeeklyTrend[index] += value;
      });
    });

    const topProtocols = Object.entries(protocolData)
      .filter(([_, data]: [string, any]) => data.totalVolume > 0)
      .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.totalVolume - a.totalVolume)
      .slice(0, 3)
      .map(([protocol, _]) => protocol);

    // Calculate market share
    Object.keys(protocolData).forEach(protocol => {
      protocolData[protocol].marketShare = totalVolume > 0 ? protocolData[protocol].totalVolume / totalVolume : 0;
    });

    const result = {
      date: dateStr,
      protocols: protocolData,
      topProtocols,
      totals: {
        totalVolume,
        totalUsers,
        totalNewUsers,
        totalTrades,
        totalFees,
        totalGrowth,
        totalWeeklyTrend,
        totalLifetimeVolume
      }
    };

    insightsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Error fetching Monad daily metrics:', error);
    throw error;
  }
}

// OPTIMIZED: Solana monthly metrics
export async function getSolanaMonthlyMetrics(endDate: Date, dataType: string = 'private') {
  const cacheKey = `solana_monthly_metrics_${format(endDate, 'yyyy-MM')}_${dataType}`;

  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  try {
    const currentMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const currentMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
    const previousMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
    const previousMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);

    // OPTIMIZED: Parallel queries for current and previous month
    const [currentData, previousData] = await Promise.all([
      db.query<any>(
        `SELECT protocol_name, SUM(volume_usd) as volume_usd, SUM(new_users) as new_users,
                SUM(trades) as trades, SUM(fees_usd) as fees_usd
         FROM protocol_stats
         WHERE data_type = ? AND chain = 'solana'
           AND date >= ? AND date <= ?
         GROUP BY protocol_name`,
        [dataType, format(currentMonthStart, 'yyyy-MM-dd'), format(currentMonthEnd, 'yyyy-MM-dd')]
      ),
      db.query<any>(
        `SELECT protocol_name, SUM(volume_usd) as volume_usd, SUM(new_users) as new_users,
                SUM(trades) as trades, SUM(fees_usd) as fees_usd
         FROM protocol_stats
         WHERE data_type = ? AND chain = 'solana'
           AND date >= ? AND date <= ?
         GROUP BY protocol_name`,
        [dataType, format(previousMonthStart, 'yyyy-MM-dd'), format(previousMonthEnd, 'yyyy-MM-dd')]
      )
    ]);

    // Build maps
    const currentMap = new Map(currentData.map((r: any) => [r.protocol_name, r]));
    const previousMap = new Map(previousData.map((r: any) => [r.protocol_name, r]));

    const protocols = getSolanaProtocols();
    const protocolData: Record<string, any> = {};

    protocols.forEach(protocol => {
      const current = currentMap.get(protocol);
      const previous = previousMap.get(protocol);

      const currentVolume = Number(current?.volume_usd) || 0;
      const previousVolume = Number(previous?.volume_usd) || 0;

      protocolData[protocol] = {
        volume: currentVolume,
        newUsers: Number(current?.new_users) || 0,
        trades: Number(current?.trades) || 0,
        fees: Number(current?.fees_usd) || 0,
        previousVolume,
        growth: previousVolume > 0 ? (currentVolume - previousVolume) / previousVolume : 0
      };
    });

    const totalVolume = Object.values(protocolData).reduce((sum, d: any) => sum + d.volume, 0);
    const totalPreviousVolume = Object.values(protocolData).reduce((sum, d: any) => sum + d.previousVolume, 0);

    const result = {
      month: format(endDate, 'yyyy-MM'),
      protocols: protocolData,
      totals: {
        totalVolume,
        totalPreviousVolume,
        totalGrowth: totalPreviousVolume > 0 ? (totalVolume - totalPreviousVolume) / totalPreviousVolume : 0
      }
    };

    insightsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Error fetching Solana monthly metrics:', error);
    throw error;
  }
}

/**
 * Get latest data dates for all protocols
 * OPTIMIZED: Uses GROUP BY with MAX() instead of fetching all rows
 */
export async function getLatestDataDates(dataType?: string): Promise<{
  protocol_name: string;
  latest_date: string;
  is_current: boolean;
  days_behind: number;
  chain: string;
}[]> {
  try {
    // OPTIMIZED: Single query with GROUP BY and MAX to get latest date per protocol/chain
    let sql = `
      SELECT protocol_name, chain, data_type, MAX(date) as latest_date
      FROM protocol_stats
      ${dataType ? 'WHERE data_type = ?' : ''}
      GROUP BY protocol_name, chain, data_type
      ORDER BY latest_date DESC
    `;
    const params = dataType ? [dataType] : [];

    const data = await db.query<any>(sql, params);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Group by protocol and chain
    const protocolLatestDates = new Map<string, { date: string; chain: string }>();

    data.forEach((row: any) => {
      const protocol = row.protocol_name;
      const dateStr = typeof row.latest_date === 'string' ? row.latest_date : format(new Date(row.latest_date), 'yyyy-MM-dd');
      const chain = row.chain;
      const recordDataType = row.data_type;

      const normalizedProtocol = protocol.endsWith('_evm') ? protocol.slice(0, -4) : protocol;
      const key = chain === 'solana' ? normalizedProtocol : `${normalizedProtocol}_evm`;

      if (dataType && recordDataType !== dataType) return;

      if (!dataType) {
        const expectedDataType = (chain === 'solana' || chain === 'monad') ? 'private' : 'public';
        if (recordDataType !== expectedDataType) return;
      }

      if (!protocolLatestDates.has(key) || dateStr > protocolLatestDates.get(key)!.date) {
        protocolLatestDates.set(key, { date: dateStr, chain: chain === 'solana' ? 'solana' : 'evm' });
      }
    });

    const result = Array.from(protocolLatestDates.entries()).map(([key, { date: latestDate, chain }]) => {
      const daysBehind = Math.floor((today.getTime() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24));
      const isCurrent = latestDate === todayStr || daysBehind <= 1;
      const protocolName = key.endsWith('_evm') ? key.slice(0, -4) : key;

      return {
        protocol_name: protocolName,
        latest_date: latestDate,
        is_current: isCurrent,
        days_behind: Math.max(0, daysBehind),
        chain: chain
      };
    });

    result.sort((a, b) => b.days_behind - a.days_behind);
    return result;
  } catch (error) {
    console.error('Error fetching latest data dates:', error);
    throw error;
  }
}

/**
 * Get cumulative volume for a protocol from inception to a specific end date
 * OPTIMIZED: Uses SUM() in SQL instead of fetching all rows
 */
export async function getCumulativeVolume(protocolName: string, endDate: Date, dataType: string = 'private'): Promise<number> {
  try {
    const endDateStr = endDate.toISOString().split('T')[0];
    console.log(`Getting cumulative volume for ${protocolName} up to ${endDateStr} with data type: ${dataType}`);

    // OPTIMIZED: Single SQL SUM query instead of fetching all rows
    const result = await db.queryOne<{ total_volume: number | null }>(
      `SELECT SUM(volume_usd) as total_volume
       FROM protocol_stats
       WHERE protocol_name = ?
         AND data_type = ?
         AND date <= ?
         AND volume_usd IS NOT NULL`,
      [protocolName, dataType, endDateStr]
    );

    const cumulativeVolume = result?.total_volume || 0;
    console.log(`Cumulative volume for ${protocolName} up to ${endDateStr}: $${cumulativeVolume.toLocaleString()}`);

    return cumulativeVolume;
  } catch (error) {
    console.error(`Error getting cumulative volume for ${protocolName}:`, error);
    throw error;
  }
}

/**
 * Get cumulative new users for a protocol from inception to a specific end date
 */
export async function getCumulativeUsers(protocolName: string, endDate: Date, dataType: string = 'private'): Promise<number> {
  try {
    const endDateStr = endDate.toISOString().split('T')[0];

    const result = await db.queryOne<{ total_users: number | null }>(
      `SELECT SUM(new_users) as total_users
       FROM protocol_stats
       WHERE protocol_name = ?
         AND data_type = ?
         AND date <= ?
         AND new_users IS NOT NULL`,
      [protocolName, dataType, endDateStr]
    );

    return result?.total_users || 0;
  } catch (error) {
    console.error(`Error getting cumulative users for ${protocolName}:`, error);
    throw error;
  }
}

/**
 * Get user milestone data for a protocol - when they reached 1M, 2M, 3M users etc.
 */
export async function getUserMilestones(protocolName: string, dataType: string = 'public'): Promise<{
  milestones: Array<{
    milestone: number;
    milestoneLabel: string;
    dateReached: string | null;
    daysFromStart: number | null;
    daysFromPrevious: number | null;
  }>;
  totalUsers: number;
  firstDataDate: string | null;
}> {
  try {
    // Get all daily new users data ordered by date
    const dailyData = await db.query<{ date: string; new_users: number }>(
      `SELECT date, new_users
       FROM protocol_stats
       WHERE protocol_name = ?
         AND data_type = ?
         AND new_users IS NOT NULL
         AND new_users > 0
       ORDER BY date ASC`,
      [protocolName, dataType]
    );

    if (!dailyData || dailyData.length === 0) {
      return {
        milestones: [],
        totalUsers: 0,
        firstDataDate: null
      };
    }

    const firstDataDate = dailyData[0].date;
    const firstDate = new Date(firstDataDate);

    // Calculate cumulative users and find milestones
    let cumulativeUsers = 0;

    // Milestone values: 500K increments up to 5M, then larger increments
    const milestoneValues = [
      500000, 1000000, 1500000, 2000000, 2500000, 3000000,
      3500000, 4000000, 4500000, 5000000, 6000000, 7000000, 8000000, 9000000, 10000000
    ];
    const milestoneLabels = [
      '500K', '1M', '1.5M', '2M', '2.5M', '3M',
      '3.5M', '4M', '4.5M', '5M', '6M', '7M', '8M', '9M', '10M'
    ];

    const milestonesReached: Map<number, { date: string; daysFromStart: number }> = new Map();

    dailyData.forEach((day) => {
      cumulativeUsers += Math.round(Number(day.new_users) || 0);
      const currentDate = new Date(day.date);

      // Check each milestone
      milestoneValues.forEach((milestone) => {
        if (cumulativeUsers >= milestone && !milestonesReached.has(milestone)) {
          // Calculate actual calendar days from first date
          const daysFromStart = Math.floor((currentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
          milestonesReached.set(milestone, { date: day.date, daysFromStart });
        }
      });
    });

    // Build milestone response with days from previous milestone
    let previousMilestoneDate: Date | null = null;
    const milestones = milestoneValues.map((milestone, index) => {
      const reached = milestonesReached.get(milestone);
      let daysFromPrevious: number | null = null;

      if (reached && previousMilestoneDate !== null) {
        const currentMilestoneDate = new Date(reached.date);
        daysFromPrevious = Math.floor((currentMilestoneDate.getTime() - previousMilestoneDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (reached) {
        previousMilestoneDate = new Date(reached.date);
      }

      return {
        milestone,
        milestoneLabel: milestoneLabels[index],
        dateReached: reached?.date || null,
        daysFromStart: reached?.daysFromStart ?? null,
        daysFromPrevious
      };
    });

    // Filter to only show relevant milestones (reached ones + next 2 unreached)
    const reachedCount = milestones.filter(m => m.dateReached).length;
    const filteredMilestones = milestones.filter((m, i) => {
      if (m.dateReached) return true;
      // Show next 2 unreached milestones
      const unreachedIndex = i - reachedCount;
      return unreachedIndex < 2;
    });

    return {
      milestones: filteredMilestones,
      totalUsers: Math.round(cumulativeUsers),
      firstDataDate
    };
  } catch (error) {
    console.error(`Error getting user milestones for ${protocolName}:`, error);
    throw error;
  }
}

/**
 * Get EVM weekly metrics with growth calculations
 * OPTIMIZED: Single query with date range instead of pagination loops
 */
export async function getEVMWeeklyMetrics(endDate: Date, dataType: string = 'public') {
  try {
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);

    const prevWeekEndDate = new Date(endDate);
    prevWeekEndDate.setDate(endDate.getDate() - 7);
    const prevWeekStartDate = new Date(prevWeekEndDate);
    prevWeekStartDate.setDate(prevWeekEndDate.getDate() - 6);

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    const prevStartStr = format(prevWeekStartDate, 'yyyy-MM-dd');
    const prevEndStr = format(prevWeekEndDate, 'yyyy-MM-dd');

    console.log(`Fetching EVM weekly metrics: ${startDateStr} to ${endDateStr}`);

    const evmChains = ['ethereum', 'base', 'bsc', 'avax', 'arbitrum'];
    const evmProtocols = getEVMProtocols();

    // Single query for both current and previous week
    const data = await db.query<any>(
      `SELECT protocol_name, date, volume_usd, chain, daily_users, new_users
       FROM protocol_stats
       WHERE chain IN (${evmChains.map(() => '?').join(',')})
         AND protocol_name IN (${evmProtocols.map(() => '?').join(',')})
         AND data_type = ?
         AND date >= ?
         AND date <= ?
       ORDER BY protocol_name, date`,
      [...evmChains, ...evmProtocols, dataType, prevStartStr, endDateStr]
    );

    if (!data || data.length === 0) {
      return { weeklyData: {}, dateRange: { startDate: startDateStr, endDate: endDateStr }, totalProtocols: 0 };
    }

    // Group data by protocol and calculate metrics
    const protocolData: Record<string, any> = {};

    evmProtocols.forEach(protocol => {
      protocolData[protocol] = {
        dailyVolumes: {} as Record<string, number>,
        dailyUsers: {} as Record<string, number>,
        dailyNewUsers: {} as Record<string, number>,
        chainVolumes: { ethereum: 0, base: 0, bsc: 0, avax: 0, arbitrum: 0 },
        currentWeekTotal: 0,
        currentWeekUsers: 0,
        currentWeekNewUsers: 0,
        previousWeekTotal: 0,
        previousWeekUsers: 0,
        previousWeekNewUsers: 0,
        weeklyTrend: [] as number[]
      };
    });

    // Process each record
    data.forEach((record: any) => {
      const protocol = record.protocol_name;
      const dateStr = typeof record.date === 'string' ? record.date : format(new Date(record.date), 'yyyy-MM-dd');
      const volume = Number(record.volume_usd) || 0;
      const users = Number(record.daily_users) || 0;
      const newUsers = Number(record.new_users) || 0;
      const chain = record.chain;

      if (!protocolData[protocol]) return;

      const recordDate = new Date(dateStr);
      const isCurrentWeek = recordDate >= startDate && recordDate <= endDate;
      const isPreviousWeek = recordDate >= prevWeekStartDate && recordDate <= prevWeekEndDate;

      if (isCurrentWeek) {
        if (!protocolData[protocol].dailyVolumes[dateStr]) protocolData[protocol].dailyVolumes[dateStr] = 0;
        if (!protocolData[protocol].dailyUsers[dateStr]) protocolData[protocol].dailyUsers[dateStr] = 0;
        if (!protocolData[protocol].dailyNewUsers[dateStr]) protocolData[protocol].dailyNewUsers[dateStr] = 0;

        protocolData[protocol].dailyVolumes[dateStr] += volume;
        protocolData[protocol].dailyUsers[dateStr] += users;
        protocolData[protocol].dailyNewUsers[dateStr] += newUsers;
        protocolData[protocol].currentWeekTotal += volume;
        protocolData[protocol].currentWeekUsers += users;
        protocolData[protocol].currentWeekNewUsers += newUsers;

        if (protocolData[protocol].chainVolumes[chain] !== undefined) {
          protocolData[protocol].chainVolumes[chain] += volume;
        }
      } else if (isPreviousWeek) {
        protocolData[protocol].previousWeekTotal += volume;
        protocolData[protocol].previousWeekUsers += users;
        protocolData[protocol].previousWeekNewUsers += newUsers;
      }
    });

    // Calculate growth percentages and prepare final response
    const weeklyData: Record<string, any> = {};
    const protocolTotals: Array<{ protocol: string; volume: number }> = [];

    Object.entries(protocolData).forEach(([protocol, data]) => {
      const weeklyGrowth = data.previousWeekTotal > 0
        ? (data.currentWeekTotal - data.previousWeekTotal) / data.previousWeekTotal
        : (data.currentWeekTotal > 0 ? 1 : 0);

      const dateKeys = Object.keys(data.dailyVolumes).sort();
      const weeklyTrend = dateKeys.map(date => data.dailyVolumes[date] || 0);

      weeklyData[protocol] = {
        totalVolume: data.currentWeekTotal,
        totalUsers: data.currentWeekUsers,
        totalNewUsers: data.currentWeekNewUsers,
        dailyVolumes: data.dailyVolumes,
        dailyUsers: data.dailyUsers,
        dailyNewUsers: data.dailyNewUsers,
        chainVolumes: data.chainVolumes,
        weeklyGrowth,
        weeklyTrend,
        previousWeekTotal: data.previousWeekTotal
      };

      if (data.currentWeekTotal > 0) {
        protocolTotals.push({ protocol, volume: data.currentWeekTotal });
      }
    });

    const sortedProtocols = protocolTotals.sort((a, b) => b.volume - a.volume).map(p => p.protocol);

    return {
      weeklyData,
      dateRange: { startDate: startDateStr, endDate: endDateStr },
      totalProtocols: protocolTotals.length,
      sortedProtocols
    };
  } catch (error) {
    console.error('Error in getEVMWeeklyMetrics:', error);
    throw error;
  }
}

/**
 * Get EVM monthly metrics with growth calculations
 * OPTIMIZED: SQL aggregation and parallel queries
 */
export async function getEVMMonthlyMetrics(endDate: Date, dataType: string = 'public') {
  const cacheKey = `evm_monthly_metrics_${format(endDate, 'yyyy-MM')}_${dataType}`;
  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  try {
    const currentMonthStart = format(new Date(endDate.getFullYear(), endDate.getMonth(), 1), 'yyyy-MM-dd');
    const currentMonthEnd = format(new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0), 'yyyy-MM-dd');
    const previousMonthStart = format(new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1), 'yyyy-MM-dd');
    const previousMonthEnd = format(new Date(endDate.getFullYear(), endDate.getMonth(), 0), 'yyyy-MM-dd');
    const sixMonthsAgo = format(new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1), 'yyyy-MM-dd');

    const evmChains = ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon'];

    // OPTIMIZED: Parallel queries with SQL aggregation
    const [currentAgg, previousAgg, trendData] = await Promise.all([
      // Current month aggregated by protocol and chain
      db.query<any>(
        `SELECT protocol_name, chain,
                SUM(volume_usd) as total_volume,
                SUM(new_users) as total_new_users,
                SUM(trades) as total_trades,
                SUM(fees_usd) as total_fees
         FROM protocol_stats
         WHERE data_type = ?
           AND chain IN (${evmChains.map(() => '?').join(',')})
           AND date >= ? AND date <= ?
         GROUP BY protocol_name, chain`,
        [dataType, ...evmChains, currentMonthStart, currentMonthEnd]
      ),
      // Previous month aggregated by protocol
      db.query<any>(
        `SELECT protocol_name,
                SUM(volume_usd) as total_volume,
                SUM(new_users) as total_new_users,
                SUM(trades) as total_trades,
                SUM(fees_usd) as total_fees
         FROM protocol_stats
         WHERE data_type = ?
           AND chain IN (${evmChains.map(() => '?').join(',')})
           AND date >= ? AND date <= ?
         GROUP BY protocol_name`,
        [dataType, ...evmChains, previousMonthStart, previousMonthEnd]
      ),
      // 6-month trend aggregated by protocol and month
      db.query<any>(
        `SELECT protocol_name,
                DATE_FORMAT(date, '%Y-%m') as month,
                SUM(volume_usd) as total_volume
         FROM protocol_stats
         WHERE data_type = ?
           AND chain IN (${evmChains.map(() => '?').join(',')})
           AND date >= ? AND date <= ?
         GROUP BY protocol_name, DATE_FORMAT(date, '%Y-%m')`,
        [dataType, ...evmChains, sixMonthsAgo, currentMonthEnd]
      )
    ]);

    // Build protocol data
    const evmProtocols = getEVMProtocols();
    const protocols = new Set([
      ...evmProtocols,
      ...currentAgg.map((d: any) => d.protocol_name),
      ...previousAgg.map((d: any) => d.protocol_name)
    ]);

    const monthlyData: Record<string, any> = {};
    const previousMonthData: Record<string, any> = {};
    const monthlyVolumeData: Record<string, Record<string, number>> = {};

    // Initialize all protocols
    for (const protocol of protocols) {
      monthlyVolumeData[protocol] = {};
    }

    // Build current month data with chain breakdown
    for (const protocol of protocols) {
      const protocolChainData = currentAgg.filter((d: any) => d.protocol_name === protocol);
      const totalVolume = protocolChainData.reduce((sum: number, d: any) => sum + (Number(d.total_volume) || 0), 0);
      const totalNewUsers = protocolChainData.reduce((sum: number, d: any) => sum + (Number(d.total_new_users) || 0), 0);
      const totalTrades = protocolChainData.reduce((sum: number, d: any) => sum + (Number(d.total_trades) || 0), 0);
      const totalFees = protocolChainData.reduce((sum: number, d: any) => sum + (Number(d.total_fees) || 0), 0);

      const chainVolumes: Record<string, number> = {};
      evmChains.forEach(chain => {
        const chainData = protocolChainData.find((d: any) => d.chain === chain);
        chainVolumes[chain] = Number(chainData?.total_volume) || 0;
      });

      const prevData = previousAgg.find((d: any) => d.protocol_name === protocol);
      const prevTotalVolume = Number(prevData?.total_volume) || 0;
      const monthlyGrowth = prevTotalVolume > 0 ? (totalVolume - prevTotalVolume) / prevTotalVolume : 0;

      monthlyData[protocol] = {
        total_volume_usd: totalVolume,
        numberOfNewUsers: totalNewUsers,
        daily_trades: totalTrades,
        total_fees_usd: totalFees,
        monthly_growth: monthlyGrowth,
        ethereum_volume: chainVolumes.ethereum || 0,
        base_volume: chainVolumes.base || 0,
        bsc_volume: chainVolumes.bsc || 0,
        avax_volume: chainVolumes.avax || 0,
        arbitrum_volume: chainVolumes.arbitrum || 0,
        polygon_volume: chainVolumes.polygon || 0
      };

      previousMonthData[protocol] = {
        total_volume_usd: prevTotalVolume,
        numberOfNewUsers: Number(prevData?.total_new_users) || 0,
        daily_trades: Number(prevData?.total_trades) || 0,
        total_fees_usd: Number(prevData?.total_fees) || 0,
        monthly_growth: 0
      };
    }

    // Build 6-month trend data
    trendData.forEach((d: any) => {
      if (monthlyVolumeData[d.protocol_name]) {
        monthlyVolumeData[d.protocol_name][d.month] = Number(d.total_volume) || 0;
      }
    });

    // Fill missing months with zeros
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

/**
 * Get monthly insights for highlights
 * OPTIMIZED: SQL aggregation with parallel queries
 */
export async function getMonthlyInsights(endDate: Date, dataType: string = 'private') {
  const cacheKey = `monthly_insights_${format(endDate, 'yyyy-MM')}_${dataType}`;
  const cachedEntry = insightsCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  try {
    const currentMonthStart = format(new Date(endDate.getFullYear(), endDate.getMonth(), 1), 'yyyy-MM-dd');
    const currentMonthEnd = format(new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0), 'yyyy-MM-dd');
    const previousMonthStart = format(new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1), 'yyyy-MM-dd');
    const previousMonthEnd = format(new Date(endDate.getFullYear(), endDate.getMonth(), 0), 'yyyy-MM-dd');
    const threeMonthsAgo = format(new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1), 'yyyy-MM-dd');

    // OPTIMIZED: Parallel queries with SQL aggregation
    const [currentData, previousData, historicalData] = await Promise.all([
      db.query<any>(
        `SELECT protocol_name,
                SUM(volume_usd) as total_volume,
                MAX(daily_users) as max_daily_users,
                SUM(new_users) as total_new_users,
                SUM(trades) as total_trades,
                SUM(fees_usd) as total_fees
         FROM protocol_stats
         WHERE data_type = ? AND chain = 'solana'
           AND date >= ? AND date <= ?
         GROUP BY protocol_name`,
        [dataType, currentMonthStart, currentMonthEnd]
      ),
      db.query<any>(
        `SELECT protocol_name,
                SUM(volume_usd) as total_volume,
                MAX(daily_users) as max_daily_users,
                SUM(new_users) as total_new_users,
                SUM(trades) as total_trades,
                SUM(fees_usd) as total_fees
         FROM protocol_stats
         WHERE data_type = ? AND chain = 'solana'
           AND date >= ? AND date <= ?
         GROUP BY protocol_name`,
        [dataType, previousMonthStart, previousMonthEnd]
      ),
      db.query<any>(
        `SELECT protocol_name, AVG(volume_usd) as avg_volume
         FROM protocol_stats
         WHERE data_type = ? AND chain = 'solana'
           AND date >= ? AND date <= ?
         GROUP BY protocol_name`,
        [dataType, threeMonthsAgo, currentMonthEnd]
      )
    ]);

    const performances: Record<string, any> = {};
    const historicalAvg: Record<string, number> = {};
    historicalData.forEach((d: any) => {
      historicalAvg[d.protocol_name] = Number(d.avg_volume) || 0;
    });

    for (const current of currentData) {
      if (Number(current.total_volume) === 0) continue;

      const prev = previousData.find((p: any) => p.protocol_name === current.protocol_name);
      const currentMetrics = {
        total_volume_usd: Number(current.total_volume) || 0,
        daily_users: Number(current.max_daily_users) || 0,
        numberOfNewUsers: Number(current.total_new_users) || 0,
        daily_trades: Number(current.total_trades) || 0,
        total_fees_usd: Number(current.total_fees) || 0
      };

      const previousMetrics = {
        total_volume_usd: Number(prev?.total_volume) || 0,
        daily_users: Number(prev?.max_daily_users) || 0,
        numberOfNewUsers: Number(prev?.total_new_users) || 0,
        daily_trades: Number(prev?.total_trades) || 0,
        total_fees_usd: Number(prev?.total_fees) || 0
      };

      const volume1m = previousMetrics.total_volume_usd > 0
        ? (currentMetrics.total_volume_usd - previousMetrics.total_volume_usd) / previousMetrics.total_volume_usd : 0;
      const users1m = previousMetrics.daily_users > 0
        ? (currentMetrics.daily_users - previousMetrics.daily_users) / previousMetrics.daily_users : 0;
      const trades1m = previousMetrics.daily_trades > 0
        ? (currentMetrics.daily_trades - previousMetrics.daily_trades) / previousMetrics.daily_trades : 0;

      const avg3mVolume = historicalAvg[current.protocol_name] || 0;
      const volume3m = avg3mVolume > 0 ? (currentMetrics.total_volume_usd - avg3mVolume) / avg3mVolume : 0;

      const monthlyVolumes = [currentMetrics.total_volume_usd, previousMetrics.total_volume_usd];
      const avgMonthlyVolume = monthlyVolumes.reduce((sum, vol) => sum + vol, 0) / monthlyVolumes.length;
      const volumeVariance = monthlyVolumes.reduce((sum, vol) => sum + Math.pow(vol - avgMonthlyVolume, 2), 0) / monthlyVolumes.length;
      const consistency = avgMonthlyVolume > 0 ? avgMonthlyVolume * (1 / (1 + Math.sqrt(volumeVariance) / avgMonthlyVolume)) : 0;

      performances[current.protocol_name] = {
        current: currentMetrics,
        previous: previousMetrics,
        trends: { volume1m, volume3m, users1m, trades1m, consistency }
      };
    }

    // Generate insights
    const insights: any[] = [];
    const performancesList = Object.entries(performances).map(([protocol, perf]) => ({ protocol, ...perf }));

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

      const gainers = performancesList.filter((p: any) => p.trends.volume1m > 0.1);
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

    const result = { performances, insights, totalProtocols: performancesList.length };
    insightsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Error fetching monthly insights:', error);
    throw error;
  }
}

/**
 * Get Solana weekly metrics with growth calculations
 * OPTIMIZED: Single query with date range
 */
export async function getSolanaWeeklyMetrics(endDate: Date, dataType: string = 'private', rankingMetric: string = 'volume') {
  try {
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);

    const prevWeekEndDate = new Date(endDate);
    prevWeekEndDate.setDate(endDate.getDate() - 7);
    const prevWeekStartDate = new Date(prevWeekEndDate);
    prevWeekStartDate.setDate(prevWeekEndDate.getDate() - 6);

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    const prevStartStr = format(prevWeekStartDate, 'yyyy-MM-dd');

    console.log(`Fetching Solana weekly metrics: ${startDateStr} to ${endDateStr}`);

    // Fetch both protocol_stats and projected_stats data in parallel
    const [data, projectedData] = await Promise.all([
      db.query<any>(
        `SELECT protocol_name, date, volume_usd, daily_users, new_users, trades, fees_usd
         FROM protocol_stats
         WHERE chain = 'solana' AND data_type = ?
           AND date >= ? AND date <= ?
         ORDER BY protocol_name, date`,
        [dataType, prevStartStr, endDateStr]
      ),
      db.query<any>(
        `SELECT protocol_name, formatted_day, volume_usd
         FROM projected_stats
         WHERE formatted_day >= ? AND formatted_day <= ?`,
        [prevStartStr, endDateStr]
      )
    ]);

    if (!data || data.length === 0) {
      return { weeklyData: {}, topProtocols: [], dateRange: { startDate: startDateStr, endDate: endDateStr } };
    }

    // Build projected volume lookup map: protocol -> date -> volume
    const projectedVolumeMap: Record<string, Record<string, number>> = {};
    projectedData.forEach((record: any) => {
      const protocol = record.protocol_name;
      const dateStr = typeof record.formatted_day === 'string'
        ? record.formatted_day
        : format(new Date(record.formatted_day), 'yyyy-MM-dd');
      if (!projectedVolumeMap[protocol]) {
        projectedVolumeMap[protocol] = {};
      }
      projectedVolumeMap[protocol][dateStr] = Number(record.volume_usd) || 0;
    });

    const solanaProtocols = getSolanaProtocols();
    const protocolData: Record<string, any> = {};

    solanaProtocols.forEach(protocol => {
      protocolData[protocol] = {
        dailyMetrics: { volume: {}, adjustedVolume: {}, users: {}, newUsers: {}, trades: {} },
        currentWeekTotal: { volume: 0, adjustedVolume: 0, users: 0, newUsers: 0, trades: 0 },
        previousWeekTotal: { volume: 0, adjustedVolume: 0, users: 0, newUsers: 0, trades: 0 }
      };
    });

    data.forEach((record: any) => {
      const protocol = record.protocol_name;
      const dateStr = typeof record.date === 'string' ? record.date : format(new Date(record.date), 'yyyy-MM-dd');
      if (!protocolData[protocol]) return;

      const recordDate = new Date(dateStr);
      const isCurrentWeek = recordDate >= startDate && recordDate <= endDate;
      const isPreviousWeek = recordDate >= prevWeekStartDate && recordDate <= prevWeekEndDate;

      const volume = Number(record.volume_usd) || 0;
      const users = Number(record.daily_users) || 0;
      const newUsers = Number(record.new_users) || 0;
      const trades = Number(record.trades) || 0;

      // Get projected volume if available, otherwise use actual volume
      const projectedVolume = projectedVolumeMap[protocol]?.[dateStr] || 0;
      const adjustedVolume = projectedVolume > 0 ? projectedVolume : volume;

      if (isCurrentWeek) {
        protocolData[protocol].dailyMetrics.volume[dateStr] = volume;
        protocolData[protocol].dailyMetrics.adjustedVolume[dateStr] = adjustedVolume;
        protocolData[protocol].dailyMetrics.users[dateStr] = users;
        protocolData[protocol].dailyMetrics.newUsers[dateStr] = newUsers;
        protocolData[protocol].dailyMetrics.trades[dateStr] = trades;
        protocolData[protocol].currentWeekTotal.volume += volume;
        protocolData[protocol].currentWeekTotal.adjustedVolume += adjustedVolume;
        protocolData[protocol].currentWeekTotal.users += users;
        protocolData[protocol].currentWeekTotal.newUsers += newUsers;
        protocolData[protocol].currentWeekTotal.trades += trades;
      } else if (isPreviousWeek) {
        protocolData[protocol].previousWeekTotal.volume += volume;
        protocolData[protocol].previousWeekTotal.adjustedVolume += adjustedVolume;
        protocolData[protocol].previousWeekTotal.users += users;
        protocolData[protocol].previousWeekTotal.newUsers += newUsers;
        protocolData[protocol].previousWeekTotal.trades += trades;
      }
    });

    const weeklyData: Record<string, any> = {};
    const protocolTotals: Array<{ protocol: string; volume: number; adjustedVolume: number; users: number; newUsers: number; trades: number }> = [];

    Object.entries(protocolData).forEach(([protocol, data]) => {
      const volumeGrowth = data.previousWeekTotal.volume > 0
        ? (data.currentWeekTotal.volume - data.previousWeekTotal.volume) / data.previousWeekTotal.volume
        : (data.currentWeekTotal.volume > 0 ? 1 : 0);
      const adjustedVolumeGrowth = data.previousWeekTotal.adjustedVolume > 0
        ? (data.currentWeekTotal.adjustedVolume - data.previousWeekTotal.adjustedVolume) / data.previousWeekTotal.adjustedVolume
        : (data.currentWeekTotal.adjustedVolume > 0 ? 1 : 0);
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
        growth: { volume: volumeGrowth, adjustedVolume: adjustedVolumeGrowth, users: userGrowth, newUsers: newUserGrowth, trades: tradeGrowth }
      };

      if (data.currentWeekTotal.volume > 0 || data.currentWeekTotal.users > 0) {
        protocolTotals.push({
          protocol,
          volume: data.currentWeekTotal.volume,
          adjustedVolume: data.currentWeekTotal.adjustedVolume,
          users: data.currentWeekTotal.users,
          newUsers: data.currentWeekTotal.newUsers,
          trades: data.currentWeekTotal.trades
        });
      }
    });

    const topProtocols = protocolTotals
      .sort((a, b) => {
        switch (rankingMetric) {
          case 'users': return b.users - a.users;
          case 'newUsers': return b.newUsers - a.newUsers;
          case 'trades': return b.trades - a.trades;
          case 'adjustedVolume': return b.adjustedVolume - a.adjustedVolume;
          default: return b.adjustedVolume - a.adjustedVolume; // Default to adjustedVolume for ranking
        }
      })
      .slice(0, 3)
      .map(p => p.protocol);

    console.log(`Successfully processed weekly data for ${protocolTotals.length} Solana protocols`);
    return { weeklyData, topProtocols, dateRange: { startDate: startDateStr, endDate: endDateStr }, totalProtocols: protocolTotals.length };
  } catch (error) {
    console.error('Error in getSolanaWeeklyMetrics:', error);
    throw error;
  }
}

/**
 * Get Solana monthly metrics with daily breakdowns
 */
export async function getSolanaMonthlyMetricsWithDaily(endDate: Date, dataType: string = 'private') {
  try {
    const monthStart = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0));
    const startStr = monthStart.toISOString().split('T')[0];
    const endStr = monthEnd.toISOString().split('T')[0];

    console.log(`Fetching Solana monthly metrics with daily data: ${startStr} to ${endStr}`);

    const data = await db.query<any>(
      `SELECT protocol_name, date, volume_usd, daily_users, new_users, trades, fees_usd
       FROM protocol_stats
       WHERE chain = 'solana' AND data_type = ?
         AND date >= ? AND date <= ?
       ORDER BY protocol_name, date`,
      [dataType, startStr, endStr]
    );

    if (!data || data.length === 0) {
      return { weeklyData: {}, dateRange: { startDate: startStr, endDate: endStr } };
    }

    const solanaProtocols = getSolanaProtocols();
    const protocolData: Record<string, any> = {};

    solanaProtocols.forEach(protocol => {
      protocolData[protocol] = {
        dailyMetrics: { volume: {}, users: {}, newUsers: {}, trades: {} },
        monthlyTotal: { volume: 0, users: 0, newUsers: 0, trades: 0 }
      };
    });

    data.forEach((record: any) => {
      const protocol = record.protocol_name;
      const dateStr = typeof record.date === 'string' ? record.date : format(new Date(record.date), 'yyyy-MM-dd');
      if (!protocolData[protocol]) return;

      protocolData[protocol].dailyMetrics.volume[dateStr] = Number(record.volume_usd) || 0;
      protocolData[protocol].dailyMetrics.users[dateStr] = Number(record.daily_users) || 0;
      protocolData[protocol].dailyMetrics.newUsers[dateStr] = Number(record.new_users) || 0;
      protocolData[protocol].dailyMetrics.trades[dateStr] = Number(record.trades) || 0;

      protocolData[protocol].monthlyTotal.volume += Number(record.volume_usd) || 0;
      protocolData[protocol].monthlyTotal.users += Number(record.daily_users) || 0;
      protocolData[protocol].monthlyTotal.newUsers += Number(record.new_users) || 0;
      protocolData[protocol].monthlyTotal.trades += Number(record.trades) || 0;
    });

    const weeklyData: Record<string, any> = {};
    Object.entries(protocolData).forEach(([protocol, data]) => {
      if (data.monthlyTotal.volume > 0 || data.monthlyTotal.users > 0) {
        weeklyData[protocol] = { dailyMetrics: data.dailyMetrics, monthlyTotals: data.monthlyTotal };
      }
    });

    console.log(`Successfully processed monthly data for ${Object.keys(weeklyData).length} Solana protocols`);
    return { weeklyData, dateRange: { startDate: startStr, endDate: endStr } };
  } catch (error) {
    console.error('Error in getSolanaMonthlyMetricsWithDaily:', error);
    throw error;
  }
}

/**
 * Get EVM monthly metrics with daily breakdowns
 */
export async function getEVMMonthlyMetricsWithDaily(endDate: Date, dataType: string = 'public') {
  try {
    const monthStart = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0));
    const startStr = monthStart.toISOString().split('T')[0];
    const endStr = monthEnd.toISOString().split('T')[0];

    console.log(`Fetching EVM monthly metrics with daily data: ${startStr} to ${endStr}`);

    const evmChains = ['ethereum', 'base', 'bsc', 'avax', 'arbitrum'];

    const data = await db.query<any>(
      `SELECT protocol_name, date, chain, volume_usd, daily_users, new_users, trades
       FROM protocol_stats
       WHERE data_type = ?
         AND chain IN (${evmChains.map(() => '?').join(',')})
         AND date >= ? AND date <= ?
       ORDER BY protocol_name, date`,
      [dataType, ...evmChains, startStr, endStr]
    );

    if (!data || data.length === 0) {
      return { weeklyData: {}, dateRange: { startDate: startStr, endDate: endStr } };
    }

    const evmProtocols = getEVMProtocols();
    const protocolData: Record<string, any> = {};

    evmProtocols.forEach(protocol => {
      protocolData[protocol] = {
        dailyVolumes: {},
        chainVolumes: { ethereum: 0, base: 0, bsc: 0, avax: 0, arbitrum: 0 },
        monthlyTotal: { volume: 0, users: 0, newUsers: 0 }
      };
    });

    data.forEach((record: any) => {
      const protocol = record.protocol_name;
      const dateStr = typeof record.date === 'string' ? record.date : format(new Date(record.date), 'yyyy-MM-dd');
      const chain = record.chain;
      if (!protocolData[protocol]) return;

      if (!protocolData[protocol].dailyVolumes[dateStr]) {
        protocolData[protocol].dailyVolumes[dateStr] = 0;
      }
      protocolData[protocol].dailyVolumes[dateStr] += Number(record.volume_usd) || 0;

      if (chain && protocolData[protocol].chainVolumes[chain] !== undefined) {
        protocolData[protocol].chainVolumes[chain] += Number(record.volume_usd) || 0;
      }

      protocolData[protocol].monthlyTotal.volume += Number(record.volume_usd) || 0;
      protocolData[protocol].monthlyTotal.users += Number(record.daily_users) || 0;
      protocolData[protocol].monthlyTotal.newUsers += Number(record.new_users) || 0;
    });

    const weeklyData: Record<string, any> = {};
    Object.entries(protocolData).forEach(([protocol, data]) => {
      if (data.monthlyTotal.volume > 0) {
        weeklyData[protocol] = {
          dailyVolumes: data.dailyVolumes,
          chainVolumes: data.chainVolumes,
          totalVolume: data.monthlyTotal.volume,
          monthlyTotals: data.monthlyTotal
        };
      }
    });

    console.log(`Successfully processed monthly data for ${Object.keys(weeklyData).length} EVM protocols`);
    return { weeklyData, dateRange: { startDate: startStr, endDate: endStr } };
  } catch (error) {
    console.error('Error in getEVMMonthlyMetricsWithDaily:', error);
    throw error;
  }
}
