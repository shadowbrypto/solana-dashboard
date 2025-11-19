/**
 * Rolling Refresh Configuration (7-Day Data)
 *
 * This file manages the mapping between protocol IDs and their corresponding
 * Dune query IDs for fetching the latest 7 days of data during refresh operations.
 *
 * These queries should return ONLY the last 7 days of data (no filtering needed).
 * Data is always stored with dataType='private'.
 *
 * To add a new protocol's Dune query:
 * 1. Add the protocol ID and its corresponding 7-day Dune query ID(s) to the ROLLING_REFRESH_SOURCES object
 * 2. The protocol ID should match the ID used in protocol-config.ts
 * 3. Ensure the Dune query returns exactly 7 days of data
 * 4. Specify the chain ('solana' or 'evm')
 *
 * Note: Projected stats are NOT included here - they use projected-stats-config.ts
 */

interface RollingRefreshSource {
  queryIds: number[];
  chain: 'solana' | 'evm';
}

/**
 * Mapping of protocol IDs to their 7-day rolling refresh Dune query configurations
 * Replace the empty arrays with actual Dune query IDs that return 7 days of data
 */
export const ROLLING_REFRESH_SOURCES: Record<string, RollingRefreshSource> = {
  // Solana Protocols - Telegram Bots
   'trojan': { queryIds: [6169496], chain: 'solana' },
   'bonkbot': { queryIds: [6169502], chain: 'solana' },
  'bloom': { queryIds: [6169658], chain: 'solana' },
  // 'nova': { queryIds: [], chain: 'solana' },
  'soltradingbot': { queryIds: [6169527], chain: 'solana' },
  'banana': { queryIds: [6169632], chain: 'solana' },
  'maestro': { queryIds: [6169523], chain: 'solana' },

  // Solana Protocols - Trading Terminals
  'photon': { queryIds: [6169453], chain: 'solana' },
  'bullx': { queryIds: [6168962], chain: 'solana' },
  'axiom': { queryIds: [6169681], chain: 'solana' },
  'gmgnai': { queryIds: [6169546], chain: 'solana' },
  'padre': { queryIds: [6169793], chain: 'solana' },
  'nova terminal': { queryIds: [6171190], chain: 'solana' },
  'telemetry': { queryIds: [6169501], chain: 'solana' },
  'mevx': { queryIds: [6169725], chain: 'solana' },
  'rhythm': { queryIds: [6169816], chain: 'solana' },
  'vyper': { queryIds: [6169767], chain: 'solana' },
  "opensea": { queryIds: [6171165], chain: 'solana' },
  'phantom': { queryIds: [6229269], chain: 'solana' },

  // Solana Protocols - Mobile Apps
  'moonshot': { queryIds: [6171127], chain: 'solana' },
  'vector': { queryIds: [6171179], chain: 'solana' },
  'slingshot': { queryIds: [6171138], chain: 'solana' },
  'fomo': { queryIds: [6171132], chain: 'solana' },

  // EVM Protocols - Telegram Bots
  'sigma_evm': { queryIds: [6169799], chain: 'evm' },
  // 'maestro_evm': { queryIds: [], chain: 'evm' },
  // 'bloom_evm': { queryIds: [], chain: 'evm' },
  'banana_evm': { queryIds: [6169564], chain: 'evm' },

  // EVM Protocols - Trading Terminals
  // 'padre_evm': { queryIds: [], chain: 'evm' },
  // 'gmgnai_evm': { queryIds: [], chain: 'evm' },
  // 'photon_evm': { queryIds: [], chain: 'evm' },
  // 'mevx_evm': { queryIds: [], chain: 'evm' },
  'axiom_evm': { queryIds: [6170063], chain: 'evm' },
};

/**
 * Get rolling refresh configuration for a specific protocol
 * @param protocolId - The protocol identifier
 * @returns The rolling refresh source config or null if not found
 */
export function getRollingRefreshSource(protocolId: string): RollingRefreshSource | null {
  return ROLLING_REFRESH_SOURCES[protocolId] || null;
}

/**
 * Check if a protocol has a valid rolling refresh configuration
 * @param protocolId - The protocol identifier
 * @returns True if the protocol has a valid rolling refresh configuration
 */
export function hasRollingRefreshSource(protocolId: string): boolean {
  const source = ROLLING_REFRESH_SOURCES[protocolId];
  return source != null && source.queryIds.length > 0;
}

/**
 * Get all protocols that have valid rolling refresh configurations
 * @returns Array of protocol IDs that have valid rolling refresh configurations
 */
export function getProtocolsWithRollingRefresh(): string[] {
  return Object.keys(ROLLING_REFRESH_SOURCES).filter(hasRollingRefreshSource);
}

/**
 * Get all protocol IDs that have rolling refresh query configurations
 * @returns Array of all protocol IDs in the configuration
 */
export function getAllRollingRefreshProtocolIds(): string[] {
  return Object.keys(ROLLING_REFRESH_SOURCES);
}
