import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { clearAllCaches, clearProtocolCache } from './protocolService.js';
import { protocolSyncStatusService } from './protocolSyncStatusService.js';
import { getRollingRefreshSource, hasRollingRefreshSource } from '../config/rolling-refresh-config.js';
import { getPublicRollingRefreshSource, hasPublicRollingRefreshSource } from '../config/rolling-refresh-config-public.js';
import { getProtocolSources } from '../config/protocol-sources-config.js';

// Zod schema for Dune API query results
const DuneQueryResultSchema = z.object({
  result: z.object({
    rows: z.array(z.record(z.string(), z.unknown())),
  }),
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_KEY = process.env.DUNE_API_KEY;
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const TABLE_NAME = "protocol_stats";

// Validate API key is present
if (!API_KEY) {
  throw new Error('DUNE_API_KEY environment variable is not set');
}

// CSV column mapping to database columns
// Primary columns (snake_case - used by Solana)
const COLUMN_MAP: Record<string, string> = {
  formattedDay: "date",
  total_volume_usd: "volume_usd",
  daily_users: "daily_users",
  numberOfNewUsers: "new_users",
  daily_trades: "trades",
  total_fees_usd: "fees_usd",
};

// Alternative columns (camelCase - used by EVM queries)
// Maps DB column name -> alternative CSV column names to check
const ALTERNATIVE_COLUMNS: Record<string, string[]> = {
  volume_usd: ["totalVolumeUSD"],
  daily_users: ["numberOfUsers"],
  trades: ["numberOfTrades"],
  fees_usd: ["feesUSD"],
};

// EVM chain column mapping for parsing chain-specific data
// Maps chain name -> { volumeCol, usersCol }
const EVM_CHAIN_COLUMNS: Record<string, { volumeCol: string; usersCol: string }> = {
  ethereum: { volumeCol: 'ethereumVolumeUSD', usersCol: 'ethereumNumberOfUsers' },
  base: { volumeCol: 'baseVolumeUSD', usersCol: 'baseNumberOfUsers' },
  bsc: { volumeCol: 'bscVolumeUSD', usersCol: 'bscNumberOfUsers' },
  avax: { volumeCol: 'avalancheVolumeUSD', usersCol: 'avalancheNumberOfUsers' },
  arbitrum: { volumeCol: 'arbitrumVolumeUSD', usersCol: 'arbitrumNumberOfUsers' },
};

interface DownloadResult {
  success: boolean;
  protocol: string;
  queriesProcessed?: number;
  queriesFailed?: number;
  error?: string;
}

interface ImportResult {
  success: boolean;
  protocol: string;
  rowsInserted: number;
  error?: string;
}

interface SyncResult {
  success: boolean;
  csvFilesFetched: number;
  rowsImported: number;
  timestamp: string;
  downloadResults: DownloadResult[];
  importResults: ImportResult[];
  error?: string;
}

export class DataManagementService {

  /**
   * Sync data for a specific protocol
   */
  public async syncProtocolData(protocolName: string, dataType: string = 'private'): Promise<SyncResult> {
    const startTime = new Date();

    try {
      // Check for rolling refresh config first based on data type
      let protocolConfig;
      let effectiveDataType = dataType;

      // Check public rolling refresh config if dataType is 'public'
      if (dataType === 'public' && hasPublicRollingRefreshSource(protocolName)) {
        protocolConfig = getPublicRollingRefreshSource(protocolName);
        effectiveDataType = 'public';
      } else if (dataType === 'private' && hasRollingRefreshSource(protocolName)) {
        protocolConfig = getRollingRefreshSource(protocolName);
        effectiveDataType = 'private';
      } else {
        // Use standard config
        const protocolSources = getProtocolSources(dataType);

        // Validate protocol exists
        if (!protocolSources[protocolName]) {
          throw new Error(`Protocol '${protocolName}' not found in protocol sources for data type '${dataType}'`);
        }

        protocolConfig = protocolSources[protocolName];
      }

      if (!protocolConfig) {
        throw new Error(`No configuration found for protocol '${protocolName}'`);
      }

      // Step 1: Download CSV file for the specific protocol
      const downloadResult = await this.downloadProtocolData(protocolName, protocolConfig.queryIds);

      if (!downloadResult.success) {
        throw new Error(`Failed to download data for ${protocolName}: ${downloadResult.error}`);
      }

      // Step 2: Import CSV file to database (upsert will update existing or insert new)
      const importResult = await this.importProtocolData(protocolName, effectiveDataType, protocolConfig.queryIds);

      if (!importResult.success) {
        throw new Error(`Failed to import data for ${protocolName}: ${importResult.error}`);
      }

      // Update sync status
      await protocolSyncStatusService.updateProtocolSyncStatus(
        protocolName,
        true,
        importResult.rowsInserted
      );

      // Clear cache for this specific protocol after successful import
      clearProtocolCache(protocolName);

      return {
        success: true,
        csvFilesFetched: 1,
        rowsImported: importResult.rowsInserted,
        timestamp: startTime.toISOString(),
        downloadResults: [downloadResult],
        importResults: [importResult]
      };

    } catch (error) {
      console.error(`Error syncing data for protocol ${protocolName}:`, error);

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
        timestamp: startTime.toISOString(),
        downloadResults: [],
        importResults: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download data from Dune API for a single query using JSON endpoint
   * JSON endpoint returns fresher data than CSV endpoint
   */
  private async downloadSingleQuery(protocolName: string, queryId: number, queryIndex: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      // Use JSON endpoint instead of CSV - JSON returns fresher/more accurate data
      const url = `https://api.dune.com/api/v1/query/${queryId}/results?api_key=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Validate API response structure with Zod
      const parseResult = DuneQueryResultSchema.safeParse(rawData);
      if (!parseResult.success) {
        throw new Error(`Invalid Dune API response structure: ${parseResult.error.message}`);
      }

      const jsonData = parseResult.data;
      if (jsonData.result.rows.length === 0) {
        throw new Error('Downloaded data is empty');
      }

      // Convert JSON rows to the expected format (same as CSV parsing would produce)
      const data = jsonData.result.rows.map((row) => {
        // Ensure all values are converted to strings for consistency with CSV parsing
        const processedRow: any = {};
        for (const key of Object.keys(row)) {
          const value = row[key];
          processedRow[key] = value === null || value === undefined ? '' : String(value);
        }
        return processedRow;
      });

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error(`${protocolName}: download failed - ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Merge data from multiple queries by date, handling duplicates
   */
  private mergeDataByDate(dataArrays: any[][]): any[] {
    const mergedMap = new Map<string, any>();

    // Process each data array
    dataArrays.forEach((data) => {
      data.forEach(row => {
        const dateKey = row.formattedDay;
        if (!dateKey) return; // Skip rows without date

        if (mergedMap.has(dateKey)) {
          // Merge with existing row - combine numeric values
          const existingRow = mergedMap.get(dateKey);
          const mergedRow = { ...existingRow };

          // Sum numeric fields, handling <nil> values
          ['total_volume_usd', 'daily_users', 'numberOfNewUsers', 'daily_trades', 'total_fees_usd'].forEach(field => {
            // Handle <nil> values before parsing
            let existingVal = existingRow[field];
            let newVal = row[field];

            if (existingVal === '<nil>' || existingVal === null || existingVal === undefined || existingVal === '') {
              existingVal = '0';
            }
            if (newVal === '<nil>' || newVal === null || newVal === undefined || newVal === '') {
              newVal = '0';
            }

            // Convert scientific notation if present
            if (typeof existingVal === 'string' && existingVal.toLowerCase().includes('e+')) {
              try {
                existingVal = parseFloat(existingVal).toString();
              } catch (e) {
                existingVal = '0';
              }
            }
            if (typeof newVal === 'string' && newVal.toLowerCase().includes('e+')) {
              try {
                newVal = parseFloat(newVal).toString();
              } catch (e) {
                newVal = '0';
              }
            }

            const existingValue = parseFloat(existingVal) || 0;
            const newValue = parseFloat(newVal) || 0;
            mergedRow[field] = (existingValue + newValue).toString();
          });

          mergedMap.set(dateKey, mergedRow);
        } else {
          // Add new row, cleaning <nil> values
          const cleanedRow = { ...row };
          ['total_volume_usd', 'daily_users', 'numberOfNewUsers', 'daily_trades', 'total_fees_usd'].forEach(field => {
            if (cleanedRow[field] === '<nil>' || cleanedRow[field] === null || cleanedRow[field] === undefined || cleanedRow[field] === '') {
              cleanedRow[field] = '0';
            }
            // Convert scientific notation if present
            if (typeof cleanedRow[field] === 'string' && cleanedRow[field].toLowerCase().includes('e+')) {
              try {
                cleanedRow[field] = parseFloat(cleanedRow[field]).toString();
              } catch (e) {
                cleanedRow[field] = '0';
              }
            }
          });
          mergedMap.set(dateKey, cleanedRow);
        }
      });
    });

    // Convert map back to array and sort by date
    const result = Array.from(mergedMap.values()).sort((a, b) => {
      const dateA = new Date(a.formattedDay.split('/').reverse().join('-'));
      const dateB = new Date(b.formattedDay.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });

    return result;
  }

  /**
   * Download and merge CSV data for a protocol with multiple queries
   */
  private async downloadProtocolData(protocolName: string, queryIds: number[]): Promise<DownloadResult> {
    try {
      // Download all queries in parallel
      const downloadPromises = queryIds.map((queryId, index) =>
        this.downloadSingleQuery(protocolName, queryId, index)
      );

      const results = await Promise.all(downloadPromises);

      // Separate successful and failed downloads
      const successfulResults = results.filter(r => r.success && r.data);
      const failedCount = results.length - successfulResults.length;

      if (successfulResults.length === 0) {
        throw new Error('All queries failed to download');
      }

      // Merge data from all successful queries
      const allData = successfulResults.map(r => r.data!);
      const mergedData = this.mergeDataByDate(allData);

      // Convert back to CSV and save
      const csvContent = Papa.unparse(mergedData);
      const outputFile = path.join(DATA_DIR, `${protocolName}.csv`);

      // Ensure data directory exists
      await fs.mkdir(DATA_DIR, { recursive: true });

      // Write merged CSV data to file
      await fs.writeFile(outputFile, csvContent, 'utf8');

      return {
        success: true,
        protocol: protocolName,
        queriesProcessed: successfulResults.length,
        queriesFailed: failedCount
      };

    } catch (error) {
      console.error(`Error processing protocol ${protocolName}:`, error);

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
   * Download CSV data for all protocols
   */
  private async downloadAllProtocolData(dataType: string = 'private'): Promise<DownloadResult[]> {
    const protocolSources = getProtocolSources(dataType);
    const downloadPromises = Object.entries(protocolSources).map(
      ([protocolName, config]) => this.downloadProtocolData(protocolName, config.queryIds)
    );

    return Promise.all(downloadPromises);
  }

  /**
   * Import CSV data for a specific protocol into the database
   */
  private async importProtocolData(protocolName: string, dataType: string = 'private', queryIds?: number[]): Promise<ImportResult> {
    try {
      const csvFilePath = path.join(DATA_DIR, `${protocolName}.csv`);

      // Check if file exists
      try {
        await fs.access(csvFilePath);
      } catch {
        throw new Error(`CSV file not found: ${csvFilePath}`);
      }

      // Read and parse CSV file
      const fileContent = await fs.readFile(csvFilePath, 'utf8');
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length) {
        throw new Error(`CSV parse errors: ${JSON.stringify(parsed.errors)}`);
      }

      const data = parsed.data;

      // Map CSV columns to database columns and add protocol name and chain
      // First check rolling refresh configs for chain info, then fall back to standard sources
      let chain: 'solana' | 'evm' | 'monad' = 'solana';
      if (dataType === 'public' && hasPublicRollingRefreshSource(protocolName)) {
        const rollingConfig = getPublicRollingRefreshSource(protocolName);
        chain = rollingConfig?.chain || 'solana';
      } else if (dataType === 'private' && hasRollingRefreshSource(protocolName)) {
        const rollingConfig = getRollingRefreshSource(protocolName);
        chain = rollingConfig?.chain || 'solana';
      } else {
        const protocolSources = getProtocolSources(dataType);
        const protocolConfig = protocolSources[protocolName];
        chain = protocolConfig?.chain || 'solana';
      }

      // For EVM protocols, parse chain-specific columns into separate rows
      let mappedData: any[] = [];

      if (chain === 'evm') {
        // EVM protocol: create separate rows for each chain
        data.forEach((row: any) => {
          // Convert date
          let dateValue = row.formattedDay;
          if (dateValue) {
            const [day, month, year] = dateValue.split("/");
            dateValue = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }

          // Get common fields
          const numberOfNewUsers = parseFloat(row.numberOfNewUsers) || 0;
          const numberOfTrades = parseFloat(row.numberOfTrades) || 0;
          const feesUSD = parseFloat(row.feesUSD) || 0;

          // Create a row for each chain that has data
          for (const [chainName, cols] of Object.entries(EVM_CHAIN_COLUMNS)) {
            const volume = parseFloat(row[cols.volumeCol]) || 0;
            const users = parseFloat(row[cols.usersCol]) || 0;

            // Only create row if there's any data for this chain
            if (volume > 0 || users > 0) {
              mappedData.push({
                date: dateValue,
                volume_usd: volume,
                daily_users: users,
                new_users: numberOfNewUsers, // Shared across chains for now
                trades: numberOfTrades,
                fees_usd: feesUSD, // Shared across chains for now
                protocol_name: protocolName,
                chain: chainName,
                data_type: dataType
              });
            }
          }
        });
      } else {
        // Non-EVM protocol: standard single-row mapping
        mappedData = data.map((row: any) => {
          const mappedRow: any = {};

          for (const csvCol in COLUMN_MAP) {
            const dbCol = COLUMN_MAP[csvCol];
            let value = row[csvCol];

            // Convert date from DD/MM/YYYY to YYYY-MM-DD
            if (dbCol === "date" && value) {
              const [day, month, year] = value.split("/");
              value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }

            // Check if value is empty/zero and try alternative columns (for EVM data)
            const numericFields = ['volume_usd', 'daily_users', 'new_users', 'trades', 'fees_usd'];
            if (numericFields.includes(dbCol)) {
              const numValue = parseFloat(value);
              // If primary column is empty or zero, check alternative columns
              if (isNaN(numValue) || numValue === 0) {
                const altCols = ALTERNATIVE_COLUMNS[dbCol];
                if (altCols) {
                  for (const altCol of altCols) {
                    const altValue = row[altCol];
                    if (altValue !== undefined && altValue !== null && altValue !== '' && altValue !== '<nil>') {
                      const parsedAlt = parseFloat(altValue);
                      if (!isNaN(parsedAlt) && parsedAlt !== 0) {
                        value = altValue;
                        break;
                      }
                    }
                  }
                }
              }
            }

            // Handle <nil> values by replacing with 0 for numeric fields
            if (value === '<nil>' || value === null || value === undefined || value === '') {
              if (numericFields.includes(dbCol)) {
                value = 0;
              }
            }

            // Convert scientific notation to decimal for numeric fields
            if (value && typeof value === 'string' && value.toLowerCase().includes('e+')) {
              const sciNumericFields = ['volume_usd', 'fees_usd'];
              if (sciNumericFields.includes(dbCol)) {
                try {
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue)) {
                    value = numValue;
                  }
                } catch (error) {
                  console.warn(`Failed to convert scientific notation for ${csvCol}: ${value}`);
                }
              }
            }

            // Convert string numbers to proper numbers for numeric fields
            if (numericFields.includes(dbCol)) {
              value = parseFloat(value) || 0;
            }

            mappedRow[dbCol] = value;
          }

          mappedRow.protocol_name = protocolName;
          mappedRow.chain = chain;
          mappedRow.data_type = dataType;

          return mappedRow;
        });
      }

      // Sanitize data: convert undefined to null for MySQL compatibility
      const sanitizedData = mappedData.map(row => {
        const sanitizedRow: any = {};
        for (const key in row) {
          sanitizedRow[key] = row[key] === undefined ? null : row[key];
        }
        return sanitizedRow;
      });

      // MySQL: Batch upsert with INSERT...ON DUPLICATE KEY UPDATE
      const result = await db.batchUpsert(TABLE_NAME, sanitizedData, ['protocol_name', 'date', 'chain', 'data_type']);

      const queryIdStr = queryIds?.join(', ') || 'N/A';
      console.log(`${protocolName} (Dune ID: ${queryIdStr}): ${result.affectedRows} rows synced`);

      return {
        success: true,
        protocol: protocolName,
        rowsInserted: mappedData.length
      };

    } catch (error) {
      console.error(`Error importing data for ${protocolName}:`, error);

      return {
        success: false,
        protocol: protocolName,
        rowsInserted: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Import all CSV files into the database
   */
  private async importAllProtocolData(dataType: string = 'private'): Promise<ImportResult[]> {
    try {
      // Get list of CSV files
      const files = await fs.readdir(DATA_DIR);
      const csvFiles = files.filter(file => file.endsWith('.csv'));

      // Import each CSV file (upsert will update existing or insert new)
      const protocolSources = getProtocolSources(dataType);
      const importPromises = csvFiles.map(file => {
        const protocolName = path.basename(file, '.csv');
        const queryIds = protocolSources[protocolName]?.queryIds;
        return this.importProtocolData(protocolName, dataType, queryIds);
      });

      return Promise.all(importPromises);

    } catch (error) {
      console.error('Error in importAllProtocolData:', error);

      // Return error result for all protocols
      const protocolSources = getProtocolSources('private');
      return Object.keys(protocolSources).map(protocol => ({
        success: false,
        protocol,
        rowsInserted: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  /**
   * Complete sync process: download CSV files and import to database
   */
  public async syncData(dataType: string = 'private'): Promise<SyncResult> {
    const startTime = new Date();

    try {
      // Step 1: Download CSV files
      const downloadResults = await this.downloadAllProtocolData(dataType);

      const successfulDownloads = downloadResults.filter(result => result.success);

      if (successfulDownloads.length === 0) {
        throw new Error('No CSV files were downloaded successfully');
      }

      // Step 2: Import CSV files to database
      const importResults = await this.importAllProtocolData(dataType);

      const successfulImports = importResults.filter(result => result.success);
      const totalRowsImported = importResults.reduce((sum, result) => sum + result.rowsInserted, 0);

      // Update sync status for each protocol
      for (const importResult of importResults) {
        await protocolSyncStatusService.updateProtocolSyncStatus(
          importResult.protocol,
          importResult.success,
          importResult.rowsInserted,
          importResult.error
        );
      }

      // Clear all caches after successful import of all protocols
      clearAllCaches();

      return {
        success: true,
        csvFilesFetched: successfulDownloads.length,
        rowsImported: totalRowsImported,
        timestamp: startTime.toISOString(),
        downloadResults,
        importResults
      };

    } catch (error) {
      console.error('Error in complete sync process:', error);

      return {
        success: false,
        csvFilesFetched: 0,
        rowsImported: 0,
        timestamp: startTime.toISOString(),
        downloadResults: [],
        importResults: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const dataManagementService = new DataManagementService();
