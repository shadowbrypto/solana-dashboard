#!/usr/bin/env tsx
import { dataManagementService } from './src/services/dataManagementService.js';

async function main() {
  console.log('Starting data sync process...');
  
  try {
    const result = await dataManagementService.syncData();
    
    if (result.success) {
      console.log('\n✅ Data sync completed successfully!');
      console.log(`📊 CSV files fetched: ${result.csvFilesFetched}`);
      console.log(`📈 Total rows imported: ${result.rowsImported}`);
      console.log(`⏰ Completed at: ${result.timestamp}`);
      
      // Show details for each protocol
      console.log('\n📋 Download Results:');
      result.downloadResults.forEach(dr => {
        if (dr.success) {
          console.log(`  ✅ ${dr.protocol}: ${dr.queriesProcessed || 1} queries processed${dr.queriesFailed ? `, ${dr.queriesFailed} failed` : ''}`);
        } else {
          console.log(`  ❌ ${dr.protocol}: ${dr.error}`);
        }
      });
      
      console.log('\n📋 Import Results:');
      result.importResults.forEach(ir => {
        if (ir.success) {
          console.log(`  ✅ ${ir.protocol}: ${ir.rowsInserted} rows imported`);
        } else {
          console.log(`  ❌ ${ir.protocol}: ${ir.error}`);
        }
      });
      
    } else {
      console.error('\n❌ Data sync failed:', result.error);
    }
    
  } catch (error) {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  }
}

main().catch(console.error);