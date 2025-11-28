// Chain-based protocol configuration
// Defines which protocols are available on which chains

export interface ProtocolChainConfig {
  solana: boolean;
  evm: boolean;
  monad: boolean;
}

export const chainBasedProtocols: Record<string, ProtocolChainConfig> = {
  // Solana-only protocols
  'axiom': { solana: true, evm: true, monad: false },
  'bonkbot': { solana: true, evm: false, monad: false },
  'bullx': { solana: true, evm: false, monad: false },
  'gmgnai': { solana: true, evm: true, monad: false },
  'moonshot': { solana: true, evm: false, monad: false },
  'nova': { solana: true, evm: false, monad: false },
  'padre': { solana: true, evm: true, monad: false },
  'photon': { solana: true, evm: true, monad: false },
  'soltradingbot': { solana: true, evm: false, monad: false },
  'trojan': { solana: true, evm: false, monad: false },
  'vector': { solana: true, evm: false, monad: false },
  'mevx': { solana: true, evm: true, monad: false },
  'telemetry': { solana: true, evm: false, monad: false },
  'nova terminal': { solana: true, evm: false, monad: false },
  'slingshot': { solana: true, evm: false, monad: false },
  'fomo': { solana: true, evm: false, monad: false },
  'rhythm': { solana: true, evm: false, monad: false },
  'vyper': { solana: true, evm: false, monad: false },
  'opensea': { solana: true, evm: false, monad: false },
  'phantom': { solana: true, evm: false, monad: false },
  'basedbot': { solana: true, evm: false, monad: false },

  // Multi-chain protocols (both Solana and EVM)
  'bloom': { solana: true, evm: true, monad: false },
  'banana': { solana: true, evm: true, monad: false },
  'maestro': { solana: true, evm: true, monad: false },

  // EVM-only protocols
  'sigma': { solana: false, evm: true, monad: false },

  // Monad-only protocols
  'gmgnai_monad': { solana: false, evm: false, monad: true },
  'bloom_monad': { solana: false, evm: false, monad: true },
  'nadfun_monad': { solana: false, evm: false, monad: true },
  'basedbot_monad': { solana: false, evm: false, monad: true },
};

// Helper functions
export function isSolanaProtocol(protocolName: string): boolean {
  const config = chainBasedProtocols[protocolName.toLowerCase()];
  return config?.solana || false;
}

export function isEVMProtocol(protocolName: string): boolean {
  const config = chainBasedProtocols[protocolName.toLowerCase()];
  return config?.evm || false;
}

export function isMultiChainProtocol(protocolName: string): boolean {
  const config = chainBasedProtocols[protocolName.toLowerCase()];
  return config ? (config.solana && config.evm) : false;
}

export function getSolanaProtocols(): string[] {
  return Object.entries(chainBasedProtocols)
    .filter(([_, config]) => config.solana)
    .map(([protocol]) => protocol);
}

export function getEVMProtocols(): string[] {
  return Object.entries(chainBasedProtocols)
    .filter(([_, config]) => config.evm)
    .map(([protocol]) => protocol);
}

export function isMonadProtocol(protocolName: string): boolean {
  const config = chainBasedProtocols[protocolName.toLowerCase()];
  return config?.monad || false;
}

export function getMonadProtocols(): string[] {
  return Object.entries(chainBasedProtocols)
    .filter(([_, config]) => config.monad)
    .map(([protocol]) => protocol);
}

export function getProtocolChains(protocolName: string): string[] {
  const config = chainBasedProtocols[protocolName.toLowerCase()];
  if (!config) return [];

  const chains: string[] = [];
  if (config.solana) chains.push('solana');
  if (config.evm) chains.push('evm');
  if (config.monad) chains.push('monad');

  return chains;
}