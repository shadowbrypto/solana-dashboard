import { format } from 'date-fns';
import TraderStatsService from './traderStatsService.js';
import { getTraderStatsQueryId, traderStatsQueries } from '../config/traderStatsQueries.js';

interface DuneQueryResult {
  user: string;
  volume_usd: number;
}

export class DuneTraderStatsService {
  private static readonly DUNE_API_URL = 'https://api.dune.com/api/v1';
  private static readonly API_KEY = process.env.DUNE_API_KEY;

  // Execute Dune query and get results
  static async executeQuery(queryId: string): Promise<DuneQueryResult[]> {
    if (!this.API_KEY) {
      throw new Error('DUNE_API_KEY environment variable is not set');
    }

    try {
      // Execute the query
      const executeResponse = await fetch(
        `${this.DUNE_API_URL}/query/${queryId}/execute`,
        {
          method: 'POST',
          headers: {
            'X-DUNE-API-KEY': this.API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      if (!executeResponse.ok) {
        throw new Error(`Failed to execute query: ${executeResponse.statusText}`);
      }

      const executeData = await executeResponse.json();
      const executionId = executeData.execution_id;
      console.log(`Started Dune query execution: ${executionId}`);

      // Poll for results
      let attempts = 0;
      const maxAttempts = 180; // 15 minutes timeout (5 second intervals)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const resultResponse = await fetch(
          `${this.DUNE_API_URL}/execution/${executionId}/results`,
          {
            headers: {
              'X-DUNE-API-KEY': this.API_KEY
            }
          }
        );

        if (!resultResponse.ok) {
          throw new Error(`Failed to get results: ${resultResponse.statusText}`);
        }

        const resultData = await resultResponse.json();

        if (resultData.state === 'QUERY_STATE_COMPLETED') {
          console.log(`Dune query completed: ${executionId}`);
          return resultData.result.rows as DuneQueryResult[];
        } else if (resultData.state === 'QUERY_STATE_FAILED') {
          throw new Error(`Dune query failed: ${resultData.error}`);
        }

        attempts++;
      }

      throw new Error('Dune query execution timeout');
    } catch (error: any) {
      console.error('Error executing Dune query:', error.message);
      throw error;
    }
  }

  // Fetch and import trader stats for a specific protocol
  static async fetchAndImportTraderStats(
    protocol: string,
    date: Date = new Date()
  ): Promise<void> {
    try {
      const queryId = getTraderStatsQueryId(protocol);
      if (!queryId) {
        throw new Error(`No Dune query ID found for protocol: ${protocol}`);
      }

      console.log(`Fetching trader stats for ${protocol} using query ${queryId}`);
      
      // Execute the Dune query
      const results = await this.executeQuery(queryId);
      
      if (!results || results.length === 0) {
        console.log(`No trader data found for ${protocol}`);
        return;
      }

      // Transform and import the data
      const transformedData = results.map(row => ({
        user: row.user,
        volume_usd: Number(row.volume_usd) || 0
      }));

      await TraderStatsService.importTraderData(protocol, date, transformedData);
      
      console.log(`Successfully imported ${transformedData.length} trader records for ${protocol}`);
    } catch (error) {
      console.error(`Error fetching trader stats for ${protocol}:`, error);
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