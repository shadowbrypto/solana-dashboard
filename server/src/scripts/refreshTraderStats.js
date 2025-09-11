// Refresh Photon and Axiom trader stats data
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kctohdlzcnnmcubgxiaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteExistingData(protocol) {
  try {
    console.log(`Deleting existing ${protocol} data...`);
    
    const { error } = await supabase
      .from('trader_stats')
      .delete()
      .eq('protocol_name', protocol);
      
    if (error) throw error;
    
    console.log(`Successfully deleted existing ${protocol} data`);
  } catch (error) {
    console.error(`Error deleting ${protocol} data:`, error);
    throw error;
  }
}

async function refreshProtocolData(protocol) {
  try {
    console.log(`\n=== Refreshing ${protocol} trader stats ===`);
    
    // Step 1: Delete existing data
    await deleteExistingData(protocol);
    
    // Step 2: Fetch fresh data from Dune
    console.log(`Fetching fresh ${protocol} data from Dune...`);
    await DuneTraderStatsService.fetchAndImportTraderStats(protocol, new Date());
    
    // Step 3: Verify the data was imported
    const { count, error: countError } = await supabase
      .from('trader_stats')
      .select('*', { count: 'exact', head: true })
      .eq('protocol_name', protocol);
      
    if (countError) throw countError;
    
    console.log(`✅ Successfully refreshed ${protocol}: ${count} trader records imported`);
    
    return count;
    
  } catch (error) {
    console.error(`❌ Failed to refresh ${protocol}:`, error);
    throw error;
  }
}

async function refreshAllTraderStats() {
  console.log('🔄 Starting trader stats refresh for Photon and Axiom...');
  
  const protocols = ['photon', 'axiom'];
  const results = {};
  
  for (const protocol of protocols) {
    try {
      const count = await refreshProtocolData(protocol);
      results[protocol] = { success: true, count };
    } catch (error) {
      results[protocol] = { success: false, error: error.message };
    }
  }
  
  console.log('\n🏁 Refresh Summary:');
  console.log('==================');
  
  Object.entries(results).forEach(([protocol, result]) => {
    if (result.success) {
      console.log(`✅ ${protocol}: ${result.count} traders imported`);
    } else {
      console.log(`❌ ${protocol}: ${result.error}`);
    }
  });
  
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 Overall: ${successful}/${total} protocols refreshed successfully`);
  
  if (successful > 0) {
    console.log('\n🔄 Note: You may want to recalculate percentiles after this refresh');
  }
}

// Run the refresh if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  refreshAllTraderStats()
    .then(() => {
      console.log('\n✨ Trader stats refresh completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Trader stats refresh failed:', error);
      process.exit(1);
    });
}

export default refreshAllTraderStats;