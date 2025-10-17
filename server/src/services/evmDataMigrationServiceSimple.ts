import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.DUNE_API_KEY;
const TABLE_NAME = 'protocol_stats';
const DATA_DIR = path.join(__dirname, '../../public/data');

// Simple EVM data sync - parse original CSV and map directly to database
export class SimpleEVMDataMigrationService {

  /**
   * Sync EVM protocol data - download single CSV file and save like Solana protocols
   */
  public async syncEVMProtocolData(protocolName: string, dataType: string = 'public'): Promise<any> {
    try {
      console.log(`Starting simple EVM data sync for ${protocolName} with ${dataType} data...`);

      // Clean up any files created in wrong location (legacy data/evm directory)
      const oldDataDir = path.join(__dirname, '../../data/evm');
      try {
        const oldFiles = await fs.readdir(oldDataDir);
        for (const file of oldFiles) {
          if (file.includes(protocolName)) {
            const oldPath = path.join(oldDataDir, file);
            const newPath = path.join(DATA_DIR, file);
            await fs.rename(oldPath, newPath);
            console.log(`Moved ${file} from old location to correct location`);
          }
        }
        // Try to remove the old directory if it's empty
        try {
          await fs.rmdir(oldDataDir);
          const parentDir = path.join(__dirname, '../../data');
          await fs.rmdir(parentDir);
        } catch {
          // Ignore if not empty or doesn't exist
        }
      } catch {
        // Old directory doesn't exist, which is good
      }

      // Download and save the single CSV file
      const queryId = this.getQueryIdForProtocol(protocolName);
      if (!queryId) {
        throw new Error(`No query ID found for protocol: ${protocolName}`);
      }

      const csvData = await this.downloadAndSaveEVMCSV(protocolName, queryId);
      
      // Parse and import directly to database
      const results = await this.parseAndImportEVMData(protocolName, csvData, dataType);

      return {
        success: true,
        rowsImported: results.reduce((sum, r) => sum + r.rowsInserted, 0),
        timestamp: new Date().toISOString(),
        results: results
      };

    } catch (error) {
      console.error(`Error in simple EVM sync for ${protocolName}:`, error);
      throw error;
    }
  }

  /**
   * Download CSV from Dune Analytics and save as single file
   */
  private async downloadAndSaveEVMCSV(protocolName: string, queryId: number): Promise<any[]> {
    try {
      console.log(`Downloading CSV for ${protocolName} from query ${queryId}...`);

      const response = await fetch(`https://api.dune.com/api/v1/query/${queryId}/results/csv?limit=50000`, {
        headers: {
          'X-Dune-API-Key': API_KEY!
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvContent = await response.text();
      
      // Save the CSV file (like Solana protocols)
      await fs.mkdir(DATA_DIR, { recursive: true });
      const csvFilePath = path.join(DATA_DIR, `${protocolName}.csv`);
      await fs.writeFile(csvFilePath, csvContent, 'utf8');
      console.log(`Saved CSV file: ${csvFilePath}`);
      
      // Parse CSV
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.warn(`CSV parsing warnings:`, parsed.errors);
      }

      console.log(`Downloaded and saved ${parsed.data.length} rows for ${protocolName}`);
      return parsed.data;

    } catch (error) {
      console.error(`Error downloading CSV for ${protocolName}:`, error);
      throw error;
    }
  }

  /**
   * Parse CSV data and import directly to database
   */
  private async parseAndImportEVMData(protocolName: string, csvData: any[], dataType: string = 'public'): Promise<any[]> {
    try {
      // Clean protocol name (remove _evm suffix)
      const cleanProtocolName = protocolName.replace('_evm', '');
      
      // Delete existing data
      console.log(`Deleting existing data for ${cleanProtocolName}...`);
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('protocol_name', cleanProtocolName)
        .neq('chain', 'solana'); // Only delete EVM data, not Solana data

      if (deleteError) {
        throw new Error(`Failed to delete existing data: ${JSON.stringify(deleteError)}`);
      }

      // Chain volume column mapping
      const chainVolumeMapping = {
        'ethereum': 'ethereumVolumeUSD',
        'base': 'baseVolumeUSD',
        'arbitrum': 'arbitrumVolumeUSD',
        'bsc': 'bscVolumeUSD',
        'avax': 'avalancheVolumeUSD'
      };

      // Chain user metrics column mapping (currently only BSC has user data)
      const chainUsersMapping = {
        'bsc': 'bscNumberOfUsers'
      };

      const chainNewUsersMapping = {
        'bsc': 'bscNumberOfNewUsers'
      };

      const results = [];

      // Process each chain
      for (const [chain, volumeColumn] of Object.entries(chainVolumeMapping)) {
        console.log(`Processing ${chain} data for ${cleanProtocolName}...`);
        console.log(`  Volume column: ${volumeColumn}`);
        console.log(`  Users column: ${chainUsersMapping[chain as keyof typeof chainUsersMapping] || 'none'}`);
        console.log(`  New users column: ${chainNewUsersMapping[chain as keyof typeof chainNewUsersMapping] || 'none'}`);

        // Map CSV rows to database records for this chain
        const chainRecords = csvData.map((row: any) => {
          // Parse date - handle "DD/MM/YYYY" format from formattedDay column
          let parsedDate = null;
          const dateValue = row.formattedDay;
          
          if (dateValue && typeof dateValue === 'string' && dateValue.includes('/')) {
            // Handle format: "07/07/2025" -> convert to "2025-07-07"
            const parts = dateValue.split('/');
            if (parts.length === 3) {
              const [day, month, year] = parts;
              parsedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }

          // Get volume for this specific chain
          const volumeValue = row[volumeColumn];
          const volume = volumeValue ? parseFloat(volumeValue) : 0;

          // Get user metrics for this specific chain (currently only BSC has data)
          const usersColumn = chainUsersMapping[chain as keyof typeof chainUsersMapping];
          const newUsersColumn = chainNewUsersMapping[chain as keyof typeof chainNewUsersMapping];

          const usersValue = usersColumn ? row[usersColumn] : null;
          const newUsersValue = newUsersColumn ? row[newUsersColumn] : null;

          const dailyUsers = usersValue ? parseFloat(usersValue) : 0;
          const newUsers = newUsersValue ? parseFloat(newUsersValue) : 0;

          // Debug log for first BSC row
          if (chain === 'bsc' && parsedDate === '2025-10-14') {
            console.log(`BSC USER DATA DEBUG for ${cleanProtocolName}:`, {
              chain,
              date: parsedDate,
              usersColumn,
              newUsersColumn,
              usersValue,
              newUsersValue,
              dailyUsers,
              newUsers,
              volume
            });
          }

          return {
            protocol_name: cleanProtocolName,  // Use clean name without _evm
            chain: chain,
            date: parsedDate,
            volume_usd: volume,
            daily_users: dailyUsers,
            new_users: newUsers,
            trades: 0,
            fees_usd: 0,
            data_type: dataType
          };
        }).filter(record =>
          // Only include records with valid dates and (volume > 0 OR user data exists)
          record.date && (record.volume_usd > 0 || record.daily_users > 0 || record.new_users > 0)
        );

        if (chainRecords.length === 0) {
          console.log(`No valid data for ${cleanProtocolName} on ${chain}`);
          results.push({
            chain: chain,
            rowsInserted: 0,
            success: true
          });
          continue;
        }

        // Debug: Log first BSC record
        if (chain === 'bsc' && chainRecords.length > 0) {
          console.log(`First BSC record for ${cleanProtocolName}:`, JSON.stringify(chainRecords[0], null, 2));
        }

        // Insert records in batches
        console.log(`Inserting ${chainRecords.length} records for ${cleanProtocolName} on ${chain}...`);
        
        const batchSize = 500;
        let totalInserted = 0;

        for (let i = 0; i < chainRecords.length; i += batchSize) {
          const batch = chainRecords.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from(TABLE_NAME)
            .upsert(batch, {
              onConflict: 'protocol_name,date,chain,data_type'
            });

          if (error) {
            throw new Error(`Failed to insert batch for ${chain}: ${JSON.stringify(error)}`);
          }
          
          totalInserted += batch.length;
        }

        console.log(`Successfully inserted ${totalInserted} records for ${cleanProtocolName} on ${chain}`);

        results.push({
          chain: chain,
          rowsInserted: totalInserted,
          success: true
        });
      }

      return results;

    } catch (error) {
      console.error(`Error parsing and importing EVM data:`, error);
      throw error;
    }
  }

  /**
   * Get query ID for protocol
   */
  private getQueryIdForProtocol(protocolName: string): number | null {
    const queryMap: Record<string, number> = {
      'sigma_evm': 5430634,
      'maestro_evm': 3832557,
      'bloom_evm': 4824799,
      'banana_evm': 4750709,
      'padre_evm': 5793181,
      'gmgnai_evm': 5823908,
      'photon_evm': 5929750,
      'mevx_evm': 5498756
    };

    return queryMap[protocolName] || null;
  }
}

export const simpleEVMDataMigrationService = new SimpleEVMDataMigrationService();