import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase.js';
import { clearAllCaches } from './protocolService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_KEY = process.env.DUNE_API_KEY;
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data', 'launchpads');
const TABLE_NAME = "launchpad_stats";

// Validate API key is present
if (!API_KEY) {
  throw new Error('DUNE_API_KEY environment variable is not set');
}

// Launchpad configuration - Solana only
interface LaunchpadSource {
  queryIds: number[];
}

// Launchpad sources mapping - only Solana chain
const LAUNCHPAD_SOURCES: Record<string, LaunchpadSource> = {
  "pumpfun": { queryIds: [4894656] }, // Will be populated with actual query IDs
};

// CSV column mapping to database columns - only launches, graduations, date
const COLUMN_MAP: Record<string, string> = {
  block_date: "date",
  token_launches: "launches",
  token_migrations: "graduations",
};

interface DownloadResult {
  success: boolean;
  launchpad: string;
  queriesProcessed?: number;
  queriesFailed?: number;
  error?: string;
}

interface ImportResult {
  success: boolean;
  launchpad: string;
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

export class LaunchpadDataService {
  
  /**
   * Sync data for a specific launchpad
   */
  public async syncLaunchpadData(launchpadName: string): Promise<SyncResult> {
    const startTime = new Date();
    
    try {
      console.log(`\n=== LAUNCHPAD SYNC DEBUG ===`);
      console.log(`Launchpad: ${launchpadName}`);
      console.log(`============================\n`);
      
      // Validate launchpad exists
      if (!LAUNCHPAD_SOURCES[launchpadName]) {
        throw new Error(`Launchpad '${launchpadName}' not found in launchpad sources`);
      }

      const launchpadConfig = LAUNCHPAD_SOURCES[launchpadName];
      console.log(`Using query IDs: ${launchpadConfig.queryIds.join(', ')}`);
      
      // Check if query IDs are configured
      if (launchpadConfig.queryIds.length === 0) {
        throw new Error(`No query IDs configured for launchpad '${launchpadName}'. Please add query IDs to the configuration.`);
      }

      console.log(`Starting data sync for launchpad: ${launchpadName}...`);

      // Step 1: Download CSV file for the specific launchpad
      const downloadResult = await this.downloadLaunchpadData(launchpadName, launchpadConfig.queryIds);
      
      if (!downloadResult.success) {
        throw new Error(`Failed to download data for ${launchpadName}: ${downloadResult.error}`);
      }

      console.log(`Downloaded data for ${launchpadName} successfully`);

      // Step 2: Import CSV file to database (delete existing data for this launchpad first)
      const importResult = await this.importLaunchpadData(launchpadName, true);
      
      if (!importResult.success) {
        throw new Error(`Failed to import data for ${launchpadName}: ${importResult.error}`);
      }

      console.log(`Imported ${importResult.rowsInserted} rows for ${launchpadName}`);

      return {
        success: true,
        csvFilesFetched: 1,
        rowsImported: importResult.rowsInserted,
        timestamp: startTime.toISOString(),
        downloadResults: [downloadResult],
        importResults: [importResult]
      };

    } catch (error) {
      console.error(`Error syncing data for launchpad ${launchpadName}:`, error);
      
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
  private async downloadSingleQuery(launchpadName: string, queryId: number, queryIndex: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const url = `https://api.dune.com/api/v1/query/${queryId}/results/csv?api_key=${API_KEY}`;

      console.log(`\n=== LAUNCHPAD DOWNLOAD DEBUG ===`);
      console.log(`Launchpad: ${launchpadName}`);
      console.log(`Query ID: ${queryId}`);
      console.log(`Query Index: ${queryIndex + 1}`);
      console.log(`URL: ${url.replace(API_KEY || '', '[API_KEY]')}`);
      console.log(`=================================\n`);

      console.log(`Fetching data for ${launchpadName} query ${queryIndex + 1} (ID: ${queryId})...`);

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
        console.warn(`No data rows found in CSV for ${launchpadName} query ${queryIndex + 1}`);
        return { success: true, data: [] };
      }

      console.log(`Successfully fetched ${parsed.data.length} rows for ${launchpadName} query ${queryIndex + 1}`);
      console.log(`Sample row:`, parsed.data[0]);
      
      return {
        success: true,
        data: parsed.data
      };

    } catch (error) {
      console.error(`Error downloading query ${queryId} for ${launchpadName}:`, error);
      
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
        const dateKey = row.block_date;
        if (!dateKey) return; // Skip rows without date

        if (mergedMap.has(dateKey)) {
          // Merge with existing row - combine numeric values
          const existingRow = mergedMap.get(dateKey);
          const mergedRow = { ...existingRow };

          // Sum numeric fields, handling <nil> values
          ['token_launches', 'token_migrations'].forEach(field => {
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
          ['token_launches', 'token_migrations'].forEach(field => {
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
      const dateA = new Date(a.block_date);
      const dateB = new Date(b.block_date);
      return dateA.getTime() - dateB.getTime();
    });

    return result;
  }

  /**
   * Download and merge CSV data for a launchpad with multiple queries
   */
  private async downloadLaunchpadData(launchpadName: string, queryIds: number[]): Promise<DownloadResult> {
    try {
      console.log(`Processing ${queryIds.length} queries for ${launchpadName}...`);

      // Download all queries in parallel
      const downloadPromises = queryIds.map((queryId, index) => 
        this.downloadSingleQuery(launchpadName, queryId, index)
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

      console.log(`Merged ${mergedData.length} unique date records for ${launchpadName}`);

      // Convert back to CSV and save
      const csvContent = Papa.unparse(mergedData);
      const outputFile = path.join(DATA_DIR, `${launchpadName}.csv`);

      // Ensure data directory exists
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Write merged CSV data to file
      await fs.writeFile(outputFile, csvContent, 'utf8');

      console.log(`Successfully created merged file for ${launchpadName}: ${outputFile}`);
      
      return {
        success: true,
        launchpad: launchpadName,
        queriesProcessed: successfulResults.length,
        queriesFailed: failedCount
      };

    } catch (error) {
      console.error(`Error processing launchpad ${launchpadName}:`, error);
      
      return {
        success: false,
        launchpad: launchpadName,
        queriesProcessed: 0,
        queriesFailed: queryIds.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download CSV data for all launchpads
   */
  private async downloadAllLaunchpadData(): Promise<DownloadResult[]> {
    const downloadPromises = Object.entries(LAUNCHPAD_SOURCES).map(
      ([launchpadName, config]) => this.downloadLaunchpadData(launchpadName, config.queryIds)
    );

    return Promise.all(downloadPromises);
  }

  /**
   * Import CSV data for a specific launchpad into the database
   * @param deleteExisting - If true, deletes existing data for this launchpad before importing
   */
  private async importLaunchpadData(launchpadName: string, deleteExisting: boolean = false): Promise<ImportResult> {
    try {
      const csvFilePath = path.join(DATA_DIR, `${launchpadName}.csv`);
      
      // Check if file exists
      try {
        await fs.access(csvFilePath);
      } catch {
        throw new Error(`CSV file not found: ${csvFilePath}`);
      }

      console.log(`--- Importing ${csvFilePath} ---`);

      // Delete existing data for this launchpad if requested
      if (deleteExisting) {
        console.log(`\n=== LAUNCHPAD DELETE DEBUG ===`);
        console.log(`Deleting existing data for ${launchpadName}...`);
        
        const { error: deleteError } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq('launchpad_name', launchpadName);

        if (deleteError) {
          console.error(`Delete error:`, deleteError);
          throw new Error(`Failed to delete existing data: ${JSON.stringify(deleteError)}`);
        }
        console.log(`Successfully deleted existing data for ${launchpadName}`);
        console.log(`===============================\n`);
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

      // Map CSV columns to database columns and add launchpad name
      const mappedData = data.map((row: any) => {
        const mappedRow: any = {};
        
        for (const csvCol in COLUMN_MAP) {
          let value = row[csvCol];
          
          // Convert date from various formats to YYYY-MM-DD
          if (COLUMN_MAP[csvCol] === "date" && value) {
            if (value.includes("/")) {
              // Handle DD/MM/YYYY format
              const [day, month, year] = value.split("/");
              value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            } else if (value.includes("UTC")) {
              // Handle "2025-07-28 00:00:00.000 UTC" format
              const dateOnly = value.split(" ")[0];
              value = dateOnly;
            }
          }
          
          // Handle <nil> values by replacing with 0 for numeric fields
          if (value === '<nil>' || value === null || value === undefined || value === '') {
            const numericFields = ['launches', 'graduations'];
            if (numericFields.includes(COLUMN_MAP[csvCol])) {
              value = '0';
            }
          }
          
          // Convert scientific notation to decimal for numeric fields
          if (value && typeof value === 'string' && value.toLowerCase().includes('e+')) {
            const numericFields = ['launches', 'graduations'];
            if (numericFields.includes(COLUMN_MAP[csvCol])) {
              try {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  value = numValue.toFixed(0); // No decimals for launches/graduations
                }
              } catch (error) {
                console.warn(`Failed to convert scientific notation for ${csvCol}: ${value}`);
              }
            }
          }
          
          mappedRow[COLUMN_MAP[csvCol]] = value;
        }
        
        mappedRow.launchpad_name = launchpadName;
        
        // Debug logging for first row
        if (data.indexOf(row) === 0) {
          console.log(`Debug: First row mapped data:`, { launchpad_name: mappedRow.launchpad_name });
        }
        
        return mappedRow;
      });

      // Insert data in batches
      const batchSize = 500;
      let insertedCount = 0;

      console.log(`\n=== LAUNCHPAD INSERT DEBUG ===`);
      console.log(`Total rows to insert: ${mappedData.length}`);
      console.log(`First row sample:`, JSON.stringify(mappedData[0], null, 2));
      console.log(`===============================\n`);

      for (let i = 0; i < mappedData.length; i += batchSize) {
        const batch = mappedData.slice(i, i + batchSize);
        
        console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}, rows ${i + 1}-${Math.min(i + batchSize, mappedData.length)}`);
        console.log(`Sample row from batch:`, { 
          launchpad_name: batch[0]?.launchpad_name, 
          date: batch[0]?.date 
        });
        
        const { error } = await supabase
          .from(TABLE_NAME)
          .insert(batch);

        if (error) {
          throw new Error(`Supabase insert error (batch ${i / batchSize + 1}): ${JSON.stringify(error)}`);
        }

        insertedCount += batch.length;
        console.log(`Batch ${i / batchSize + 1} inserted successfully! Rows inserted in this batch: ${batch.length}`);
      }

      console.log(`All data from ${launchpadName}.csv inserted successfully!`);
      console.log(`Total rows actually inserted for ${launchpadName}.csv: ${insertedCount}`);

      return {
        success: true,
        launchpad: launchpadName,
        rowsInserted: insertedCount
      };

    } catch (error) {
      console.error(`Error importing data for ${launchpadName}:`, error);
      
      return {
        success: false,
        launchpad: launchpadName,
        rowsInserted: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Import all CSV files into the database
   */
  private async importAllLaunchpadData(): Promise<ImportResult[]> {
    try {
      // First, delete existing launchpad data
      console.log(`--- Deleting existing launchpad data from launchpad_stats ---`);
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .delete()
        .neq('launchpad_name', ''); // Delete all records

      if (deleteError) {
        throw new Error(`Failed to delete existing data: ${JSON.stringify(deleteError)}`);
      }

      console.log(`Successfully deleted existing launchpad data`);

      // Get list of CSV files
      const files = await fs.readdir(DATA_DIR);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      console.log(`Found ${csvFiles.length} CSV files:`, csvFiles);

      // Import each CSV file
      const importPromises = csvFiles.map(file => {
        const launchpadName = path.basename(file, '.csv');
        return this.importLaunchpadData(launchpadName, false);
      });

      return Promise.all(importPromises);

    } catch (error) {
      console.error('Error in importAllLaunchpadData:', error);
      
      // Return error result for all launchpads
      return Object.keys(LAUNCHPAD_SOURCES).map(launchpad => ({
        success: false,
        launchpad,
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
      console.log(`Starting complete launchpad data sync process...`);

      // Step 1: Download CSV files
      console.log('--- Downloading CSV files from Dune API ---');
      const downloadResults = await this.downloadAllLaunchpadData();
      
      const successfulDownloads = downloadResults.filter(result => result.success);
      console.log(`Downloaded ${successfulDownloads.length}/${downloadResults.length} CSV files successfully`);

      if (successfulDownloads.length === 0) {
        throw new Error('No CSV files were downloaded successfully');
      }

      // Step 2: Import CSV files to database
      console.log('--- Importing CSV files to database ---');
      const importResults = await this.importAllLaunchpadData();
      
      const successfulImports = importResults.filter(result => result.success);
      const totalRowsImported = importResults.reduce((sum, result) => sum + result.rowsInserted, 0);

      console.log(`Imported ${successfulImports.length}/${importResults.length} launchpads successfully`);
      console.log(`Total rows imported: ${totalRowsImported}`);

      // Clear all caches after successful import of all launchpads
      clearAllCaches();
      console.log('All caches cleared after successful launchpad data sync');

      return {
        success: true,
        csvFilesFetched: successfulDownloads.length,
        rowsImported: totalRowsImported,
        timestamp: startTime.toISOString(),
        downloadResults,
        importResults
      };

    } catch (error) {
      console.error('Error in complete launchpad sync process:', error);
      
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

export const launchpadDataService = new LaunchpadDataService();