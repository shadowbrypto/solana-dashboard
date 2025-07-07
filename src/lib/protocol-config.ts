import React from 'react';
import { 
  BarChart2, 
  Zap, 
  Sword, 
  Aperture, 
  CalendarClock, 
  Wand2, 
  Bot, 
  Star, 
  Rocket, 
  Banana, 
  Cross, 
  Moon, 
  ArrowUpRight, 
  Terminal,
  BotMessageSquare,
  Crosshair,
  TrendingUp,
  LucideIcon
} from 'lucide-react';
import { 
  BonkBotIcon, TrojanIcon, BloomIcon, NovaIcon, SolTradingBotIcon, 
  BananaIcon, MaestroIcon, PhotonIcon, BullXIcon, AxiomIcon, 
  GMGNAIIcon, MoonshotIcon, VectorIcon, SlingshotIcon, FomoIcon, PadreIcon,
  SigmaIcon, SigmaEVMIcon, MaestroEVMIcon, BloomEVMIcon, BananaEVMIcon 
} from '../components/icons/index';

export interface ProtocolConfig {
  id: string;
  name: string;
  icon: LucideIcon | React.ComponentType<any>;
  category: 'Telegram Bots' | 'Trading Terminals' | 'Mobile Apps' | 'EVM Protocols';
  chain?: 'solana' | 'ethereum' | 'evm'; // Optional for backward compatibility
}

export interface ProtocolConfigMutable {
  id: string;
  name: string;
  icon: LucideIcon | React.ComponentType<any>;
  category: string;
  chain?: 'solana' | 'ethereum' | 'evm'; // Optional for backward compatibility
}

// Centralized protocol configuration
// To add a new protocol:
// 1. Add an entry to this array with id, name, icon, and category
// 2. The protocol will automatically appear in the navigation and be categorized correctly
export const protocolConfigs: ProtocolConfig[] = [
  // Solana - Telegram Bots
  { id: 'trojan', name: 'Trojan', icon: TrojanIcon, category: 'Telegram Bots', chain: 'solana' },
  { id: 'bonkbot', name: 'BonkBot', icon: BonkBotIcon, category: 'Telegram Bots', chain: 'solana' },
  { id: 'bloom', name: 'Bloom', icon: BloomIcon, category: 'Telegram Bots', chain: 'solana' },
  { id: 'nova', name: 'Nova', icon: NovaIcon, category: 'Telegram Bots', chain: 'solana' },
  { id: 'soltradingbot', name: 'SolTradingBot', icon: SolTradingBotIcon, category: 'Telegram Bots', chain: 'solana' },
  { id: 'banana', name: 'Banana', icon: BananaIcon, category: 'Telegram Bots', chain: 'solana' },
  { id: 'maestro', name: 'Maestro', icon: MaestroIcon, category: 'Telegram Bots', chain: 'solana' },
  
  // Solana - Trading Terminals
  { id: 'photon', name: 'Photon', icon: PhotonIcon, category: 'Trading Terminals', chain: 'solana' },
  { id: 'bullx', name: 'Bull X', icon: BullXIcon, category: 'Trading Terminals', chain: 'solana' },
  { id: 'axiom', name: 'Axiom', icon: AxiomIcon, category: 'Trading Terminals', chain: 'solana' },
  { id: 'gmgnai', name: 'GmGnAi', icon: GMGNAIIcon, category: 'Trading Terminals', chain: 'solana' },
  { id: 'padre', name: 'Padre', icon: PadreIcon, category: 'Trading Terminals', chain: 'solana' },
  { id: 'nova terminal', name: 'Nova Terminal', icon: NovaIcon, category: 'Trading Terminals', chain: 'solana' },
  { id: 'bonkbot terminal', name: 'BonkBot Terminal', icon: BonkBotIcon, category: 'Trading Terminals', chain: 'solana' },
  
  // Solana - Mobile Apps
  { id: 'moonshot', name: 'Moonshot', icon: MoonshotIcon, category: 'Mobile Apps', chain: 'solana' },
  { id: 'vector', name: 'Vector', icon: VectorIcon, category: 'Mobile Apps', chain: 'solana' },
  { id: 'slingshot', name: 'Slingshot', icon: SlingshotIcon, category: 'Mobile Apps', chain: 'solana' },
  { id: 'fomo', name: 'Fomo', icon: FomoIcon, category: 'Mobile Apps', chain: 'solana' },
  
  // EVM Protocols (Multi-Chain: Ethereum, Base, Arbitrum, BSC, Avalanche)
  { id: 'sigma_evm', name: 'Sigma EVM', icon: SigmaEVMIcon, category: 'EVM Protocols', chain: 'evm' },
  { id: 'maestro_evm', name: 'Maestro EVM', icon: MaestroEVMIcon, category: 'EVM Protocols', chain: 'evm' },
  { id: 'bloom_evm', name: 'Bloom EVM', icon: BloomEVMIcon, category: 'EVM Protocols', chain: 'evm' },
  { id: 'banana_evm', name: 'Banana EVM', icon: BananaEVMIcon, category: 'EVM Protocols', chain: 'evm' },
];

// Helper functions
export const getProtocolById = (id: string): ProtocolConfig | undefined => {
  return protocolConfigs.find(p => p.id === id);
};

export const getProtocolsByChain = (chain: 'solana' | 'ethereum' | 'evm'): ProtocolConfig[] => {
  return protocolConfigs.filter(p => p.chain === chain);
};

export const getAllChains = (): Array<'solana' | 'ethereum' | 'evm'> => {
  const chains = new Set(protocolConfigs.map(p => p.chain).filter(Boolean) as Array<'solana' | 'ethereum' | 'evm'>);
  return Array.from(chains);
};

export const getProtocolsByCategory = (category: string): ProtocolConfig[] => {
  return protocolConfigs.filter(p => p.category === category);
};

export const getAllCategories = (): string[] => {
  return Array.from(new Set(protocolConfigs.map(p => p.category)));
};

export const getProtocolIcon = (protocolId: string): LucideIcon | null => {
  const protocol = getProtocolById(protocolId);
  return protocol ? protocol.icon : null;
};

export const getProtocolName = (protocolId: string): string => {
  const protocol = getProtocolById(protocolId);
  return protocol ? protocol.name : protocolId;
};

// Centralized logo mapping for terminal protocols and special cases
export const getProtocolLogoFilename = (protocolId: string): string => {
  // Handle terminal protocols - use base protocol logo
  if (protocolId.includes('terminal')) {
    const baseName = protocolId.split(' ')[0];
    return `${baseName}.jpg`;
  }
  
  // Handle special cases
  switch (protocolId.toLowerCase()) {
    case 'bull x':
      return 'bullx.jpg';
    case 'bonkbot terminal':
      return 'bonkbot.jpg';
    case 'nova terminal':
      return 'nova.jpg';
    default:
      return `${protocolId.toLowerCase()}.jpg`;
  }
};

// Generate protocol categories for backward compatibility
export const generateProtocolCategories = () => {
  const categories = getAllCategories();
  return categories.map(categoryName => ({
    name: categoryName,
    protocols: getProtocolsByCategory(categoryName).map(p => p.id)
  }));
};

import { 
  fetchProtocolConfigurations, 
  saveProtocolConfigurationsToDb, 
  resetProtocolConfigurationsInDb 
} from './protocol-config-api';

// Load saved configurations from database or use defaults
const loadSavedConfigurations = async (): Promise<ProtocolConfigMutable[]> => {
  try {
    const savedConfigs = await fetchProtocolConfigurations();
    if (savedConfigs.length > 0) {
      // Merge with current configs to handle new protocols that might have been added
      const mergedConfigs = [...protocolConfigs];
      
      // Update categories for existing protocols based on saved data
      savedConfigs.forEach((savedProtocol) => {
        const existingIndex = mergedConfigs.findIndex(p => p.id === savedProtocol.protocol_id);
        if (existingIndex !== -1) {
          mergedConfigs[existingIndex] = {
            ...mergedConfigs[existingIndex],
            category: savedProtocol.category
          };
        }
      });
      
      return mergedConfigs;
    }
  } catch (error) {
    // Fallback to localStorage for backward compatibility
    try {
      const saved = localStorage.getItem('saved_protocol_configurations');
      if (saved) {
        const savedConfigs = JSON.parse(saved);
        const mergedConfigs = [...protocolConfigs];
        
        savedConfigs.forEach((savedProtocol: ProtocolConfigMutable) => {
          const existingIndex = mergedConfigs.findIndex(p => p.id === savedProtocol.id);
          if (existingIndex !== -1) {
            mergedConfigs[existingIndex] = {
              ...mergedConfigs[existingIndex],
              category: savedProtocol.category
            };
          }
        });
        
        return mergedConfigs;
      }
    } catch (localStorageError) {
      // Silent fallback failure
    }
  }
  return [...protocolConfigs];
};

// Mutable version of protocol configs for drag-and-drop
let mutableProtocolConfigs: ProtocolConfigMutable[] = [...protocolConfigs];
let isLoaded = false;

// Initialize configurations from database
const initializeConfigurations = async (): Promise<void> => {
  if (isLoaded) return;
  
  try {
    mutableProtocolConfigs = await loadSavedConfigurations();
    isLoaded = true;
  } catch (error) {
    mutableProtocolConfigs = [...protocolConfigs];
    isLoaded = true;
  }
};

export const getMutableProtocolConfigs = (): ProtocolConfigMutable[] => {
  return mutableProtocolConfigs;
};

export const updateProtocolCategory = (protocolId: string, newCategory: string): void => {
  const protocolIndex = mutableProtocolConfigs.findIndex(p => p.id === protocolId);
  if (protocolIndex !== -1) {
    mutableProtocolConfigs[protocolIndex] = {
      ...mutableProtocolConfigs[protocolIndex],
      category: newCategory
    };
  }
};

export const getMutableProtocolsByCategory = (category: string): ProtocolConfigMutable[] => {
  return mutableProtocolConfigs.filter(p => p.category === category);
};

export const getMutableAllCategories = (): string[] => {
  return Array.from(new Set(mutableProtocolConfigs.map(p => p.category)));
};

// Save current configurations to database
export const saveProtocolConfigurations = async (): Promise<void> => {
  try {
    // Prepare configurations for database
    const configurations = mutableProtocolConfigs.map(config => ({
      protocol_id: config.id,
      category: config.category
    }));
    
    await saveProtocolConfigurationsToDb(configurations);
    
    // Also save to localStorage as backup
    try {
      localStorage.setItem('saved_protocol_configurations', JSON.stringify(mutableProtocolConfigs));
    } catch (localStorageError) {
      // Silent localStorage failure
    }
  } catch (error) {
    throw new Error('Failed to save configurations');
  }
};

// Reset configurations to defaults
export const resetProtocolConfigurations = async (): Promise<void> => {
  try {
    await resetProtocolConfigurationsInDb();
    mutableProtocolConfigs = [...protocolConfigs];
    
    // Also clear localStorage
    try {
      localStorage.removeItem('saved_protocol_configurations');
    } catch (localStorageError) {
      // Silent localStorage failure
    }
  } catch (error) {
    throw new Error('Failed to reset configurations');
  }
};

// Check if current configurations differ from defaults
export const hasUnsavedChanges = (): boolean => {
  try {
    return JSON.stringify(mutableProtocolConfigs) !== JSON.stringify(protocolConfigs);
  } catch (error) {
    return false;
  }
};

// Load configurations from database
export const loadProtocolConfigurations = async (): Promise<void> => {
  await initializeConfigurations();
};