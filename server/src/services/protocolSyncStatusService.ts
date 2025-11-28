import { supabase } from '../lib/supabase.js';

export interface ProtocolSyncStatus {
  protocol_name: string;
  last_sync_at: string;
  sync_success: boolean;
  rows_imported: number;
  error_message?: string;
  has_recent_data: boolean;
  latest_data_date?: string;
  days_behind?: number;
}

export class ProtocolSyncStatusService {
  private static TABLE_NAME = 'protocol_sync_status';

  /**
   * Update sync status for a protocol
   */
  async updateProtocolSyncStatus(
    protocolName: string, 
    success: boolean, 
    rowsImported: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Check if protocol has recent data (within last 3 days)
      const { hasRecentData, latestDate, daysBehind } = await this.checkRecentData(protocolName);

      const syncStatus: ProtocolSyncStatus = {
        protocol_name: protocolName,
        last_sync_at: new Date().toISOString(),
        sync_success: success,
        rows_imported: rowsImported,
        error_message: errorMessage,
        has_recent_data: hasRecentData,
        latest_data_date: latestDate,
        days_behind: daysBehind
      };

      // Upsert the sync status
      const { error } = await supabase
        .from(ProtocolSyncStatusService.TABLE_NAME)
        .upsert(syncStatus, {
          onConflict: 'protocol_name'
        });

      if (error) {
        console.error(`Failed to update sync status for ${protocolName}:`, error);
      }
    } catch (error) {
      console.error(`Error updating sync status for ${protocolName}:`, error);
    }
  }

  /**
   * Check if protocol has recent data
   */
  private async checkRecentData(protocolName: string): Promise<{
    hasRecentData: boolean;
    latestDate?: string;
    daysBehind?: number;
  }> {
    try {
      // Determine chain based on protocol name
      let chain = 'solana';
      if (protocolName.endsWith('_monad')) {
        chain = 'monad';
      } else if (protocolName.endsWith('_evm')) {
        chain = 'evm';
      }

      // Get the latest date for this protocol
      const { data, error } = await supabase
        .from('protocol_stats')
        .select('date')
        .eq('protocol_name', protocolName)
        .eq('chain', chain)
        .eq('data_type', 'private') // Default to private data for sync status
        .order('date', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return { hasRecentData: false };
      }

      const latestDate = data[0].date;
      const latestDataDate = new Date(latestDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate days behind
      const daysDiff = Math.floor((today.getTime() - latestDataDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Consider data recent if within 3 days
      const hasRecentData = daysDiff <= 3;

      return {
        hasRecentData,
        latestDate,
        daysBehind: daysDiff
      };
    } catch (error) {
      console.error(`Error checking recent data for ${protocolName}:`, error);
      return { hasRecentData: false };
    }
  }

  /**
   * Get sync status for all protocols
   */
  async getAllProtocolSyncStatus(): Promise<ProtocolSyncStatus[]> {
    try {
      const { data, error } = await supabase
        .from(ProtocolSyncStatusService.TABLE_NAME)
        .select('*')
        .order('protocol_name');

      if (error) {
        console.error('Failed to fetch protocol sync status:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching protocol sync status:', error);
      return [];
    }
  }

  /**
   * Get sync status for a specific protocol
   */
  async getProtocolSyncStatus(protocolName: string): Promise<ProtocolSyncStatus | null> {
    try {
      const { data, error } = await supabase
        .from(ProtocolSyncStatusService.TABLE_NAME)
        .select('*')
        .eq('protocol_name', protocolName)
        .single();

      if (error) {
        console.error(`Failed to fetch sync status for ${protocolName}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching sync status for ${protocolName}:`, error);
      return null;
    }
  }
}

export const protocolSyncStatusService = new ProtocolSyncStatusService();