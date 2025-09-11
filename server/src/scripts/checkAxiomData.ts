import 'dotenv/config';
import { supabase } from '../lib/supabase.js';

async function checkAxiomData() {
  try {
    const { data, error, count } = await supabase
      .from('trader_stats')
      .select('*', { count: 'exact', head: true })
      .eq('protocol_name', 'axiom');
    
    if (error) throw error;
    console.log('Axiom trader records in database:', count || 0);
    
    if (count && count > 0) {
      // Get some sample data
      const { data: sampleData } = await supabase
        .from('trader_stats')
        .select('*')
        .eq('protocol_name', 'axiom')
        .order('volume_usd', { ascending: false })
        .limit(5);
        
      if (sampleData && sampleData.length > 0) {
        console.log('Top 5 Axiom traders:');
        sampleData.forEach((trader, index) => {
          console.log(`${index + 1}. ${trader.user_address}: $${Number(trader.volume_usd).toLocaleString()}`);
        });
      }
    } else {
      console.log('No Axiom data found. You may need to wait for the Dune query to complete and import.');
    }
  } catch (error) {
    console.error('Error checking Axiom data:', error);
  }
}

checkAxiomData();