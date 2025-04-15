import fs from 'fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase project details
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const tableName = 'protocol_stats'; // Replace with your table name

import path from 'path';

const dataDir = './public/data';

// Map CSV columns to Supabase table columns
// Example: { csv_col: 'table_col', ... }
const columnMap: Record<string, string> = {
  // TODO: Replace these with your actual mappings
  formattedDay: 'date',
  total_volume_usd: 'volume_usd',
  daily_users: 'daily_users',
  numberOfNewUsers: 'new_users',
  daily_trades: 'trades',
  total_fees_usd: 'fees_usd',
};

async function importAllCsvs() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  // Only insert new records (no purge)
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));

  for (const fileName of files) {
    const csvFilePath = path.join(dataDir, fileName);
    console.log(`\n--- Importing ${csvFilePath} ---`);

    const file = fs.readFileSync(csvFilePath, 'utf8');
    const parsed = Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length) {
      console.error('CSV Parse Errors:', parsed.errors);
      continue;
    }
    const data = parsed.data;
    const protocolName = path.basename(csvFilePath, path.extname(csvFilePath));
    const mappedData = data.map((row: any) => {
      const mappedRow: any = {};
      for (const csvCol in columnMap) {
        let value = row[csvCol];
        // Convert date from DD/MM/YYYY to YYYY-MM-DD
        if (columnMap[csvCol] === 'date' && value) {
          const [day, month, year] = value.split('/');
          value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        mappedRow[columnMap[csvCol]] = value;
      }
      mappedRow.protocol_name = protocolName;
      return mappedRow;
    });
    // Insert in batches
    const batchSize = 500;
    let success = true;
    let insertedCount = 0;
    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const { error, count } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'protocol_name,date', ignoreDuplicates: true, count: 'exact' });
      if (error) {
        console.error(`Supabase Insert Error (${fileName}, batch ${i / batchSize + 1}):`, JSON.stringify(error, null, 2));
        console.error('Failed batch data:', JSON.stringify(batch, null, 2));
        success = false;
      } else {
        insertedCount += count || 0;
        console.log(`Batch ${i / batchSize + 1} inserted successfully! Rows inserted in this batch: ${count || 0}`);
      }
    }
    if (success) {
      console.log(`All data from ${fileName} inserted successfully!`);
    } else {
      console.log(`Some data from ${fileName} failed to insert.`);
    }
    console.log(`Total rows actually inserted for ${fileName}: ${insertedCount}`);
  }
}

importAllCsvs();
