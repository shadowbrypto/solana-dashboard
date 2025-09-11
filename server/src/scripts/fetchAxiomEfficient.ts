import 'dotenv/config';
import { getTraderStatsQueryId } from '../config/traderStatsQueries.js';
import TraderStatsService from '../services/traderStatsService.js';

const DUNE_API_URL = 'https://api.dune.com/api/v1';

async function fetchAxiomEfficiently() {
  const API_KEY = process.env.DUNE_API_KEY;
  if (!API_KEY) {
    console.error('❌ DUNE_API_KEY environment variable is not set');
    process.exit(1);
  }

  const protocol = 'axiom';
  const queryId = getTraderStatsQueryId(protocol);
  
  console.log('🚀 Starting efficient Axiom trader stats fetch');
  console.log(`📊 Dune Query ID: ${queryId}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  try {
    // Step 1: Initiate query execution
    console.log('\n📤 Executing Dune query...');
    const executeResponse = await fetch(`${DUNE_API_URL}/query/${queryId}/execute`, {
      method: 'POST',
      headers: {
        'X-DUNE-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!executeResponse.ok) {
      throw new Error(`Failed to execute query: ${executeResponse.status} ${executeResponse.statusText}`);
    }

    const { execution_id } = await executeResponse.json();
    console.log(`✅ Query execution started: ${execution_id}`);

    // Step 2: Poll for results with extended timeout
    console.log('\n⏳ Polling for results (this may take 5-10 minutes for large datasets)...');
    let attempts = 0;
    const maxAttempts = 180; // 15 minutes (5 second intervals)
    let completed = false;
    let rows: any[] = [];

    while (attempts < maxAttempts && !completed) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const resultResponse = await fetch(
        `${DUNE_API_URL}/execution/${execution_id}/results`,
        {
          headers: {
            'X-DUNE-API-KEY': API_KEY
          }
        }
      );

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        const elapsed = Math.round((attempts * 5) / 60 * 100) / 100;
        
        if (resultData.state === 'QUERY_STATE_COMPLETED') {
          completed = true;
          rows = resultData.result?.rows || [];
          console.log(`\n✅ Query completed after ${elapsed} minutes!`);
          console.log(`📊 Found ${rows.length} trader records`);
        } else if (resultData.state === 'QUERY_STATE_FAILED') {
          throw new Error(`Query failed: ${resultData.error || 'Unknown error'}`);
        } else {
          // Progress update every 30 seconds
          if (attempts % 6 === 0) {
            console.log(`⏱️  ${elapsed} min - State: ${resultData.state}`);
          }
        }
      }
      
      attempts++;
    }

    if (!completed) {
      throw new Error('Query timeout - exceeded 15 minutes');
    }

    // Step 3: Process and import data efficiently
    if (rows.length > 0) {
      console.log('\n📥 Processing and importing data...');
      
      // Show sample data
      console.log('📈 Top 5 traders by volume:');
      rows.slice(0, 5).forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.user}: $${Number(row.volume_usd).toLocaleString()}`);
      });

      // Transform data
      const transformedData = rows.map(row => ({
        user: row.user,
        volume_usd: Number(row.volume_usd) || 0
      }));

      // Import in batches for efficiency
      const batchSize = 1000;
      const totalBatches = Math.ceil(transformedData.length / batchSize);
      
      console.log(`\n📦 Importing in ${totalBatches} batches of ${batchSize} records...`);
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, transformedData.length);
        const batch = transformedData.slice(start, end);
        
        await TraderStatsService.importTraderData(protocol, new Date(), batch);
        
        const progress = Math.round(((i + 1) / totalBatches) * 100);
        console.log(`  Batch ${i + 1}/${totalBatches} imported (${progress}%)`);
      }

      console.log('\n✅ Import completed successfully!');

      // Verify the import
      const totalCount = await TraderStatsService.getTraderStatsCount(protocol);
      const totalVolume = await TraderStatsService.getTotalVolumeForProtocol(protocol);
      
      console.log('\n📊 Final Statistics:');
      console.log(`  Total Traders: ${totalCount.toLocaleString()}`);
      console.log(`  Total Volume: $${totalVolume.toLocaleString()}`);
      console.log('\n🎉 Axiom trader stats are ready!');
    } else {
      console.log('⚠️  No data returned from query');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  }
}

// Run the script
fetchAxiomEfficiently();