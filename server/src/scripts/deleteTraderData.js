// Delete existing Photon and Axiom trader data
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kctohdlzcnnmcubgxiaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteProtocolData(protocol) {
  try {
    console.log(`Counting existing ${protocol} records...`);
    
    const { count: beforeCount, error: countError } = await supabase
      .from('trader_stats')
      .select('*', { count: 'exact', head: true })
      .eq('protocol_name', protocol);
      
    if (countError) throw countError;
    
    console.log(`Found ${beforeCount} existing ${protocol} records`);
    
    if (beforeCount === 0) {
      console.log(`No ${protocol} data to delete`);
      return 0;
    }
    
    console.log(`Deleting ${beforeCount} ${protocol} records...`);
    
    const { error } = await supabase
      .from('trader_stats')
      .delete()
      .eq('protocol_name', protocol);
      
    if (error) throw error;
    
    // Verify deletion
    const { count: afterCount, error: verifyError } = await supabase
      .from('trader_stats')
      .select('*', { count: 'exact', head: true })
      .eq('protocol_name', protocol);
      
    if (verifyError) throw verifyError;
    
    console.log(`✅ Deleted ${beforeCount} ${protocol} records. Remaining: ${afterCount}`);
    return beforeCount;
    
  } catch (error) {
    console.error(`❌ Error deleting ${protocol} data:`, error);
    throw error;
  }
}

async function deleteAllTraderData() {
  console.log('🗑️  Deleting existing trader data for refresh...');
  
  const protocols = ['photon', 'axiom'];
  let totalDeleted = 0;
  
  for (const protocol of protocols) {
    try {
      const deleted = await deleteProtocolData(protocol);
      totalDeleted += deleted;
    } catch (error) {
      console.error(`Failed to delete ${protocol} data:`, error);
    }
  }
  
  console.log(`\n📊 Total records deleted: ${totalDeleted}`);
  console.log('✨ Database is now ready for fresh data import');
  
  return totalDeleted;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deleteAllTraderData()
    .then((deleted) => {
      console.log(`\n🎉 Deletion completed! ${deleted} records removed`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Deletion failed:', error);
      process.exit(1);
    });
}

export default deleteAllTraderData;