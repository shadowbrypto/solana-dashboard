// Fix Axiom percentile calculations with correct data
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kctohdlzcnnmcubgxiaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixAxiomPercentiles() {
  try {
    console.log('Creating protocol_percentiles table...');
    
    // First, create the percentiles table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS protocol_percentiles (
        id SERIAL PRIMARY KEY,
        protocol_name TEXT NOT NULL,
        percentile INTEGER NOT NULL,
        trader_count INTEGER NOT NULL,
        rank_range TEXT NOT NULL,
        volume_usd NUMERIC(20, 2) NOT NULL,
        volume_share NUMERIC(5, 2) NOT NULL,
        total_volume NUMERIC(20, 2) NOT NULL,
        total_traders INTEGER NOT NULL,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(protocol_name, percentile)
      );
    `;
    
    // Note: This might not work due to permissions, but let's try manual calculation
    
    console.log('Fetching all Axiom data...');
    
    // Get all Axiom data in batches
    let allData = [];
    let offset = 0;
    const batchSize = 1000;
    
    while (true) {
      console.log(`Fetching batch at offset ${offset}...`);
      const { data: batchData, error } = await supabase
        .from('trader_stats')
        .select('volume_usd')
        .eq('protocol_name', 'axiom')
        .order('volume_usd', { ascending: false })
        .range(offset, offset + batchSize - 1);
      
      if (error) throw error;
      if (!batchData || batchData.length === 0) break;
      
      allData.push(...batchData);
      offset += batchSize;
      
      // Safety break to avoid infinite loops
      if (offset > 50000) {
        console.log('Safety break at 50k records');
        break;
      }
    }
    
    console.log(`Found ${allData.length} Axiom traders`);
    
    const totalVolume = allData.reduce((sum, trader) => {
      const volume = parseFloat(trader.volume_usd?.toString() || '0');
      return sum + (isNaN(volume) ? 0 : volume);
    }, 0);
    
    console.log(`Total volume: $${totalVolume.toLocaleString()}`);
    
    const totalTraders = allData.length;
    const percentiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 50, 75, 100];
    
    console.log('\nCalculating percentiles...');
    
    const results = [];
    
    percentiles.forEach(percentile => {
      const rankCutoff = Math.floor((percentile / 100) * totalTraders);
      const tradersInPercentile = allData.slice(0, rankCutoff);
      const traderCount = tradersInPercentile.length;
      const bracketVolume = tradersInPercentile.reduce((sum, trader) => {
        const volume = parseFloat(trader.volume_usd?.toString() || '0');
        return sum + (isNaN(volume) ? 0 : volume);
      }, 0);
      const volumeShare = totalVolume > 0 ? (bracketVolume / totalVolume) * 100 : 0;
      const rankRange = traderCount > 0 ? `1-${traderCount}` : '0';
      
      results.push({
        protocol_name: 'axiom',
        percentile: percentile,
        trader_count: traderCount,
        rank_range: rankRange,
        volume_usd: bracketVolume,
        volume_share: volumeShare,
        total_volume: totalVolume,
        total_traders: totalTraders
      });
      
      console.log(`Top ${percentile}% (ranks 1-${rankCutoff}): $${bracketVolume.toLocaleString()} (${volumeShare.toFixed(1)}% of total)`);
    });
    
    // Try to insert the data - this will show us what the correct values should be
    console.log('\nCorrect percentile data for Axiom:');
    console.log('Top 1%:', results.find(r => r.percentile === 1));
    console.log('Top 5%:', results.find(r => r.percentile === 5));
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total Volume: $${totalVolume.toLocaleString()}`);
    console.log(`Total Traders: ${totalTraders.toLocaleString()}`);
    console.log(`Top 1% Volume: $${results.find(r => r.percentile === 1).volume_usd.toLocaleString()}`);
    console.log(`Top 5% Volume: $${results.find(r => r.percentile === 5).volume_usd.toLocaleString()}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAxiomPercentiles();