import { supabase } from '../lib/supabase.js';

export interface ProtocolConfiguration {
  id: string;
  protocol_id: string;
  category: string;
  created_at?: string;
  updated_at?: string;
}

// Verify the protocol_configurations table exists and is accessible
export async function verifyProtocolConfigTable(): Promise<void> {
  try {
    // Simple check to ensure table exists and is accessible
    const { error } = await supabase
      .from('protocol_configurations')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error accessing protocol_configurations table:', error);
      throw new Error(`Database table not accessible: ${error.message}`);
    }
    
    console.log('protocol_configurations table verified successfully');
  } catch (error) {
    console.error('Error verifying protocol_configurations table:', error);
    throw error;
  }
}

// Get all protocol configurations
export async function getProtocolConfigurations(): Promise<ProtocolConfiguration[]> {
  try {
    const { data, error } = await supabase
      .from('protocol_configurations')
      .select('*')
      .order('protocol_id');

    if (error) {
      console.error('Error fetching protocol configurations:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getProtocolConfigurations:', error);
    throw error;
  }
}

// Save a single protocol configuration
export async function saveProtocolConfiguration(protocolId: string, category: string): Promise<ProtocolConfiguration> {
  try {
    const { data, error } = await supabase
      .from('protocol_configurations')
      .upsert(
        {
          protocol_id: protocolId,
          category: category,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'protocol_id'
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving protocol configuration:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in saveProtocolConfiguration:', error);
    throw error;
  }
}

// Save multiple protocol configurations
export async function saveProtocolConfigurations(configurations: { protocol_id: string; category: string }[]): Promise<ProtocolConfiguration[]> {
  try {
    const configsWithTimestamp = configurations.map(config => ({
      ...config,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('protocol_configurations')
      .upsert(configsWithTimestamp, {
        onConflict: 'protocol_id'
      })
      .select();

    if (error) {
      console.error('Error saving protocol configurations:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in saveProtocolConfigurations:', error);
    throw error;
  }
}

// Delete a protocol configuration (reset to default)
export async function deleteProtocolConfiguration(protocolId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('protocol_configurations')
      .delete()
      .eq('protocol_id', protocolId);

    if (error) {
      console.error('Error deleting protocol configuration:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteProtocolConfiguration:', error);
    throw error;
  }
}

// Reset all configurations (delete all records)
export async function resetAllProtocolConfigurations(): Promise<void> {
  try {
    const { error } = await supabase
      .from('protocol_configurations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) {
      console.error('Error resetting protocol configurations:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in resetAllProtocolConfigurations:', error);
    throw error;
  }
}