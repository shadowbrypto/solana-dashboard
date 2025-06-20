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

// Protocol sources mapping
const PROTOCOL_SOURCES = {
  "trojan": 4251075,
  "photon": 4852143,
  "bullx": 3823331,
  "axiom": 4663709,
  "gmgnai": 4231939,
  "bloom": 4340509,
  "bonkbot": 4278881,
  "nova": 4503165,
  "soltradingbot": 3954872,
  "maestro": 4537256,
  "banana": 4537271,
  "padre": 5099279,
  "moonshot": 4103111,
  "vector": 4969231,
  "bonkbot terminal": 5212810,
  "nova terminal": 5196914,
  "slingshot": 4968360,
  "tryFomo": 5315650
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
   * Download CSV data from Dune API for a specific protocol
   */
  private async downloadProtocolData(protocolName: string, queryId: number): Promise<DownloadResult> {
    try {
      const url = `https://api.dune.com/api/v1/query/${queryId}/results/csv?api_key=${API_KEY}`;
      const outputFile = path.join(DATA_DIR, `${protocolName}.csv`);

      console.log(`Fetching data for ${protocolName} (ID: ${queryId})...`);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvData = await response.text();
      
      // Ensure data directory exists
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Write CSV data to file
      await fs.writeFile(outputFile, csvData, 'utf8');

      // Verify file was written and has content
      const stats = await fs.stat(outputFile);
      if (stats.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      console.log(`Successfully downloaded data for ${protocolName} to ${outputFile}`);
      
      return {
        success: true,
        protocol: protocolName
      };

    } catch (error) {
      console.error(`Error downloading data for ${protocolName}:`, error);
      
      return {
        success: false,
        protocol: protocolName,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download CSV data for all protocols
   */
  private async downloadAllProtocolData(): Promise<DownloadResult[]> {
    const downloadPromises = Object.entries(PROTOCOL_SOURCES).map(
      ([protocolName, queryId]) => this.downloadProtocolData(protocolName, queryId)
    );

    return Promise.all(downloadPromises);
  }

  /**
   * Import CSV data for a specific protocol into the database
   */
  private async importProtocolData(protocolName: string): Promise<ImportResult> {
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