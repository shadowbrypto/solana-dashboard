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

export interface VolumeRangeData {
  rangeLabel: string; // Descriptive label (e.g., "Volume Less than 50,000")
  shortLabel: string; // Short label for file names (e.g., "sub-50k")
  min: number;
  max: number | null; // null for the highest range (5M+)
  traderCount: number;
  totalVolume: number;
  volumeShare: number; // percentage of total volume
  traderShare: number; // percentage of total traders
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

  // Get total count of traders for a protocol (optimized SQL function)
  static async getTraderStatsCount(protocol: string): Promise<number> {
    try {
      // Try using the optimized SQL function first
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('get_protocol_trader_count', { 
          protocol_name: protocol.toLowerCase() 
        });

      if (!sqlError && sqlResult !== null) {
        console.log(`Total trader count for ${protocol} (SQL function): ${sqlResult.toLocaleString()}`);
        return parseInt(sqlResult);
      }

      console.log('SQL function not available, falling back to count query');
      
      // Fallback to regular count
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

  // Import trader data - TIMEOUT RESISTANT VERSION
  static async importTraderData(
    protocol: string,
    date: Date,
    data: Array<{ user: string; volume_usd: number }>
  ): Promise<void> {
    // Optimized for large datasets with timeout resistance
    const BATCH_SIZE = 10000; // 10k rows for maximum reliability
    const MAX_CONCURRENT = 1; // Sequential processing to avoid database overload
    const MAX_RETRIES = 3; // Retry failed batches
    
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 TRADER STATS IMPORT - ${protocol.toUpperCase()}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📅 Date: ${format(date, 'yyyy-MM-dd')}`);
      console.log(`📊 Records to import: ${data.length.toLocaleString()}`);
      console.log(`🔧 Batch size: ${BATCH_SIZE.toLocaleString()}`);
      console.log(`🚀 Concurrent batches: ${MAX_CONCURRENT}`);
      console.log(`📦 Total batches: ${Math.ceil(data.length / BATCH_SIZE)}`);
      console.log(`${'='.repeat(60)}\n`);

      // Step 1: Delete ALL existing data for this protocol in batches
      console.log(`🗑️ Step 1: Clearing existing ${protocol} data...`);

      const { count: existingCount } = await supabase
        .from('trader_stats')
        .select('*', { count: 'exact', head: true })
        .eq('protocol_name', protocol.toLowerCase());

      console.log(`   - Found ${(existingCount || 0).toLocaleString()} existing records to delete`);

      if (existingCount && existingCount > 0) {
        // Batch delete to avoid timeout - delete 50k at a time using range pagination
        const DELETE_BATCH_SIZE = 50000;
        let totalDeleted = 0;
        let currentOffset = 0;

        while (totalDeleted < existingCount) {
          // Fetch IDs of next batch using range pagination
          const { data: batch, error: fetchError } = await supabase
            .from('trader_stats')
            .select('id')
            .eq('protocol_name', protocol.toLowerCase())
            .range(currentOffset, currentOffset + DELETE_BATCH_SIZE - 1);

          if (fetchError) {
            console.error('❌ Error fetching batch for deletion:', fetchError);
            throw fetchError;
          }

          if (!batch || batch.length === 0) break;

          // Delete this batch by IDs
          const ids = batch.map(r => r.id);
          const { error: deleteError, count: deletedCount } = await supabase
            .from('trader_stats')
            .delete({ count: 'exact' })
            .in('id', ids);

          if (deleteError) {
            console.error('❌ Delete batch operation failed:', deleteError);
            throw deleteError;
          }

          totalDeleted += deletedCount || 0;
          currentOffset += batch.length;
          console.log(`   🗑️  Deleted ${totalDeleted.toLocaleString()}/${existingCount.toLocaleString()} records (batch of ${batch.length.toLocaleString()})...`);
        }

        console.log(`   ✅ Deleted ${totalDeleted.toLocaleString()} records\n`);
      } else {
        console.log(`   ✅ No existing records to delete\n`);
      }

      // Step 2: Prepare records
      console.log(`🔧 Step 2: Preparing records...`);
      const chain = traderStatsQueries.find(q => q.protocol === protocol)?.chain || 'solana';
      const dateStr = format(date, 'yyyy-MM-dd');
      const protocolLower = protocol.toLowerCase();
      
      const records = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        records[i] = {
          protocol_name: protocolLower,
          user_address: data[i].user,
          volume_usd: data[i].volume_usd,
          date: dateStr,
          chain: chain
        };
      }
      
      console.log(`   ✅ Prepared ${records.length.toLocaleString()} records\n`);

      // Step 3: Parallel batch insertion
      console.log(`💾 Step 3: Parallel batch insertion...`);
      const startTime = Date.now();
      let successCount = 0;
      
      // Create batches
      const batches: any[][] = [];
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        batches.push(records.slice(i, Math.min(i + BATCH_SIZE, records.length)));
      }
      
      // Timeout-resistant batch processing with retry logic
      const processBatch = async (batch: any[], batchIndex: number, retryCount: number = 0): Promise<void> => {
        const batchStart = Date.now();
        
        try {
          // Use minimal options for speed with timeout handling
          const { error } = await supabase
            .from('trader_stats')
            .insert(batch);

          if (error) {
            // Check if it's a timeout error that we can retry
            if (error.code === '57014' && retryCount < MAX_RETRIES) {
              console.log(`⚠️  Batch ${batchIndex + 1} timeout, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
              return processBatch(batch, batchIndex, retryCount + 1);
            }
            
            console.error(`❌ Batch ${batchIndex + 1} failed after ${retryCount} retries:`, error.message);
            throw error;
          }

          const batchTime = (Date.now() - batchStart) / 1000;
          const batchSpeed = Math.round(batch.length / batchTime);
          successCount += batch.length;
          
          const retryText = retryCount > 0 ? ` (retry ${retryCount})` : '';
          console.log(`✅ Batch ${batchIndex + 1}/${batches.length}: ${batch.length.toLocaleString()} records in ${batchTime.toFixed(1)}s (${batchSpeed.toLocaleString()}/s)${retryText} - Total: ${successCount.toLocaleString()}/${records.length.toLocaleString()}`);
        } catch (error: any) {
          // Handle any other errors
          if (error.code === '57014' && retryCount < MAX_RETRIES) {
            console.log(`⚠️  Batch ${batchIndex + 1} timeout (catch), retrying... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return processBatch(batch, batchIndex, retryCount + 1);
          }
          throw error;
        }
      };

      // Ultra-optimized batch processing with rolling window
      let completedBatches = 0;
      let activeBatches = new Set<Promise<void>>();
      
      for (let i = 0; i < batches.length; i++) {
        // Create batch promise
        const batchPromise = processBatch(batches[i], i).then(() => {
          completedBatches++;
          activeBatches.delete(batchPromise);
        });
        
        activeBatches.add(batchPromise);
        
        // Control concurrency with rolling window approach
        if (activeBatches.size >= MAX_CONCURRENT) {
          // Wait for at least one batch to complete
          await Promise.race(Array.from(activeBatches));
        }
      }
      
      // Wait for all remaining batches to complete
      await Promise.all(Array.from(activeBatches));
      
      const duration = (Date.now() - startTime) / 1000;
      const speed = Math.round(successCount / duration);

      console.log(`\n📊 Import Summary for ${protocol.toUpperCase()}:`);
      console.log(`   ✅ Successfully imported: ${successCount.toLocaleString()} records`);
      console.log(`   ⌚ Total time: ${duration.toFixed(1)} seconds`);
      console.log(`   🚀 Speed: ${speed.toLocaleString()} records/second`);
      
      console.log(`\n✅ Import completed for ${protocol}\n${'='.repeat(60)}\n`);
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

  // Get comprehensive stats using optimized SQL function
  static async getComprehensiveProtocolStats(protocol: string): Promise<any> {
    try {
      console.log(`🚀 Getting comprehensive stats for ${protocol} using optimized SQL...`);
      
      // Use the optimized SQL function that calculates everything in one query
      const { data: statsResult, error: statsError } = await supabase
        .rpc('get_comprehensive_protocol_stats', { 
          protocol_name_param: protocol.toLowerCase() 
        });

      if (statsError) {
        console.log('SQL function not available, falling back to calculation method');
        throw statsError;
      }

      if (!statsResult || statsResult.length === 0) {
        console.log(`No data found for ${protocol}`);
        return {
          totalTraders: 0,
          totalVolume: 0,
          avgVolumePerTrader: 0,
          top1PercentVolume: 0,
          top5PercentVolume: 0,
          percentile99Volume: 0,
          percentile95Volume: 0,
          top1PercentShare: 0,
          top5PercentShare: 0
        };
      }

      const stats = statsResult[0];
      console.log(`✅ Comprehensive stats calculated for ${protocol}: ${stats.total_traders} traders, $${parseFloat(stats.total_volume).toLocaleString()} total volume`);

      return {
        totalTraders: parseInt(stats.total_traders),
        totalVolume: parseFloat(stats.total_volume),
        avgVolumePerTrader: parseFloat(stats.avg_volume_per_trader),
        top1PercentVolume: parseFloat(stats.top_1_percent_volume),
        top5PercentVolume: parseFloat(stats.top_5_percent_volume),
        percentile99Volume: parseFloat(stats.percentile_99_volume),
        percentile95Volume: parseFloat(stats.percentile_95_volume),
        top1PercentShare: parseFloat(stats.top_1_percent_share),
        top5PercentShare: parseFloat(stats.top_5_percent_share)
      };
    } catch (error) {
      console.error('Error getting comprehensive protocol stats:', error);
      throw error;
    }
  }

  // Get percentile brackets using optimized SQL function
  static async getOptimizedPercentileBrackets(protocol: string): Promise<any[]> {
    try {
      console.log(`🚀 Getting percentile brackets for ${protocol} using optimized SQL...`);
      
      const { data: bracketsResult, error: bracketsError } = await supabase
        .rpc('get_protocol_percentile_brackets', { 
          protocol_name_param: protocol.toLowerCase() 
        });

      if (bracketsError) {
        console.log('SQL function not available, falling back to calculation method');
        throw bracketsError;
      }

      if (!bracketsResult || bracketsResult.length === 0) {
        console.log(`No percentile data found for ${protocol}`);
        return [];
      }

      console.log(`✅ Percentile brackets calculated for ${protocol}: ${bracketsResult.length} brackets`);

      return bracketsResult.map((bracket: any) => ({
        percentile: parseInt(bracket.percentile),
        traderCount: parseInt(bracket.trader_count),
        rankRange: bracket.rank_range,
        volume: parseFloat(bracket.volume),
        volumeShare: parseFloat(bracket.volume_share)
      }));
    } catch (error) {
      console.error('Error getting percentile brackets:', error);
      throw error;
    }
  }

  // Get paginated traders with pre-calculated stats using optimized SQL
  static async getOptimizedTradersPaginated(
    protocol: string,
    page: number,
    limit: number
  ): Promise<any[]> {
    try {
      console.log(`🚀 Getting paginated traders for ${protocol} (page ${page}, limit ${limit}) using optimized SQL...`);
      
      const { data: tradersResult, error: tradersError } = await supabase
        .rpc('get_top_traders_with_stats', { 
          protocol_name_param: protocol.toLowerCase(),
          page_num: page,
          page_size: limit
        });

      if (tradersError) {
        console.log('SQL function not available, falling back to regular pagination');
        throw tradersError;
      }

      if (!tradersResult) {
        console.log(`No trader data found for ${protocol}`);
        return [];
      }

      console.log(`✅ Retrieved ${tradersResult.length} traders for ${protocol} page ${page}`);

      return tradersResult.map((trader: any) => ({
        protocol_name: trader.protocol_name,
        user_address: trader.user_address,
        volume_usd: parseFloat(trader.volume_usd),
        date: trader.date,
        chain: trader.chain,
        rank: parseInt(trader.rank),
        volumeShare: parseFloat(trader.volume_share)
      }));
    } catch (error) {
      console.error('Error getting optimized paginated traders:', error);
      throw error;
    }
  }

  // Get row counts for all protocols
  static async getAllProtocolRowCounts(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('trader_stats')
        .select('protocol_name')
        .then(async ({ data, error }) => {
          if (error) throw error;

          // Count records by protocol
          const counts: Record<string, number> = {};
          const protocols = ['photon', 'axiom', 'bloom', 'trojan'];

          for (const protocol of protocols) {
            const { count, error: countError } = await supabase
              .from('trader_stats')
              .select('*', { count: 'exact', head: true })
              .eq('protocol_name', protocol);

            if (!countError) {
              counts[protocol] = count || 0;
            } else {
              counts[protocol] = 0;
            }
          }

          return { data: counts, error: null };
        });

      if (error) throw error;
      return data || {};
    } catch (error) {
      console.error('Error getting protocol row counts:', error);
      return {};
    }
  }

  // Get volume range distribution for a protocol
  static async getVolumeRanges(protocol: string): Promise<VolumeRangeData[]> {
    try {
      console.log(`Calculating volume ranges for ${protocol}...`);

      // Helper function to format volume range labels
      const formatRangeLabel = (min: number, max: number | null): string => {
        const formatNumber = (num: number): string => {
          return '$' + num.toLocaleString('en-US');
        };

        if (max === null) {
          // Greater than case
          return `Greater than ${formatNumber(min)}`;
        } else if (min === 0) {
          // Less than case
          return `Less than ${formatNumber(max)}`;
        } else {
          // Between case
          return `${formatNumber(min)} - ${formatNumber(max)}`;
        }
      };

      // Define volume ranges with descriptive labels (highest to lowest)
      const ranges = [
        { label: formatRangeLabel(5000000, null), shortLabel: '5m+', min: 5000000, max: null },
        { label: formatRangeLabel(4000000, 5000000), shortLabel: '4m-5m', min: 4000000, max: 5000000 },
        { label: formatRangeLabel(3000000, 4000000), shortLabel: '3m-4m', min: 3000000, max: 4000000 },
        { label: formatRangeLabel(2000000, 3000000), shortLabel: '2m-3m', min: 2000000, max: 3000000 },
        { label: formatRangeLabel(1000000, 2000000), shortLabel: '1m-2m', min: 1000000, max: 2000000 },
        { label: formatRangeLabel(500000, 1000000), shortLabel: '500k-1m', min: 500000, max: 1000000 },
        { label: formatRangeLabel(250000, 500000), shortLabel: '250k-500k', min: 250000, max: 500000 },
        { label: formatRangeLabel(100000, 250000), shortLabel: '100k-250k', min: 100000, max: 250000 },
        { label: formatRangeLabel(50000, 100000), shortLabel: '50k-100k', min: 50000, max: 100000 },
        { label: formatRangeLabel(0, 50000), shortLabel: 'sub-50k', min: 0, max: 50000 }
      ];

      // Get total trader count for the protocol (using COUNT for efficiency)
      const { count: totalTraders, error: countError } = await supabase
        .from('trader_stats')
        .select('*', { count: 'exact', head: true })
        .eq('protocol_name', protocol.toLowerCase());

      if (countError) throw countError;

      if (!totalTraders || totalTraders === 0) {
        return ranges.map(r => ({
          rangeLabel: r.label,
          shortLabel: r.shortLabel,
          min: r.min,
          max: r.max,
          traderCount: 0,
          totalVolume: 0,
          volumeShare: 0,
          traderShare: 0
        }));
      }

      console.log(`Total traders for ${protocol}: ${totalTraders.toLocaleString()}`);

      // Calculate stats for each range using database queries
      const rangeResults = await Promise.all(ranges.map(async (range) => {
        // Build query for this range
        let countQuery = supabase
          .from('trader_stats')
          .select('*', { count: 'exact', head: true })
          .eq('protocol_name', protocol.toLowerCase())
          .gte('volume_usd', range.min);

        let volumeQuery = supabase
          .from('trader_stats')
          .select('volume_usd')
          .eq('protocol_name', protocol.toLowerCase())
          .gte('volume_usd', range.min)
          .limit(1000000); // Set high limit to avoid default 1000 row limit

        // Add upper bound if not the highest range
        if (range.max !== null) {
          countQuery = countQuery.lt('volume_usd', range.max);
          volumeQuery = volumeQuery.lt('volume_usd', range.max);
        }

        // Execute both queries
        const [countResult, volumeResult] = await Promise.all([
          countQuery,
          volumeQuery
        ]);

        if (countResult.error) throw countResult.error;
        if (volumeResult.error) throw volumeResult.error;

        const traderCount = countResult.count || 0;
        const rangeVolume = volumeResult.data?.reduce((sum, t) => sum + t.volume_usd, 0) || 0;

        return {
          label: range.label,
          shortLabel: range.shortLabel,
          min: range.min,
          max: range.max,
          traderCount,
          rangeVolume
        };
      }));

      // Calculate total volume from sum of all ranges (avoids fetching all records)
      const totalVolume = rangeResults.reduce((sum, r) => sum + r.rangeVolume, 0);
      console.log(`Total volume for ${protocol}: $${totalVolume.toLocaleString()}`);

      // Build final range data with percentages
      const rangeData = rangeResults.map(r => ({
        rangeLabel: r.label,
        shortLabel: r.shortLabel,
        min: r.min,
        max: r.max,
        traderCount: r.traderCount,
        totalVolume: r.rangeVolume,
        volumeShare: totalVolume > 0 ? (r.rangeVolume / totalVolume) * 100 : 0,
        traderShare: totalTraders > 0 ? (r.traderCount / totalTraders) * 100 : 0
      }));

      console.log(`Volume ranges calculated for ${protocol}: ${rangeData.length} ranges`);
      return rangeData;
    } catch (error) {
      console.error('Error calculating volume ranges:', error);
      throw error;
    }
  }

  // Get traders in a specific volume range for CSV export
  static async getTradersInVolumeRange(
    protocol: string,
    minVolume: number,
    maxVolume: number | null
  ): Promise<{ user_address: string; volume_usd: number }[]> {
    try {
      let query = supabase
        .from('trader_stats')
        .select('user_address, volume_usd')
        .eq('protocol_name', protocol.toLowerCase())
        .gte('volume_usd', minVolume)
        .order('volume_usd', { ascending: false })
        .limit(1000000); // Set high limit to avoid default 1000 row limit

      if (maxVolume !== null) {
        query = query.lt('volume_usd', maxVolume);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching traders in volume range:', error);
      throw error;
    }
  }
}

export default TraderStatsService;