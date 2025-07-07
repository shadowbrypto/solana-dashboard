#!/usr/bin/env tsx

/**
 * CLI script to sync EVM data
 * Usage: npm run sync-evm [protocol-name]
 * 
 * Examples:
 * npm run sync-evm              # Sync all EVM protocols
 * npm run sync-evm sigma_evm    # Sync specific EVM protocol
 */

import { evmDataMigrationService } from '../src/services/evmDataMigrationService.js';

async function main() {
  const args = process.argv.slice(2);
  const protocolName = args[0];

  try {
    if (protocolName) {
      console.log(`🚀 Starting EVM data sync for protocol: ${protocolName}`);
      const result = await evmDataMigrationService.syncEVMProtocolData(protocolName);
      
      if (result.success) {
        console.log(`✅ Successfully synced EVM data for ${protocolName}`);
        console.log(`📊 Rows imported: ${result.rowsImported}`);
        console.log(`📁 CSV files processed: ${result.csvFilesFetched}`);
      } else {
        console.error(`❌ Failed to sync EVM data for ${protocolName}: ${result.error}`);
        process.exit(1);
      }
    } else {
      console.log('🚀 Starting EVM data sync for all protocols');
      const result = await evmDataMigrationService.syncAllEVMData();
      
      if (result.success) {
        console.log('✅ Successfully synced all EVM data');
        console.log(`📊 Total rows imported: ${result.rowsImported}`);
        console.log(`📁 Total CSV files processed: ${result.csvFilesFetched}`);
      } else {
        console.error(`❌ Failed to sync EVM data: ${result.error}`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Error running EVM sync:', error);
    process.exit(1);
  }
}

main();