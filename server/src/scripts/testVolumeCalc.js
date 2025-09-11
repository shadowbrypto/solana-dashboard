import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kctohdlzcnnmcubgxiaa.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkJXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw'
);

async function testVolume() {
  console.log('Testing volume calculation for Photon...\n');
  
  // Get total count
  const { count } = await supabase
    .from('trader_stats')
    .select('*', { count: 'exact', head: true })
    .eq('protocol_name', 'photon');
    
  console.log(`Total traders: ${count}`);
  
  // Calculate volume properly with pagination
  let totalVolume = 0;
  let offset = 0;
  const batchSize = 1000;
  
  while (offset < count) {
    const { data, error } = await supabase
      .from('trader_stats')
      .select('volume_usd')
      .eq('protocol_name', 'photon')
      .range(offset, offset + batchSize - 1);
      
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    const batchVolume = data.reduce((sum, trader) => {
      return sum + parseFloat(trader.volume_usd || 0);
    }, 0);
    
    totalVolume += batchVolume;
    offset += batchSize;
    
    console.log(`Processed ${offset} records, running total: $${totalVolume.toLocaleString()}`);
  }
  
  console.log(`\nFinal total volume: $${totalVolume.toLocaleString()}`);
  
  // Also test the API endpoint
  console.log('\nTesting API endpoint...');
  const response = await fetch('http://localhost:3001/api/trader-stats/stats/photon');
  const apiData = await response.json();
  console.log('API response:', apiData.data);
}

testVolume();