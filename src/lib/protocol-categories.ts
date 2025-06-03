export interface ProtocolCategory {
  name: string;
  protocols: string[];
}

export const protocolCategories: ProtocolCategory[] = [
  {
    name: 'Telegram Bots',
    protocols: ['bonkbot', 'trojan', 'bloom', 'nova', 'soltradingbot', 'banana', 'maestro']
  },
  {
    name: 'Trading Terminals',
    protocols: ['photon', 'bullx', 'axiom', 'gmgnai', 'padre']
  },
  {
    name: 'Mobile Apps',
    protocols: ['moonshot', 'vector']
  }
];

export const getProtocolCategory = (protocolName: string): string => {
  const category = protocolCategories.find(cat => 
    cat.protocols.includes(protocolName.toLowerCase())
  );
  return category ? category.name : 'Other';
};

export const getAllProtocols = (): string[] => {
  return protocolCategories.reduce((acc, category) => [...acc, ...category.protocols], [] as string[]);
};

export const getCategoryProtocols = (categoryName: string): string[] => {
  const category = protocolCategories.find(cat => cat.name === categoryName);
  return category ? category.protocols : [];
};
