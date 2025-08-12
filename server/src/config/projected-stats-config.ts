/**
 * Projected Stats Configuration (Server-side)
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
  'trojan': '4899624',
  'bonkbot': '4899822', 
  'bloom': '4899851',
  'nova': '',
  'soltradingbot': '4954880',
  'banana': '4899926',
  'maestro': '4899904',
  
  // Trading Terminals  
  'photon': '4899788',
  'bullx': '4899816',
  'axiom': '4899853',
  'gmgnai': '4899849',
  'padre': '5622891',
  'nova terminal': '4899891',
  'bonkbot terminal': '',
  'mevx': '',
  
  // Mobile Apps
  'moonshot': '',
  'vector': '', 
  'slingshot': '',
  'fomo': '',
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
  return queryId != null && queryId !== '';
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
    .filter(([_, queryId]) => queryId !== '')
    .map(([protocolId, duneQueryId]) => ({ protocolId, duneQueryId }));
}

/**
 * Get all protocol IDs that have Dune query configurations
 * @returns Array of all protocol IDs in the configuration
 */
export function getAllConfiguredProtocolIds(): string[] {
  return Object.keys(DUNE_QUERY_IDS);
}