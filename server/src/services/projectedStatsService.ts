import { supabase } from '../lib/supabase';
import { 
  getDuneQueryId, 
  hasValidDuneQueryId, 
  getAllConfiguredProtocolIds,
  getValidDuneQueryMappings 
} from '../config/projected-stats-config';

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
    // First, get the execution result
    const response = await fetch(`https://api.dune.com/api/v1/query/${duneQueryId}/results`, {
      headers: {
        'X-Dune-API-Key': process.env.DUNE_API_KEY || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data from Dune: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform Dune response to our expected format
    // Dune returns data in result.rows format
    return data.result.rows.map((row: any) => {
      // Convert date to proper YYYY-MM-DD format
      let formattedDate = row.formattedDay;
      
      // Convert DD-MM-YYYY to YYYY-MM-DD format
      if (formattedDate && typeof formattedDate === 'string') {
        // Check for DD-MM-YYYY format (like 31-07-2025)
        if (formattedDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const parts = formattedDate.split('-');
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to YYYY-MM-DD
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
    console.error(`Error fetching data from Dune query ${duneQueryId}:`, error);
    return [];
  }
}

/**
 * Save projected stats data to database
 */
export async function saveProjectedStats(data: ProjectedStatsData[]): Promise<void> {
  try {
    // Extract unique protocol names from the data
    const protocolNames = [...new Set(data.map(item => item.protocol_name))];
    
    // Delete existing records for these protocols
    if (protocolNames.length > 0) {
      const { error: deleteError } = await supabase
        .from('projected_stats')
        .delete()
        .in('protocol_name', protocolNames);

      if (deleteError) {
        throw deleteError;
      }
    }

    // Insert new data
    const { error } = await supabase
      .from('projected_stats')
      .insert(data);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error saving projected stats:', error);
    throw error;
  }
}

/**
 * Get projected stats for specific protocols and date range
 */
export async function getProjectedStats(
  protocolNames?: string[], 
  startDate?: string, 
  endDate?: string
): Promise<ProjectedStatsData[]> {
  try {
    let query = supabase
      .from('projected_stats')
      .select('*');

    if (protocolNames && protocolNames.length > 0) {
      query = query.in('protocol_name', protocolNames);
    }

    if (startDate) {
      query = query.gte('formatted_day', startDate);
    }

    if (endDate) {
      query = query.lte('formatted_day', endDate);
    }

    const { data, error } = await query
      .order('formatted_day', { ascending: true })
      .order('protocol_name', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching projected stats:', error);
    throw error;
  }
}

/**
 * Get projected stats for a specific date
 */
export async function getProjectedStatsForDate(date: string): Promise<ProjectedStatsData[]> {
  try {
    const { data, error } = await supabase
      .from('projected_stats')
      .select('*')
      .eq('formatted_day', date)
      .order('protocol_name', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching projected stats for date:', error);
    throw error;
  }
}

/**
 * Update projected data for all protocols with Dune query IDs
 */
export async function updateAllProjectedData(): Promise<void> {
  try {
    console.log('Starting projected data update for all protocols...');
    
    // Get all protocols with valid Dune query IDs
    const validMappings = getValidDuneQueryMappings();

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
          console.log(`✓ Updated ${projectedData.length} records for ${protocolId}`);
        } else {
          console.log(`No data returned for ${protocolId}`);
        }
      } catch (error) {
        console.error(`Error updating projected data for ${protocolId}:`, {
          protocolId,
          duneQueryId,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }

    // Log protocols without valid Dune query IDs
    const allProtocolIds = getAllConfiguredProtocolIds();
    const protocolsWithoutValidIds = allProtocolIds.filter(id => !hasValidDuneQueryId(id));
    if (protocolsWithoutValidIds.length > 0) {
      console.log(`Skipped protocols without valid Dune query IDs: ${protocolsWithoutValidIds.join(', ')}`);
    }

    console.log('Projected data update completed');
  } catch (error) {
    console.error('Error in updateAllProjectedData:', error);
    throw error;
  }
}

/**
 * Get latest projected volume for all protocols
 */
export async function getLatestProjectedVolumes(): Promise<Record<string, number>> {
  try {
    // Get the most recent date
    const { data: latestDate, error: dateError } = await supabase
      .from('projected_stats')
      .select('formatted_day')
      .order('formatted_day', { ascending: false })
      .limit(1);

    if (dateError || !latestDate || latestDate.length === 0) {
      return {};
    }

    const latest = latestDate[0].formatted_day;

    // Get all projected volumes for the latest date
    const { data, error } = await supabase
      .from('projected_stats')
      .select('protocol_name, volume_usd')
      .eq('formatted_day', latest);

    if (error) {
      throw error;
    }

    // Convert to record format
    const result: Record<string, number> = {};
    data?.forEach(item => {
      result[item.protocol_name] = item.volume_usd;
    });

    return result;
  } catch (error) {
    console.error('Error fetching latest projected volumes:', error);
    return {};
  }
}