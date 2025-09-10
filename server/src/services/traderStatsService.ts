import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { traderStatsQueries, getTraderStatsQueryId } from '../config/traderStatsQueries';

export interface TraderStats {
  protocol_name: string;
  user_address: string;
  volume_usd: number;
  date: string;
  chain?: string;
}

export interface TraderAnalytics {
  topTraders: {
    address: string;
    volume: number;
    tradeCount: number;
    percentageOfTotal: number;
  }[];
  totalUniqueTraders: number;
  totalVolume: number;
  volumeDistribution: {
    top10Percentage: number;
    top50Percentage: number;
    top100Percentage: number;
  };
  traderCategories: {
    whales: number; // top 1%
    sharks: number; // top 10%
    fish: number;   // rest
  };
}

export class TraderStatsService {
  // Get trader stats for a protocol
  static async getTraderStats(
    protocol: string,
    startDate: Date,
    endDate: Date,
    limit?: number
  ): Promise<TraderStats[]> {
    try {
      let query = supabase
        .from('trader_stats')
        .select('*')
        .eq('protocol_name', protocol.toLowerCase())
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('volume_usd', { ascending: false });

      // Only apply limit if it's provided
      if (limit !== undefined && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trader stats:', error);
      throw error;
    }
  }

  // Get aggregated trader analytics
  static async getTraderAnalytics(
    protocol: string,
    startDate: Date,
    endDate: Date
  ): Promise<TraderAnalytics> {
    try {
      // Get all trader data for the period
      const { data: traderData, error } = await supabase
        .from('trader_stats')
        .select('user_address, volume_usd')
        .eq('protocol_name', protocol.toLowerCase())
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;
      if (!traderData || traderData.length === 0) {
        return {
          topTraders: [],
          totalUniqueTraders: 0,
          totalVolume: 0,
          volumeDistribution: {
            top10Percentage: 0,
            top50Percentage: 0,
            top100Percentage: 0
          },
          traderCategories: {
            whales: 0,
            sharks: 0,
            fish: 0
          }
        };
      }

      // Aggregate by trader
      const traderMap = new Map<string, { volume: number; tradeCount: number }>();
      let totalVolume = 0;

      traderData.forEach(trade => {
        const existing = traderMap.get(trade.user_address) || { volume: 0, tradeCount: 0 };
        existing.volume += trade.volume_usd;
        existing.tradeCount += 1;
        traderMap.set(trade.user_address, existing);
        totalVolume += trade.volume_usd;
      });

      // Sort traders by volume
      const sortedTraders = Array.from(traderMap.entries())
        .map(([address, data]) => ({
          address,
          volume: data.volume,
          tradeCount: data.tradeCount,
          percentageOfTotal: (data.volume / totalVolume) * 100
        }))
        .sort((a, b) => b.volume - a.volume);

      // Calculate volume distribution
      const top10Volume = sortedTraders.slice(0, 10).reduce((sum, t) => sum + t.volume, 0);
      const top50Volume = sortedTraders.slice(0, 50).reduce((sum, t) => sum + t.volume, 0);
      const top100Volume = sortedTraders.slice(0, 100).reduce((sum, t) => sum + t.volume, 0);

      // Categorize traders
      const totalTraders = sortedTraders.length;
      const whaleThreshold = Math.ceil(totalTraders * 0.01);
      const sharkThreshold = Math.ceil(totalTraders * 0.1);

      return {
        topTraders: sortedTraders.slice(0, 20), // Return top 20
        totalUniqueTraders: totalTraders,
        totalVolume,
        volumeDistribution: {
          top10Percentage: (top10Volume / totalVolume) * 100,
          top50Percentage: (top50Volume / totalVolume) * 100,
          top100Percentage: (top100Volume / totalVolume) * 100
        },
        traderCategories: {
          whales: whaleThreshold,
          sharks: sharkThreshold - whaleThreshold,
          fish: totalTraders - sharkThreshold
        }
      };
    } catch (error) {
      console.error('Error calculating trader analytics:', error);
      throw error;
    }
  }

  // Import trader data from Dune (placeholder - implement based on your Dune integration)
  static async importTraderData(
    protocol: string,
    date: Date,
    data: Array<{ user: string; volume_usd: number }>
  ): Promise<void> {
    try {
      const records = data.map(item => ({
        protocol_name: protocol.toLowerCase(),
        user_address: item.user,
        volume_usd: item.volume_usd,
        date: format(date, 'yyyy-MM-dd'),
        chain: traderStatsQueries.find(q => q.protocol === protocol)?.chain || 'solana'
      }));

      const { error } = await supabase
        .from('trader_stats')
        .upsert(records, {
          onConflict: 'protocol_name,user_address,date',
          ignoreDuplicates: false
        });

      if (error) throw error;
      
      console.log(`Imported ${records.length} trader records for ${protocol} on ${format(date, 'yyyy-MM-dd')}`);
    } catch (error) {
      console.error('Error importing trader data:', error);
      throw error;
    }
  }

  // Get top traders across all protocols
  static async getTopTradersAcrossProtocols(
    startDate: Date,
    endDate: Date,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_top_traders_across_protocols', {
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          limit_count: limit
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching top traders across protocols:', error);
      throw error;
    }
  }
}

export default TraderStatsService;