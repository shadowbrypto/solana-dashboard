import React, { FunctionComponent } from 'react';

// Launchpad icon placeholder - will be replaced with actual icon
const PumpFunIcon: FunctionComponent<{ className?: string }> = ({ className }) => (
  React.createElement('svg', {
    className: className,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement('circle', { cx: "12", cy: "12", r: "10" }))
);

export interface LaunchpadConfig {
  id: string;
  name: string;
  icon: FunctionComponent<{ className?: string }>;
  category: string;
  chain: 'solana' | 'ethereum' | 'evm';
  description?: string;
}

// Launchpad configurations
export const launchpadConfigs: LaunchpadConfig[] = [
  { 
    id: 'pumpfun', 
    name: 'PumpFun', 
    icon: PumpFunIcon, 
    category: 'Launchpads', 
    chain: 'solana',
    description: 'Token launchpad on Solana'
  },
];

// Helper functions
export const getLaunchpadById = (id: string): LaunchpadConfig | undefined => {
  return launchpadConfigs.find(l => l.id === id);
};

export const getLaunchpadsByChain = (chain: 'solana' | 'ethereum' | 'evm'): LaunchpadConfig[] => {
  return launchpadConfigs.filter(l => l.chain === chain);
};

export const getAllLaunchpads = (): LaunchpadConfig[] => {
  return launchpadConfigs;
};

export const getLaunchpadName = (id: string): string => {
  const launchpad = getLaunchpadById(id);
  return launchpad?.name || id;
};

export const getLaunchpadLogoFilename = (id: string): string => {
  // Map launchpad IDs to their logo filenames
  const logoMap: Record<string, string> = {
    'pumpfun': 'pumpfun.jpg',
  };
  
  return logoMap[id] || 'default-logo.png';
};