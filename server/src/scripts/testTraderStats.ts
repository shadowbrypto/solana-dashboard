import 'dotenv/config';
import { supabase } from '../lib/supabase';

async function testTraderStats() {
  try {
    console.log('=== Testing Trader Stats Database ===');
    
    // Test database connection
    const { count: testCount, error: testError } = await supabase
      .from('trader_stats')
      .select('*', { count: 'exact', head: true });
      
    if (testError) {
      console.error('Database connection error:', testError);
      return;
    }
    
    console.log('Database connected successfully');
    console.log('Total records in trader_stats table:', testCount);
    
    // Get sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('trader_stats')
      .select('*')
      .eq('protocol_name', 'photon')
      .limit(5);
      
    if (sampleError) {
      console.error('Sample data error:', sampleError);
      return;
    }
    
    console.log('Sample trader stats data:');
    console.log(JSON.stringify(sampleData, null, 2));
    
    // Get top traders by volume
    const { data: topTraders, error: topError } = await supabase
      .from('trader_stats')
      .select('*')
      .eq('protocol_name', 'photon')
      .order('volume_usd', { ascending: false })
      .limit(10);
      
    if (topError) {
      console.error('Top traders error:', topError);
      return;
    }
    
    console.log('\nTop 10 traders by volume:');
    topTraders?.forEach((trader, index) => {
      console.log(`${index + 1}. ${trader.user_address}: $${trader.volume_usd?.toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTraderStats();