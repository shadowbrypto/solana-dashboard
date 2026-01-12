// Chain-based protocol configuration
// Defines which protocols are available on which chains

export interface ProtocolChainConfig {
  solana: boolean;
  evm: boolean;
}

export const chainBasedProtocols: Record<string, ProtocolChainConfig> = {
  // Solana-only protocols
  'axiom': { solana: true, evm: false },
  'bonkbot': { solana: true, evm: false },
  'bullx': { solana: true, evm: false },
  'gmgnai': { solana: true, evm: false },
  'moonshot': { solana: true, evm: false },
  'nova': { solana: true, evm: false },
  'terminal': { solana: true, evm: false },
  'photon': { solana: true, evm: true },
  'soltradingbot': { solana: true, evm: false },
  'trojanonsolana': { solana: true, evm: false },
  'vector': { solana: true, evm: false },
  
  // Multi-chain protocols (both Solana and EVM)
  'bloom': { solana: true, evm: true },
  'banana': { solana: true, evm: true },
  'maestro': { solana: true, evm: true },
  
  // EVM-only protocols
  'sigma': { solana: false, evm: true }
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

export function getProtocolChains(protocolName: string): string[] {
  const config = chainBasedProtocols[protocolName.toLowerCase()];
  if (!config) return [];
  
  const chains: string[] = [];
  if (config.solana) chains.push('solana');
  if (config.evm) chains.push('evm');
  
  return chains;
}