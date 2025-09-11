// Create volume calculation functions in Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kctohdlzcnnmcubgxiaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createVolumeFunctions() {
  try {
    console.log('Creating volume calculation function...');
    
    // First, let's create the function directly
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION calculate_protocol_total_volume(protocol_name TEXT)
      RETURNS NUMERIC AS $$
      DECLARE
          total_vol NUMERIC;
      BEGIN
          SELECT COALESCE(SUM(volume_usd), 0)
          INTO total_vol
          FROM trader_stats 
          WHERE protocol_name = $1;
          
          RETURN total_vol;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Note: This will only work if you have the right permissions
    // For now, let's just test our manual calculation
    
    console.log('Testing Axiom volume calculation...');
    
    // Manual calculation to verify our numbers
    const { data, error } = await supabase
      .from('trader_stats')
      .select('volume_usd')
      .eq('protocol_name', 'axiom');
    
    if (error) throw error;
    
    const totalVolume = data.reduce((sum, trader) => {
      const volume = parseFloat(trader.volume_usd?.toString() || '0');
      return sum + (isNaN(volume) ? 0 : volume);
    }, 0);
    
    console.log(`Manual calculation - Total volume: $${totalVolume.toLocaleString()}`);
    
    // Now let's calculate the correct percentiles
    const sortedData = data.sort((a, b) => parseFloat(b.volume_usd) - parseFloat(a.volume_usd));
    const totalTraders = sortedData.length;
    
    console.log(`Total traders: ${totalTraders}`);
    
    // Calculate percentile ranges
    const percentiles = [1, 5];
    
    percentiles.forEach(percentile => {
      const rankCutoff = Math.floor((percentile / 100) * totalTraders);
      const tradersInPercentile = sortedData.slice(0, rankCutoff);
      const bracketVolume = tradersInPercentile.reduce((sum, trader) => {
        const volume = parseFloat(trader.volume_usd?.toString() || '0');
        return sum + (isNaN(volume) ? 0 : volume);
      }, 0);
      const volumeShare = totalVolume > 0 ? (bracketVolume / totalVolume) * 100 : 0;
      
      console.log(`Top ${percentile}% (ranks 1-${rankCutoff}): $${bracketVolume.toLocaleString()} (${volumeShare.toFixed(1)}% of total)`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createVolumeFunctions();