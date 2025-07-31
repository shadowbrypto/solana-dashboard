import { supabase } from './src/lib/supabase.js';

async function debugAxiom() {
  try {
    // Check current axiom data in database
    console.log('\n=== CHECKING CURRENT AXIOM DATA ===');
    
    // Get all axiom records ordered by date
    const { data: axiomData, error: axiomError } = await supabase
      .from('protocol_stats')
      .select('date, protocol_name, chain, data_type, volume_usd')
      .eq('protocol_name', 'axiom')
      .order('date', { ascending: true });

    if (axiomError) {
      console.error('Axiom data error:', axiomError);
      return;
    }

    console.log(`Total Axiom records in database: ${axiomData.length}`);
    
    if (axiomData.length > 0) {
      console.log('\nFirst 5 records:');
      axiomData.slice(0, 5).forEach(row => {
        console.log(`  ${row.date} - ${row.protocol_name} (${row.chain}) [${row.data_type}] - Vol: ${row.volume_usd}`);
      });
      
      console.log('\nLast 5 records:');
      axiomData.slice(-5).forEach(row => {
        console.log(`  ${row.date} - ${row.protocol_name} (${row.chain}) [${row.data_type}] - Vol: ${row.volume_usd}`);
      });
      
      // Check for date range gaps
      const dates = axiomData.map(row => new Date(row.date));
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      
      console.log(`\nDate range: ${firstDate.toISOString().split('T')[0]} to ${lastDate.toISOString().split('T')[0]}`);
      
      // Check for any duplicate dates
      const dateStrings = axiomData.map(row => row.date);
      const uniqueDates = new Set(dateStrings);
      if (dateStrings.length !== uniqueDates.size) {
        console.log('\nWARNING: Found duplicate dates in database!');
      }
    }

    // Check table constraints and indexes
    console.log('\n=== CHECKING TABLE STRUCTURE ===');
    
    // Try to get table info - this might fail if we don't have permissions
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'protocol_stats');
    
    if (tableError) {
      console.log('Could not access table information:', tableError.message);
    } else {
      console.log('Table exists:', tableInfo.length > 0);
    }

    // Check for any date validation constraints by testing future date insert
    console.log('\n=== TESTING FUTURE DATE INSERT ===');
    
    const testData = {
      protocol_name: 'test_protocol',
      chain: 'solana',
      data_type: 'private',
      date: '2025-12-31',
      volume_usd: '100',
      daily_users: '1',
      new_users: '1',
      trades: '1',
      fees_usd: '1'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('protocol_stats')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.log('Future date insert failed:', insertError);
    } else {
      console.log('Future date insert succeeded - no date constraints detected');
      
      // Clean up test data
      await supabase
        .from('protocol_stats')
        .delete()
        .eq('protocol_name', 'test_protocol');
    }

  } catch (error) {
    console.error('Debug script error:', error);
  }
  
  process.exit(0);
}

debugAxiom();