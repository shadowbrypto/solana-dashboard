import { db } from '../lib/db.js';
import { format } from 'date-fns';
import { traderStatsQueries, getTraderStatsQueryId } from '../config/traderStatsQueries.js';

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
  // Get trader stats for a protocol with pagination - OPTIMIZED with LIMIT/OFFSET
  static async getTraderStatsPaginated(
    protocol: string,
    offset: number,
    limit: number
  ): Promise<TraderStats[]> {
    try {
      // MySQL: Direct LIMIT/OFFSET query - no pagination loops needed
      const data = await db.query<TraderStats>(
        `SELECT protocol_name, user_address, volume_usd, date, chain
         FROM trader_stats
         WHERE protocol_name = ?
         ORDER BY volume_usd DESC
         LIMIT ? OFFSET ?`,
        [protocol.toLowerCase(), limit, offset]
      );

      return data;
    } catch (error) {
      console.error('Error fetching paginated trader stats:', error);
      throw error;
    }
  }

  // Get total count of traders for a protocol - OPTIMIZED with direct COUNT
  static async getTraderStatsCount(protocol: string): Promise<number> {
    try {
      // MySQL: Direct COUNT query - no RPC needed
      const result = await db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM trader_stats WHERE protocol_name = ?`,
        [protocol.toLowerCase()]
      );

      const count = result?.count || 0;
      console.log(`Total trader count for ${protocol}: ${count.toLocaleString()}`);
      return count;
    } catch (error) {
      console.error('Error counting trader stats:', error);
      throw error;
    }
  }

  // Get total volume for a protocol - OPTIMIZED with direct SUM
  static async getTotalVolumeForProtocol(protocol: string): Promise<number> {
    try {
      // MySQL: Direct SUM query - no pagination or RPC needed
      const result = await db.queryOne<{ total: number }>(
        `SELECT SUM(volume_usd) as total FROM trader_stats WHERE protocol_name = ?`,
        [protocol.toLowerCase()]
      );

      const total = result?.total || 0;
      console.log(`Total volume for ${protocol}: ${total.toLocaleString()}`);
      return total;
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
      let sql = `
        SELECT protocol_name, user_address, volume_usd, date, chain
        FROM trader_stats
        WHERE protocol_name = ?
          AND date >= ?
          AND date <= ?
        ORDER BY volume_usd DESC
      `;
      const params: any[] = [
        protocol.toLowerCase(),
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      ];

      if (limit !== undefined && limit > 0) {
        sql += ` LIMIT ?`;
        params.push(limit);
      }

      return await db.query<TraderStats>(sql, params);
    } catch (error) {
      console.error('Error fetching trader stats:', error);
      throw error;
    }
  }

  // Get aggregated trader analytics - OPTIMIZED with SQL aggregation
  static async getTraderAnalytics(
    protocol: string,
    startDate: Date,
    endDate: Date
  ): Promise<TraderAnalytics> {
    try {
      // Get aggregated trader data with volume sums per address
      const traderData = await db.query<{ user_address: string; volume: number; trade_count: number }>(
        `SELECT user_address,
                SUM(volume_usd) as volume,
                COUNT(*) as trade_count
         FROM trader_stats
         WHERE protocol_name = ?
           AND date >= ?
           AND date <= ?
         GROUP BY user_address
         ORDER BY volume DESC`,
        [protocol.toLowerCase(), format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')]
      );

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

      const totalVolume = traderData.reduce((sum, t) => sum + Number(t.volume), 0);
      const totalTraders = traderData.length;

      // Calculate top traders with percentages
      const topTraders = traderData.slice(0, 20).map(t => ({
        address: t.user_address,
        volume: Number(t.volume),
        tradeCount: Number(t.trade_count),
        percentageOfTotal: (Number(t.volume) / totalVolume) * 100
      }));

      // Calculate volume distribution
      const top10Volume = traderData.slice(0, 10).reduce((sum, t) => sum + Number(t.volume), 0);
      const top50Volume = traderData.slice(0, 50).reduce((sum, t) => sum + Number(t.volume), 0);
      const top100Volume = traderData.slice(0, 100).reduce((sum, t) => sum + Number(t.volume), 0);

      // Categorize traders
      const whaleThreshold = Math.ceil(totalTraders * 0.01);
      const sharkThreshold = Math.ceil(totalTraders * 0.1);

      return {
        topTraders,
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

  // Import trader data - OPTIMIZED with batch operations
  static async importTraderData(
    protocol: string,
    date: Date,
    data: Array<{ user: string; volume_usd: number }>,
    resumeMode: boolean = false
  ): Promise<void> {
    const isAxiom = protocol.toLowerCase() === 'axiom';
    const BATCH_SIZE = isAxiom ? 5000 : 10000;
    const MAX_RETRIES = isAxiom ? 10 : 3;
    const RETRY_DELAY = isAxiom ? 30000 : 1000;

    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 TRADER STATS IMPORT - ${protocol.toUpperCase()}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📅 Date: ${format(date, 'yyyy-MM-dd')}`);
      console.log(`📊 Records to import: ${data.length.toLocaleString()}`);
      console.log(`🔧 Batch size: ${BATCH_SIZE.toLocaleString()}`);
      console.log(`📦 Total batches: ${Math.ceil(data.length / BATCH_SIZE)}`);
      console.log(`${'='.repeat(60)}\n`);

      // Get existing count
      const existingCount = await this.getTraderStatsCount(protocol);
      console.log(`   - Found ${existingCount.toLocaleString()} existing records in database`);

      let recordsToSkip = 0;

      if (resumeMode && existingCount > 0) {
        console.log(`🔄 RESUME MODE: Skipping deletion and resuming from record ${existingCount + 1}`);
        recordsToSkip = existingCount;
      } else {
        // Delete existing data for this protocol
        console.log(`🗑️ Step 1: Clearing existing ${protocol} data...`);

        if (existingCount > 0) {
          // MySQL: Delete all records for this protocol
          const deleteResult = await db.delete('trader_stats', 'protocol_name = ?', [protocol.toLowerCase()]);
          console.log(`   ✅ Deleted ${deleteResult.affectedRows.toLocaleString()} records\n`);
        } else {
          console.log(`   ✅ No existing records to delete\n`);
        }
      }

      // Prepare records
      console.log(`🔧 Step 2: Preparing records...`);
      const chain = traderStatsQueries.find(q => q.protocol === protocol)?.chain || 'solana';
      const dateStr = format(date, 'yyyy-MM-dd');
      const protocolLower = protocol.toLowerCase();

      const dataToInsert = recordsToSkip > 0 ? data.slice(recordsToSkip) : data;
      console.log(`   - Total records in source: ${data.length.toLocaleString()}`);
      if (recordsToSkip > 0) {
        console.log(`   - Skipping first ${recordsToSkip.toLocaleString()} records (already in DB)`);
        console.log(`   - Remaining to insert: ${dataToInsert.length.toLocaleString()}`);
      }

      const records = dataToInsert.map(item => ({
        protocol_name: protocolLower,
        user_address: item.user,
        volume_usd: item.volume_usd,
        date: dateStr,
        chain: chain
      }));

      console.log(`   ✅ Prepared ${records.length.toLocaleString()} records for insertion\n`);

      // Batch insertion
      console.log(`💾 Step 3: Batch insertion...`);
      const startTime = Date.now();
      let successCount = 0;

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, Math.min(i + BATCH_SIZE, records.length));
        const batchIndex = Math.floor(i / BATCH_SIZE);
        const totalBatches = Math.ceil(records.length / BATCH_SIZE);
        let retries = 0;

        while (retries <= MAX_RETRIES) {
          try {
            const batchStart = Date.now();

            // MySQL: Batch insert
            const result = await db.batchInsert('trader_stats', batch);

            const batchTime = (Date.now() - batchStart) / 1000;
            const batchSpeed = Math.round(batch.length / batchTime);
            successCount += batch.length;

            const retryText = retries > 0 ? ` (retry ${retries})` : '';
            console.log(`✅ Batch ${batchIndex + 1}/${totalBatches}: ${batch.length.toLocaleString()} records in ${batchTime.toFixed(1)}s (${batchSpeed.toLocaleString()}/s)${retryText} - Total: ${successCount.toLocaleString()}/${records.length.toLocaleString()}`);

            // Add delay between batches for Axiom
            if (isAxiom && i + BATCH_SIZE < records.length) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            break;
          } catch (error: any) {
            retries++;
            if (retries <= MAX_RETRIES) {
              console.log(`⚠️  Batch ${batchIndex + 1} failed, retrying in ${RETRY_DELAY / 1000}s... (${retries}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            } else {
              throw error;
            }
          }
        }
      }

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

  // Get top traders across all protocols - requires stored procedure or complex query
  static async getTopTradersAcrossProtocols(
    startDate: Date,
    endDate: Date,
    limit: number = 50
  ): Promise<any[]> {
    try {
      // MySQL: Aggregate across protocols and get top traders
      const data = await db.query<any>(
        `SELECT user_address,
                SUM(volume_usd) as total_volume,
                COUNT(DISTINCT protocol_name) as protocol_count,
                GROUP_CONCAT(DISTINCT protocol_name) as protocols
         FROM trader_stats
         WHERE date >= ? AND date <= ?
         GROUP BY user_address
         ORDER BY total_volume DESC
         LIMIT ?`,
        [format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), limit]
      );

      return data || [];
    } catch (error) {
      console.error('Error fetching top traders across protocols:', error);
      throw error;
    }
  }

  // Get comprehensive stats using optimized SQL - REPLACES RPC function
  static async getComprehensiveProtocolStats(protocol: string): Promise<any> {
    try {
      console.log(`🚀 Getting comprehensive stats for ${protocol} using optimized SQL...`);

      // MySQL: Single optimized query with window functions
      const result = await db.queryOne<any>(
        `SELECT
           COUNT(*) as total_traders,
           SUM(volume_usd) as total_volume,
           AVG(volume_usd) as avg_volume_per_trader,
           (SELECT SUM(volume_usd) FROM (
             SELECT volume_usd FROM trader_stats
             WHERE protocol_name = ?
             ORDER BY volume_usd DESC
             LIMIT CEIL(COUNT(*) * 0.01)
           ) top1) as top_1_percent_volume,
           (SELECT SUM(volume_usd) FROM (
             SELECT volume_usd FROM trader_stats
             WHERE protocol_name = ?
             ORDER BY volume_usd DESC
             LIMIT CEIL(COUNT(*) * 0.05)
           ) top5) as top_5_percent_volume
         FROM trader_stats
         WHERE protocol_name = ?`,
        [protocol.toLowerCase(), protocol.toLowerCase(), protocol.toLowerCase()]
      );

      if (!result || result.total_traders === 0) {
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

      // Get percentile values using separate queries
      const totalTraders = parseInt(result.total_traders);
      const totalVolume = parseFloat(result.total_volume);
      const top1Count = Math.ceil(totalTraders * 0.01);
      const top5Count = Math.ceil(totalTraders * 0.05);

      // Get top 1% volume
      const top1Data = await db.query<{ volume_usd: number }>(
        `SELECT volume_usd FROM trader_stats
         WHERE protocol_name = ?
         ORDER BY volume_usd DESC
         LIMIT ?`,
        [protocol.toLowerCase(), top1Count]
      );
      const top1Volume = top1Data.reduce((sum, r) => sum + Number(r.volume_usd), 0);

      // Get top 5% volume
      const top5Data = await db.query<{ volume_usd: number }>(
        `SELECT volume_usd FROM trader_stats
         WHERE protocol_name = ?
         ORDER BY volume_usd DESC
         LIMIT ?`,
        [protocol.toLowerCase(), top5Count]
      );
      const top5Volume = top5Data.reduce((sum, r) => sum + Number(r.volume_usd), 0);

      // Get percentile values
      const p99Index = Math.floor(totalTraders * 0.01);
      const p95Index = Math.floor(totalTraders * 0.05);

      const percentileData = await db.query<{ volume_usd: number }>(
        `SELECT volume_usd FROM trader_stats
         WHERE protocol_name = ?
         ORDER BY volume_usd DESC
         LIMIT 1 OFFSET ?`,
        [protocol.toLowerCase(), p99Index]
      );
      const percentile99Volume = percentileData[0]?.volume_usd || 0;

      const percentile95Data = await db.query<{ volume_usd: number }>(
        `SELECT volume_usd FROM trader_stats
         WHERE protocol_name = ?
         ORDER BY volume_usd DESC
         LIMIT 1 OFFSET ?`,
        [protocol.toLowerCase(), p95Index]
      );
      const percentile95Volume = percentile95Data[0]?.volume_usd || 0;

      console.log(`✅ Comprehensive stats calculated for ${protocol}: ${totalTraders} traders, $${totalVolume.toLocaleString()} total volume`);

      return {
        totalTraders,
        totalVolume,
        avgVolumePerTrader: parseFloat(result.avg_volume_per_trader) || 0,
        top1PercentVolume: top1Volume,
        top5PercentVolume: top5Volume,
        percentile99Volume: parseFloat(String(percentile99Volume)),
        percentile95Volume: parseFloat(String(percentile95Volume)),
        top1PercentShare: totalVolume > 0 ? (top1Volume / totalVolume) * 100 : 0,
        top5PercentShare: totalVolume > 0 ? (top5Volume / totalVolume) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting comprehensive protocol stats:', error);
      throw error;
    }
  }

  // Get percentile brackets using optimized SQL
  static async getOptimizedPercentileBrackets(protocol: string): Promise<any[]> {
    try {
      console.log(`🚀 Getting percentile brackets for ${protocol} using optimized SQL...`);

      // Get total count first
      const totalResult = await db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM trader_stats WHERE protocol_name = ?`,
        [protocol.toLowerCase()]
      );
      const totalTraders = totalResult?.count || 0;

      if (totalTraders === 0) {
        console.log(`No percentile data found for ${protocol}`);
        return [];
      }

      // MySQL: Calculate percentile brackets using CASE
      const brackets = await db.query<any>(
        `WITH ranked AS (
           SELECT volume_usd,
                  ROW_NUMBER() OVER (ORDER BY volume_usd DESC) as rn,
                  COUNT(*) OVER () as total
           FROM trader_stats
           WHERE protocol_name = ?
         )
         SELECT
           CASE
             WHEN rn <= total * 0.01 THEN 99
             WHEN rn <= total * 0.05 THEN 95
             WHEN rn <= total * 0.10 THEN 90
             WHEN rn <= total * 0.25 THEN 75
             WHEN rn <= total * 0.50 THEN 50
             ELSE 0
           END as percentile,
           COUNT(*) as trader_count,
           SUM(volume_usd) as volume,
           SUM(volume_usd) / (SELECT SUM(volume_usd) FROM trader_stats WHERE protocol_name = ?) * 100 as volume_share
         FROM ranked
         GROUP BY
           CASE
             WHEN rn <= total * 0.01 THEN 99
             WHEN rn <= total * 0.05 THEN 95
             WHEN rn <= total * 0.10 THEN 90
             WHEN rn <= total * 0.25 THEN 75
             WHEN rn <= total * 0.50 THEN 50
             ELSE 0
           END
         ORDER BY percentile DESC`,
        [protocol.toLowerCase(), protocol.toLowerCase()]
      );

      console.log(`✅ Percentile brackets calculated for ${protocol}: ${brackets.length} brackets`);

      return brackets.map((bracket: any) => ({
        percentile: parseInt(bracket.percentile),
        traderCount: parseInt(bracket.trader_count),
        rankRange: `Top ${100 - bracket.percentile}%`,
        volume: parseFloat(bracket.volume),
        volumeShare: parseFloat(bracket.volume_share)
      }));
    } catch (error) {
      console.error('Error getting percentile brackets:', error);
      throw error;
    }
  }

  // Get paginated traders with pre-calculated stats - OPTIMIZED with window functions
  static async getOptimizedTradersPaginated(
    protocol: string,
    page: number,
    limit: number
  ): Promise<any[]> {
    try {
      console.log(`🚀 Getting paginated traders for ${protocol} (page ${page}, limit ${limit}) using optimized SQL...`);

      const offset = (page - 1) * limit;

      // MySQL: Use window functions for rank and volume share
      const data = await db.query<any>(
        `SELECT
           protocol_name,
           user_address,
           volume_usd,
           date,
           chain,
           ROW_NUMBER() OVER (ORDER BY volume_usd DESC) as \`rank\`,
           volume_usd / (SELECT SUM(volume_usd) FROM trader_stats WHERE protocol_name = ?) * 100 as volume_share
         FROM trader_stats
         WHERE protocol_name = ?
         ORDER BY volume_usd DESC
         LIMIT ? OFFSET ?`,
        [protocol.toLowerCase(), protocol.toLowerCase(), limit, offset]
      );

      console.log(`✅ Retrieved ${data.length} traders for ${protocol} page ${page}`);

      return data.map((trader: any) => ({
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
      // MySQL: Group by protocol_name for counts
      const data = await db.query<{ protocol_name: string; count: number }>(
        `SELECT protocol_name, COUNT(*) as count
         FROM trader_stats
         GROUP BY protocol_name`
      );

      const counts: Record<string, number> = {};
      data.forEach(row => {
        counts[row.protocol_name] = row.count;
      });

      return counts;
    } catch (error) {
      console.error('Error getting protocol row counts:', error);
      return {};
    }
  }

  // Get volume range distribution - OPTIMIZED with CASE statement
  static async getVolumeRanges(protocol: string): Promise<VolumeRangeData[]> {
    try {
      console.log(`Calculating volume ranges for ${protocol}...`);

      // Helper function to format volume range labels
      const formatRangeLabel = (min: number, max: number | null): string => {
        const formatNumber = (num: number): string => {
          return '$' + num.toLocaleString('en-US');
        };

        if (max === null) {
          return `Greater than ${formatNumber(min)}`;
        } else if (min === 0) {
          return `Less than ${formatNumber(max)}`;
        } else {
          return `${formatNumber(min)} - ${formatNumber(max)}`;
        }
      };

      // Define volume ranges
      const ranges = [
        { label: formatRangeLabel(5000000, null), shortLabel: '5m+', min: 5000000, max: null },
        { label: formatRangeLabel(4000000, null), shortLabel: '4m+', min: 4000000, max: null },
        { label: formatRangeLabel(3000000, null), shortLabel: '3m+', min: 3000000, max: null },
        { label: formatRangeLabel(2000000, null), shortLabel: '2m+', min: 2000000, max: null },
        { label: formatRangeLabel(1000000, null), shortLabel: '1m+', min: 1000000, max: null },
        { label: formatRangeLabel(500000, null), shortLabel: '500k+', min: 500000, max: null },
        { label: formatRangeLabel(4000000, 5000000), shortLabel: '4m-5m', min: 4000000, max: 5000000 },
        { label: formatRangeLabel(3000000, 4000000), shortLabel: '3m-4m', min: 3000000, max: 4000000 },
        { label: formatRangeLabel(2000000, 3000000), shortLabel: '2m-3m', min: 2000000, max: 3000000 },
        { label: formatRangeLabel(1000000, 2000000), shortLabel: '1m-2m', min: 1000000, max: 2000000 },
        { label: formatRangeLabel(500000, 1000000), shortLabel: '500k-1m', min: 500000, max: 1000000 },
        { label: formatRangeLabel(250000, 500000), shortLabel: '250k-500k', min: 250000, max: 500000 },
        { label: formatRangeLabel(100000, 250000), shortLabel: '100k-250k', min: 100000, max: 250000 },
        { label: formatRangeLabel(50000, 100000), shortLabel: '50k-100k', min: 50000, max: 100000 },
        { label: formatRangeLabel(10000, 50000), shortLabel: '10k-50k', min: 10000, max: 50000 }
      ];

      // MySQL: Get total traders (excluding < $10k)
      const totalResult = await db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM trader_stats
         WHERE protocol_name = ? AND volume_usd >= 10000`,
        [protocol.toLowerCase()]
      );
      const totalTraders = totalResult?.count || 0;

      if (totalTraders === 0) {
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

      // MySQL: Calculate counts for each range in parallel
      const rangePromises = ranges.map(async (range) => {
        let sql = `SELECT COUNT(*) as count FROM trader_stats
                   WHERE protocol_name = ? AND volume_usd >= ?`;
        const params: any[] = [protocol.toLowerCase(), range.min];

        if (range.max !== null) {
          sql += ` AND volume_usd < ?`;
          params.push(range.max);
        }

        const result = await db.queryOne<{ count: number }>(sql, params);
        const traderCount = result?.count || 0;

        return {
          rangeLabel: range.label,
          shortLabel: range.shortLabel,
          min: range.min,
          max: range.max,
          traderCount,
          totalVolume: 0, // Not displayed in UI
          volumeShare: 0, // Not displayed in UI
          traderShare: 0  // Not displayed in UI
        };
      });

      const rangeData = await Promise.all(rangePromises);

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
      // Ensure we never export traders with volume < $10k
      const effectiveMinVolume = Math.max(minVolume, 10000);

      console.log(`Fetching traders in volume range for ${protocol}...`);
      console.log(`  Min: ${effectiveMinVolume.toLocaleString()}, Max: ${maxVolume ? maxVolume.toLocaleString() : 'unlimited'}`);

      // MySQL: Direct query - no pagination needed for export
      let sql = `SELECT user_address, volume_usd
                 FROM trader_stats
                 WHERE protocol_name = ? AND volume_usd >= ?`;
      const params: any[] = [protocol.toLowerCase(), effectiveMinVolume];

      if (maxVolume !== null) {
        sql += ` AND volume_usd < ?`;
        params.push(maxVolume);
      }

      sql += ` ORDER BY volume_usd DESC`;

      const data = await db.query<{ user_address: string; volume_usd: number }>(sql, params);

      console.log(`  ✅ Retrieved ${data.length.toLocaleString()} traders for CSV export\n`);
      return data;
    } catch (error) {
      console.error('Error fetching traders in volume range:', error);
      throw error;
    }
  }
}

export default TraderStatsService;
