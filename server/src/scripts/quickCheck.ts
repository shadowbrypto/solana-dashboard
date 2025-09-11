import 'dotenv/config';

async function quickCheck() {
  const DUNE_API_URL = 'https://api.dune.com/api/v1';
  const API_KEY = process.env.DUNE_API_KEY;
  const executionId = '01K4SWWVY77W3JA19HNAVHMB67';

  try {
    const statusResponse = await fetch(
      `${DUNE_API_URL}/execution/${executionId}/results`,
      {
        headers: {
          'X-DUNE-API-KEY': API_KEY!
        }
      }
    );
    
    const statusData = await statusResponse.json();
    console.log('Current status:', statusData.state);
    
    if (statusData.state === 'QUERY_STATE_COMPLETED') {
      console.log(`✅ Found ${statusData.result?.rows?.length || 0} rows`);
      
      if (statusData.result?.rows?.length > 0) {
        // Import the data
        const { default: TraderStatsService } = await import('../services/traderStatsService.js');
        
        const transformedData = statusData.result.rows.map((row: any) => ({
          user: row.user,
          volume_usd: Number(row.volume_usd) || 0
        }));
        
        await TraderStatsService.importTraderData('axiom', new Date(), transformedData);
        console.log(`✅ Successfully imported ${transformedData.length} Axiom trader records`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

quickCheck();