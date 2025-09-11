// Quick script to check Axiom volume calculation
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kctohdlzcnnmcubgxiaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAxiomData() {
  try {
    console.log('Checking Axiom data...');
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('trader_stats')
      .select('*', { count: 'exact', head: true })
      .eq('protocol_name', 'axiom');
    
    if (countError) throw countError;
    console.log(`Total traders: ${count}`);
    
    // Get a sample of data to check volume ranges
    const { data: sampleData, error: sampleError } = await supabase
      .from('trader_stats')
      .select('volume_usd')
      .eq('protocol_name', 'axiom')
      .order('volume_usd', { ascending: false })
      .limit(10);
    
    if (sampleError) throw sampleError;
    console.log('\nTop 10 traders by volume:');
    sampleData.forEach((trader, i) => {
      console.log(`${i + 1}. $${parseFloat(trader.volume_usd).toLocaleString()}`);
    });
    
    // Calculate total volume using SQL function if available
    const { data: totalVolumeData, error: totalVolumeError } = await supabase
      .rpc('calculate_protocol_total_volume', { protocol_name: 'axiom' });
    
    if (!totalVolumeError && totalVolumeData !== null) {
      console.log(`\nTotal volume (SQL function): $${parseFloat(totalVolumeData).toLocaleString()}`);
    } else {
      console.log('\nSQL function not available, calculating manually...');
      
      // Manual calculation in batches
      let totalVolume = 0;
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data: batchData, error: batchError } = await supabase
          .from('trader_stats')
          .select('volume_usd')
          .eq('protocol_name', 'axiom')
          .range(offset, offset + batchSize - 1);
        
        if (batchError) throw batchError;
        if (!batchData || batchData.length === 0) break;
        
        const batchVolume = batchData.reduce((sum, trader) => {
          return sum + parseFloat(trader.volume_usd || 0);
        }, 0);
        
        totalVolume += batchVolume;
        offset += batchSize;
        
        if (offset % 10000 === 0) {
          console.log(`Processed ${offset} records, running total: $${totalVolume.toLocaleString()}`);
        }
      }
      
      console.log(`\nFinal total volume: $${totalVolume.toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAxiomData();