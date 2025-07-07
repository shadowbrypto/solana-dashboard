import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { supabase } from '../lib/supabase.js';
import { dataManagementService } from './dataManagementService.js';
import { getSolanaProtocols } from '../config/chainProtocols.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of all protocols we expect to have data for (Solana only)
const EXPECTED_PROTOCOLS = getSolanaProtocols();

// Check if we have current day data for all protocols in the database
async function checkCurrentDataInDB(): Promise<{ hasCurrentData: boolean; missingProtocols: string[] }> {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Query for today's data for all protocols
    const { data, error } = await supabase
      .from('protocol_stats')
      .select('protocol_name')
      .eq('date', today)
      .eq('chain', 'solana') // Filter for Solana data only
      .in('protocol_name', EXPECTED_PROTOCOLS);
    
    if (error) {
      console.error('Error checking current data:', error);
      return { hasCurrentData: false, missingProtocols: EXPECTED_PROTOCOLS };
    }
    
    // Get list of protocols that have data for today
    const protocolsWithData = data?.map(row => row.protocol_name) || [];
    
    // Find missing protocols
    const missingProtocols = EXPECTED_PROTOCOLS.filter(
      protocol => !protocolsWithData.includes(protocol)
    );
    
    const hasCurrentData = missingProtocols.length === 0;
    
    return { hasCurrentData, missingProtocols };
  } catch (error) {
    console.error('Error checking current data in DB:', error);
    return { hasCurrentData: false, missingProtocols: EXPECTED_PROTOCOLS };
  }
}

interface SyncResult {
  success: boolean;
  csvFilesFetched?: number;
  timestamp?: string;
  error?: string;
  step?: string;
}

interface SyncStatus {
  lastSync: string | null;
  csvFilesCount: number;
  csvFiles: string[];
  message?: string;
  hasCurrentData: boolean;
  missingProtocols?: string[];
}

export async function syncData(): Promise<SyncResult> {
  try {
    console.log('Starting data sync process using API services...');
    
    // Use the new data management service for complete sync
    const result = await dataManagementService.syncData();
    
    if (result.success) {
      return {
        success: true,
        csvFilesFetched: result.csvFilesFetched,
        timestamp: result.timestamp
      };
    } else {
      return {
        success: false,
        error: result.error || 'Data sync failed',
        step: 'sync_process'
      };
    }
  } catch (error) {
    console.error('Unexpected error in data sync:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error during data sync'
    };
  }
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const dataDir = path.join(__dirname, '..', '..', 'public', 'data');
  
  try {
    // Check database for current data
    const { hasCurrentData, missingProtocols } = await checkCurrentDataInDB();
    
    const files = await fs.readdir(dataDir);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    
    if (csvFiles.length > 0) {
      // Get the most recent modification time
      const stats = await Promise.all(
        csvFiles.map(async (file) => {
          const stat = await fs.stat(path.join(dataDir, file));
          return stat.mtime;
        })
      );
      
      const mostRecent = new Date(Math.max(...stats.map(s => s.getTime())));
      
      return {
        lastSync: mostRecent.toISOString(),
        csvFilesCount: csvFiles.length,
        csvFiles: csvFiles.map(f => f.replace('.csv', '')),
        hasCurrentData,
        missingProtocols: missingProtocols.length > 0 ? missingProtocols : undefined,
        message: hasCurrentData 
          ? 'All protocols have current data' 
          : `Missing current data for: ${missingProtocols.join(', ')}`
      };
    } else {
      return {
        lastSync: null,
        csvFilesCount: 0,
        csvFiles: [],
        hasCurrentData: false,
        missingProtocols: EXPECTED_PROTOCOLS,
        message: 'No data has been synced yet'
      };
    }
  } catch (error) {
    console.error('Error checking sync status:', error);
    throw new Error('Unable to check sync status');
  }
}