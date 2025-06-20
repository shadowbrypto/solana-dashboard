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
  { id: 'tryFomo', name: 'TryFomo', icon: TrendingUp, category: 'Mobile Apps' },
];

// Helper functions
export const getProtocolById = (id: string): ProtocolConfig | undefined => {
  return protocolConfigs.find(p => p.id === id);
};

export const getProtocolsByCategory = (category: string): ProtocolConfig[] => {
  return protocolConfigs.filter(p => p.category === category);
};

export const getAllCategories = (): string[] => {
  return [...new Set(protocolConfigs.map(p => p.category))];
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