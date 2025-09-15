import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testSupabaseInsert() {
  console.log('🔧 Testing Supabase insert...\n');

  // Test data
  const testRecord = {
    protocol_name: 'photon',
    user_address: 'TEST_ADDRESS_123',
    volume_usd: 12345.67,
    date: '2025-09-14',
    chain: 'solana'
  };

  console.log('📋 Test record:', testRecord);

  // Try to insert
  const { data, error } = await supabase
    .from('trader_stats')
    .insert([testRecord])
    .select();

  if (error) {
    console.error('❌ Insert failed:', error);
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
  } else {
    console.log('✅ Insert successful:', data);
  }

  // Check if it was inserted
  const { count, error: countError } = await supabase
    .from('trader_stats')
    .select('*', { count: 'exact', head: true })
    .eq('user_address', 'TEST_ADDRESS_123');

  console.log(`\n🔍 Verification: Found ${count || 0} test records`);

  // Clean up
  if (count && count > 0) {
    const { error: deleteError } = await supabase
      .from('trader_stats')
      .delete()
      .eq('user_address', 'TEST_ADDRESS_123');
    
    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError);
    } else {
      console.log('🧹 Test record cleaned up');
    }
  }
}

testSupabaseInsert();