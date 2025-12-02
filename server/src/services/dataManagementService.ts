import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { db } from '../lib/db.js';
import { clearAllCaches, clearProtocolCache } from './protocolService.js';
import { protocolSyncStatusService } from './protocolSyncStatusService.js';
import { isSolanaProtocol } from '../config/chainProtocols.js';
import { getRollingRefreshSource, hasRollingRefreshSource } from '../config/rolling-refresh-config.js';

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

// Protocol configuration with chain support
interface ProtocolSource {
  queryIds: number[];
  chain: 'solana' | 'evm' | 'monad';
}

// Protocol sources mapping - now supports multiple query IDs and chains
// Public data sources (when dataType is 'public')
const PUBLIC_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // Solana protocols
  "trojan": { queryIds: [5500774], chain: 'solana' },
  "photon": { queryIds: [5500907, 5579135], chain: 'solana' },
  "bullx": { queryIds: [5500910, 5579188], chain: 'solana' },
  "axiom": { queryIds: [5556317, 5376750, 5376740, 5376694, 4663709, 5829313], chain: 'solana' },
  "gmgnai": { queryIds: [4231939], chain: 'solana' },
  "bloom": { queryIds: [4340509], chain: 'solana' },
  "bonkbot": { queryIds: [4278881], chain: 'solana' },
  "nova": { queryIds: [6106735], chain: 'solana' },
  "soltradingbot": { queryIds: [3954872], chain: 'solana' },
  "maestro": { queryIds: [4537256], chain: 'solana' },
  "banana": { queryIds: [4537271], chain: 'solana' },
  "padre": { queryIds: [5099279], chain: 'solana' },
  "moonshot": { queryIds: [4103111, 5691748], chain: 'solana' },
  "vector": { queryIds: [4969231], chain: 'solana' },
  "telemetry": { queryIds: [5212810], chain: 'solana' },
  "nova terminal": { queryIds: [6106638], chain: 'solana' },
  "slingshot": { queryIds: [4968360, 5785477], chain: 'solana' },
  "fomo": { queryIds: [5315650, 5713629], chain: 'solana' },
  "mevx": { queryIds: [5498846], chain: 'solana' },
  "rhythm": { queryIds: [5698641], chain: 'solana' },
  "vyper": { queryIds: [5284061], chain: 'solana' },
  "opensea": { queryIds: [5910228], chain: 'solana' },
  "phantom": { queryIds: [6229269], chain: 'solana' },

  // Ethereum protocols
  "sigma_evm": { queryIds: [5430634], chain: 'evm' },
  "maestro_evm": { queryIds: [3832557], chain: 'evm' },
  "bloom_evm": { queryIds: [4824799], chain: 'evm' },
  "banana_evm": { queryIds: [4750709], chain: 'evm' },
  "padre_evm": { queryIds: [5793181], chain: 'evm' },
  "gmgnai_evm": { queryIds: [5823908], chain: 'evm' },
  "photon_evm": { queryIds: [5929750], chain: 'evm' },
  "mevx_evm": { queryIds: [5498756], chain: 'evm' },
  "axiom_evm": { queryIds: [6031024], chain: 'evm' },

  // Monad protocols
  "gmgnai_monad": { queryIds: [6252295], chain: 'monad' },
  "bloom_monad": { queryIds: [6257400], chain: 'monad' },
  "nadfun_monad": { queryIds: [6252536], chain: 'monad' },
  "basedbot_monad": { queryIds: [6271223], chain: 'monad' },
};

// Private data sources (when dataType is 'private' or default)
const PRIVATE_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // Solana protocols
  "trojan": { queryIds: [4251075], chain: 'solana' },
  "photon": { queryIds: [5845657, 5845717, 5845732], chain: 'solana' },
  "bullx": { queryIds: [3823331], chain: 'solana' },
  "axiom": { queryIds: [5556317, 5376750, 5376740, 5376694, 4663709, 5829313], chain: 'solana' },
  "gmgnai": { queryIds: [4231939], chain: 'solana' },
  "bloom": { queryIds: [4340509], chain: 'solana' },
  "bonkbot": { queryIds: [4278881], chain: 'solana' },
  "nova": { queryIds: [6106735], chain: 'solana' },
  "soltradingbot": { queryIds: [3954872], chain: 'solana' },
  "maestro": { queryIds: [4537256], chain: 'solana' },
  "banana": { queryIds: [4537271], chain: 'solana' },
  "padre": { queryIds: [5099279], chain: 'solana' },
  "moonshot": { queryIds: [4103111, 5691748], chain: 'solana' },
  "vector": { queryIds: [4969231], chain: 'solana' },
  "telemetry": { queryIds: [5212810], chain: 'solana' },
  "nova terminal": { queryIds: [6106638], chain: 'solana' },
  "slingshot": { queryIds: [4968360, 5785477], chain: 'solana' },
  "fomo": { queryIds: [5315650, 5713629], chain: 'solana' },
  "mevx": { queryIds: [5498846], chain: 'solana' },
  "rhythm": { queryIds: [5698641], chain: 'solana' },
  "vyper": { queryIds: [5284061], chain: 'solana' },
  "opensea": { queryIds: [5910228], chain: 'solana' },
  "phantom": { queryIds: [6229269], chain: 'solana' },

  // Ethereum protocols
  "sigma_evm": { queryIds: [5430634], chain: 'evm' },
  "maestro_evm": { queryIds: [3832557], chain: 'evm' },
  "bloom_evm": { queryIds: [4824799], chain: 'evm' },
  "banana_evm": { queryIds: [4750709], chain: 'evm' },
  "padre_evm": { queryIds: [5793181], chain: 'evm' },
  "gmgnai_evm": { queryIds: [5823908], chain: 'evm' },
  "photon_evm": { queryIds: [5929750], chain: 'evm' },
  "mevx_evm": { queryIds: [5498756], chain: 'evm' },
  "axiom_evm": { queryIds: [6031024], chain: 'evm' },

  // Monad protocols
  "gmgnai_monad": { queryIds: [6252295], chain: 'monad' },
  "bloom_monad": { queryIds: [6257400], chain: 'monad' },
  "nadfun_monad": { queryIds: [6252536], chain: 'monad' },
  "basedbot_monad": { queryIds: [6271223], chain: 'monad' },
};

// Get protocol sources based on data type
function getProtocolSources(dataType: string = 'private'): Record<string, ProtocolSource> {
  return dataType === 'public' ? PUBLIC_PROTOCOL_SOURCES : PRIVATE_PROTOCOL_SOURCES;
}

// CSV column mapping to database columns
const COLUMN_MAP: Record<string, string> = {
  formattedDay: "date",
  total_volume_usd: "volume_usd",
  daily_users: "daily_users",
  numberOfNewUsers: "new_users",
  daily_trades: "trades",
  total_fees_usd: "fees_usd",
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
      console.log(`\n=== SYNC DEBUG ===`);
      console.log(`Protocol: ${protocolName}`);
      console.log(`Data Type: ${dataType}`);
      console.log(`==================\n`);

      // Check for rolling refresh config first
      let protocolConfig;
      let effectiveDataType = dataType;

      if (hasRollingRefreshSource(protocolName)) {
        // Use rolling refresh config (always private data)
        protocolConfig = getRollingRefreshSource(protocolName);
        effectiveDataType = 'private';
        console.log(`✓ Using rolling refresh config (7-day data) for ${protocolName}`);
        console.log(`  Query IDs: ${protocolConfig?.queryIds.join(', ')}`);
        console.log(`  Data Type: ${effectiveDataType} (forced)`);
      } else {
        // Use standard config
        const protocolSources = getProtocolSources(dataType);

        // Validate protocol exists
        if (!protocolSources[protocolName]) {
          throw new Error(`Protocol '${protocolName}' not found in protocol sources for data type '${dataType}'`);
        }

        protocolConfig = protocolSources[protocolName];
        console.log(`Using standard config for ${protocolName}`);
        console.log(`  Query IDs: ${protocolConfig.queryIds.join(', ')}`);
        console.log(`  Data Type: ${effectiveDataType}`);
      }

      if (!protocolConfig) {
        throw new Error(`No configuration found for protocol '${protocolName}'`);
      }

      console.log(`Starting ${protocolConfig.chain} data sync for protocol: ${protocolName}...`);

      // Step 1: Download CSV file for the specific protocol
      const downloadResult = await this.downloadProtocolData(protocolName, protocolConfig.queryIds);

      if (!downloadResult.success) {
        throw new Error(`Failed to download data for ${protocolName}: ${downloadResult.error}`);
      }

      console.log(`Downloaded data for ${protocolName} successfully`);

      // Step 2: Import CSV file to database (upsert will update existing or insert new)
      const importResult = await this.importProtocolData(protocolName, effectiveDataType);

      if (!importResult.success) {
        throw new Error(`Failed to import data for ${protocolName}: ${importResult.error}`);
      }

      console.log(`Imported ${importResult.rowsInserted} rows for ${protocolName}`);

      // Update sync status
      await protocolSyncStatusService.updateProtocolSyncStatus(
        protocolName,
        true,
        importResult.rowsInserted
      );

      // Clear cache for this specific protocol after successful import
      clearProtocolCache(protocolName);
      console.log(`Cache cleared for protocol: ${protocolName}`);

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
   * Download CSV data from Dune API for a single query
   */
  private async downloadSingleQuery(protocolName: string, queryId: number, queryIndex: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = `https://api.dune.com/api/v1/query/${queryId}/results/csv?api_key=${API_KEY}`;

      console.log(`\n=== DOWNLOAD DEBUG ===`);
      console.log(`Protocol: ${protocolName}`);
      console.log(`Query ID: ${queryId}`);
      console.log(`Query Index: ${queryIndex + 1}`);
      console.log(`URL: ${url.replace(API_KEY || '', '[API_KEY]')}`);
      console.log(`======================\n`);

      console.log(`Fetching data for ${protocolName} query ${queryIndex + 1} (ID: ${queryId})...`);

      const response = await fetch(url);

      console.log(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        console.error(`HTTP Error: ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvData = await response.text();

      console.log(`CSV data length: ${csvData.length} characters`);
      console.log(`CSV data preview (first 200 chars): ${csvData.substring(0, 200)}`);

      if (!csvData.trim()) {
        console.error('Downloaded CSV data is empty');
        throw new Error('Downloaded data is empty');
      }

      // Parse CSV data
      const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      console.log(`Parse result: ${parsed.data.length} rows, ${parsed.errors.length} errors`);

      if (parsed.errors.length) {
        console.error(`CSV parse errors:`, parsed.errors);
        throw new Error(`CSV parse errors: ${JSON.stringify(parsed.errors)}`);
      }

      if (parsed.data.length === 0) {
        console.warn(`No data rows found in CSV for ${protocolName} query ${queryIndex + 1}`);
        return { success: true, data: [] };
      }

      console.log(`Successfully fetched ${parsed.data.length} rows for ${protocolName} query ${queryIndex + 1}`);
      console.log(`Sample row:`, parsed.data[0]);

      return {
        success: true,
        data: parsed.data
      };

    } catch (error) {
      console.error(`Error downloading query ${queryId} for ${protocolName}:`, error);

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
      console.log(`Processing ${queryIds.length} queries for ${protocolName}...`);

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

      console.log(`Merged ${mergedData.length} unique date records for ${protocolName}`);

      // Convert back to CSV and save
      const csvContent = Papa.unparse(mergedData);
      const outputFile = path.join(DATA_DIR, `${protocolName}.csv`);

      // Ensure data directory exists
      await fs.mkdir(DATA_DIR, { recursive: true });

      // Write merged CSV data to file
      await fs.writeFile(outputFile, csvContent, 'utf8');

      console.log(`Successfully created merged file for ${protocolName}: ${outputFile}`);

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
  private async importProtocolData(protocolName: string, dataType: string = 'private'): Promise<ImportResult> {
    try {
      const csvFilePath = path.join(DATA_DIR, `${protocolName}.csv`);

      // Check if file exists
      try {
        await fs.access(csvFilePath);
      } catch {
        throw new Error(`CSV file not found: ${csvFilePath}`);
      }

      console.log(`--- Importing ${csvFilePath} ---`);

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
      const protocolSources = getProtocolSources(dataType);
      const protocolConfig = protocolSources[protocolName];
      const chain = protocolConfig?.chain || 'solana';

      const mappedData = data.map((row: any) => {
        const mappedRow: any = {};

        for (const csvCol in COLUMN_MAP) {
          let value = row[csvCol];

          // Convert date from DD/MM/YYYY to YYYY-MM-DD
          if (COLUMN_MAP[csvCol] === "date" && value) {
            const [day, month, year] = value.split("/");
            value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }

          // Handle <nil> values by replacing with 0 for numeric fields
          if (value === '<nil>' || value === null || value === undefined || value === '') {
            const numericFields = ['volume_usd', 'daily_users', 'new_users', 'trades', 'fees_usd'];
            if (numericFields.includes(COLUMN_MAP[csvCol])) {
              value = 0;
            }
          }

          // Convert scientific notation to decimal for numeric fields
          if (value && typeof value === 'string' && value.toLowerCase().includes('e+')) {
            const numericFields = ['volume_usd', 'fees_usd'];
            if (numericFields.includes(COLUMN_MAP[csvCol])) {
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
          if (['volume_usd', 'daily_users', 'new_users', 'trades', 'fees_usd'].includes(COLUMN_MAP[csvCol])) {
            value = parseFloat(value) || 0;
          }

          mappedRow[COLUMN_MAP[csvCol]] = value;
        }

        mappedRow.protocol_name = protocolName;
        mappedRow.chain = chain;
        mappedRow.data_type = dataType;

        return mappedRow;
      });

      // Calculate 15 days ago for monitoring
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split('T')[0];

      // TEMPORARY LOGGING - PRE-REFRESH SNAPSHOT
      console.log(`\n┌─────────────────────────────────────────────────────────┐`);
      console.log(`│ [REFRESH-MONITOR] PRE-REFRESH DATABASE SNAPSHOT        │`);
      console.log(`│ Protocol: ${protocolName.padEnd(20)} Chain: ${chain.padEnd(10)} │`);
      console.log(`└─────────────────────────────────────────────────────────┘`);

      // MySQL: Get pre-refresh data
      const preRefreshData = await db.query<{ date: string; volume_usd: number; fees_usd: number; data_type: string }>(
        `SELECT date, volume_usd, fees_usd, data_type
         FROM ${TABLE_NAME}
         WHERE protocol_name = ? AND chain = ? AND data_type = ? AND date >= ?
         ORDER BY date ASC`,
        [protocolName, chain, dataType, fifteenDaysAgoStr]
      );

      console.log(`[REFRESH-MONITOR] Found ${preRefreshData.length} existing rows in last 15 days\n`);
      console.log(`Date       │ Volume USD          │ Fees USD            │ Type`);
      console.log(`───────────┼─────────────────────┼─────────────────────┼─────────`);
      preRefreshData.forEach(row => {
        console.log(`${row.date} │ ${String(row.volume_usd || 0).padStart(19)} │ ${String(row.fees_usd || 0).padStart(19)} │ ${row.data_type}`);
      });

      // Debug logging
      console.log(`\n=== INSERT DEBUG ===`);
      console.log(`Total rows to insert: ${mappedData.length}`);
      console.log(`Data type for all rows: ${dataType}`);
      if (mappedData.length > 0) {
        console.log(`First row sample:`, JSON.stringify(mappedData[0], null, 2));
      }
      console.log(`====================\n`);

      // MySQL: Batch upsert with INSERT...ON DUPLICATE KEY UPDATE
      const result = await db.batchUpsert(TABLE_NAME, mappedData, ['protocol_name', 'date', 'chain', 'data_type']);

      console.log(`All data from ${protocolName}.csv inserted successfully!`);
      console.log(`Total rows affected: ${result.affectedRows}`);

      // TEMPORARY LOGGING - POST-REFRESH SNAPSHOT
      console.log(`\n┌─────────────────────────────────────────────────────────┐`);
      console.log(`│ [REFRESH-MONITOR] POST-REFRESH DATABASE SNAPSHOT       │`);
      console.log(`└─────────────────────────────────────────────────────────┘`);

      // MySQL: Get post-refresh data
      const postRefreshData = await db.query<{ date: string; volume_usd: number; fees_usd: number; data_type: string }>(
        `SELECT date, volume_usd, fees_usd, data_type
         FROM ${TABLE_NAME}
         WHERE protocol_name = ? AND chain = ? AND data_type = ? AND date >= ?
         ORDER BY date ASC`,
        [protocolName, chain, dataType, fifteenDaysAgoStr]
      );

      console.log(`[REFRESH-MONITOR] Found ${postRefreshData.length} rows after refresh\n`);
      console.log(`Date       │ Volume USD          │ Fees USD            │ Type`);
      console.log(`───────────┼─────────────────────┼─────────────────────┼─────────`);
      postRefreshData.forEach(row => {
        console.log(`${row.date} │ ${String(row.volume_usd || 0).padStart(19)} │ ${String(row.fees_usd || 0).padStart(19)} │ ${row.data_type}`);
      });

      // Comparison Report
      console.log(`\n┌─────────────────────────────────────────────────────────┐`);
      console.log(`│ [REFRESH-MONITOR] COMPARISON REPORT                    │`);
      console.log(`└─────────────────────────────────────────────────────────┘\n`);

      const preMap = new Map(preRefreshData.map(r => [r.date, r]));
      const postMap = new Map(postRefreshData.map(r => [r.date, r]));
      const csvLast15Days = mappedData.filter(row => row.date >= fifteenDaysAgoStr);
      const csvMap = new Map(csvLast15Days.map(r => [r.date, r]));

      let updated = 0, inserted = 0, unchanged = 0;

      csvMap.forEach((csvRow: any, date: string) => {
        const preRow = preMap.get(date);
        const postRow = postMap.get(date);

        if (!preRow && postRow) {
          inserted++;
          console.log(`✨ INSERTED  ${date}: Vol=${postRow.volume_usd}, Fees=${postRow.fees_usd}`);
        } else if (preRow && postRow) {
          if (preRow.volume_usd !== postRow.volume_usd || preRow.fees_usd !== postRow.fees_usd) {
            updated++;
            console.log(`🔄 UPDATED   ${date}:`);
            console.log(`   Before: Vol=${preRow.volume_usd}, Fees=${preRow.fees_usd}`);
            console.log(`   After:  Vol=${postRow.volume_usd}, Fees=${postRow.fees_usd}`);
            console.log(`   Source: Vol=${csvRow.volume_usd}, Fees=${csvRow.fees_usd}`);
          } else {
            unchanged++;
            console.log(`✓ UNCHANGED ${date}: Vol=${postRow.volume_usd}, Fees=${postRow.fees_usd}`);
          }
        }
      });

      console.log(`\n[REFRESH-MONITOR] Summary:`);
      console.log(`  ✨ Inserted: ${inserted}`);
      console.log(`  🔄 Updated:  ${updated}`);
      console.log(`  ✓ Unchanged: ${unchanged}`);
      console.log(`  📊 Total:    ${inserted + updated + unchanged}`);
      console.log(`\n═══════════════════════════════════════════════════════════\n`);

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

      console.log(`Found ${csvFiles.length} CSV files:`, csvFiles);

      // Import each CSV file (upsert will update existing or insert new)
      const importPromises = csvFiles.map(file => {
        const protocolName = path.basename(file, '.csv');
        return this.importProtocolData(protocolName, dataType);
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
      console.log(`Starting complete data sync process for ${dataType} data...`);

      // Step 1: Download CSV files
      console.log('--- Downloading CSV files from Dune API ---');
      const downloadResults = await this.downloadAllProtocolData(dataType);

      const successfulDownloads = downloadResults.filter(result => result.success);
      console.log(`Downloaded ${successfulDownloads.length}/${downloadResults.length} CSV files successfully`);

      if (successfulDownloads.length === 0) {
        throw new Error('No CSV files were downloaded successfully');
      }

      // Step 2: Import CSV files to database
      console.log('--- Importing CSV files to database ---');
      const importResults = await this.importAllProtocolData(dataType);

      const successfulImports = importResults.filter(result => result.success);
      const totalRowsImported = importResults.reduce((sum, result) => sum + result.rowsInserted, 0);

      console.log(`Imported ${successfulImports.length}/${importResults.length} protocols successfully`);
      console.log(`Total rows imported: ${totalRowsImported}`);

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
      console.log('All caches cleared after successful data sync');

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
