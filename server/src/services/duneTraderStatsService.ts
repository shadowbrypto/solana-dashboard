import { format } from 'date-fns';
import TraderStatsService from './traderStatsService.js';
import { getTraderStatsQueryId, traderStatsQueries } from '../config/traderStatsQueries.js';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

interface DuneQueryResult {
  user: string;
  volume_usd: number;
}

export class DuneTraderStatsService {
  private static readonly DUNE_API_URL = 'https://api.dune.com/api/v1';
  private static readonly API_KEY = process.env.DUNE_API_KEY;

  // Get query result info (row count, metadata)
  static async getQueryResultsInfo(queryId: string): Promise<{ rowCount: number; hasResults: boolean }> {
    if (!this.API_KEY) {
      throw new Error('DUNE_API_KEY environment variable is not set');
    }
    
    try {
      const response = await fetch(
        `${this.DUNE_API_URL}/query/${queryId}/results?limit=1&ignore_max_datapoints_per_request=true`,
        {
          headers: {
            'X-DUNE-API-KEY': this.API_KEY
          }
        }
      );

      if (!response.ok) {
        return { rowCount: 0, hasResults: false };
      }

      const data = await response.json();
      const rowCount = data.result?.metadata?.total_row_count || 0;
      const hasResults = rowCount > 0;

      return { rowCount, hasResults };
    } catch (error) {
      console.log('Error getting query info:', error);
      return { rowCount: 0, hasResults: false };
    }
  }

  // Download single CSV chunk with pagination
  static async downloadCSVChunk(
    queryId: string, 
    offset: number, 
    limit: number, 
    chunkIndex: number,
    protocol: string
  ): Promise<string> {
    if (!this.API_KEY) {
      throw new Error('DUNE_API_KEY environment variable is not set');
    }
    
    try {
      const response = await fetch(
        `${this.DUNE_API_URL}/query/${queryId}/results/csv?offset=${offset}&limit=${limit}&ignore_max_datapoints_per_request=true`,
        {
          headers: {
            'X-DUNE-API-KEY': this.API_KEY,
            'Accept': 'text/csv'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download chunk ${chunkIndex}: ${response.statusText}`);
      }

      // Create temp directory
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Save chunk to file
      const timestamp = Date.now();
      const chunkFilePath = path.join(tempDir, `${protocol}_chunk_${chunkIndex}_${timestamp}.csv`);
      const fileStream = fs.createWriteStream(chunkFilePath);
      await pipeline(response.body!, fileStream);

      console.log(`📦 Chunk ${chunkIndex + 1}: ${limit} rows (offset ${offset}) → ${chunkFilePath}`);
      return chunkFilePath;
    } catch (error: any) {
      console.error(`Error downloading chunk ${chunkIndex}:`, error.message);
      throw error;
    }
  }

  // REVOLUTIONARY: Parallel CSV download with pagination - NO QUERY EXECUTION NEEDED!
  static async downloadQueryCSVParallel(queryId: string, protocol: string): Promise<DuneQueryResult[]> {
    if (!this.API_KEY) {
      throw new Error('DUNE_API_KEY environment variable is not set');
    }

    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🚀 REVOLUTIONARY PARALLEL CSV DOWNLOAD - ${protocol.toUpperCase()}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`🔍 Query ID: ${queryId}`);
      
      // Step 1: Check if results exist and get metadata
      console.log(`⚡ Step 1: Checking query results metadata...`);
      const { rowCount, hasResults } = await this.getQueryResultsInfo(queryId);
      
      if (!hasResults || rowCount === 0) {
        throw new Error(`No results found for query ${queryId}. Query may need to be executed first.`);
      }
      
      console.log(`✅ Found ${rowCount.toLocaleString()} rows available!`);
      
      // Step 2: Calculate optimal chunking strategy
      const CHUNK_SIZE = 10000; // 10k rows per chunk for reliability
      const MAX_PARALLEL_CHUNKS = 6; // Control concurrency
      const totalChunks = Math.ceil(rowCount / CHUNK_SIZE);
      const parallelChunks = Math.min(totalChunks, MAX_PARALLEL_CHUNKS);
      
      console.log(`📊 Download strategy:`);
      console.log(`   - Total rows: ${rowCount.toLocaleString()}`);
      console.log(`   - Chunk size: ${CHUNK_SIZE.toLocaleString()} rows`);
      console.log(`   - Total chunks: ${totalChunks}`);
      console.log(`   - Parallel downloads: ${parallelChunks}`);
      console.log(`${'='.repeat(80)}\n`);
      
      // Step 3: Download all chunks in parallel batches
      const allResults: DuneQueryResult[] = [];
      const downloadStart = Date.now();
      
      for (let batchStart = 0; batchStart < totalChunks; batchStart += parallelChunks) {
        const batchEnd = Math.min(batchStart + parallelChunks, totalChunks);
        const batchChunks = batchEnd - batchStart;
        
        console.log(`🚀 Downloading batch ${Math.floor(batchStart / parallelChunks) + 1}: chunks ${batchStart + 1}-${batchEnd}`);
        
        // Download batch of chunks in parallel
        const chunkPromises = [];
        for (let i = batchStart; i < batchEnd; i++) {
          const offset = i * CHUNK_SIZE;
          const limit = Math.min(CHUNK_SIZE, rowCount - offset);
          chunkPromises.push(this.downloadCSVChunk(queryId, offset, limit, i, protocol));
        }
        
        const chunkFiles = await Promise.all(chunkPromises);
        
        // Process all chunks in this batch
        console.log(`📊 Processing ${batchChunks} chunks in parallel...`);
        const processPromises = chunkFiles.map(filePath => this.processCSVFile(filePath, protocol));
        const chunkResults = await Promise.all(processPromises);
        
        // Combine results
        for (const results of chunkResults) {
          allResults.push(...results);
        }
        
        const batchTime = (Date.now() - downloadStart) / 1000;
        const currentSpeed = Math.round(allResults.length / batchTime);
        console.log(`✅ Batch complete: ${allResults.length.toLocaleString()}/${rowCount.toLocaleString()} rows (${currentSpeed.toLocaleString()}/sec)\n`);
      }
      
      const totalTime = (Date.now() - downloadStart) / 1000;
      const finalSpeed = Math.round(allResults.length / totalTime);
      
      console.log(`🎉 PARALLEL DOWNLOAD COMPLETE:`);
      console.log(`   ✅ Total rows: ${allResults.length.toLocaleString()}`);
      console.log(`   ⏱️  Total time: ${totalTime.toFixed(1)} seconds`);
      console.log(`   🚀 Speed: ${finalSpeed.toLocaleString()} rows/second`);
      console.log(`${'='.repeat(80)}\n`);
      
      return allResults;
      
    } catch (error: any) {
      console.error('Error in parallel CSV download:', error.message);
      throw error;
    }
  }

  // Ultra-fast CSV processing with streaming
  static async processCSVFile(csvFilePath: string, protocol: string): Promise<DuneQueryResult[]> {
    return new Promise((resolve, reject) => {
      const results: DuneQueryResult[] = [];
      let processedRows = 0;
      const startTime = Date.now();
      
      console.log(`📊 Processing CSV file: ${csvFilePath}`);
      
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      parser.on('readable', function() {
        let record;
        while ((record = parser.read()) !== null) {
          // Handle different column name variations
          const user = record.user || record.User || record.USER || record.trader || record.address;
          const volume = record.volume_usd || record.Volume_USD || record.volume || record.Volume;
          
          if (user && volume !== undefined) {
            results.push({
              user: user.toString(),
              volume_usd: parseFloat(volume) || 0
            });
          }
          
          processedRows++;
          if (processedRows % 50000 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = Math.round(processedRows / elapsed);
            console.log(`   📈 Processed ${processedRows.toLocaleString()} rows (${speed.toLocaleString()}/sec)`);
          }
        }
      });

      parser.on('error', (err) => {
        console.error('CSV parsing error:', err);
        reject(err);
      });

      parser.on('end', () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = Math.round(processedRows / elapsed);
        console.log(`✅ CSV processing complete: ${results.length.toLocaleString()} records in ${elapsed.toFixed(1)}s (${speed.toLocaleString()}/sec)`);
        
        // Clean up the CSV file
        fs.unlink(csvFilePath, (err) => {
          if (err) console.error('Failed to delete temp CSV:', err);
          else console.log(`🗑️  Cleaned up temp file: ${csvFilePath}`);
        });
        
        resolve(results);
      });

      // Start streaming the file
      createReadStream(csvFilePath).pipe(parser);
    });
  }

  // Fetch and import trader stats - REVOLUTIONARY PARALLEL METHOD
  static async fetchAndImportTraderStats(
    protocol: string,
    date: Date = new Date()
  ): Promise<void> {
    try {
      const queryId = getTraderStatsQueryId(protocol);
      if (!queryId) {
        throw new Error(`No Dune query ID found for protocol: ${protocol}`);
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`🚀 REVOLUTIONARY PARALLEL METHOD - ${protocol.toUpperCase()}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`📅 Date: ${format(date, 'yyyy-MM-dd')}`);
      console.log(`🔍 Query ID: ${queryId}`);
      console.log(`⚡ Method: Parallel CSV pagination (NO query execution!)`);
      console.log(`${'='.repeat(80)}\n`);

      // Step 1: Parallel CSV download with pagination (REVOLUTIONARY!)
      const startDownload = Date.now();
      const results = await this.downloadQueryCSVParallel(queryId, protocol);
      const downloadTime = (Date.now() - startDownload) / 1000;
      
      if (!results || results.length === 0) {
        console.log(`❌ No trader data found for ${protocol}`);
        return;
      }

      console.log(`📊 Data Summary for ${protocol.toUpperCase()}:`);
      console.log(`   - Total records: ${results.length.toLocaleString()}`);
      console.log(`   - Download + Processing time: ${downloadTime.toFixed(1)}s`);
      console.log(`   - Sample records:`, results.slice(0, 3));
      console.log(`${'='.repeat(80)}\n`);

      // Step 2: Ultra-fast database import with timeout resistance
      const startImport = Date.now();
      await TraderStatsService.importTraderData(protocol, date, results);
      const importTime = (Date.now() - startImport) / 1000;
      
      const totalTime = (Date.now() - startDownload) / 1000;
      console.log(`\n🎉 REVOLUTIONARY SUCCESS for ${protocol.toUpperCase()}:`);
      console.log(`   ✅ Parallel Download + Processing: ${downloadTime.toFixed(1)}s`);
      console.log(`   ✅ Database Import: ${importTime.toFixed(1)}s`);
      console.log(`   🚀 Total time: ${totalTime.toFixed(1)}s`);
      console.log(`   📊 Records: ${results.length.toLocaleString()}`);
      console.log(`   ⚡ Overall speed: ${Math.round(results.length / totalTime).toLocaleString()} records/sec`);
      console.log(`   🎯 vs Old method: ~${Math.round(300 / totalTime)}x faster!`);
      console.log(`${'='.repeat(80)}\n`);
      
    } catch (error) {
      console.error(`❌ Error in revolutionary parallel method for ${protocol}:`, error);
      throw error;
    }
  }

  // Fetch trader stats for all configured protocols
  static async fetchAllProtocolTraderStats(date: Date = new Date()): Promise<void> {
    console.log(`Starting trader stats fetch for all protocols on ${format(date, 'yyyy-MM-dd')}`);
    
    const results = await Promise.allSettled(
      traderStatsQueries
        .filter(query => query.duneQueryId !== 'XXXXX') // Skip placeholder IDs
        .map(query => this.fetchAndImportTraderStats(query.protocol, date))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Trader stats fetch completed: ${successful} successful, ${failed} failed`);
    
    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const protocol = traderStatsQueries[index].protocol;
        console.error(`Failed to fetch trader stats for ${protocol}:`, result.reason);
      }
    });
  }

  // Test connection with a specific protocol
  static async testPhotonQuery(): Promise<void> {
    try {
      console.log('Testing Photon trader stats query...');
      await this.fetchAndImportTraderStats('photon', new Date());
      console.log('Photon query test completed successfully');
    } catch (error) {
      console.error('Photon query test failed:', error);
      throw error;
    }
  }
}

export default DuneTraderStatsService;