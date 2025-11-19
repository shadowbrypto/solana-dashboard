/**
 * Protocol Fee Configuration (Server-side)
 *
 * Manually configure fees for each protocol.
 * Update the fee values here to reflect changes.
 */

export interface ProtocolFeeConfig {
  [protocolId: string]: string;
}

export const PROTOCOL_FEES: ProtocolFeeConfig = {
  // Telegram Bots (Solana)
  'trojan': '1.0%',
  'bonkbot': '1.0%',
  'bloom': '1.0%',
  'nova': '1.0%',
  'soltradingbot': '1.0%',
  'banana': '1.0%',
  'maestro': '1.0%',

  // Trading Terminals (Solana)
  'photon': '1.0%',
  'bullx': '1.0%',
  'axiom': '1.0%',
  'gmgnai': '1.0%',
  'padre': '1.0%',
  'nova terminal': '1.0%',
  'telemetry': '1.0%',
  'mevx': '1.0%',
  'rhythm': '1.0%',
  'vyper': '1.0%',
  'opensea': '1.0%',
  'phantom': '1.0%',

  // Mobile Apps (Solana)
  'moonshot': '1.0%',
  'vector': '1.0%',
  'slingshot': '1.0%',
  'fomo': '1.0%',
};

/**
 * Get fee for a specific protocol
 * @param protocolId - Protocol identifier
 * @returns Fee string (e.g., "1.0%") or "N/A" if not configured
 */
export function getProtocolFee(protocolId: string): string {
  return PROTOCOL_FEES[protocolId.toLowerCase()] || 'N/A';
}

/**
 * Get all protocols with configured fees
 * @returns Array of protocol IDs that have fees configured
 */
export function getProtocolsWithFees(): string[] {
  return Object.keys(PROTOCOL_FEES);
}
