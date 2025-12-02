import { db } from '../lib/db.js';
import {
  getDuneQueryId,
  hasValidDuneQueryId,
  getAllConfiguredProtocolIds,
  getValidDuneQueryMappings
} from '../config/projected-stats-config.js';

export interface ProjectedStatsData {
  id?: number;
  protocol_name: string;
  formatted_day: string;
  fees_sol: number;
  volume_sol: number;
  fees_usd: number;
  volume_usd: number;
  created_at?: string;
  updated_at?: string;
}

export interface DuneQueryResult {
  formattedDay: string;
  fees_sol: number;
  volume_sol: number;
  fees_usd: number;
  volume_usd: number;
}

/**
 * Fetch projected data from Dune Analytics
 */
export async function fetchProjectedDataFromDune(duneQueryId: string): Promise<DuneQueryResult[]> {
  try {
    const duneApiKey = process.env.DUNE_API_KEY;
    if (!duneApiKey) {
      console.warn('DUNE_API_KEY environment variable is not set. Skipping Dune data fetch.');
      return [];
    }

    const response = await fetch(`https://api.dune.com/api/v1/query/${duneQueryId}/results`, {
      headers: {
        'X-Dune-API-Key': duneApiKey,
      },
    });

    if (!response.ok) {
      const errorDetails = response.status === 401
        ? 'Unauthorized - Please check your DUNE_API_KEY'
        : `${response.status} - ${response.statusText}`;
      throw new Error(`Failed to fetch data from Dune Analytics: ${errorDetails}`);
    }

    const data = await response.json();

    return data.result.rows.map((row: any) => {
      let formattedDate = row.formattedDay;

      // Convert DD-MM-YYYY to YYYY-MM-DD format
      if (formattedDate && typeof formattedDate === 'string') {
        if (formattedDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const parts = formattedDate.split('-');
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      return {
        formattedDay: formattedDate,
        fees_sol: parseFloat(row.fees_sol) || 0,
        volume_sol: parseFloat(row.volume_sol) || 0,
        fees_usd: parseFloat(row.fees_usd) || 0,
        volume_usd: parseFloat(row.volume_usd) || 0,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('DUNE_API_KEY')) {
      console.warn(`Dune Analytics integration not configured. Query ${duneQueryId} skipped.`);
    } else {
      console.error(`Error fetching data from Dune query ${duneQueryId}:`, error);
    }
    return [];
  }
}

/**
 * Save projected stats data to database (batch upsert - optimized)
 */
export async function saveProjectedStats(data: ProjectedStatsData[]): Promise<void> {
  if (!data || data.length === 0) return;

  try {
    const protocolName = data[0].protocol_name;
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split('T')[0];

    // Pre-refresh snapshot for logging
    console.log(`\n[REFRESH] Updating projected_stats for ${protocolName}`);

    const preRefreshData = await db.query<{ formatted_day: string; volume_usd: number; fees_usd: number }>(
      `SELECT formatted_day, volume_usd, fees_usd
       FROM projected_stats
       WHERE protocol_name = ? AND formatted_day >= ?
       ORDER BY formatted_day ASC`,
      [protocolName, fifteenDaysAgoStr]
    );

    console.log(`[REFRESH] Found ${preRefreshData.length} existing rows`);

    // Prepare data for batch upsert
    const records = data.map(row => ({
      protocol_name: row.protocol_name,
      formatted_day: row.formatted_day,
      fees_sol: row.fees_sol,
      volume_sol: row.volume_sol,
      fees_usd: row.fees_usd,
      volume_usd: row.volume_usd
    }));

    // Batch upsert - much more efficient than individual inserts
    await db.batchUpsert('projected_stats', records, ['protocol_name', 'formatted_day']);

    // Post-refresh count
    const [{ count }] = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM projected_stats
       WHERE protocol_name = ? AND formatted_day >= ?`,
      [protocolName, fifteenDaysAgoStr]
    );

    console.log(`[REFRESH] After upsert: ${count} rows for ${protocolName}`);
  } catch (error) {
    console.error('Error saving projected stats:', error);
    throw error;
  }
}

/**
 * Get projected stats for specific protocols and date range (optimized)
 */
export async function getProjectedStats(
  protocolNames?: string[],
  startDate?: string,
  endDate?: string
): Promise<ProjectedStatsData[]> {
  try {
    let sql = 'SELECT * FROM projected_stats WHERE 1=1';
    const params: any[] = [];

    if (protocolNames && protocolNames.length > 0) {
      const placeholders = protocolNames.map(() => '?').join(', ');
      sql += ` AND protocol_name IN (${placeholders})`;
      params.push(...protocolNames);
    }

    if (startDate) {
      sql += ' AND formatted_day >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND formatted_day <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY formatted_day ASC, protocol_name ASC';

    return await db.query<ProjectedStatsData>(sql, params);
  } catch (error) {
    console.error('Error fetching projected stats:', error);
    throw error;
  }
}

/**
 * Get projected stats for a specific date (optimized)
 */
export async function getProjectedStatsForDate(date: string): Promise<ProjectedStatsData[]> {
  try {
    return await db.query<ProjectedStatsData>(
      `SELECT * FROM projected_stats
       WHERE formatted_day = ?
       ORDER BY protocol_name ASC`,
      [date]
    );
  } catch (error) {
    console.error('Error fetching projected stats for date:', error);
    throw error;
  }
}

/**
 * Update projected data for all protocols with Dune query IDs
 */
export async function updateAllProjectedData(): Promise<{ successCount: number; totalCount: number; protocols: string[] }> {
  try {
    console.log('Starting projected data update for all protocols...');

    if (!process.env.DUNE_API_KEY) {
      console.warn('DUNE_API_KEY is not configured. Projected stats update skipped.');
      return { successCount: 0, totalCount: 0, protocols: [] };
    }

    const validMappings = getValidDuneQueryMappings();
    let successCount = 0;
    const successfulProtocols: string[] = [];

    for (const { protocolId, duneQueryId } of validMappings) {
      try {
        console.log(`Fetching projected data for ${protocolId}...`);

        const duneData = await fetchProjectedDataFromDune(duneQueryId);

        if (duneData.length > 0) {
          const projectedData: ProjectedStatsData[] = duneData.map(row => ({
            protocol_name: protocolId,
            formatted_day: row.formattedDay,
            fees_sol: row.fees_sol,
            volume_sol: row.volume_sol,
            fees_usd: row.fees_usd,
            volume_usd: row.volume_usd,
          }));

          await saveProjectedStats(projectedData);
          console.log(`Updated ${projectedData.length} records for ${protocolId}`);
          successCount++;
          successfulProtocols.push(protocolId);
        } else {
          console.log(`No data returned for ${protocolId}`);
        }
      } catch (error) {
        console.error(`Error updating projected data for ${protocolId}:`, error);
      }
    }

    const allProtocolIds = getAllConfiguredProtocolIds();
    const protocolsWithoutValidIds = allProtocolIds.filter(id => !hasValidDuneQueryId(id));
    if (protocolsWithoutValidIds.length > 0) {
      console.log(`Skipped protocols without valid Dune query IDs: ${protocolsWithoutValidIds.join(', ')}`);
    }

    console.log(`Projected data update completed: ${successCount}/${validMappings.length} protocols updated`);

    return {
      successCount,
      totalCount: validMappings.length,
      protocols: successfulProtocols
    };
  } catch (error) {
    console.error('Error in updateAllProjectedData:', error);
    throw error;
  }
}

/**
 * Get latest projected volume for all protocols (OPTIMIZED - single query with MAX)
 */
export async function getLatestProjectedVolumes(): Promise<Record<string, number>> {
  try {
    // Use subquery to get latest date, then fetch volumes for that date
    const latestDate = await db.queryOne<{ formatted_day: string }>(
      'SELECT MAX(formatted_day) as formatted_day FROM projected_stats'
    );

    if (!latestDate?.formatted_day) {
      return {};
    }

    const data = await db.query<{ protocol_name: string; volume_usd: number }>(
      `SELECT protocol_name, volume_usd
       FROM projected_stats
       WHERE formatted_day = ?`,
      [latestDate.formatted_day]
    );

    const result: Record<string, number> = {};
    data.forEach(item => {
      result[item.protocol_name] = item.volume_usd;
    });

    return result;
  } catch (error) {
    console.error('Error fetching latest projected volumes:', error);
    return {};
  }
}

/**
 * Get monthly adjusted volumes for all protocols (OPTIMIZED - aggregation in SQL)
 */
export async function getMonthlyAdjustedVolumes(year: number, month: number): Promise<Record<string, number>> {
  try {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endOfMonth = new Date(year, month, 0);
    const endDate = endOfMonth.toISOString().split('T')[0];

    console.log(`Fetching monthly adjusted volumes for ${year}-${month.toString().padStart(2, '0')}`);

    // OPTIMIZED: Aggregate at DB level instead of fetching all rows
    const data = await db.query<{ protocol_name: string; total_volume: number }>(
      `SELECT protocol_name, SUM(volume_usd) as total_volume
       FROM projected_stats
       WHERE formatted_day >= ? AND formatted_day <= ?
       GROUP BY protocol_name`,
      [startDate, endDate]
    );

    console.log(`Found ${data.length} protocols with projected stats for the month`);

    const monthlyVolumes: Record<string, number> = {};
    data.forEach(item => {
      monthlyVolumes[item.protocol_name] = item.total_volume || 0;
    });

    return monthlyVolumes;
  } catch (error) {
    console.error('Error fetching monthly adjusted volumes:', error);
    return {};
  }
}

/**
 * Get latest projected data dates for all protocols (OPTIMIZED - GROUP BY with MAX)
 */
export async function getLatestProjectedDates(): Promise<Record<string, { latest_date: string; is_current: boolean; days_behind: number }>> {
  try {
    // OPTIMIZED: Single query with GROUP BY instead of fetching all records
    const data = await db.query<{ protocol_name: string; latest_date: string }>(
      `SELECT protocol_name, MAX(formatted_day) as latest_date
       FROM projected_stats
       GROUP BY protocol_name`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestDates: Record<string, { latest_date: string; is_current: boolean; days_behind: number }> = {};

    data.forEach(item => {
      const latestDate = new Date(item.latest_date);
      const daysDiff = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

      latestDates[item.protocol_name] = {
        latest_date: item.latest_date,
        is_current: daysDiff <= 1,
        days_behind: daysDiff
      };
    });

    return latestDates;
  } catch (error) {
    console.error('Error fetching latest projected dates:', error);
    return {};
  }
}

/**
 * Update projected data for a specific protocol
 */
export async function updateProjectedDataForProtocol(protocolId: string): Promise<{
  success: boolean;
  error?: string;
  recordsUpdated?: number;
  latestDate?: string
}> {
  try {
    console.log(`Starting projected data update for protocol: ${protocolId}`);

    if (!process.env.DUNE_API_KEY) {
      console.warn('DUNE_API_KEY is not configured. Projected stats update skipped.');
      return {
        success: false,
        error: 'Dune API key not configured'
      };
    }

    const duneQueryId = getDuneQueryId(protocolId);
    if (!duneQueryId) {
      return {
        success: false,
        error: `No Dune query ID configured for protocol: ${protocolId}`
      };
    }

    console.log(`Fetching projected data for ${protocolId} with query ID ${duneQueryId}...`);

    const duneData = await fetchProjectedDataFromDune(duneQueryId);

    if (duneData.length === 0) {
      return {
        success: false,
        error: `No data returned from Dune for protocol: ${protocolId}`
      };
    }

    const projectedData: ProjectedStatsData[] = duneData.map(row => ({
      protocol_name: protocolId,
      formatted_day: row.formattedDay,
      fees_sol: row.fees_sol,
      volume_sol: row.volume_sol,
      fees_usd: row.fees_usd,
      volume_usd: row.volume_usd,
    }));

    await saveProjectedStats(projectedData);

    // Get the latest date from the updated data
    const latestDate = projectedData.length > 0
      ? projectedData.sort((a, b) => b.formatted_day.localeCompare(a.formatted_day))[0].formatted_day
      : undefined;

    console.log(`Updated ${projectedData.length} records for ${protocolId}`);

    return {
      success: true,
      recordsUpdated: projectedData.length,
      latestDate
    };
  } catch (error) {
    console.error(`Error updating projected data for ${protocolId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
