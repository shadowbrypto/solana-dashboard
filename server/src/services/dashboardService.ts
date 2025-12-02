import { db } from '../lib/db.js';
import { subDays, format, startOfDay } from 'date-fns';

class DashboardService {
  // Cache for dashboard stats
  private dashboardCache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_TTL = 60 * 1000; // 1 minute cache

  async getDashboardStats(dataType: string = 'private') {
    const cacheKey = `dashboard-stats-${dataType}`;

    // Check cache
    const cached = this.dashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Get yesterday's date
      const yesterday = startOfDay(subDays(new Date(), 1));
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

      // Get date 7 days ago for weekly data
      const weekAgo = startOfDay(subDays(new Date(), 7));
      const weekAgoStr = format(weekAgo, 'yyyy-MM-dd');

      // Fetch yesterday's aggregated stats for all Solana protocols
      const yesterdayData = await db.query<{
        volume_usd: number;
        daily_users: number;
        new_users: number;
        trades: number;
      }>(`
        SELECT volume_usd, daily_users, new_users, trades
        FROM protocol_stats
        WHERE chain = 'solana' AND data_type = ? AND date = ?
      `, [dataType, yesterdayStr]);

      // Calculate yesterday's totals
      const yesterdayTotals = (yesterdayData || []).reduce((acc, row) => ({
        volume: acc.volume + (Number(row.volume_usd) || 0),
        users: acc.users + (Number(row.daily_users) || 0),
        newUsers: acc.newUsers + (Number(row.new_users) || 0),
        trades: acc.trades + (Number(row.trades) || 0)
      }), { volume: 0, users: 0, newUsers: 0, trades: 0 });

      // Fetch last 7 days data for trend charts
      const weekData = await db.query<{
        date: Date;
        volume_usd: number;
        daily_users: number;
        new_users: number;
        trades: number;
      }>(`
        SELECT date, volume_usd, daily_users, new_users, trades
        FROM protocol_stats
        WHERE chain = 'solana' AND data_type = ? AND date >= ? AND date <= ?
        ORDER BY date ASC
      `, [dataType, weekAgoStr, yesterdayStr]);

      // Aggregate weekly data by date
      const weeklyTrends: Record<string, any> = {};
      (weekData || []).forEach(row => {
        const dateStr = row.date instanceof Date ? format(row.date, 'yyyy-MM-dd') : row.date;
        if (!weeklyTrends[dateStr]) {
          weeklyTrends[dateStr] = {
            date: dateStr,
            volume: 0,
            users: 0,
            newUsers: 0,
            trades: 0
          };
        }
        weeklyTrends[dateStr].volume += Number(row.volume_usd) || 0;
        weeklyTrends[dateStr].users += Number(row.daily_users) || 0;
        weeklyTrends[dateStr].newUsers += Number(row.new_users) || 0;
        weeklyTrends[dateStr].trades += Number(row.trades) || 0;
      });

      // Convert to array and ensure we have 7 days
      const trendArray = Object.values(weeklyTrends).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate growth percentages (compare yesterday to day before)
      const dayBefore = trendArray[trendArray.length - 2];
      const growth = {
        volume: dayBefore?.volume ? ((yesterdayTotals.volume - dayBefore.volume) / dayBefore.volume) * 100 : 0,
        users: dayBefore?.users ? ((yesterdayTotals.users - dayBefore.users) / dayBefore.users) * 100 : 0,
        newUsers: dayBefore?.newUsers ? ((yesterdayTotals.newUsers - dayBefore.newUsers) / dayBefore.newUsers) * 100 : 0,
        trades: dayBefore?.trades ? ((yesterdayTotals.trades - dayBefore.trades) / dayBefore.trades) * 100 : 0
      };

      // Fetch protocol-level data for top protocols
      const protocolData = await db.query<{
        protocol_name: string;
        volume_usd: number;
        daily_users: number;
        trades: number;
      }>(`
        SELECT protocol_name, volume_usd, daily_users, trades
        FROM protocol_stats
        WHERE chain = 'solana' AND data_type = ? AND date = ?
        ORDER BY volume_usd DESC
        LIMIT 20
      `, [dataType, yesterdayStr]);

      // Prepare protocol rankings - 15 protocols each
      const topProtocolsByVolume = (protocolData || [])
        .filter(p => Number(p.volume_usd) > 0)
        .slice(0, 15)
        .map(p => ({
          name: p.protocol_name.charAt(0).toUpperCase() + p.protocol_name.slice(1),
          value: Number(p.volume_usd)
        }));

      const topProtocolsByUsers = (protocolData || [])
        .sort((a, b) => (Number(b.daily_users) || 0) - (Number(a.daily_users) || 0))
        .filter(p => Number(p.daily_users) > 0)
        .slice(0, 15)
        .map(p => ({
          name: p.protocol_name.charAt(0).toUpperCase() + p.protocol_name.slice(1),
          value: Number(p.daily_users)
        }));

      const topProtocolsByTrades = (protocolData || [])
        .sort((a, b) => (Number(b.trades) || 0) - (Number(a.trades) || 0))
        .filter(p => Number(p.trades) > 0)
        .slice(0, 15)
        .map(p => ({
          name: p.protocol_name.charAt(0).toUpperCase() + p.protocol_name.slice(1),
          value: Number(p.trades)
        }));

      // Calculate Fear & Greed Index based on multiple factors
      const calculateFearGreedIndex = () => {
        let score = 50; // Start neutral

        // Volume growth factor (30% weight)
        if (growth.volume > 20) score += 15;
        else if (growth.volume > 10) score += 10;
        else if (growth.volume > 0) score += 5;
        else if (growth.volume < -20) score -= 15;
        else if (growth.volume < -10) score -= 10;
        else if (growth.volume < 0) score -= 5;

        // User growth factor (25% weight)
        if (growth.users > 15) score += 12;
        else if (growth.users > 5) score += 8;
        else if (growth.users > 0) score += 3;
        else if (growth.users < -15) score -= 12;
        else if (growth.users < -5) score -= 8;
        else if (growth.users < 0) score -= 3;

        // Trade growth factor (25% weight)
        if (growth.trades > 20) score += 12;
        else if (growth.trades > 10) score += 8;
        else if (growth.trades > 0) score += 3;
        else if (growth.trades < -20) score -= 12;
        else if (growth.trades < -10) score -= 8;
        else if (growth.trades < 0) score -= 3;

        // New user growth factor (20% weight)
        if (growth.newUsers > 25) score += 10;
        else if (growth.newUsers > 10) score += 6;
        else if (growth.newUsers > 0) score += 2;
        else if (growth.newUsers < -25) score -= 10;
        else if (growth.newUsers < -10) score -= 6;
        else if (growth.newUsers < 0) score -= 2;

        // Clamp between 0 and 100
        return Math.max(0, Math.min(100, Math.round(score)));
      };

      const fearGreedIndex = calculateFearGreedIndex();

      // Fetch chain-specific volume data
      const chainVolumes = await this.getChainVolumes(yesterdayStr, dataType);

      // Fetch launchpad data for timeline charts
      const launchpadData = await db.query<{
        date: Date;
        launches: number;
        graduations: number;
      }>(`
        SELECT date, launches, graduations
        FROM launchpad_stats
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `, [weekAgoStr, yesterdayStr]);

      // Aggregate launchpad data by date
      const launchpadTrends: Record<string, any> = {};
      (launchpadData || []).forEach(row => {
        const dateStr = row.date instanceof Date ? format(row.date, 'yyyy-MM-dd') : row.date;
        if (!launchpadTrends[dateStr]) {
          launchpadTrends[dateStr] = {
            date: dateStr,
            launches: 0,
            graduations: 0
          };
        }
        launchpadTrends[dateStr].launches += Number(row.launches) || 0;
        launchpadTrends[dateStr].graduations += Number(row.graduations) || 0;
      });

      // Convert to array and ensure we have 7 days
      const launchpadTrendArray = Object.values(launchpadTrends).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate yesterday's launchpad totals
      const yesterdayLaunchpad = launchpadTrendArray[launchpadTrendArray.length - 1] || { launches: 0, graduations: 0 };
      const dayBeforeLaunchpad = launchpadTrendArray[launchpadTrendArray.length - 2] || { launches: 0, graduations: 0 };

      // Calculate launchpad growth
      const launchpadGrowth = {
        launches: dayBeforeLaunchpad.launches ? ((yesterdayLaunchpad.launches - dayBeforeLaunchpad.launches) / dayBeforeLaunchpad.launches) * 100 : 0,
        graduations: dayBeforeLaunchpad.graduations ? ((yesterdayLaunchpad.graduations - dayBeforeLaunchpad.graduations) / dayBeforeLaunchpad.graduations) * 100 : 0
      };

      // Fetch top 6 protocols with detailed stats for daily stats card
      const topProtocolsData = await db.query<{
        protocol_name: string;
        volume_usd: number;
        daily_users: number;
        new_users: number;
        trades: number;
      }>(`
        SELECT protocol_name, volume_usd, daily_users, new_users, trades
        FROM protocol_stats
        WHERE chain = 'solana' AND data_type = ? AND date = ?
        ORDER BY volume_usd DESC
        LIMIT 6
      `, [dataType, yesterdayStr]);

      // Get previous day data for growth calculations
      const dayBeforeStr = format(startOfDay(subDays(new Date(), 2)), 'yyyy-MM-dd');
      const previousDayData = await db.query<{
        protocol_name: string;
        volume_usd: number;
        daily_users: number;
        new_users: number;
        trades: number;
      }>(`
        SELECT protocol_name, volume_usd, daily_users, new_users, trades
        FROM protocol_stats
        WHERE chain = 'solana' AND data_type = ? AND date = ?
      `, [dataType, dayBeforeStr]);

      // Create lookup for previous day data
      const previousDayLookup = (previousDayData || []).reduce((acc, row) => {
        acc[row.protocol_name] = row;
        return acc;
      }, {} as Record<string, any>);

      // Calculate growth for each protocol
      const topProtocolsWithGrowth = (topProtocolsData || []).map(protocol => {
        const prevData = previousDayLookup[protocol.protocol_name];

        const calculateGrowth = (current: number, previous: number) => {
          if (!previous || previous === 0) return 0;
          return ((current - previous) / previous) * 100;
        };

        return {
          app: protocol.protocol_name.charAt(0).toUpperCase() + protocol.protocol_name.slice(1),
          protocolId: protocol.protocol_name,
          volume: Number(protocol.volume_usd) || 0,
          volumeGrowth: calculateGrowth(Number(protocol.volume_usd) || 0, Number(prevData?.volume_usd) || 0),
          daus: Number(protocol.daily_users) || 0,
          dausGrowth: calculateGrowth(Number(protocol.daily_users) || 0, Number(prevData?.daily_users) || 0),
          newUsers: Number(protocol.new_users) || 0,
          newUsersGrowth: calculateGrowth(Number(protocol.new_users) || 0, Number(prevData?.new_users) || 0),
          trades: Number(protocol.trades) || 0,
          tradesGrowth: calculateGrowth(Number(protocol.trades) || 0, Number(prevData?.trades) || 0)
        };
      });

      const result = {
        yesterday: yesterdayTotals,
        growth,
        trends: {
          volume: trendArray.map(d => ({ name: format(new Date(d.date), 'MMM d'), value: d.volume, date: d.date })),
          users: trendArray.map(d => ({ name: format(new Date(d.date), 'MMM d'), value: d.users, date: d.date })),
          newUsers: trendArray.map(d => ({ name: format(new Date(d.date), 'MMM d'), value: d.newUsers, date: d.date })),
          trades: trendArray.map(d => ({ name: format(new Date(d.date), 'MMM d'), value: d.trades, date: d.date })),
          launches: launchpadTrendArray.map(d => ({ name: format(new Date(d.date), 'MMM d'), value: d.launches, date: d.date })),
          graduations: launchpadTrendArray.map(d => ({ name: format(new Date(d.date), 'MMM d'), value: d.graduations, date: d.date }))
        },
        launchpad: {
          launches: yesterdayLaunchpad.launches || 0,
          graduations: yesterdayLaunchpad.graduations || 0,
          growth: launchpadGrowth
        },
        rankings: {
          byVolume: topProtocolsByVolume,
          byUsers: topProtocolsByUsers,
          byTrades: topProtocolsByTrades
        },
        chainVolumes,
        topProtocols: topProtocolsWithGrowth,
        fearGreedIndex,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      this.dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('Dashboard service error:', error);
      throw error;
    }
  }

  async getChainVolumes(date: string, dataType: string = 'private') {
    try {
      // Fetch volume for each chain directly from database
      const chains = ['solana', 'ethereum', 'base', 'bsc'];
      const chainVolumes: Record<string, number> = {};

      // Query each chain separately and get actual volumes
      for (const chain of chains) {
        const chainDataType = chain === 'solana' ? dataType : 'public';
        const chainData = await db.query<{ volume_usd: number }>(`
          SELECT volume_usd
          FROM protocol_stats
          WHERE chain = ? AND data_type = ? AND date = ?
        `, [chain, chainDataType, date]);

        chainVolumes[chain] = (chainData || []).reduce((sum, row) => sum + (Number(row.volume_usd) || 0), 0);
      }

      const totalVolume = Object.values(chainVolumes).reduce((sum, vol) => sum + vol, 0);

      return {
        solana: Math.round(chainVolumes.solana || 0),
        ethereum: Math.round(chainVolumes.ethereum || 0),
        bsc: Math.round(chainVolumes.bsc || 0),
        base: Math.round(chainVolumes.base || 0),
        total: Math.round(totalVolume)
      };
    } catch (error) {
      console.error('Chain volumes fetch error:', error);
      return {
        solana: 0,
        ethereum: 0,
        bsc: 0,
        base: 0,
        total: 0
      };
    }
  }
}

export default new DashboardService();
