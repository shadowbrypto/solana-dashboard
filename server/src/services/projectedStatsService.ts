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
    // Check if Dune API key is configured
    const duneApiKey = process.env.DUNE_API_KEY;
    if (!duneApiKey) {
      console.warn('DUNE_API_KEY environment variable is not set. Skipping Dune data fetch.');
      return [];
    }

    // First, get the execution result
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
    if (error instanceof Error && error.message.includes('DUNE_API_KEY')) {
      console.warn(`Dune Analytics integration not configured. Query ${duneQueryId} skipped.`);
    } else {
      console.error(`Error fetching data from Dune query ${duneQueryId}:`, error);
    }
    return [];
  }
}

/**
 * Save projected stats data to database
 */
export async function saveProjectedStats(data: ProjectedStatsData[]): Promise<void> {
  try {
    // Upsert data - insert new records or update existing ones based on unique constraint
    const { error } = await supabase
      .from('projected_stats')
      .upsert(data, {
        onConflict: 'protocol_name,formatted_day'
      });

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
 * @returns Object with update statistics
 */
export async function updateAllProjectedData(): Promise<{ successCount: number; totalCount: number; protocols: string[] }> {
  try {
    console.log('Starting projected data update for all protocols...');
    
    // Check if Dune API key is configured
    if (!process.env.DUNE_API_KEY) {
      console.warn('DUNE_API_KEY is not configured. Projected stats update skipped.');
      return { successCount: 0, totalCount: 0, protocols: [] };
    }
    
    // Get all protocols with valid Dune query IDs
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
          console.log(`✓ Updated ${projectedData.length} records for ${protocolId}`);
          successCount++;
          successfulProtocols.push(protocolId);
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

/**
 * Get monthly adjusted volumes for all protocols
 */
export async function getMonthlyAdjustedVolumes(year: number, month: number): Promise<Record<string, number>> {
  try {
    // Create start and end dates for the month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endOfMonth = new Date(year, month, 0); // Last day of the month
    const endDate = endOfMonth.toISOString().split('T')[0];

    console.log(`Fetching monthly adjusted volumes for ${year}-${month.toString().padStart(2, '0')} (${startDate} to ${endDate})`);

    // Get all projected stats for the month
    const { data, error } = await supabase
      .from('projected_stats')
      .select('protocol_name, volume_usd')
      .gte('formatted_day', startDate)
      .lte('formatted_day', endDate);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} projected stats records for the month`);

    // Aggregate by protocol
    const monthlyVolumes: Record<string, number> = {};
    
    data?.forEach(item => {
      if (!monthlyVolumes[item.protocol_name]) {
        monthlyVolumes[item.protocol_name] = 0;
      }
      monthlyVolumes[item.protocol_name] += item.volume_usd || 0;
    });

    console.log('Aggregated monthly volumes:', Object.keys(monthlyVolumes).length, 'protocols');
    
    return monthlyVolumes;
  } catch (error) {
    console.error('Error fetching monthly adjusted volumes:', error);
    return {};
  }
}

/**
 * Get latest projected data dates for all protocols
 */
export async function getLatestProjectedDates(): Promise<Record<string, { latest_date: string; is_current: boolean; days_behind: number }>> {
  try {
    // Get latest date for each protocol
    const { data, error } = await supabase
      .from('projected_stats')
      .select('protocol_name, formatted_day')
      .order('formatted_day', { ascending: false });

    if (error) {
      throw error;
    }

    // Group by protocol and get the latest date for each
    const latestDates: Record<string, { latest_date: string; is_current: boolean; days_behind: number }> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data?.forEach(item => {
      if (!latestDates[item.protocol_name]) {
        const latestDate = new Date(item.formatted_day);
        const daysDiff = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
        
        latestDates[item.protocol_name] = {
          latest_date: item.formatted_day,
          is_current: daysDiff <= 1, // Consider current if within 1 day
          days_behind: daysDiff
        };
      }
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
    
    // Check if Dune API key is configured
    if (!process.env.DUNE_API_KEY) {
      console.warn('DUNE_API_KEY is not configured. Projected stats update skipped.');
      return { 
        success: false, 
        error: 'Dune API key not configured' 
      };
    }
    
    // Check if protocol has a valid Dune query ID
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
    
    console.log(`✓ Updated ${projectedData.length} records for ${protocolId}`);
    
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