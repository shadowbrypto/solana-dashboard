import 'dotenv/config';

async function waitForAxiom() {
  const DUNE_API_URL = 'https://api.dune.com/api/v1';
  const API_KEY = process.env.DUNE_API_KEY;
  const executionId = '01K4SWWVY77W3JA19HNAVHMB67';

  if (!API_KEY) {
    throw new Error('DUNE_API_KEY environment variable is not set');
  }

  try {
    console.log(`Checking status of execution: ${executionId}`);
    
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes timeout (10 second intervals)
    
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(
        `${DUNE_API_URL}/execution/${executionId}/results`,
        {
          headers: {
            'X-DUNE-API-KEY': API_KEY
          }
        }
      );
      
      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status, statusResponse.statusText);
        break;
      }
      
      const statusData = await statusResponse.json();
      console.log(`Attempt ${attempts + 1}: ${statusData.state}`);
      
      if (statusData.state === 'QUERY_STATE_COMPLETED') {
        console.log(`✅ Query completed! Found ${statusData.result?.rows?.length || 0} rows`);
        if (statusData.result?.rows?.length > 0) {
          console.log('Sample data:', JSON.stringify(statusData.result.rows.slice(0, 3), null, 2));
          
          // Now import the data
          console.log('Importing data to database...');
          const { default: TraderStatsService } = await import('../services/traderStatsService.js');
          
          const transformedData = statusData.result.rows.map((row: any) => ({
            user: row.user,
            volume_usd: Number(row.volume_usd) || 0
          }));
          
          await TraderStatsService.importTraderData('axiom', new Date(), transformedData);
          console.log(`✅ Successfully imported ${transformedData.length} Axiom trader records`);
        }
        break;
      } else if (statusData.state === 'QUERY_STATE_FAILED') {
        console.error('❌ Query failed:', statusData.error);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ Query timeout reached');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

waitForAxiom();