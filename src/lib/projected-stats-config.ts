/**
 * Projected Stats Configuration
 * 
 * This file manages the mapping between protocol IDs and their corresponding
 * Dune query IDs for fetching projected volume data.
 * 
 * To add a new protocol's Dune query:
 * 1. Add the protocol ID and its corresponding Dune query ID to the DUNE_QUERY_IDS object
 * 2. The protocol ID should match the ID used in protocol-config.ts
 * 
 * Note: If a protocol doesn't have a Dune query ID, projected volume will show '-'
 */

interface DuneQueryConfig {
  [protocolId: string]: string;
}

/**
 * Mapping of protocol IDs to their Dune query IDs
 * Replace the placeholder values with actual Dune query IDs
 */
export const DUNE_QUERY_IDS: DuneQueryConfig = {
  // Telegram Bots
  'trojan': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'bonkbot': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID', 
  'bloom': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'nova': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'soltradingbot': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'banana': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'maestro': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  
  // Trading Terminals  
  'photon': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'bullx': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'axiom': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'gmgnai': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'padre': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'nova terminal': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'telemetry': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'mevx': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  
  // Mobile Apps
  'moonshot': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'vector': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID', 
  'slingshot': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
  'fomo': 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID',
};

/**
 * Get Dune query ID for a specific protocol
 * @param protocolId - The protocol identifier
 * @returns The Dune query ID or null if not found
 */
export function getDuneQueryId(protocolId: string): string | null {
  return DUNE_QUERY_IDS[protocolId] || null;
}

/**
 * Check if a protocol has a valid Dune query ID
 * @param protocolId - The protocol identifier  
 * @returns True if the protocol has a valid Dune query ID
 */
export function hasValidDuneQueryId(protocolId: string): boolean {
  const queryId = DUNE_QUERY_IDS[protocolId];
  return queryId != null && queryId !== 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID';
}

/**
 * Get all protocols that have valid Dune query IDs
 * @returns Array of protocol IDs that have valid Dune query IDs
 */
export function getProtocolsWithValidDuneIds(): string[] {
  return Object.keys(DUNE_QUERY_IDS).filter(hasValidDuneQueryId);
}

/**
 * Get protocols with their corresponding Dune query IDs
 * Only includes protocols with valid (non-placeholder) query IDs
 */
export function getValidDuneQueryMappings(): { protocolId: string; duneQueryId: string }[] {
  return Object.entries(DUNE_QUERY_IDS)
    .filter(([_, queryId]) => queryId !== 'REPLACE_WITH_ACTUAL_DUNE_QUERY_ID')
    .map(([protocolId, duneQueryId]) => ({ protocolId, duneQueryId }));
}