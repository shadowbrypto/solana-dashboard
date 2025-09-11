import 'dotenv/config';

async function waitAndImportAxiom() {
  const DUNE_API_URL = 'https://api.dune.com/api/v1';
  const API_KEY = process.env.DUNE_API_KEY;
  const executionId = '01K4SWWVY77W3JA19HNAVHMB67';

  if (!API_KEY) {
    throw new Error('DUNE_API_KEY environment variable is not set');
  }

  console.log('🔄 Waiting for Axiom Dune query to complete...');
  console.log(`Execution ID: ${executionId}`);
  
  try {
    let attempts = 0;
    const maxAttempts = 120; // 20 minutes timeout (10 second intervals)
    
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
        console.error('❌ Status check failed:', statusResponse.status, statusResponse.statusText);
        break;
      }
      
      const statusData = await statusResponse.json();
      const elapsed = Math.round((attempts * 10) / 60 * 100) / 100;
      console.log(`⏱️  ${elapsed}min - Status: ${statusData.state}`);
      
      if (statusData.state === 'QUERY_STATE_COMPLETED') {
        console.log(`\n✅ Query completed! Found ${statusData.result?.rows?.length || 0} rows`);
        
        if (statusData.result?.rows?.length > 0) {
          console.log('📊 Sample data:');
          statusData.result.rows.slice(0, 3).forEach((row: any, i: number) => {
            console.log(`${i + 1}. ${row.user}: $${Number(row.volume_usd).toLocaleString()}`);
          });
          
          // Import the data
          console.log('\n📥 Importing data to database...');
          const { default: TraderStatsService } = await import('../services/traderStatsService.js');
          
          const transformedData = statusData.result.rows.map((row: any) => ({
            user: row.user,
            volume_usd: Number(row.volume_usd) || 0
          }));
          
          await TraderStatsService.importTraderData('axiom', new Date(), transformedData);
          console.log(`✅ Successfully imported ${transformedData.length} Axiom trader records`);
          
          // Verify the import
          const { supabase } = await import('../lib/supabase.js');
          const { count } = await supabase
            .from('trader_stats')
            .select('*', { count: 'exact', head: true })
            .eq('protocol_name', 'axiom');
            
          console.log(`🔍 Verification: ${count} records now in database`);
          console.log('\n🎉 Axiom trader data is ready for frontend!');
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
      console.log('\n⏰ Query timeout reached (20 minutes)');
      console.log('The query may still be running. You can check manually later.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

waitAndImportAxiom();