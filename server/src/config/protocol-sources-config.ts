/**
 * Protocol Sources Configuration (Full Historical Data)
 *
 * This file manages the mapping between protocol IDs and their corresponding
 * Dune query IDs for fetching full historical data.
 *
 * These queries return the complete historical data for each protocol.
 * For 7-day rolling refresh queries, see rolling-refresh-config.ts
 * For projected stats queries, see projected-stats-config.ts
 *
 * To add a new protocol's Dune query:
 * 1. Add the protocol ID and its corresponding Dune query ID(s) to both PUBLIC and PRIVATE sources
 * 2. The protocol ID should match the ID used in protocol-config.ts
 * 3. Specify the chain ('solana', 'evm', or 'monad')
 */

export interface ProtocolSource {
  queryIds: number[];
  chain: 'solana' | 'evm' | 'monad';
}

/**
 * Public data sources (when dataType is 'public')
 * These queries return publicly available metrics
 */
export const PUBLIC_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // ==========================================
  // SOLANA PROTOCOLS
  // ==========================================

  // Telegram Bots
  "trojanonsolana": { queryIds: [5500774], chain: 'solana' },
  "bonkbot": { queryIds: [4278881], chain: 'solana' },
  "bloom": { queryIds: [4340509], chain: 'solana' },
  "nova": { queryIds: [6106735], chain: 'solana' },
  "soltradingbot": { queryIds: [3954872], chain: 'solana' },
  "maestro": { queryIds: [4537256], chain: 'solana' },
  "banana": { queryIds: [4537271], chain: 'solana' },

  // Trading Terminals
  "photon": { queryIds: [5500907, 5579135], chain: 'solana' },
  "bullx": { queryIds: [5500910, 5579188], chain: 'solana' },
  "axiom": { queryIds: [5556317, 5376750, 5376740, 5376694, 4663709, 5829313], chain: 'solana' },
  "gmgnai": { queryIds: [4231939], chain: 'solana' },
  "terminal": { queryIds: [5099279], chain: 'solana' },
  "nova terminal": { queryIds: [6106638], chain: 'solana' },
  "telemetry": { queryIds: [5212810], chain: 'solana' },
  "mevx": { queryIds: [5498846], chain: 'solana' },
  "rhythm": { queryIds: [5698641], chain: 'solana' },
  "vyper": { queryIds: [5284061], chain: 'solana' },
  "opensea": { queryIds: [5910228], chain: 'solana' },
  "phantom": { queryIds: [6229269], chain: 'solana' },
  "okx": { queryIds: [6289758], chain: 'solana' },

  // Mobile Apps
  "moonshot": { queryIds: [4103111, 5691748], chain: 'solana' },
  "vector": { queryIds: [4969231], chain: 'solana' },
  "slingshot": { queryIds: [4968360, 5785477], chain: 'solana' },
  "fomo": { queryIds: [5315650, 5713629], chain: 'solana' },

  // ==========================================
  // EVM PROTOCOLS
  // ==========================================

  // Telegram Bots
  "sigma_evm": { queryIds: [5430634], chain: 'evm' },
  "maestro_evm": { queryIds: [3832557], chain: 'evm' },
  "bloom_evm": { queryIds: [4824799], chain: 'evm' },
  "banana_evm": { queryIds: [4750709], chain: 'evm' },

  // Trading Terminals
  "terminal_evm": { queryIds: [5793181], chain: 'evm' },
  "gmgnai_evm": { queryIds: [5823908], chain: 'evm' },
  "photon_evm": { queryIds: [5929750], chain: 'evm' },
  "mevx_evm": { queryIds: [5498756], chain: 'evm' },
  "axiom_evm": { queryIds: [6506374], chain: 'evm' },

  // ==========================================
  // MONAD PROTOCOLS
  // ==========================================
  "gmgnai_monad": { queryIds: [6252295], chain: 'monad' },
  "bloom_monad": { queryIds: [6257400], chain: 'monad' },
  "nadfun_monad": { queryIds: [6252536], chain: 'monad' },
  "basedbot_monad": { queryIds: [6271223], chain: 'monad' },
};

/**
 * Private data sources (when dataType is 'private' or default)
 * These queries may include additional private metrics
 */
export const PRIVATE_PROTOCOL_SOURCES: Record<string, ProtocolSource> = {
  // ==========================================
  // SOLANA PROTOCOLS
  // ==========================================

  // Telegram Bots
  "trojanonsolana": { queryIds: [4251075], chain: 'solana' },
  "bonkbot": { queryIds: [4278881], chain: 'solana' },
  "bloom": { queryIds: [4340509], chain: 'solana' },
  "nova": { queryIds: [6106735], chain: 'solana' },
  "soltradingbot": { queryIds: [3954872], chain: 'solana' },
  "maestro": { queryIds: [4537256], chain: 'solana' },
  "banana": { queryIds: [4537271], chain: 'solana' },

  // Trading Terminals
  "photon": { queryIds: [5845657, 5845717, 5845732], chain: 'solana' },
  "bullx": { queryIds: [3823331], chain: 'solana' },
  "axiom": { queryIds: [5556317, 5376750, 5376740, 5376694, 4663709, 5829313], chain: 'solana' },
  "gmgnai": { queryIds: [4231939], chain: 'solana' },
  "terminal": { queryIds: [5099279], chain: 'solana' },
  "nova terminal": { queryIds: [6106638], chain: 'solana' },
  "telemetry": { queryIds: [5212810], chain: 'solana' },
  "mevx": { queryIds: [5498846], chain: 'solana' },
  "rhythm": { queryIds: [5698641], chain: 'solana' },
  "vyper": { queryIds: [5284061], chain: 'solana' },
  "opensea": { queryIds: [5910228], chain: 'solana' },
  "phantom": { queryIds: [6229269], chain: 'solana' },
  "okx": { queryIds: [6289758], chain: 'solana' },

  // Mobile Apps
  "moonshot": { queryIds: [4103111, 5691748], chain: 'solana' },
  "vector": { queryIds: [4969231], chain: 'solana' },
  "slingshot": { queryIds: [4968360, 5785477], chain: 'solana' },
  "fomo": { queryIds: [5315650, 5713629], chain: 'solana' },

  // ==========================================
  // EVM PROTOCOLS
  // ==========================================

  // Telegram Bots
  "sigma_evm": { queryIds: [5430634], chain: 'evm' },
  "maestro_evm": { queryIds: [3832557], chain: 'evm' },
  "bloom_evm": { queryIds: [4824799], chain: 'evm' },
  "banana_evm": { queryIds: [4750709], chain: 'evm' },

  // Trading Terminals
  "terminal_evm": { queryIds: [5793181], chain: 'evm' },
  "gmgnai_evm": { queryIds: [5823908], chain: 'evm' },
  "photon_evm": { queryIds: [5929750], chain: 'evm' },
  "mevx_evm": { queryIds: [5498756], chain: 'evm' },
  "axiom_evm": { queryIds: [6031024], chain: 'evm' },

  // ==========================================
  // MONAD PROTOCOLS
  // ==========================================
  "gmgnai_monad": { queryIds: [6252295], chain: 'monad' },
  "bloom_monad": { queryIds: [6257400], chain: 'monad' },
  "nadfun_monad": { queryIds: [6252536], chain: 'monad' },
  "basedbot_monad": { queryIds: [6271223], chain: 'monad' },
};

/**
 * Get protocol sources based on data type
 * @param dataType - 'public' or 'private'
 * @returns The appropriate protocol sources mapping
 */
export function getProtocolSources(dataType: string = 'private'): Record<string, ProtocolSource> {
  return dataType === 'public' ? PUBLIC_PROTOCOL_SOURCES : PRIVATE_PROTOCOL_SOURCES;
}

/**
 * Check if a protocol exists in the sources
 * @param protocolId - The protocol identifier
 * @param dataType - 'public' or 'private'
 * @returns True if the protocol exists in the sources
 */
export function hasProtocolSource(protocolId: string, dataType: string = 'private'): boolean {
  const sources = getProtocolSources(dataType);
  return protocolId in sources;
}

/**
 * Get all protocol IDs from sources
 * @param dataType - 'public' or 'private'
 * @returns Array of protocol IDs
 */
export function getAllProtocolIds(dataType: string = 'private'): string[] {
  return Object.keys(getProtocolSources(dataType));
}

/**
 * Get protocols by chain
 * @param chain - 'solana', 'evm', or 'monad'
 * @param dataType - 'public' or 'private'
 * @returns Array of protocol IDs for the specified chain
 */
export function getProtocolsByChain(chain: 'solana' | 'evm' | 'monad', dataType: string = 'private'): string[] {
  const sources = getProtocolSources(dataType);
  return Object.entries(sources)
    .filter(([_, config]) => config.chain === chain)
    .map(([protocolId]) => protocolId);
}
