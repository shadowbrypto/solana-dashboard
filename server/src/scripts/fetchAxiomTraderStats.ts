import 'dotenv/config';
import DuneTraderStatsService from '../services/duneTraderStatsService.js';
import { format } from 'date-fns';

async function fetchAxiomTraderStats() {
  try {
    console.log('=== Fetching Axiom Trader Stats ===');
    console.log(`Date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    console.log(`Dune API Key: ${process.env.DUNE_API_KEY ? 'Set' : 'Not set'}`);
    console.log('Dune Query ID: 5755297');
    
    if (!process.env.DUNE_API_KEY) {
      throw new Error('DUNE_API_KEY environment variable is required');
    }

    // Fetch and import Axiom trader stats
    await DuneTraderStatsService.fetchAndImportTraderStats('axiom', new Date());
    
    console.log('=== Fetch completed successfully ===');
    process.exit(0);
  } catch (error) {
    console.error('=== Fetch failed ===');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
fetchAxiomTraderStats();