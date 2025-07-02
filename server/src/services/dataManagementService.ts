import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase.js';

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

// Protocol sources mapping - now supports multiple query IDs per protocol
const PROTOCOL_SOURCES: Record<string, number[]> = {
  "trojan": [4251075],
  "photon": [4852143],
  "bullx": [3823331],
  "axiom": [5376750, 5376740, 5376694, 4663709], // Multiple queries for axiom
  "gmgnai": [4231939],
  "bloom": [4340509],
  "bonkbot": [4278881],
  "nova": [4503165],
  "soltradingbot": [3954872],
  "maestro": [4537256],
  "banana": [4537271],
  "padre": [5099279],
  "moonshot": [4103111],
  "vector": [4969231],
  "bonkbot terminal": [5212810],
  "nova terminal": [5196914],
  "slingshot": [4968360],
  "fomo": [5315650]
};

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
  public async syncProtocolData(protocolName: string): Promise<SyncResult> {
    const startTime = new Date();
    
    try {
      // Validate protocol exists
      if (!PROTOCOL_SOURCES[protocolName]) {
        throw new Error(`Protocol '${protocolName}' not found in PROTOCOL_SOURCES`);
      }

      console.log(`Starting data sync for protocol: ${protocolName}...`);

      // Step 1: Download CSV file for the specific protocol
      const downloadResult = await this.downloadProtocolData(protocolName, PROTOCOL_SOURCES[protocolName]);
      
      if (!downloadResult.success) {
        throw new Error(`Failed to download data for ${protocolName}: ${downloadResult.error}`);
      }

      console.log(`Downloaded data for ${protocolName} successfully`);

      // Step 2: Import CSV file to database (delete existing data for this protocol first)
      const importResult = await this.importProtocolData(protocolName, true);
      
      if (!importResult.success) {
        throw new Error(`Failed to import data for ${protocolName}: ${importResult.error}`);
      }

      console.log(`Imported ${importResult.rowsInserted} rows for ${protocolName}`);

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

      console.log(`Fetching data for ${protocolName} query ${queryIndex + 1} (ID: ${queryId})...`);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvData = await response.text();
      
      if (!csvData.trim()) {
        throw new Error('Downloaded data is empty');
      }

      // Parse CSV data
      const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length) {
        throw new Error(`CSV parse errors: ${JSON.stringify(parsed.errors)}`);
      }

      console.log(`Successfully fetched ${parsed.data.length} rows for ${protocolName} query ${queryIndex + 1}`);
      
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
    dataArrays.forEach((data, queryIndex) => {
      data.forEach(row => {
        const dateKey = row.formattedDay;
        if (!dateKey) return; // Skip rows without date

        if (mergedMap.has(dateKey)) {
          // Merge with existing row - combine numeric values
          const existingRow = mergedMap.get(dateKey);
          const mergedRow = { ...existingRow };

          // Sum numeric fields
          ['total_volume_usd', 'daily_users', 'numberOfNewUsers', 'daily_trades', 'total_fees_usd'].forEach(field => {
            const existingValue = parseFloat(existingRow[field]) || 0;
            const newValue = parseFloat(row[field]) || 0;
            mergedRow[field] = (existingValue + newValue).toString();
          });

          mergedMap.set(dateKey, mergedRow);
        } else {
          // Add new row
          mergedMap.set(dateKey, { ...row });
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
  private async downloadAllProtocolData(): Promise<DownloadResult[]> {
    const downloadPromises = Object.entries(PROTOCOL_SOURCES).map(
      ([protocolName, queryIds]) => this.downloadProtocolData(protocolName, queryIds)
    );

    return Promise.all(downloadPromises);
  }

  /**
   * Import CSV data for a specific protocol into the database
   * @param deleteExisting - If true, deletes existing data for this protocol before importing
   */
  private async importProtocolData(protocolName: string, deleteExisting: boolean = false): Promise<ImportResult> {
    try {
      const csvFilePath = path.join(DATA_DIR, `${protocolName}.csv`);
      
      // Check if file exists
      try {
        await fs.access(csvFilePath);
      } catch {
        throw new Error(`CSV file not found: ${csvFilePath}`);
      }

      console.log(`--- Importing ${csvFilePath} ---`);

      // Delete existing data for this protocol if requested
      if (deleteExisting) {
        console.log(`Deleting existing data for ${protocolName}...`);
        const { error: deleteError } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq('protocol_name', protocolName);

        if (deleteError) {
          throw new Error(`Failed to delete existing data: ${JSON.stringify(deleteError)}`);
        }
        console.log(`Successfully deleted existing data for ${protocolName}`);
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

      // Map CSV columns to database columns and add protocol name
      const mappedData = data.map((row: any) => {
        const mappedRow: any = {};
        
        for (const csvCol in COLUMN_MAP) {
          let value = row[csvCol];
          
          // Convert date from DD/MM/YYYY to YYYY-MM-DD
          if (COLUMN_MAP[csvCol] === "date" && value) {
            const [day, month, year] = value.split("/");
            value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }
          
          mappedRow[COLUMN_MAP[csvCol]] = value;
        }
        
        mappedRow.protocol_name = protocolName;
        return mappedRow;
      });

      // Insert data in batches
      const batchSize = 500;
      let insertedCount = 0;

      for (let i = 0; i < mappedData.length; i += batchSize) {
        const batch = mappedData.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(TABLE_NAME)
          .insert(batch);

        if (error) {
          throw new Error(`Supabase insert error (batch ${i / batchSize + 1}): ${JSON.stringify(error)}`);
        }

        insertedCount += batch.length;
        console.log(`Batch ${i / batchSize + 1} inserted successfully! Rows inserted in this batch: ${batch.length}`);
      }

      console.log(`All data from ${protocolName}.csv inserted successfully!`);
      console.log(`Total rows actually inserted for ${protocolName}.csv: ${insertedCount}`);

      return {
        success: true,
        protocol: protocolName,
        rowsInserted: insertedCount
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
  private async importAllProtocolData(): Promise<ImportResult[]> {
    try {
      // First, delete all existing data
      console.log('--- Deleting all existing data from protocol_stats ---');
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .delete()
        .neq('id', 0); // Delete all rows

      if (deleteError) {
        throw new Error(`Failed to delete existing data: ${JSON.stringify(deleteError)}`);
      }

      console.log('Successfully deleted all existing data');

      // Get list of CSV files
      const files = await fs.readdir(DATA_DIR);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      console.log(`Found ${csvFiles.length} CSV files:`, csvFiles);

      // Import each CSV file
      const importPromises = csvFiles.map(file => {
        const protocolName = path.basename(file, '.csv');
        return this.importProtocolData(protocolName);
      });

      return Promise.all(importPromises);

    } catch (error) {
      console.error('Error in importAllProtocolData:', error);
      
      // Return error result for all protocols
      return Object.keys(PROTOCOL_SOURCES).map(protocol => ({
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
  public async syncData(): Promise<SyncResult> {
    const startTime = new Date();
    
    try {
      console.log('Starting complete data sync process...');

      // Step 1: Download CSV files
      console.log('--- Downloading CSV files from Dune API ---');
      const downloadResults = await this.downloadAllProtocolData();
      
      const successfulDownloads = downloadResults.filter(result => result.success);
      console.log(`Downloaded ${successfulDownloads.length}/${downloadResults.length} CSV files successfully`);

      if (successfulDownloads.length === 0) {
        throw new Error('No CSV files were downloaded successfully');
      }

      // Step 2: Import CSV files to database
      console.log('--- Importing CSV files to database ---');
      const importResults = await this.importAllProtocolData();
      
      const successfulImports = importResults.filter(result => result.success);
      const totalRowsImported = importResults.reduce((sum, result) => sum + result.rowsInserted, 0);

      console.log(`Imported ${successfulImports.length}/${importResults.length} protocols successfully`);
      console.log(`Total rows imported: ${totalRowsImported}`);

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