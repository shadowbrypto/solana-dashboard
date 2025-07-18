// Test script to check database data types
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function testDatabaseQuery() {
  console.log('Testing database queries for trojan protocol...');
  
  try {
    // Check what data types exist for trojan
    const { data: dataTypes, error: dtError } = await supabase
      .from('protocol_stats')
      .select('data_type')
      .eq('protocol_name', 'trojan')
      .limit(5);
    
    if (dtError) {
      console.error('Error fetching data types:', dtError);
      return;
    }
    
    console.log('Data types found for trojan:', dataTypes);
    
    // Check public data count
    const { data: publicData, error: pubError } = await supabase
      .from('protocol_stats')
      .select('volume_usd, date')
      .eq('protocol_name', 'trojan')
      .eq('data_type', 'public')
      .limit(5);
    
    if (pubError) {
      console.error('Error fetching public data:', pubError);
    } else {
      console.log('Public data count:', publicData?.length || 0);
      console.log('Public data sample:', publicData?.[0]);
    }
    
    // Check private data count
    const { data: privateData, error: privError } = await supabase
      .from('protocol_stats')
      .select('volume_usd, date')
      .eq('protocol_name', 'trojan')
      .eq('data_type', 'private')
      .limit(5);
    
    if (privError) {
      console.error('Error fetching private data:', privError);
    } else {
      console.log('Private data count:', privateData?.length || 0);
      console.log('Private data sample:', privateData?.[0]);
    }
    
    // Test total metrics calculation for public
    const { data: publicTotal, error: pubTotalError } = await supabase
      .from('protocol_stats')
      .select('volume_usd, daily_users, new_users, trades, fees_usd')
      .eq('protocol_name', 'trojan')
      .eq('data_type', 'public')
      .eq('chain', 'solana');
    
    if (pubTotalError) {
      console.error('Error fetching public total:', pubTotalError);
    } else {
      const publicTotalMetrics = {
        total_volume_usd: publicTotal?.reduce((sum, row) => sum + (Number(row.volume_usd) || 0), 0) || 0,
        daily_users: publicTotal?.reduce((sum, row) => sum + (Number(row.daily_users) || 0), 0) || 0,
        numberOfNewUsers: publicTotal?.reduce((sum, row) => sum + (Number(row.new_users) || 0), 0) || 0,
        daily_trades: publicTotal?.reduce((sum, row) => sum + (Number(row.trades) || 0), 0) || 0,
        total_fees_usd: publicTotal?.reduce((sum, row) => sum + (Number(row.fees_usd) || 0), 0) || 0
      };
      console.log('Public total metrics:', publicTotalMetrics);
    }
    
    // Test total metrics calculation for private
    const { data: privateTotal, error: privTotalError } = await supabase
      .from('protocol_stats')
      .select('volume_usd, daily_users, new_users, trades, fees_usd')
      .eq('protocol_name', 'trojan')
      .eq('data_type', 'private')
      .eq('chain', 'solana');
    
    if (privTotalError) {
      console.error('Error fetching private total:', privTotalError);
    } else {
      const privateTotalMetrics = {
        total_volume_usd: privateTotal?.reduce((sum, row) => sum + (Number(row.volume_usd) || 0), 0) || 0,
        daily_users: privateTotal?.reduce((sum, row) => sum + (Number(row.daily_users) || 0), 0) || 0,
        numberOfNewUsers: privateTotal?.reduce((sum, row) => sum + (Number(row.new_users) || 0), 0) || 0,
        daily_trades: privateTotal?.reduce((sum, row) => sum + (Number(row.trades) || 0), 0) || 0,
        total_fees_usd: privateTotal?.reduce((sum, row) => sum + (Number(row.fees_usd) || 0), 0) || 0
      };
      console.log('Private total metrics:', privateTotalMetrics);
    }
    
  } catch (error) {
    console.error('Database query error:', error);
  }
}

testDatabaseQuery();