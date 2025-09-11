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
  // Get trader stats for a protocol with pagination
  static async getTraderStatsPaginated(
    protocol: string,
    offset: number,
    limit: number
  ): Promise<TraderStats[]> {
    try {
      let query = supabase
        .from('trader_stats')
        .select('*')
        .eq('protocol_name', protocol.toLowerCase())
        .order('volume_usd', { ascending: false });

      // Always use batching for consistency
      if (limit > 1000) {
        // For very large requests, fetch in batches
        const allData: TraderStats[] = [];
        const batchSize = 1000;
        let currentOffset = offset;
        let remaining = limit;
        
        while (remaining > 0) {
          const currentBatch = Math.min(batchSize, remaining);
          const { data, error } = await supabase
            .from('trader_stats')
            .select('*')
            .eq('protocol_name', protocol.toLowerCase())
            .order('volume_usd', { ascending: false })
            .range(currentOffset, currentOffset + currentBatch - 1);
            
          if (error) throw error;
          if (!data || data.length === 0) break;
          
          allData.push(...data);
          currentOffset += currentBatch;
          remaining -= currentBatch;
          
          // Log progress for large datasets
          if (allData.length % 5000 === 0) {
            console.log(`Fetched ${allData.length} records so far...`);
          }
        }
        
        return allData;
      } else {
        // Standard pagination for smaller requests
        const { data, error } = await query.range(offset, offset + limit - 1);
        if (error) throw error;
        return data || [];
      }
    } catch (error) {
      console.error('Error fetching paginated trader stats:', error);
      throw error;
    }
  }

  // Get total count of traders for a protocol
  static async getTraderStatsCount(protocol: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('trader_stats')
        .select('*', { count: 'exact', head: true })
        .eq('protocol_name', protocol.toLowerCase());

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting trader stats:', error);
      throw error;
    }
  }

  // Get total volume for a protocol (calculated at database level)
  static async getTotalVolumeForProtocol(protocol: string): Promise<number> {
    try {
      // Try using the SQL function first
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('calculate_protocol_total_volume', { 
          protocol_name: protocol.toLowerCase() 
        });

      if (!sqlError && sqlResult !== null) {
        console.log(`Total volume for ${protocol} (SQL function): ${parseFloat(sqlResult).toLocaleString()}`);
        return parseFloat(sqlResult);
      }

      console.log('SQL function not available, falling back to client calculation');
      
      // Fallback to client-side calculation with proper pagination
      let totalVolume = 0;
      let offset = 0;
      const batchSize = 1000;
      
      // Fetch all records in batches to avoid the 1000 row limit
      while (true) {
        const { data, error } = await supabase
          .from('trader_stats')
          .select('volume_usd')
          .eq('protocol_name', protocol.toLowerCase())
          .range(offset, offset + batchSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        // Add this batch's volume to total
        const batchVolume = data.reduce((sum, trader) => {
          const volume = parseFloat(trader.volume_usd?.toString() || '0');
          return sum + (isNaN(volume) ? 0 : volume);
        }, 0);
        
        totalVolume += batchVolume;
        offset += batchSize;
        
        // Log progress for large datasets
        if (offset % 10000 === 0) {
          console.log(`Volume calculation progress: processed ${offset} records...`);
        }
      }

      console.log(`Total volume for ${protocol} (client calculation): ${totalVolume.toLocaleString()}`);
      return totalVolume;
    } catch (error) {
      console.error('Error calculating total volume:', error);
      throw error;
    }
  }

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

  // Get pre-calculated percentiles from database
  static async getProtocolPercentiles(protocol: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('protocol_percentiles')
        .select('*')
        .eq('protocol_name', protocol.toLowerCase())
        .order('percentile', { ascending: true });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log(`No pre-calculated percentiles found for ${protocol}, triggering refresh...`);
        await this.refreshProtocolPercentiles(protocol);
        
        // Try again after refresh
        const { data: refreshedData, error: refreshError } = await supabase
          .from('protocol_percentiles')
          .select('*')
          .eq('protocol_name', protocol.toLowerCase())
          .order('percentile', { ascending: true });
        
        if (refreshError) throw refreshError;
        return refreshedData || [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching protocol percentiles:', error);
      throw error;
    }
  }

  // Refresh percentiles for a protocol using SQL function
  static async refreshProtocolPercentiles(protocol: string): Promise<void> {
    try {
      console.log(`Refreshing percentiles for ${protocol}...`);
      
      const { error } = await supabase.rpc('refresh_protocol_percentiles', {
        protocol_name_param: protocol.toLowerCase()
      });
      
      if (error) throw error;
      console.log(`Successfully refreshed percentiles for ${protocol}`);
    } catch (error) {
      console.error('Error refreshing protocol percentiles:', error);
      throw error;
    }
  }

  // Check if percentiles need refresh (older than 1 hour)
  static async shouldRefreshPercentiles(protocol: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('protocol_percentiles')
        .select('calculated_at')
        .eq('protocol_name', protocol.toLowerCase())
        .order('calculated_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return true; // No data exists, need refresh
      }
      
      const lastCalculated = new Date(data[0].calculated_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      return lastCalculated < oneHourAgo;
    } catch (error) {
      console.error('Error checking percentile refresh status:', error);
      return true; // Err on the side of refreshing
    }
  }
}

export default TraderStatsService;