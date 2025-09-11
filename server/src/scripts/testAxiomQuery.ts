import 'dotenv/config';

async function testAxiomQuery() {
  const DUNE_API_URL = 'https://api.dune.com/api/v1';
  const API_KEY = process.env.DUNE_API_KEY;
  const queryId = '5755297';

  if (!API_KEY) {
    throw new Error('DUNE_API_KEY environment variable is not set');
  }

  try {
    console.log('Testing Axiom Dune query execution...');
    console.log(`Query ID: ${queryId}`);
    
    // Execute the query
    const executeResponse = await fetch(
      `${DUNE_API_URL}/query/${queryId}/execute`,
      {
        method: 'POST',
        headers: {
          'X-DUNE-API-KEY': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    if (!executeResponse.ok) {
      console.error('Execute response failed:', executeResponse.status, executeResponse.statusText);
      const errorText = await executeResponse.text();
      console.error('Error response:', errorText);
      return;
    }

    const executeData = await executeResponse.json();
    console.log('Execute response:', executeData);
    
    const executionId = executeData.execution_id;
    console.log(`Started execution: ${executionId}`);
    
    // Wait and check status
    console.log('Waiting 10 seconds before checking status...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const statusResponse = await fetch(
      `${DUNE_API_URL}/execution/${executionId}/results`,
      {
        headers: {
          'X-DUNE-API-KEY': API_KEY
        }
      }
    );
    
    if (!statusResponse.ok) {
      console.error('Status check failed:', statusResponse.status, statusResponse.statusText);
      return;
    }
    
    const statusData = await statusResponse.json();
    console.log('Status data:', JSON.stringify(statusData, null, 2));
    
    if (statusData.state === 'QUERY_STATE_COMPLETED') {
      console.log(`Query completed! Found ${statusData.result?.rows?.length || 0} rows`);
      if (statusData.result?.rows?.length > 0) {
        console.log('Sample data:', statusData.result.rows.slice(0, 3));
      }
    } else {
      console.log(`Query state: ${statusData.state}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAxiomQuery();