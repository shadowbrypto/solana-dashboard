import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase.js';
import { clearProtocolCache } from './protocolService.js';
import { protocolSyncStatusService } from './protocolSyncStatusService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
const API_KEY = process.env.DUNE_API_KEY;
const TABLE_NAME = 'protocol_metrics';
const DATA_DIR = path.join(__dirname, '../../data/evm');

// Validate API key is present
if (!API_KEY) {
  throw new Error('DUNE_API_KEY environment variable is not set');
}

// EVM Protocol configuration - volume only data
interface EVMProtocolSource {
  queryIds: number[];
  chains: string[]; // EVM chains this protocol operates on
}

// EVM Protocol sources mapping - these should contain volume data across multiple chains
const EVM_PROTOCOL_SOURCES: Record<string, EVMProtocolSource> = {
  "sigma_evm": { 
    queryIds: [5430634], 
    chains: ['ethereum', 'base', 'arbitrum', 'bsc', 'avax'] 
  },
  "maestro_evm": { 
    queryIds: [3832557], 
    chains: ['ethereum', 'base', 'arbitrum', 'bsc', 'avax'] 
  },
  "bloom_evm": { 
    queryIds: [4824799], 
    chains: ['ethereum', 'base', 'arbitrum', 'bsc', 'avax'] 
  },
  "banana_evm": { 
    queryIds: [4750709], 
    chains: ['ethereum', 'base', 'arbitrum', 'bsc', 'avax'] 
  }
};

// EVM CSV column mapping - flexible mapping for various EVM data formats
const EVM_COLUMN_MAP: Record<string, string> = {
  // Date fields (try multiple common formats)
  date: "date",
  day: "date", 
  formattedDay: "date",
  time: "date",
  timestamp: "date",
  block_date: "date",
  tx_date: "date",
  
  // Volume fields
  volume_usd: "volume_usd",
  total_volume_usd: "volume_usd",
  volume: "volume_usd",
  usd_volume: "volume_usd",
  volume_in_usd: "volume_usd",
  total_volume: "volume_usd",
  
  // User fields (if available)
  users: "daily_users",
  daily_users: "daily_users",
  unique_users: "daily_users",
  active_users: "daily_users",
  traders: "daily_users",
  unique_traders: "daily_users",
  
  // New user fields (if available)
  new_users: "new_users",
  first_time_users: "new_users",
  
  // Trade fields (if available)
  trades: "trades",
  transactions: "trades",
  tx_count: "trades",
  trade_count: "trades",
  
  // Fee fields (if available)
  fees: "fees_usd",
  fees_usd: "fees_usd",
  total_fees: "fees_usd",
  gas_fees: "fees_usd",
  
  // Chain identification
  chain: "chain",
  blockchain: "chain",
  network: "chain"
};

interface EVMDownloadResult {
  success: boolean;
  protocol: string;
  queriesProcessed?: number;
  queriesFailed?: number;
  error?: string;
}

interface EVMImportResult {
  success: boolean;
  protocol: string;
  rowsInserted: number;
  error?: string;
}

interface EVMSyncResult {
  success: boolean;
  csvFilesFetched: number;
  rowsImported: number;
  timestamp: string;
  downloadResults: EVMDownloadResult[];
  importResults: EVMImportResult[];
  error?: string;
}

export class EVMDataMigrationService {

  /**
   * Download CSV data from Dune Analytics for a single EVM query
   */
  private async downloadSingleEVMQuery(protocolName: string, queryId: number, queryIndex: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      console.log(`Downloading EVM query ${queryId} for ${protocolName} (${queryIndex + 1})...`);

      const response = await fetch(`https://api.dune.com/api/v1/query/${queryId}/results/csv?api_key=${API_KEY}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${response.statusText}`);
      }

      const csvContent = await response.text();
      
      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error(`Empty CSV content received for query ${queryId}`);
      }

      // Parse CSV content
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.warn(`CSV parsing warnings for ${protocolName} query ${queryId}:`, parsed.errors);
      }

      console.log(`Successfully fetched ${parsed.data.length} rows for ${protocolName} EVM query ${queryIndex + 1}`);
      
      return {
        success: true,
        data: parsed.data
      };

    } catch (error) {
      console.error(`Error downloading EVM query ${queryId} for ${protocolName}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process EVM data and split by chains - enhanced to handle various data structures
   */
  private processEVMDataByChains(data: any[], protocolConfig: EVMProtocolSource): Map<string, any[]> {
    const chainData = new Map<string, any[]>();
    
    // Initialize empty arrays for each chain
    protocolConfig.chains.forEach(chain => {
      chainData.set(chain, []);
    });

    // Analyze the data structure first
    if (data.length === 0) {
      console.warn('No data to process for chain splitting');
      return chainData;
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    
    console.log(`Processing ${data.length} rows with columns: ${columns.join(', ')}`);

    // Check if data already has chain information
    const chainColumn = columns.find(col => 
      ['chain', 'blockchain', 'network'].includes(col.toLowerCase())
    );

    if (chainColumn) {
      // Data has chain info - split by chain
      console.log(`Found chain column: ${chainColumn}`);
      
      data.forEach(row => {
        const chainValue = row[chainColumn];
        if (chainValue) {
          const normalizedChain = this.normalizeChainName(chainValue);
          if (protocolConfig.chains.includes(normalizedChain)) {
            const existing = chainData.get(normalizedChain) || [];
            existing.push(row);
            chainData.set(normalizedChain, existing);
          } else {
            console.warn(`Unknown chain: ${chainValue} (normalized: ${normalizedChain})`);
          }
        }
      });
    } else {
      // No chain info - check if data might be aggregated across chains or single chain
      console.log('No chain column found. Checking for chain-specific data patterns...');
      
      // Look for chain-specific patterns in data or column names
      const hasMultiChainIndicators = columns.some(col => 
        col.toLowerCase().includes('eth') || 
        col.toLowerCase().includes('base') || 
        col.toLowerCase().includes('arbitrum') ||
        col.toLowerCase().includes('bsc') ||
        col.toLowerCase().includes('avax')
      );

      if (hasMultiChainIndicators) {
        // Data might have chain-specific columns
        console.log('Found chain-specific column patterns');
        // This would need custom logic based on actual data structure
        // For now, add all to ethereum as default
        chainData.set('ethereum', [...data]);
      } else {
        // Assume single chain data - distribute based on protocol or add to ethereum
        console.log('Assuming single-chain data, adding to ethereum');
        chainData.set('ethereum', [...data]);
      }
    }

    // Log results
    chainData.forEach((rows, chain) => {
      if (rows.length > 0) {
        console.log(`Chain ${chain}: ${rows.length} rows`);
      }
    });

    return chainData;
  }

  /**
   * Parse different date formats and convert to YYYY-MM-DD
   */
  private parseDate(dateValue: string): string | null {
    if (!dateValue) return null;
    
    try {
      // Handle various date formats
      if (dateValue.includes('/')) {
        // Handle DD/MM/YYYY or MM/DD/YYYY formats
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          const [first, second, year] = parts;
          // Assume DD/MM/YYYY format for now (adjust if needed)
          const day = first.padStart(2, '0');
          const month = second.padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } else if (dateValue.includes('-')) {
        // Handle YYYY-MM-DD or DD-MM-YYYY formats
        if (dateValue.length === 10 && dateValue.startsWith('20')) {
          // Already in YYYY-MM-DD format
          return dateValue;
        } else {
          // Try DD-MM-YYYY format
          const parts = dateValue.split('-');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
      } else if (dateValue.length === 8 && /^\d+$/.test(dateValue)) {
        // Handle YYYYMMDD format
        const year = dateValue.substring(0, 4);
        const month = dateValue.substring(4, 6);
        const day = dateValue.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
      
      // Try parsing as ISO date
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
    } catch (error) {
      console.warn(`Failed to parse date: ${dateValue}`);
    }
    
    return null;
  }

  /**
   * Normalize chain names to standard format
   */
  private normalizeChainName(chainName: string): string {
    const normalized = chainName.toLowerCase().trim();
    
    const chainMap: Record<string, string> = {
      'eth': 'ethereum',
      'ethereum': 'ethereum',
      'base': 'base',
      'arbitrum': 'arbitrum',
      'arb': 'arbitrum',
      'bsc': 'bsc',
      'bnb': 'bsc',
      'binance': 'bsc',
      'avax': 'avax',
      'avalanche': 'avax',
      'polygon': 'polygon',
      'matic': 'polygon'
    };

    return chainMap[normalized] || normalized;
  }

  /**
   * Download and process EVM data for a protocol
   */
  private async downloadEVMProtocolData(protocolName: string, queryIds: number[]): Promise<EVMDownloadResult> {
    try {
      console.log(`Processing ${queryIds.length} EVM queries for ${protocolName}...`);

      // Download all queries in parallel
      const downloadPromises = queryIds.map((queryId, index) => 
        this.downloadSingleEVMQuery(protocolName, queryId, index)
      );

      const results = await Promise.all(downloadPromises);
      
      // Separate successful and failed downloads
      const successfulResults = results.filter(r => r.success && r.data);
      const failedCount = results.length - successfulResults.length;

      if (successfulResults.length === 0) {
        throw new Error('All EVM queries failed to download');
      }

      // Combine all data
      const allData = successfulResults.flatMap(r => r.data!);
      const protocolConfig = EVM_PROTOCOL_SOURCES[protocolName];

      // Process data by chains
      const chainDataMap = this.processEVMDataByChains(allData, protocolConfig);

      console.log(`Processed EVM data for ${protocolName} across ${chainDataMap.size} chains`);

      // Ensure data directory exists
      await fs.mkdir(DATA_DIR, { recursive: true });

      // Save separate CSV files for each chain
      for (const [chain, chainData] of chainDataMap) {
        if (chainData.length > 0) {
          const csvContent = Papa.unparse(chainData);
          const outputFile = path.join(DATA_DIR, `${protocolName}_${chain}.csv`);
          await fs.writeFile(outputFile, csvContent, 'utf8');
          console.log(`Saved EVM data for ${protocolName} on ${chain}: ${chainData.length} rows`);
        }
      }

      return {
        success: true,
        protocol: protocolName,
        queriesProcessed: successfulResults.length,
        queriesFailed: failedCount
      };

    } catch (error) {
      console.error(`Error processing EVM protocol ${protocolName}:`, error);
      
      return {
        success: false,
        protocol: protocolName,
        queriesProcessed: 0,
        queriesFailed: queryIds.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Import EVM CSV data for a specific protocol and chain into the database
   */
  private async importEVMProtocolChainData(protocolName: string, chain: string, deleteExisting: boolean = false): Promise<EVMImportResult> {
    try {
      const csvFilePath = path.join(DATA_DIR, `${protocolName}_${chain}.csv`);
      
      // Check if file exists
      try {
        await fs.access(csvFilePath);
      } catch {
        console.log(`No CSV file found for ${protocolName} on ${chain}, skipping...`);
        return {
          success: true,
          protocol: `${protocolName}_${chain}`,
          rowsInserted: 0
        };
      }

      console.log(`--- Importing EVM data ${csvFilePath} ---`);

      // Delete existing data for this protocol and chain if requested
      if (deleteExisting) {
        console.log(`Deleting existing EVM data for ${protocolName} on ${chain}...`);
        const { error: deleteError } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq('protocol_name', protocolName)
          .eq('chain', chain);

        if (deleteError) {
          throw new Error(`Failed to delete existing EVM data: ${JSON.stringify(deleteError)}`);
        }
        console.log(`Successfully deleted existing EVM data for ${protocolName} on ${chain}`);
      }

      // Read and parse CSV file
      const fileContent = await fs.readFile(csvFilePath, 'utf8');
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length) {
        console.warn(`CSV parse warnings for ${protocolName} on ${chain}:`, parsed.errors);
      }

      const data = parsed.data;

      // Map CSV columns to database columns for EVM data
      const csvColumns = Object.keys(data[0] || {});
      console.log(`Mapping columns for ${protocolName} on ${chain}: ${csvColumns.join(', ')}`);

      const mappedData = data.map((row: any) => {
        const mappedRow: any = {
          protocol_name: protocolName,
          chain: chain,
          daily_users: 0,     // Default to 0 
          new_users: 0,       // Default to 0
          trades: 0,          // Default to 0 
          fees_usd: 0,        // Default to 0
          volume_usd: 0       // Default to 0
        };
        
        // Map known columns using flexible mapping
        for (const csvCol of csvColumns) {
          const value = row[csvCol];
          const dbColumn = EVM_COLUMN_MAP[csvCol.toLowerCase()];
          
          if (dbColumn && value !== undefined && value !== null && value !== '') {
            if (dbColumn === "date") {
              // Handle different date formats
              mappedRow.date = this.parseDate(value);
            } else if (['volume_usd', 'daily_users', 'new_users', 'trades', 'fees_usd'].includes(dbColumn)) {
              // Parse numeric values
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                mappedRow[dbColumn] = numValue;
              }
            } else if (dbColumn === "chain") {
              // Override chain if specified in data
              mappedRow.chain = this.normalizeChainName(value);
            }
          }
        }
        
        return mappedRow;
      });

      // Filter out rows without valid dates or volume
      const validData = mappedData.filter(row => 
        row.date && 
        row.date !== '' && 
        row.volume_usd !== undefined && 
        row.volume_usd !== null &&
        row.volume_usd !== ''
      );

      if (validData.length === 0) {
        console.log(`No valid EVM data found for ${protocolName} on ${chain}`);
        return {
          success: true,
          protocol: `${protocolName}_${chain}`,
          rowsInserted: 0
        };
      }

      // Insert data in batches
      const batchSize = 500;
      let totalInserted = 0;

      for (let i = 0; i < validData.length; i += batchSize) {
        const batch = validData.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(TABLE_NAME)
          .upsert(batch, {
            onConflict: 'protocol_name,date,chain'
          });

        if (error) {
          throw new Error(`Failed to insert EVM batch: ${JSON.stringify(error)}`);
        }
        
        totalInserted += batch.length;
        console.log(`Inserted EVM batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validData.length / batchSize)} for ${protocolName} on ${chain}`);
      }

      console.log(`Successfully imported ${totalInserted} EVM rows for ${protocolName} on ${chain}`);

      return {
        success: true,
        protocol: `${protocolName}_${chain}`,
        rowsInserted: totalInserted
      };

    } catch (error) {
      console.error(`Error importing EVM data for ${protocolName} on ${chain}:`, error);
      
      return {
        success: false,
        protocol: `${protocolName}_${chain}`,
        rowsInserted: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync EVM data for a specific protocol
   */
  public async syncEVMProtocolData(protocolName: string): Promise<EVMSyncResult> {
    
    try {
      // Validate protocol exists
      if (!EVM_PROTOCOL_SOURCES[protocolName]) {
        throw new Error(`EVM Protocol '${protocolName}' not found in EVM_PROTOCOL_SOURCES`);
      }

      console.log(`Starting EVM data sync for protocol: ${protocolName}...`);

      // Step 1: Download CSV files for the specific EVM protocol
      const downloadResult = await this.downloadEVMProtocolData(
        protocolName, 
        EVM_PROTOCOL_SOURCES[protocolName].queryIds
      );

      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Failed to download EVM data');
      }

      // Step 2: Import data for each chain
      const protocolConfig = EVM_PROTOCOL_SOURCES[protocolName];
      const importPromises = protocolConfig.chains.map(chain =>
        this.importEVMProtocolChainData(protocolName, chain, true)
      );

      const importResults = await Promise.all(importPromises);
      const totalRowsImported = importResults.reduce((sum, result) => sum + result.rowsInserted, 0);

      console.log(`Imported ${totalRowsImported} EVM rows for ${protocolName}`);

      // Update sync status
      await protocolSyncStatusService.updateProtocolSyncStatus(
        protocolName,
        true,
        totalRowsImported
      );

      // Clear cache for this specific protocol after successful import
      clearProtocolCache(protocolName);
      console.log(`Cache cleared for EVM protocol: ${protocolName}`);

      return {
        success: true,
        csvFilesFetched: 1,
        rowsImported: totalRowsImported,
        timestamp: new Date().toISOString(),
        downloadResults: [downloadResult],
        importResults: importResults
      };

    } catch (error) {
      console.error(`Error syncing EVM data for protocol ${protocolName}:`, error);
      
      // Update sync status for failed sync
      await protocolSyncStatusService.updateProtocolSyncStatus(
        protocolName,
        false,
        0,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      return {
        success: false,
        csvFilesFetched: 0,
        rowsImported: 0,
        timestamp: new Date().toISOString(),
        downloadResults: [],
        importResults: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync all EVM protocols
   */
  public async syncAllEVMData(): Promise<EVMSyncResult> {
    
    try {
      console.log('Starting EVM data sync for all protocols...');

      const protocolNames = Object.keys(EVM_PROTOCOL_SOURCES);
      const syncPromises = protocolNames.map(protocolName =>
        this.syncEVMProtocolData(protocolName)
      );

      const results = await Promise.all(syncPromises);

      const successfulResults = results.filter(r => r.success);
      const totalCsvFiles = successfulResults.reduce((sum, r) => sum + r.csvFilesFetched, 0);
      const totalRowsImported = successfulResults.reduce((sum, r) => sum + r.rowsImported, 0);

      const allDownloadResults = results.flatMap(r => r.downloadResults);
      const allImportResults = results.flatMap(r => r.importResults);

      console.log(`EVM sync completed: ${successfulResults.length}/${results.length} protocols successful`);
      console.log(`Total EVM rows imported: ${totalRowsImported}`);

      return {
        success: true,
        csvFilesFetched: totalCsvFiles,
        rowsImported: totalRowsImported,
        timestamp: new Date().toISOString(),
        downloadResults: allDownloadResults,
        importResults: allImportResults
      };

    } catch (error) {
      console.error('Error syncing all EVM data:', error);
      
      return {
        success: false,
        csvFilesFetched: 0,
        rowsImported: 0,
        timestamp: new Date().toISOString(),
        downloadResults: [],
        importResults: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const evmDataMigrationService = new EVMDataMigrationService();