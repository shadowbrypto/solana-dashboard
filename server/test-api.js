// Simple test script for API endpoints
const BASE_URL = 'http://localhost:3001';

async function testEndpoint(method, endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`${method} ${BASE_URL}${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`✅ Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...');
  
  // Test health endpoint
  await testEndpoint('GET', '/health', 'Health Check');
  
  // Test data update status
  await testEndpoint('GET', '/api/data-update/status', 'Data Update Status');
  
  // Test protocol endpoints (these might fail without data, but we can see the structure)
  await testEndpoint('GET', '/api/protocols/health', 'Protocol Health');
  
  console.log('\n✨ Tests completed!');
  console.log('\n📝 To trigger data sync, run:');
  console.log(`curl -X POST ${BASE_URL}/api/data-update/sync`);
}

runTests();