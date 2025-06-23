interface ProtocolConfiguration {
  id: string;
  protocol_id: string;
  category: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Get all protocol configurations from the database
export async function fetchProtocolConfigurations(): Promise<ProtocolConfiguration[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/protocol-config`);
    const result: ApiResponse<ProtocolConfiguration[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch protocol configurations');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('Error fetching protocol configurations:', error);
    throw error;
  }
}

// Save multiple protocol configurations to the database
export async function saveProtocolConfigurationsToDb(
  configurations: { protocol_id: string; category: string }[]
): Promise<ProtocolConfiguration[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/protocol-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ configurations }),
    });
    
    const result: ApiResponse<ProtocolConfiguration[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save protocol configurations');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('Error saving protocol configurations:', error);
    throw error;
  }
}

// Save a single protocol configuration to the database
export async function saveProtocolConfigurationToDb(
  protocolId: string, 
  category: string
): Promise<ProtocolConfiguration> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/protocol-config/${protocolId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ category }),
    });
    
    const result: ApiResponse<ProtocolConfiguration> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save protocol configuration');
    }
    
    if (!result.data) {
      throw new Error('No data returned from save operation');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error saving protocol configuration:', error);
    throw error;
  }
}

// Reset all protocol configurations in the database
export async function resetProtocolConfigurationsInDb(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/protocol-config`, {
      method: 'DELETE',
    });
    
    const result: ApiResponse<void> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to reset protocol configurations');
    }
  } catch (error) {
    console.error('Error resetting protocol configurations:', error);
    throw error;
  }
}