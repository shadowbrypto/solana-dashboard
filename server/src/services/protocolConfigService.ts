import { supabase } from '../lib/supabase.js';

export interface ProtocolConfiguration {
  id: string;
  protocol_id: string;
  category: string;
  created_at?: string;
  updated_at?: string;
}

// Create the protocol_configurations table if it doesn't exist
export async function initializeProtocolConfigTable(): Promise<void> {
  try {
    // Check if table exists by trying to select from it
    const { error: selectError } = await supabase
      .from('protocol_configurations')
      .select('id')
      .limit(1);

    // If table doesn't exist, create it
    if (selectError && selectError.message.includes('relation "protocol_configurations" does not exist')) {
      console.log('Creating protocol_configurations table...');
      
      const { error: createError } = await supabase.rpc('create_protocol_configurations_table');
      
      if (createError) {
        console.error('Error creating table:', createError);
        throw createError;
      }
      
      console.log('protocol_configurations table created successfully');
    }
  } catch (error) {
    console.error('Error initializing protocol_configurations table:', error);
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