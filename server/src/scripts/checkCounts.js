import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kctohdlzcnnmcubgxiaa.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw'
);

async function checkCounts() {
  const { count: photonCount } = await supabase
    .from('trader_stats')
    .select('*', { count: 'exact', head: true })
    .eq('protocol_name', 'photon');
    
  const { count: axiomCount } = await supabase
    .from('trader_stats')
    .select('*', { count: 'exact', head: true })
    .eq('protocol_name', 'axiom');
    
  console.log('📊 Current Trader Counts:');
  console.log('========================');
  console.log('Photon traders:', photonCount || 0);
  console.log('Axiom traders:', axiomCount || 0);
  console.log('Total:', (photonCount || 0) + (axiomCount || 0));
}

checkCounts();