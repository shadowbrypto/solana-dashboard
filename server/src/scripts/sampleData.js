import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kctohdlzcnnmcubgxiaa.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw'
);

async function checkSampleData() {
  console.log('🔍 Checking sample data...\n');
  
  // Get sample of Photon data
  const { data: photonSample } = await supabase
    .from('trader_stats')
    .select('user_address, volume_usd')
    .eq('protocol_name', 'photon')
    .order('volume_usd', { ascending: false })
    .limit(10);
    
  if (photonSample && photonSample.length > 0) {
    console.log('📈 Top 10 Photon Traders:');
    photonSample.forEach((trader, i) => {
      console.log(`${i + 1}. ${trader.user_address.slice(0, 6)}...${trader.user_address.slice(-4)}: $${parseFloat(trader.volume_usd).toLocaleString()}`);
    });
    
    const totalPhotonVolume = photonSample.reduce((sum, t) => sum + parseFloat(t.volume_usd), 0);
    console.log(`📊 Top 10 combined volume: $${totalPhotonVolume.toLocaleString()}`);
  } else {
    console.log('❌ No Photon data found');
  }
  
  // Check Axiom data
  const { count: axiomCount } = await supabase
    .from('trader_stats')
    .select('*', { count: 'exact', head: true })
    .eq('protocol_name', 'axiom');
    
  if (axiomCount > 0) {
    const { data: axiomSample } = await supabase
      .from('trader_stats')
      .select('user_address, volume_usd')
      .eq('protocol_name', 'axiom')
      .order('volume_usd', { ascending: false })
      .limit(10);
      
    console.log('\n📈 Top 10 Axiom Traders:');
    axiomSample.forEach((trader, i) => {
      console.log(`${i + 1}. ${trader.user_address.slice(0, 6)}...${trader.user_address.slice(-4)}: $${parseFloat(trader.volume_usd).toLocaleString()}`);
    });
  } else {
    console.log('\n📊 Axiom: No data yet (fetch may be in progress)');
  }
  
  console.log('\n📈 Current Status:');
  const { count: photonFinalCount } = await supabase
    .from('trader_stats')
    .select('*', { count: 'exact', head: true })
    .eq('protocol_name', 'photon');
    
  const { count: axiomFinalCount } = await supabase
    .from('trader_stats')
    .select('*', { count: 'exact', head: true })
    .eq('protocol_name', 'axiom');
    
  console.log(`✅ Photon: ${photonFinalCount} traders`);
  console.log(`🔄 Axiom: ${axiomFinalCount} traders`);
}

checkSampleData();