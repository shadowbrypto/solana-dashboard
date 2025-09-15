import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkTraderStatsDB() {
  console.log('🔍 Checking trader_stats table...\n');

  const protocols = ['photon', 'axiom', 'bloom', 'trojan'];
  
  for (const protocol of protocols) {
    const { count, error } = await supabase
      .from('trader_stats')
      .select('*', { count: 'exact', head: true })
      .eq('protocol_name', protocol);
    
    if (error) {
      console.error(`❌ Error checking ${protocol}:`, error);
    } else {
      console.log(`${protocol.toUpperCase()}: ${count || 0} records`);
    }
  }

  // Check total records
  const { count: totalCount, error: totalError } = await supabase
    .from('trader_stats')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nTOTAL: ${totalCount || 0} records`);

  // Get sample data
  const { data: sampleData, error: sampleError } = await supabase
    .from('trader_stats')
    .select('*')
    .limit(5);
  
  if (sampleData && sampleData.length > 0) {
    console.log('\nSample data:');
    console.log(sampleData);
  }
}

checkTraderStatsDB();