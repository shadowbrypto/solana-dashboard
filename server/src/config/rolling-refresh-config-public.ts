/**
 * Rolling Refresh Configuration - PUBLIC Data (7-Day Data)
 *
 * This file manages the mapping between protocol IDs and their corresponding
 * Dune query IDs for fetching the latest 7 days of PUBLIC data during refresh operations.
 *
 * These queries should return ONLY the last 7 days of data (no filtering needed).
 * Data is always stored with dataType='public'.
 *
 * To add a new protocol's Dune query:
 * 1. Add the protocol ID and its corresponding 7-day Dune query ID(s) to the PUBLIC_ROLLING_REFRESH_SOURCES object
 * 2. The protocol ID should match the ID used in protocol-config.ts
 * 3. Ensure the Dune query returns exactly 7 days of data
 * 4. Specify the chain ('solana' or 'evm')
 *
 * Note: This is for PUBLIC data type. For PRIVATE data, use rolling-refresh-config.ts
 */

interface RollingRefreshSource {
  queryIds: number[];
  chain: 'solana' | 'evm' | 'monad';
}

/**
 * Mapping of protocol IDs to their 7-day rolling refresh Dune query configurations for PUBLIC data
 * Replace the empty arrays with actual Dune query IDs that return 7 days of public data
 */
export const PUBLIC_ROLLING_REFRESH_SOURCES: Record<string, RollingRefreshSource> = {
  // Solana Protocols - Telegram Bots
  'trojanonsolana': { queryIds: [6289166], chain: 'solana' },
  'bonkbot': { queryIds: [6289180], chain: 'solana' },
  'bloom': { queryIds: [6289302], chain: 'solana' },
  // 'nova': { queryIds: [], chain: 'solana' },
  'soltradingbot': { queryIds: [6289197], chain: 'solana' },
  'banana': { queryIds: [6289247], chain: 'solana' },
  'maestro': { queryIds: [6289189], chain: 'solana' },

  // Solana Protocols - Trading Terminals
  'photon': { queryIds: [6289154], chain: 'solana' },
  'bullx': { queryIds: [6289162], chain: 'solana' },
  'axiom': { queryIds: [6289150], chain: 'solana' },
  'gmgnai': { queryIds: [6289185], chain: 'solana' },
  'terminal': { queryIds: [6289144], chain: 'solana' },
  'nova terminal': { queryIds: [6171190], chain: 'solana' },
  'telemetry': { queryIds: [6289169], chain: 'solana' },
  'mevx': { queryIds: [6289243], chain: 'solana' },
  'rhythm': { queryIds: [6289257], chain: 'solana' },
  'vyper': { queryIds: [6289255], chain: 'solana' },
  "opensea": { queryIds: [6289269], chain: 'solana' },
  'phantom': { queryIds: [6289138], chain: 'solana' },
    'okx': { queryIds: [6289758], chain: 'solana' },

  // Solana Protocols - Mobile Apps
  'moonshot': { queryIds: [6289258], chain: 'solana' },
  'vector': { queryIds: [], chain: 'solana' },
  'slingshot': { queryIds: [6171138], chain: 'solana' },
  'fomo': { queryIds: [6171132], chain: 'solana' },

  // EVM Protocols - Telegram Bots
  'sigma_evm': { queryIds: [], chain: 'evm' },
  // 'maestro_evm': { queryIds: [], chain: 'evm' },
  'bloom_evm': { queryIds: [], chain: 'evm' },
  'banana_evm': { queryIds: [], chain: 'evm' },

  // EVM Protocols - Trading Terminals
  // 'terminal_evm': { queryIds: [], chain: 'evm' },
  // 'gmgnai_evm': { queryIds: [], chain: 'evm' },
  // 'photon_evm': { queryIds: [], chain: 'evm' },
  // 'mevx_evm': { queryIds: [], chain: 'evm' },
  'axiom_evm': { queryIds: [], chain: 'evm' },

  // Monad Protocols
  'gmgnai_monad': { queryIds: [], chain: 'monad' },
  'bloom_monad': { queryIds: [], chain: 'monad' },
  'nadfun_monad': { queryIds: [], chain: 'monad' },
  'basedbot_monad': { queryIds: [], chain: 'monad' },
};

/**
 * Get public rolling refresh configuration for a specific protocol
 * @param protocolId - The protocol identifier
 * @returns The rolling refresh source config or null if not found
 */
export function getPublicRollingRefreshSource(protocolId: string): RollingRefreshSource | null {
  return PUBLIC_ROLLING_REFRESH_SOURCES[protocolId] || null;
}

/**
 * Check if a protocol has a valid public rolling refresh configuration
 * @param protocolId - The protocol identifier
 * @returns True if the protocol has a valid public rolling refresh configuration
 */
export function hasPublicRollingRefreshSource(protocolId: string): boolean {
  const source = PUBLIC_ROLLING_REFRESH_SOURCES[protocolId];
  return source != null && source.queryIds.length > 0;
}

/**
 * Get all protocols that have valid public rolling refresh configurations
 * @returns Array of protocol IDs that have valid public rolling refresh configurations
 */
export function getProtocolsWithPublicRollingRefresh(): string[] {
  return Object.keys(PUBLIC_ROLLING_REFRESH_SOURCES).filter(hasPublicRollingRefreshSource);
}

/**
 * Get all protocol IDs that have public rolling refresh query configurations
 * @returns Array of all protocol IDs in the configuration
 */
export function getAllPublicRollingRefreshProtocolIds(): string[] {
  return Object.keys(PUBLIC_ROLLING_REFRESH_SOURCES);
}
