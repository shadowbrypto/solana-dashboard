/**
 * Protocol Fee Configuration
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
  'bloom': '0.85%',
  'nova': '1.0%',
  'soltradingbot': '1.0%',
  'banana': '0.5%',
  'maestro': '1.0%',

  // Trading Terminals (Solana)
  'photon': '0.25%',
  'bullx': '1.0%',
  'axiom': '0.5%',
  'gmgnai': '0%',
  'padre': '0%',
  'nova terminal': '0%',
  'telemetry': '0%',
  'mevx': '0%',
  'rhythm': '0%',
  'vyper': '0%',
  'opensea': '0%',

  // Mobile Apps (Solana)
  'moonshot': '1.0%',
  'vector': '0%',
  'slingshot': '0%',
  'fomo': '0%',
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
