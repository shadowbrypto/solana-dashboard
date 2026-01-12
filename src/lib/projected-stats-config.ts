/**
 * Projected Stats Configuration (Frontend)
 *
 * ⚠️ IMPORTANT: This file MUST be kept in sync with server/src/config/projected-stats-config.ts
 *
 * This file manages the mapping between protocol IDs and their corresponding
 * Dune query IDs for display and validation in the UI.
 *
 * To add a new protocol's Dune query:
 * 1. Add the SAME query ID to BOTH this file AND server/src/config/projected-stats-config.ts
 * 2. The protocol ID should match the ID used in protocol-config.ts
 * 3. Use empty string '' if protocol doesn't have projected stats (e.g., 'nova': '')
 *
 * Note: If a protocol doesn't have a Dune query ID, projected volume will show '-'
 *
 * Synchronization: The query IDs in this file should match exactly with the backend config
 * to ensure projected stats display correctly in the UI and settings page.
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
  'trojanonsolana': '4899624',
  'bonkbot': '4899822',
  'bloom': '4899851',
  'nova': '',
  'soltradingbot': '4954880',
  'banana': '4899926',
  'maestro': '4899904',
  'basedbot': '6271560',

  // Trading Terminals
  'photon': '4899788',
  'bullx': '6168578',
  'axiom': '4899853',
  'gmgnai': '4899849',
  'terminal': '5622891',
  'nova terminal': '4899891',
  'telemetry': '5666888',
  'mevx': '6169736',
  'rhythm': '5698770',
  'vyper': '5699029',
  'phantom': '6229270',
  'opensea': '6230767',
  'okx': '6289768',

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