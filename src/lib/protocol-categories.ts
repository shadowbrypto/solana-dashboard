import { generateProtocolCategories, getMutableProtocolConfigs } from './protocol-config';

export interface ProtocolCategory {
  name: string;
  protocols: string[];
}

// Generate categories from the centralized protocol configuration
export const protocolCategories: ProtocolCategory[] = generateProtocolCategories();

export const getProtocolCategory = (protocolName: string): string => {
  const protocol = getMutableProtocolConfigs().find(p => 
    p.id.toLowerCase() === protocolName.toLowerCase()
  );
  return protocol ? protocol.category : 'Other';
};

export const getAllProtocols = (): string[] => {
  return getMutableProtocolConfigs().map(p => p.id);
};

export const getCategoryProtocols = (categoryName: string): string[] => {
  return getMutableProtocolConfigs()
    .filter(p => p.category === categoryName)
    .map(p => p.id);
};
