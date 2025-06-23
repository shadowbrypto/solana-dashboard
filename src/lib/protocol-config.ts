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

export interface ProtocolConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  category: 'Telegram Bots' | 'Trading Terminals' | 'Mobile Apps';
}

export interface ProtocolConfigMutable {
  id: string;
  name: string;
  icon: LucideIcon;
  category: string;
}

// Centralized protocol configuration
// To add a new protocol:
// 1. Add an entry to this array with id, name, icon, and category
// 2. The protocol will automatically appear in the navigation and be categorized correctly
export const protocolConfigs: ProtocolConfig[] = [
  // Telegram Bots
  { id: 'bonkbot', name: 'BonkBot', icon: Bot, category: 'Telegram Bots' },
  { id: 'trojan', name: 'Trojan', icon: Sword, category: 'Telegram Bots' },
  { id: 'bloom', name: 'Bloom', icon: Wand2, category: 'Telegram Bots' },
  { id: 'nova', name: 'Nova', icon: Star, category: 'Telegram Bots' },
  { id: 'soltradingbot', name: 'SolTradingBot', icon: Rocket, category: 'Telegram Bots' },
  { id: 'banana', name: 'Banana', icon: Banana, category: 'Telegram Bots' },
  { id: 'maestro', name: 'Maestro', icon: Zap, category: 'Telegram Bots' },
  
  // Trading Terminals
  { id: 'photon', name: 'Photon', icon: Zap, category: 'Trading Terminals' },
  { id: 'bullx', name: 'Bull X', icon: BarChart2, category: 'Trading Terminals' },
  { id: 'axiom', name: 'Axiom', icon: Aperture, category: 'Trading Terminals' },
  { id: 'gmgnai', name: 'GmGnAi', icon: CalendarClock, category: 'Trading Terminals' },
  { id: 'padre', name: 'Padre', icon: Cross, category: 'Trading Terminals' },
  { id: 'nova terminal', name: 'Nova Terminal', icon: Terminal, category: 'Trading Terminals' },
  { id: 'bonkbot terminal', name: 'BonkBot Terminal', icon: BotMessageSquare, category: 'Trading Terminals' },
  
  // Mobile Apps
  { id: 'moonshot', name: 'Moonshot', icon: Moon, category: 'Mobile Apps' },
  { id: 'vector', name: 'Vector', icon: ArrowUpRight, category: 'Mobile Apps' },
  { id: 'slingshot', name: 'Slingshot', icon: Crosshair, category: 'Mobile Apps' },
  { id: 'fomo', name: 'Fomo', icon: TrendingUp, category: 'Mobile Apps' },
];

// Helper functions
export const getProtocolById = (id: string): ProtocolConfig | undefined => {
  return protocolConfigs.find(p => p.id === id);
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
    console.error('Error loading saved protocol configurations from database:', error);
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
      console.error('Error loading from localStorage fallback:', localStorageError);
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
    console.error('Error initializing configurations:', error);
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
      console.warn('Could not save to localStorage:', localStorageError);
    }
  } catch (error) {
    console.error('Error saving protocol configurations:', error);
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
      console.warn('Could not clear localStorage:', localStorageError);
    }
  } catch (error) {
    console.error('Error resetting configurations:', error);
    throw new Error('Failed to reset configurations');
  }
};

// Check if current configurations differ from defaults
export const hasUnsavedChanges = (): boolean => {
  try {
    return JSON.stringify(mutableProtocolConfigs) !== JSON.stringify(protocolConfigs);
  } catch (error) {
    console.error('Error checking for unsaved changes:', error);
    return false;
  }
};

// Load configurations from database
export const loadProtocolConfigurations = async (): Promise<void> => {
  await initializeConfigurations();
};