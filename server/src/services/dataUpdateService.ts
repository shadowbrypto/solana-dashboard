import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
}

export async function syncData(): Promise<SyncResult> {
  const scriptsDir = path.join(__dirname, '..', '..', 'scripts');
  
  try {
    // Step 1: Run update.sh to fetch CSV data
    console.log('Fetching CSV data from Dune API...');
    const updateScriptPath = path.join(scriptsDir, 'update.sh');
    
    try {
      const { stdout, stderr } = await execAsync(`bash "${updateScriptPath}"`, {
        cwd: scriptsDir
      });
      
      if (stderr) {
        console.warn('Update script warnings:', stderr);
      }
      console.log('Update script output:', stdout);
    } catch (error) {
      console.error('Error running update script:', error);
      return {
        success: false,
        error: 'Failed to fetch CSV data from Dune API',
        step: 'fetch_csv'
      };
    }
    
    // Step 2: Run import script
    console.log('Importing CSV data to Supabase...');
    const importScriptPath = path.join(scriptsDir, 'importCsvToSupabaseWithDelete.ts');
    
    try {
      const { stdout, stderr } = await execAsync(
        `npx tsx "${importScriptPath}"`,
        {
          cwd: path.join(__dirname, '..', '..')
        }
      );
      
      if (stderr) {
        console.warn('Import script warnings:', stderr);
      }
      console.log('Import script output:', stdout);
      
      // Parse output to get CSV count
      const lines = stdout.split('\n');
      const csvFilesLine = lines.find(line => line.includes('Found') && line.includes('CSV files'));
      const csvCount = csvFilesLine ? parseInt(csvFilesLine.match(/\d+/)?.[0] || '0') : 0;
      
      return {
        success: true,
        csvFilesFetched: csvCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error running import script:', error);
      return {
        success: false,
        error: 'Failed to import CSV data to database',
        step: 'import_to_db'
      };
    }
  } catch (error) {
    console.error('Unexpected error in data sync:', error);
    return {
      success: false,
      error: 'Unexpected error during data sync'
    };
  }
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const dataDir = path.join(__dirname, '..', '..', '..', '..', 'public', 'data');
  
  try {
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
        csvFiles: csvFiles.map(f => f.replace('.csv', ''))
      };
    } else {
      return {
        lastSync: null,
        csvFilesCount: 0,
        csvFiles: [],
        message: 'No data has been synced yet'
      };
    }
  } catch (error) {
    console.error('Error checking sync status:', error);
    throw new Error('Unable to check sync status');
  }
}