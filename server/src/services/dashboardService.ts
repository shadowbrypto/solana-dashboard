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

      const result = {
        yesterday: yesterdayTotals,
        growth,
        trends: {
          volume: trendArray.map(d => ({ name: format(new Date(d.date), 'EEE'), value: d.volume })),
          users: trendArray.map(d => ({ name: format(new Date(d.date), 'EEE'), value: d.users })),
          newUsers: trendArray.map(d => ({ name: format(new Date(d.date), 'EEE'), value: d.newUsers })),
          trades: trendArray.map(d => ({ name: format(new Date(d.date), 'EEE'), value: d.trades }))
        },
        rankings: {
          byVolume: topProtocolsByVolume,
          byUsers: topProtocolsByUsers,
          byTrades: topProtocolsByTrades
        },
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
}

export default new DashboardService();