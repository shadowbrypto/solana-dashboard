#!/usr/bin/env tsx

/**
 * Script to download and analyze EVM CSV files to understand column structure
 * This will help us create the correct migration mapping
 */

import Papa from 'papaparse';

// Environment variables
const API_KEY = process.env.DUNE_API_KEY;

if (!API_KEY) {
  console.error('❌ DUNE_API_KEY environment variable is not set');
  console.log('\n🔧 To fix this:');
  console.log('1. Create a .env file in the server directory');
  console.log('2. Add: DUNE_API_KEY=your_dune_api_key_here');
  console.log('3. Get your API key from: https://dune.com/settings/api');
  console.log('\nExample .env file:');
  console.log('DUNE_API_KEY=abc123def456...');
  process.exit(1);
}

// EVM Query IDs to analyze
const EVM_QUERY_IDS = {
  "sigma_evm": 5430634,
  "maestro_evm": 3832557,
  "bloom_evm": 4824799,
  "banana_evm": 4750709
};

async function downloadAndAnalyzeCSV(protocolName: string, queryId: number) {
  try {
    console.log(`\n📊 Analyzing ${protocolName} (Query ID: ${queryId})`);
    console.log('=' .repeat(50));

    const response = await fetch(`https://api.dune.com/api/v1/query/${queryId}/results/csv?api_key=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, message: ${response.statusText}`);
    }

    const csvContent = await response.text();
    
    if (!csvContent || csvContent.trim().length === 0) {
      throw new Error(`Empty CSV content received for query ${queryId}`);
    }

    // Parse CSV to analyze structure
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    console.log(`✅ Successfully downloaded ${parsed.data.length} rows`);
    
    if (parsed.data.length > 0) {
      const firstRow = parsed.data[0] as any;
      const columns = Object.keys(firstRow);
      
      console.log(`\n📋 Column Names (${columns.length} total):`);
      columns.forEach((col, index) => {
        const sampleValue = firstRow[col];
        console.log(`  ${index + 1}. ${col} = "${sampleValue}"`);
      });

      console.log(`\n📊 Sample Data (first 3 rows):`);
      parsed.data.slice(0, 3).forEach((row: any, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });

      // Look for common patterns
      console.log(`\n🔍 Column Analysis:`);
      console.log(`Date columns: ${columns.filter(col => 
        col.toLowerCase().includes('date') || 
        col.toLowerCase().includes('day') || 
        col.toLowerCase().includes('time')
      ).join(', ') || 'None found'}`);
      
      console.log(`Volume columns: ${columns.filter(col => 
        col.toLowerCase().includes('volume') || 
        col.toLowerCase().includes('usd')
      ).join(', ') || 'None found'}`);
      
      console.log(`Chain columns: ${columns.filter(col => 
        col.toLowerCase().includes('chain') || 
        col.toLowerCase().includes('network') || 
        col.toLowerCase().includes('blockchain')
      ).join(', ') || 'None found'}`);

      console.log(`User columns: ${columns.filter(col => 
        col.toLowerCase().includes('user') || 
        col.toLowerCase().includes('trader')
      ).join(', ') || 'None found'}`);

      console.log(`Trade columns: ${columns.filter(col => 
        col.toLowerCase().includes('trade') || 
        col.toLowerCase().includes('transaction') || 
        col.toLowerCase().includes('tx')
      ).join(', ') || 'None found'}`);

      console.log(`Fee columns: ${columns.filter(col => 
        col.toLowerCase().includes('fee') || 
        col.toLowerCase().includes('gas')
      ).join(', ') || 'None found'}`);

    } else {
      console.log('⚠️  No data rows found');
    }

  } catch (error) {
    console.error(`❌ Error analyzing ${protocolName}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting EVM CSV Analysis');
  console.log('This will download and analyze the structure of your EVM query CSV files\n');

  for (const [protocolName, queryId] of Object.entries(EVM_QUERY_IDS)) {
    await downloadAndAnalyzeCSV(protocolName, queryId);
    
    // Add a small delay between requests to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Analysis complete!');
  console.log('\nNext steps:');
  console.log('1. Review the column structures above');
  console.log('2. Update the EVM_COLUMN_MAP in evmDataMigrationService.ts');
  console.log('3. Run the EVM migration with the correct column mappings');
}

main().catch(console.error);