// Test script to verify EVM protocol data fetching
async function testEvmProtocols() {
  const API_BASE_URL = 'http://localhost:3001/api';
  
  console.log('Testing EVM protocol data fetching...\n');
  
  // Test protocols
  const evmProtocols = ['sigma', 'maestro', 'bloom', 'banana'];
  
  for (const protocol of evmProtocols) {
    console.log(`\n=== Testing ${protocol} ===`);
    
    // Test legacy API
    try {
      const response = await fetch(`${API_BASE_URL}/protocols/stats?protocol=${protocol}&chain=evm&dataType=public`);
      const data = await response.json();
      console.log(`Legacy API: ${data.success ? 'SUCCESS' : 'FAILED'}`);
      if (data.success && data.data) {
        console.log(`  Records: ${data.data.length}`);
        console.log(`  Sample volume: ${data.data[0]?.volume_usd || 'N/A'}`);
      }
    } catch (error) {
      console.log(`Legacy API: ERROR - ${error.message}`);
    }
    
    // Test unified API
    try {
      const response = await fetch(`${API_BASE_URL}/unified/metrics?protocol=${protocol}&chain=evm&dataType=public`);
      const data = await response.json();
      console.log(`Unified API: ${data.success ? 'SUCCESS' : 'FAILED'}`);
      if (data.success && data.data) {
        console.log(`  Records: ${data.data.length}`);
        console.log(`  Sample volume: ${data.data[0]?.volume_usd || 'N/A'}`);
      }
    } catch (error) {
      console.log(`Unified API: ERROR - ${error.message}`);
    }
    
    // Test total stats
    try {
      const response = await fetch(`${API_BASE_URL}/protocols/total-stats?protocol=${protocol}&chain=evm&dataType=public`);
      const data = await response.json();
      console.log(`Total Stats API: ${data.success ? 'SUCCESS' : 'FAILED'}`);
      if (data.success && data.data) {
        console.log(`  Total volume: ${data.data.total_volume_usd || 'N/A'}`);
        console.log(`  Total users: ${data.data.numberOfNewUsers || 'N/A'}`);
      }
    } catch (error) {
      console.log(`Total Stats API: ERROR - ${error.message}`);
    }
  }
}

// For browser console
if (typeof window !== 'undefined') {
  window.testEvmProtocols = testEvmProtocols;
  console.log('Run testEvmProtocols() in the console to test EVM protocol data');
} else {
  // For Node.js (if you want to run this script directly)
  testEvmProtocols().catch(console.error);
}