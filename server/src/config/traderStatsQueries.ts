export interface TraderStatsQuery {
  protocol: string;
  chain: 'solana' | 'evm';
  duneQueryId: string;
  description?: string;
}

export const traderStatsQueries: TraderStatsQuery[] = [
  // Solana protocols
  {
    protocol: 'photon',
    chain: 'solana',
    duneQueryId: '5754480',
    description: 'Photon trader volume data'
  },
  {
    protocol: 'axiom',
    chain: 'solana',
    duneQueryId: '5770971',
    description: 'Axiom trader volume data'
  },
  {
    protocol: 'bloom',
    chain: 'solana',
    duneQueryId: '5755297',
    description: 'Bloom trader volume data'
  },
  {
    protocol: 'trojan',
    chain: 'solana',
    duneQueryId: '5770723',
    description: 'Trojan trader volume data'
  },
  {
    protocol: 'jupiter',
    chain: 'solana',
    duneQueryId: 'XXXXX', // Replace with actual Dune query ID
    description: 'Jupiter trader volume data'
  },
  {
    protocol: 'raydium',
    chain: 'solana',
    duneQueryId: 'XXXXX', // Replace with actual Dune query ID
    description: 'Raydium trader volume data'
  },
  {
    protocol: 'orca',
    chain: 'solana',
    duneQueryId: 'XXXXX', // Replace with actual Dune query ID
    description: 'Orca trader volume data'
  },
  {
    protocol: 'meteora',
    chain: 'solana',
    duneQueryId: 'XXXXX', // Replace with actual Dune query ID
    description: 'Meteora trader volume data'
  },
  {
    protocol: 'lifinity',
    chain: 'solana',
    duneQueryId: 'XXXXX', // Replace with actual Dune query ID
    description: 'Lifinity trader volume data'
  },
  
  // EVM protocols
  {
    protocol: 'uniswap',
    chain: 'evm',
    duneQueryId: 'XXXXX', // Replace with actual Dune query ID
    description: 'Uniswap trader volume data'
  },
  {
    protocol: 'pancakeswap',
    chain: 'evm',
    duneQueryId: 'XXXXX', // Replace with actual Dune query ID
    description: 'PancakeSwap trader volume data'
  },
  // Add more protocols as needed
];

// Helper function to get query ID by protocol
export function getTraderStatsQueryId(protocol: string): string | undefined {
  const query = traderStatsQueries.find(q => q.protocol.toLowerCase() === protocol.toLowerCase());
  return query?.duneQueryId;
}

// Get all queries for a specific chain
export function getQueriesByChain(chain: 'solana' | 'evm'): TraderStatsQuery[] {
  return traderStatsQueries.filter(q => q.chain === chain);
}