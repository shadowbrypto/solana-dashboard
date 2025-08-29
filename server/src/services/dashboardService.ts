import { createClient } from '@supabase/supabase-js';
import { subDays, format, startOfDay } from 'date-fns';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      const { data: yesterdayData, error: yesterdayError } = await supabase
        .from('protocol_stats')
        .select('volume_usd, daily_users, new_users, trades')
        .eq('chain', 'solana')
        .eq('data_type', dataType)
        .eq('date', yesterdayStr);

      if (yesterdayError) {
        throw yesterdayError;
      }

      // Calculate yesterday's totals
      const yesterdayTotals = (yesterdayData || []).reduce((acc, row) => ({
        volume: acc.volume + (row.volume_usd || 0),
        users: acc.users + (row.daily_users || 0),
        newUsers: acc.newUsers + (row.new_users || 0),
        trades: acc.trades + (row.trades || 0)
      }), { volume: 0, users: 0, newUsers: 0, trades: 0 });

      // Fetch last 7 days data for trend charts
      const { data: weekData, error: weekError } = await supabase
        .from('protocol_stats')
        .select('date, volume_usd, daily_users, new_users, trades')
        .eq('chain', 'solana')
        .eq('data_type', dataType)
        .gte('date', weekAgoStr)
        .lte('date', yesterdayStr)
        .order('date', { ascending: true });

      if (weekError) {
        throw weekError;
      }

      // Aggregate weekly data by date
      const weeklyTrends: Record<string, any> = {};
      (weekData || []).forEach(row => {
        if (!weeklyTrends[row.date]) {
          weeklyTrends[row.date] = {
            date: row.date,
            volume: 0,
            users: 0,
            newUsers: 0,
            trades: 0
          };
        }
        weeklyTrends[row.date].volume += row.volume_usd || 0;
        weeklyTrends[row.date].users += row.daily_users || 0;
        weeklyTrends[row.date].newUsers += row.new_users || 0;
        weeklyTrends[row.date].trades += row.trades || 0;
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
      const { data: protocolData, error: protocolError } = await supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, daily_users, trades')
        .eq('chain', 'solana')
        .eq('data_type', dataType)
        .eq('date', yesterdayStr)
        .order('volume_usd', { ascending: false })
        .limit(20);

      if (protocolError) {
        throw protocolError;
      }

      // Prepare protocol rankings - 15 protocols each
      const topProtocolsByVolume = (protocolData || [])
        .filter(p => p.volume_usd > 0)
        .slice(0, 15)
        .map(p => ({
          name: p.protocol_name.charAt(0).toUpperCase() + p.protocol_name.slice(1),
          value: p.volume_usd
        }));

      const topProtocolsByUsers = (protocolData || [])
        .sort((a, b) => (b.daily_users || 0) - (a.daily_users || 0))
        .filter(p => p.daily_users > 0)
        .slice(0, 15)
        .map(p => ({
          name: p.protocol_name.charAt(0).toUpperCase() + p.protocol_name.slice(1),
          value: p.daily_users
        }));

      const topProtocolsByTrades = (protocolData || [])
        .sort((a, b) => (b.trades || 0) - (a.trades || 0))
        .filter(p => p.trades > 0)
        .slice(0, 15)
        .map(p => ({
          name: p.protocol_name.charAt(0).toUpperCase() + p.protocol_name.slice(1),
          value: p.trades
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
      const { data: launchpadData, error: launchpadError } = await supabase
        .from('launchpad_stats')
        .select('date, launches, graduations')
        .gte('date', weekAgoStr)
        .lte('date', yesterdayStr)
        .order('date', { ascending: true });

      if (launchpadError) {
        console.error('Error fetching launchpad data:', launchpadError);
      }

      // Aggregate launchpad data by date
      const launchpadTrends: Record<string, any> = {};
      (launchpadData || []).forEach(row => {
        if (!launchpadTrends[row.date]) {
          launchpadTrends[row.date] = {
            date: row.date,
            launches: 0,
            graduations: 0
          };
        }
        launchpadTrends[row.date].launches += row.launches || 0;
        launchpadTrends[row.date].graduations += row.graduations || 0;
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
      const { data: topProtocolsData, error: topProtocolsError } = await supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, daily_users, new_users, trades')
        .eq('chain', 'solana')
        .eq('data_type', dataType)
        .eq('date', yesterdayStr)
        .order('volume_usd', { ascending: false })
        .limit(6);

      if (topProtocolsError) {
        throw topProtocolsError;
      }

      // Get previous day data for growth calculations
      const dayBeforeStr = format(startOfDay(subDays(new Date(), 2)), 'yyyy-MM-dd');
      const { data: previousDayData, error: previousDayError } = await supabase
        .from('protocol_stats')
        .select('protocol_name, volume_usd, daily_users, new_users, trades')
        .eq('chain', 'solana')
        .eq('data_type', dataType)
        .eq('date', dayBeforeStr);

      if (previousDayError) {
        console.error('Error fetching previous day data for growth:', previousDayError);
      }

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
          volume: protocol.volume_usd || 0,
          volumeGrowth: calculateGrowth(protocol.volume_usd || 0, prevData?.volume_usd || 0),
          daus: protocol.daily_users || 0,
          dausGrowth: calculateGrowth(protocol.daily_users || 0, prevData?.daily_users || 0),
          newUsers: protocol.new_users || 0,
          newUsersGrowth: calculateGrowth(protocol.new_users || 0, prevData?.new_users || 0),
          trades: protocol.trades || 0,
          tradesGrowth: calculateGrowth(protocol.trades || 0, prevData?.trades || 0)
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
      // The database stores chain-specific data with separate entries per chain
      const chains = ['solana', 'ethereum', 'base', 'bsc'];
      const chainVolumes: Record<string, number> = {};

      // Query each chain separately and get actual volumes
      for (const chain of chains) {
        const { data: chainData, error: chainError } = await supabase
          .from('protocol_stats')
          .select('volume_usd')
          .eq('chain', chain)
          .eq('data_type', chain === 'solana' ? dataType : 'public') // EVM chains use 'public' data type
          .eq('date', date);

        if (chainError) {
          console.error(`Error fetching ${chain} volume:`, chainError);
          chainVolumes[chain] = 0;
        } else {
          chainVolumes[chain] = (chainData || []).reduce((sum, row) => sum + (row.volume_usd || 0), 0);
        }
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