import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kctohdlzcnnmcubgxiaa.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkJXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw'
);

async function verifyAxiomVolume() {
  console.log('🔍 Verifying Axiom volume calculation...\n');
  
  // Get total count
  const { count } = await supabase
    .from('trader_stats')
    .select('*', { count: 'exact', head: true })
    .eq('protocol_name', 'axiom');
    
  console.log(`Total Axiom traders: ${count}\n`);
  
  // Get top 100 traders to see volume distribution
  const { data: top100 } = await supabase
    .from('trader_stats')
    .select('volume_usd')
    .eq('protocol_name', 'axiom')
    .order('volume_usd', { ascending: false })
    .limit(100);
    
  if (top100) {
    const top100Volume = top100.reduce((sum, trader) => {
      return sum + parseFloat(trader.volume_usd || 0);
    }, 0);
    
    console.log('Volume distribution:');
    console.log(`Top 1 trader: $${parseFloat(top100[0].volume_usd).toLocaleString()}`);
    console.log(`Top 10 total: $${top100.slice(0, 10).reduce((s, t) => s + parseFloat(t.volume_usd), 0).toLocaleString()}`);
    console.log(`Top 100 total: $${top100Volume.toLocaleString()}`);
    
    // Calculate what percentage top 100 represents
    console.log(`\nTop 100 traders (${(100/count * 100).toFixed(2)}% of traders)`);
  }
  
  // Sample middle traders
  const { data: middleSample } = await supabase
    .from('trader_stats')
    .select('volume_usd')
    .eq('protocol_name', 'axiom')
    .order('volume_usd', { ascending: false })
    .range(50000, 50100);
    
  if (middleSample && middleSample.length > 0) {
    const avgMiddle = middleSample.reduce((sum, t) => sum + parseFloat(t.volume_usd || 0), 0) / middleSample.length;
    console.log(`\nMiddle traders (around rank 50,000):`);
    console.log(`Average volume: $${avgMiddle.toFixed(2)}`);
  }
  
  // Get bottom traders
  const { data: bottomSample } = await supabase
    .from('trader_stats')
    .select('volume_usd')
    .eq('protocol_name', 'axiom')
    .order('volume_usd', { ascending: true })
    .limit(1000);
    
  if (bottomSample) {
    const bottomCount = bottomSample.filter(t => parseFloat(t.volume_usd) === 0).length;
    console.log(`\nBottom 1000 traders:`);
    console.log(`Traders with $0 volume: ${bottomCount}`);
  }
  
  // Final check: calculate total using SUM if possible
  console.log('\n📊 Calculating total volume...');
  
  // Manual calculation with all records
  let totalVolume = 0;
  let offset = 0;
  const batchSize = 1000;
  let nonZeroCount = 0;
  
  while (offset < count) {
    const { data, error } = await supabase
      .from('trader_stats')
      .select('volume_usd')
      .eq('protocol_name', 'axiom')
      .range(offset, offset + batchSize - 1);
      
    if (error || !data) break;
    if (data.length === 0) break;
    
    data.forEach(trader => {
      const volume = parseFloat(trader.volume_usd || 0);
      if (volume > 0) nonZeroCount++;
      totalVolume += volume;
    });
    
    offset += batchSize;
    if (offset % 10000 === 0) {
      console.log(`Processed ${offset} records... Running total: $${totalVolume.toLocaleString()}`);
    }
  }
  
  console.log(`\n✅ Final Results:`);
  console.log(`Total traders: ${count}`);
  console.log(`Traders with volume > $0: ${nonZeroCount}`);
  console.log(`Total volume: $${totalVolume.toLocaleString()}`);
  console.log(`Average volume per trader: $${(totalVolume / count).toFixed(2)}`);
  console.log(`Average volume per active trader: $${(totalVolume / nonZeroCount).toFixed(2)}`);
}

verifyAxiomVolume();