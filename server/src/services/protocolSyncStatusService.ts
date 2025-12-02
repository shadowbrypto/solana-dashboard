import { db } from '../lib/db.js';

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

      const syncStatus = {
        protocol_name: protocolName,
        last_sync_at: new Date().toISOString(),
        sync_success: success,
        rows_imported: rowsImported,
        error_message: errorMessage || null,
        has_recent_data: hasRecentData,
        latest_data_date: latestDate || null,
        days_behind: daysBehind ?? null
      };

      // Upsert the sync status
      await db.upsert(ProtocolSyncStatusService.TABLE_NAME, syncStatus, ['protocol_name']);
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
      const data = await db.query<{ date: string }>(
        `SELECT date FROM protocol_stats
         WHERE protocol_name = ? AND chain = ? AND data_type = 'private'
         ORDER BY date DESC LIMIT 1`,
        [protocolName, chain]
      );

      if (!data || data.length === 0) {
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
      const data = await db.query<ProtocolSyncStatus>(
        `SELECT * FROM ${ProtocolSyncStatusService.TABLE_NAME} ORDER BY protocol_name`
      );
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
      const data = await db.queryOne<ProtocolSyncStatus>(
        `SELECT * FROM ${ProtocolSyncStatusService.TABLE_NAME} WHERE protocol_name = ?`,
        [protocolName]
      );
      return data;
    } catch (error) {
      console.error(`Error fetching sync status for ${protocolName}:`, error);
      return null;
    }
  }
}

export const protocolSyncStatusService = new ProtocolSyncStatusService();