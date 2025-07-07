import { generateProtocolCategories, generateAllProtocolCategories, getMutableProtocolConfigs } from './protocol-config';
import { isSolanaProtocol } from '../config/chainProtocols';

// Note: EVM protocols are excluded from daily, weekly, and monthly reports
// as per user requirements. Only Solana protocols should appear in reports.

export interface ProtocolCategory {
  name: string;
  protocols: string[];
}

// Generate categories from the centralized protocol configuration
// This includes ALL protocols (Solana + EVM) for navigation sidebar
export const protocolCategories: ProtocolCategory[] = generateAllProtocolCategories();

// Generate categories for reports (Solana only)
export const reportProtocolCategories: ProtocolCategory[] = generateProtocolCategories();

export const getProtocolCategory = (protocolName: string): string => {
  const protocol = getMutableProtocolConfigs().find(p => 
    p.id.toLowerCase() === protocolName.toLowerCase()
  );
  return protocol ? protocol.category : 'Other';
};

export const getAllProtocols = (): string[] => {
  return getMutableProtocolConfigs()
    .filter(p => p.chain !== 'evm') // Exclude EVM protocols from reports
    .map(p => p.id);
};

export const getCategoryProtocols = (categoryName: string): string[] => {
  return getMutableProtocolConfigs()
    .filter(p => p.category === categoryName && p.chain !== 'evm') // Exclude EVM protocols from reports
    .map(p => p.id);
};

// Get only Solana protocols for reports
export const getSolanaProtocols = (): string[] => {
  return getMutableProtocolConfigs()
    .filter(p => p.chain === 'solana' || !p.chain) // Include protocols with solana chain or no chain specified (legacy)
    .map(p => p.id);
};

// Get only Solana protocols by category for reports
export const getSolanaCategoryProtocols = (categoryName: string): string[] => {
  return getMutableProtocolConfigs()
    .filter(p => p.category === categoryName && (p.chain === 'solana' || !p.chain)) // Include only Solana protocols
    .map(p => p.id);
};

// Get ALL protocols (including EVM) for navigation
export const getAllProtocolsIncludingEVM = (): string[] => {
  return getMutableProtocolConfigs().map(p => p.id);
};

// Get ALL protocols by category (including EVM) for navigation
export const getAllCategoryProtocolsIncludingEVM = (categoryName: string): string[] => {
  return getMutableProtocolConfigs()
    .filter(p => p.category === categoryName)
    .map(p => p.id);
};
