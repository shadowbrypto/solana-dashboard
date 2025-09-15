import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import DuneTraderStatsService from '../services/duneTraderStatsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testPhotonImport() {
  console.log('🔧 Testing Photon import...');
  console.log('🔑 Dune API Key:', process.env.DUNE_API_KEY ? 'Present' : 'Missing');
  console.log('🔑 Supabase URL:', process.env.REACT_APP_SUPABASE_URL ? 'Present' : 'Missing');
  console.log('🔑 Supabase Key:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Present' : 'Missing');

  try {
    await DuneTraderStatsService.fetchAndImportTraderStats('photon', new Date());
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPhotonImport();