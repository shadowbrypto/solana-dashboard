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
  BonkBotIcon, TrojanIcon, TrojanTerminalIcon, TrojanTerminalAppIcon, BloomIcon, NovaIcon, SolTradingBotIcon,
  BananaIcon, MaestroIcon, PhotonIcon, BullXIcon, AxiomIcon,
  GMGNAIIcon, MoonshotIcon, VectorIcon, SlingshotIcon, FomoIcon, TerminalProtocolIcon,
  SigmaIcon, SigmaEVMIcon, MaestroEVMIcon, BloomEVMIcon, BananaEVMIcon, MevxIcon, MevxEVMIcon, AxiomEVMIcon,
  RhythmIcon, VyperIcon, OpenSeaIcon, PhantomIcon, BasedBotIcon, OKXIcon,
  GMGNAIMonadIcon, BloomMonadIcon, NadFunMonadIcon, BasedBotMonadIcon
} from '../components/icons/index';

export interface IconProps {
  className?: string;
}

export interface ProtocolConfig {
  id: string;
  name: string;
  icon: LucideIcon | React.ComponentType<IconProps>;
  category: 'Telegram Bot' | 'Trading Terminal' | 'Mobile App' | 'EVM' | 'Monad';
  chain?: 'solana' | 'ethereum' | 'evm' | 'monad'; // Optional for backward compatibility
}

export interface ProtocolConfigMutable {
  id: string;
  name: string;
  icon: LucideIcon | React.ComponentType<IconProps>;
  category: string;
  chain?: 'solana' | 'ethereum' | 'evm' | 'monad'; // Optional for backward compatibility
}

// Centralized protocol configuration
// To add a new protocol:
// 1. Add an entry to this array with id, name, icon, and category
// 2. The protocol will automatically appear in the navigation and be categorized correctly
export const protocolConfigs: ProtocolConfig[] = [
  // Solana - Telegram Bots
  { id: 'trojanonsolana', name: 'Trojan On Solana', icon: TrojanIcon, category: 'Telegram Bot', chain: 'solana' },
  { id: 'bonkbot', name: 'BonkBot', icon: BonkBotIcon, category: 'Telegram Bot', chain: 'solana' },
  { id: 'bloom', name: 'Bloom', icon: BloomIcon, category: 'Telegram Bot', chain: 'solana' },
  { id: 'nova', name: 'Nova', icon: NovaIcon, category: 'Telegram Bot', chain: 'solana' },
  { id: 'soltradingbot', name: 'SolTradingBot', icon: SolTradingBotIcon, category: 'Telegram Bot', chain: 'solana' },
  { id: 'banana', name: 'Banana', icon: BananaIcon, category: 'Telegram Bot', chain: 'solana' },
  { id: 'maestro', name: 'Maestro', icon: MaestroIcon, category: 'Telegram Bot', chain: 'solana' },
  { id: 'basedbot', name: 'Based Bot', icon: BasedBotIcon, category: 'Telegram Bot', chain: 'solana' },

  // Solana - Trading Terminals
  { id: 'photon', name: 'Photon', icon: PhotonIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'bullx', name: 'Bull X', icon: BullXIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'axiom', name: 'Axiom', icon: AxiomIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'gmgnai', name: 'GmGnAi', icon: GMGNAIIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'terminal', name: 'Terminal', icon: TerminalProtocolIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'nova terminal', name: 'Nova Terminal', icon: NovaIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'telemetry', name: 'Telemetry', icon: BonkBotIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'mevx', name: 'Mevx', icon: MevxIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'rhythm', name: 'Rhythm', icon: RhythmIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'vyper', name: 'Vyper', icon: VyperIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'opensea', name: 'OpenSea', icon: OpenSeaIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'phantom', name: 'Phantom', icon: PhantomIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'okx', name: 'OKX', icon: OKXIcon, category: 'Mobile App', chain: 'solana' },
  { id: 'trojan', name: 'Trojan', icon: TrojanTerminalIcon, category: 'Trading Terminal', chain: 'solana' },
  { id: 'trojanterminal', name: 'Trojan Terminal', icon: TrojanTerminalAppIcon, category: 'Trading Terminal', chain: 'solana' },

  // Solana - Mobile Apps
  { id: 'moonshot', name: 'Moonshot', icon: MoonshotIcon, category: 'Mobile App', chain: 'solana' },
  { id: 'vector', name: 'Vector', icon: VectorIcon, category: 'Mobile App', chain: 'solana' },
  { id: 'slingshot', name: 'Slingshot', icon: SlingshotIcon, category: 'Mobile App', chain: 'solana' },
  { id: 'fomo', name: 'Fomo', icon: FomoIcon, category: 'Mobile App', chain: 'solana' },
  
  // EVM Protocols (Multi-Chain: Ethereum, Base, Arbitrum, BSC, Avalanche)
  { id: 'sigma_evm', name: 'Sigma', icon: SigmaEVMIcon, category: 'EVM', chain: 'evm' },
  { id: 'maestro_evm', name: 'Maestro', icon: MaestroEVMIcon, category: 'EVM', chain: 'evm' },
  { id: 'bloom_evm', name: 'Bloom', icon: BloomEVMIcon, category: 'EVM', chain: 'evm' },
  { id: 'banana_evm', name: 'Banana', icon: BananaEVMIcon, category: 'EVM', chain: 'evm' },
  { id: 'terminal_evm', name: 'Terminal', icon: TerminalProtocolIcon, category: 'EVM', chain: 'evm' },
  { id: 'gmgnai_evm', name: 'GmGnAi', icon: GMGNAIIcon, category: 'EVM', chain: 'evm' },
  { id: 'photon_evm', name: 'Photon', icon: PhotonIcon, category: 'EVM', chain: 'evm' },
  { id: 'mevx_evm', name: 'Mevx', icon: MevxEVMIcon, category: 'EVM', chain: 'evm' },
  { id: 'axiom_evm', name: 'Axiom', icon: AxiomEVMIcon, category: 'EVM', chain: 'evm' },

  // Monad Protocols
  { id: 'gmgnai_monad', name: 'GmGnAi', icon: GMGNAIMonadIcon, category: 'Monad', chain: 'monad' },
  { id: 'bloom_monad', name: 'Bloom', icon: BloomMonadIcon, category: 'Monad', chain: 'monad' },
  { id: 'nadfun_monad', name: 'NadFun', icon: NadFunMonadIcon, category: 'Monad', chain: 'monad' },
  { id: 'basedbot_monad', name: 'Based Bot', icon: BasedBotMonadIcon, category: 'Monad', chain: 'monad' },
];

// Helper functions
export const getProtocolById = (id: string): ProtocolConfig | undefined => {
  return protocolConfigs.find(p => p.id === id);
};

export const getProtocolsByChain = (chain: 'solana' | 'ethereum' | 'evm' | 'monad'): ProtocolConfig[] => {
  return protocolConfigs.filter(p => p.chain === chain);
};

export const getAllChains = (): Array<'solana' | 'ethereum' | 'evm' | 'monad'> => {
  const chains = new Set(protocolConfigs.map(p => p.chain).filter(Boolean) as Array<'solana' | 'ethereum' | 'evm' | 'monad'>);
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
  // Handle "nova terminal" style protocols with space - use first word
  if (protocolId.includes(' ') && protocolId.includes('terminal')) {
    const baseName = protocolId.split(' ')[0];
    return `${baseName}.jpg`;
  }

  // Handle special cases (including _evm and _monad suffixes)
  switch (protocolId.toLowerCase()) {
    case 'trojanonsolana':
      return 'trojanonsolana.jpg';
    case 'trojan':
      return 'trojan.jpg';
    case 'trojanterminal':
      return 'trojan.jpg';
    case 'bull x':
      return 'bullx.jpg';
    case 'telemetry':
      return 'bonkbot.jpg';
    case 'nova terminal':
      return 'nova.jpg';
    // EVM protocols - map to base protocol logos
    case 'sigma_evm':
      return 'sigma.jpg';
    case 'maestro_evm':
      return 'maestro.jpg';
    case 'bloom_evm':
      return 'bloom.jpg';
    case 'banana_evm':
      return 'banana.jpg';
    case 'terminal_evm':
      return 'terminal.jpg';
    case 'gmgnai_evm':
      return 'gmgnai.jpg';
    case 'photon_evm':
      return 'photon.jpg';
    case 'mevx_evm':
      return 'mevx.jpg';
    case 'axiom_evm':
      return 'axiom.jpg';
    // Monad protocols - map to base protocol logos
    case 'gmgnai_monad':
      return 'gmgnai.jpg';
    case 'bloom_monad':
      return 'bloom.jpg';
    case 'nadfun_monad':
      return 'nadfun.jpg';
    case 'basedbot_monad':
      return 'basedbot.jpg';
    default:
      return `${protocolId.toLowerCase()}.jpg`;
  }
};

// Generate protocol categories for backward compatibility (Solana only - for reports)
export const generateProtocolCategories = () => {
  const categories = getAllCategories();
  return categories.map(categoryName => ({
    name: categoryName,
    protocols: getProtocolsByCategory(categoryName)
      .filter(p => p.chain !== 'evm') // Exclude EVM protocols from reports
      .map(p => p.id)
  }));
};

// Generate ALL protocol categories including EVM (for sidebar navigation)
export const generateAllProtocolCategories = () => {
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
    console.warn('[protocol-config] Database fetch failed, falling back to localStorage:', error instanceof Error ? error.message : error);
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
      console.warn('[protocol-config] localStorage fallback failed (may be private browsing):', localStorageError instanceof Error ? localStorageError.message : localStorageError);
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
    console.error('[protocol-config] Failed to initialize configurations, using defaults:', error instanceof Error ? error.message : error);
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
  return mutableProtocolConfigs.filter(p => p.category === category && p.chain !== 'evm'); // Exclude EVM protocols from reports
};

export const getMutableAllCategories = (): string[] => {
  return Array.from(new Set(mutableProtocolConfigs
    .filter(p => p.chain !== 'evm') // Exclude EVM protocols from reports
    .map(p => p.category)));
};

// Get ALL categories including EVM for navigation
export const getMutableAllCategoriesIncludingEVM = (): string[] => {
  return Array.from(new Set(mutableProtocolConfigs.map(p => p.category)));
};

// Get ALL protocols by category including EVM for navigation
export const getMutableProtocolsByCategoryIncludingEVM = (category: string): ProtocolConfigMutable[] => {
  return mutableProtocolConfigs.filter(p => p.category === category);
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
      console.warn('[protocol-config] localStorage backup failed (may be private browsing):', localStorageError instanceof Error ? localStorageError.message : localStorageError);
    }
  } catch (error) {
    console.error('[protocol-config] Failed to save configurations:', error instanceof Error ? error.message : error);
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
      console.warn('[protocol-config] localStorage clear failed (may be private browsing):', localStorageError instanceof Error ? localStorageError.message : localStorageError);
    }
  } catch (error) {
    console.error('[protocol-config] Failed to reset configurations:', error instanceof Error ? error.message : error);
    throw new Error('Failed to reset configurations');
  }
};

// Check if current configurations differ from defaults
export const hasUnsavedChanges = (): boolean => {
  try {
    return JSON.stringify(mutableProtocolConfigs) !== JSON.stringify(protocolConfigs);
  } catch (error) {
    console.warn('[protocol-config] Error checking unsaved changes:', error instanceof Error ? error.message : error);
    return false;
  }
};

// Load configurations from database
export const loadProtocolConfigurations = async (): Promise<void> => {
  await initializeConfigurations();
};