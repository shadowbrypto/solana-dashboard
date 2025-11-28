/**
 * Monad Chain Protocol Configuration
 *
 * This file manages the mapping between Monad protocol IDs and their corresponding
 * Dune query IDs for fetching daily volume data.
 *
 * To add a new Monad protocol:
 * 1. Add the protocol ID and its Dune query ID to MONAD_DUNE_QUERY_IDS
 * 2. Also add the protocol to chainProtocols.ts with monad: true
 * 3. Add to rolling-refresh-config.ts for 7-day rolling data
 * 4. Add to dataManagementService.ts for full data sync
 */

export interface MonadQueryConfig {
  [protocolId: string]: string;
}

/**
 * Mapping of Monad protocol IDs to their Dune query IDs
 */
export const MONAD_DUNE_QUERY_IDS: MonadQueryConfig = {
  'gmgnai_monad': '6252295',
  'bloom_monad': '6257400',
  'nadfun_monad': '6252536',
  'basedbot_monad': '6271223',
};

/**
 * Get the Dune query ID for a specific Monad protocol
 * @param protocolId - The protocol identifier
 * @returns The Dune query ID or null if not found
 */
export function getMonadQueryId(protocolId: string): string | null {
  return MONAD_DUNE_QUERY_IDS[protocolId] || null;
}

/**
 * Check if a protocol has a valid Monad Dune query ID
 * @param protocolId - The protocol identifier
 * @returns True if the protocol has a valid query ID
 */
export function hasMonadQueryId(protocolId: string): boolean {
  const queryId = MONAD_DUNE_QUERY_IDS[protocolId];
  return queryId != null && queryId !== '';
}

/**
 * Get all Monad protocols that have valid Dune query IDs
 * @returns Array of protocol IDs with valid query configurations
 */
export function getMonadProtocolsWithQueries(): string[] {
  return Object.keys(MONAD_DUNE_QUERY_IDS).filter(hasMonadQueryId);
}

/**
 * Get all configured Monad protocol IDs
 * @returns Array of all Monad protocol IDs in the configuration
 */
export function getAllMonadProtocolIds(): string[] {
  return Object.keys(MONAD_DUNE_QUERY_IDS);
}
