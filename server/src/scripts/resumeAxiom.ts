import DuneTraderStatsService from '../services/duneTraderStatsService.js';
import { parseISO } from 'date-fns';

/**
 * Resume Axiom import from where it failed
 *
 * This script will:
 * 1. Check how many Axiom records are already in the database
 * 2. Skip those records from the source data
 * 3. Continue importing the remaining records
 *
 * Usage:
 *   RESUME_MODE=true npx tsx src/scripts/resumeAxiom.ts
 */

async function resumeAxiomImport() {
  try {
    console.log('🔄 RESUMING AXIOM IMPORT\n');
    console.log('This will:');
    console.log('  1. Check existing records in database');
    console.log('  2. Download fresh data from Dune');
    console.log('  3. Skip already imported records');
    console.log('  4. Import remaining records only\n');

    // Set resume mode
    process.env.RESUME_MODE = 'true';

    // Fetch and sync Axiom data in resume mode
    const protocol = 'axiom';
    const date = parseISO('2025-01-01'); // Adjust date as needed

    console.log(`Starting resume import for ${protocol}...\n`);

    await DuneTraderStatsService.fetchAndImportTraderStats(protocol, date);

    console.log('\n✅ Resume import completed successfully!');
  } catch (error) {
    console.error('❌ Resume import failed:', error);
    process.exit(1);
  }
}

// Run the resume import
resumeAxiomImport();
