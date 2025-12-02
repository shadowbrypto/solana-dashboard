import { db } from '../lib/db.js';

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
    await db.query<{ id: string }>('SELECT id FROM protocol_configurations LIMIT 1');
    console.log('protocol_configurations table verified successfully');
  } catch (error: any) {
    console.error('Error verifying protocol_configurations table:', error);
    throw new Error(`Database table not accessible: ${error.message}`);
  }
}

// Get all protocol configurations
export async function getProtocolConfigurations(): Promise<ProtocolConfiguration[]> {
  try {
    const data = await db.query<ProtocolConfiguration>(
      'SELECT * FROM protocol_configurations ORDER BY protocol_id'
    );
    return data || [];
  } catch (error) {
    console.error('Error in getProtocolConfigurations:', error);
    throw error;
  }
}

// Save a single protocol configuration
export async function saveProtocolConfiguration(protocolId: string, category: string): Promise<ProtocolConfiguration> {
  try {
    const id = db.generateUuid();
    const now = new Date().toISOString();

    await db.upsert(
      'protocol_configurations',
      {
        id,
        protocol_id: protocolId,
        category: category,
        updated_at: now
      },
      ['protocol_id']
    );

    // Fetch the upserted record
    const result = await db.queryOne<ProtocolConfiguration>(
      'SELECT * FROM protocol_configurations WHERE protocol_id = ?',
      [protocolId]
    );

    if (!result) {
      throw new Error('Failed to retrieve saved configuration');
    }

    return result;
  } catch (error) {
    console.error('Error in saveProtocolConfiguration:', error);
    throw error;
  }
}

// Save multiple protocol configurations
export async function saveProtocolConfigurations(configurations: { protocol_id: string; category: string }[]): Promise<ProtocolConfiguration[]> {
  try {
    const now = new Date().toISOString();
    const configsWithData = configurations.map(config => ({
      id: db.generateUuid(),
      protocol_id: config.protocol_id,
      category: config.category,
      updated_at: now
    }));

    await db.batchUpsert('protocol_configurations', configsWithData, ['protocol_id']);

    // Fetch all saved records
    const protocolIds = configurations.map(c => c.protocol_id);
    const placeholders = protocolIds.map(() => '?').join(', ');
    const data = await db.query<ProtocolConfiguration>(
      `SELECT * FROM protocol_configurations WHERE protocol_id IN (${placeholders})`,
      protocolIds
    );

    return data || [];
  } catch (error) {
    console.error('Error in saveProtocolConfigurations:', error);
    throw error;
  }
}

// Delete a protocol configuration (reset to default)
export async function deleteProtocolConfiguration(protocolId: string): Promise<void> {
  try {
    await db.delete('protocol_configurations', 'protocol_id = ?', [protocolId]);
  } catch (error) {
    console.error('Error in deleteProtocolConfiguration:', error);
    throw error;
  }
}

// Reset all configurations (delete all records)
export async function resetAllProtocolConfigurations(): Promise<void> {
  try {
    await db.execute('DELETE FROM protocol_configurations');
  } catch (error) {
    console.error('Error in resetAllProtocolConfigurations:', error);
    throw error;
  }
}