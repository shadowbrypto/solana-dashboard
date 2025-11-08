import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportHighVolumeTraders() {
  console.log('🔍 Fetching axiom traders with volume > $1M...');

  try {
    // Query traders with volume > 1 million
    const { data, error } = await supabase
      .from('trader_stats')
      .select('*')
      .eq('protocol_name', 'axiom')
      .gt('volume_usd', 1000000)
      .order('volume_usd', { ascending: false });

    if (error) {
      console.error('❌ Error fetching data:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('❌ No traders found with volume > $1M');
      return;
    }

    console.log(`✅ Found ${data.length.toLocaleString()} traders with volume > $1M`);

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Generate CSV
    const csvFilePath = path.join(exportsDir, 'axiom_traders_over_1m.csv');

    // CSV headers
    const headers = Object.keys(data[0]).join(',');

    // CSV rows
    const rows = data.map(row => {
      return Object.values(row).map(value => {
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    // Write to file
    const csvContent = [headers, ...rows].join('\n');
    fs.writeFileSync(csvFilePath, csvContent, 'utf-8');

    console.log(`✅ CSV exported successfully!`);
    console.log(`📁 File location: ${csvFilePath}`);
    console.log(`📊 Total traders: ${data.length.toLocaleString()}`);
    console.log(`💰 Top trader volume: $${data[0].volume_usd.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

exportHighVolumeTraders()
  .then(() => {
    console.log('✅ Export complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Export failed:', error);
    process.exit(1);
  });
