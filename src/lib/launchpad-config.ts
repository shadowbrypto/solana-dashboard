import React, { FunctionComponent } from 'react';

// Launchpad icon placeholder - will be replaced with actual icon
const PumpFunIcon: FunctionComponent<{ className?: string }> = ({ className }) => (
  React.createElement('svg', {
    className: className,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement('circle', { cx: "12", cy: "12", r: "10" }))
);

const LaunchLabIcon: FunctionComponent<{ className?: string }> = ({ className }) => (
  React.createElement('svg', {
    className: className,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement('rect', { x: "4", y: "4", width: "16", height: "16", rx: "2" }))
);

const LetsBonkIcon: FunctionComponent<{ className?: string }> = ({ className }) => (
  React.createElement('svg', {
    className: className,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement('polygon', { points: "12,2 22,20 2,20" }))
);

const MoonshotIcon: FunctionComponent<{ className?: string }> = ({ className }) => (
  React.createElement('svg', {
    className: className,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement('circle', { cx: "12", cy: "8", r: "6" }), React.createElement('path', { d: "M12 14L8 20h8l-4-6z" }))
);

export interface LaunchpadTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  cardBg: string;
  text: string;
  chartColors: string[];
}

export interface LaunchpadConfig {
  id: string;
  name: string;
  icon: FunctionComponent<{ className?: string }>;
  category: string;
  chain: 'solana' | 'ethereum' | 'evm';
  description?: string;
  theme: LaunchpadTheme;
}

// Launchpad configurations
export const launchpadConfigs: LaunchpadConfig[] = [
  { 
    id: 'pumpfun', 
    name: 'PumpFun', 
    icon: PumpFunIcon, 
    category: 'Launchpads', 
    chain: 'solana',
    description: 'Token launchpad on Solana',
    theme: {
      primary: 'hsl(262, 83%, 58%)', // Purple
      secondary: 'hsl(262, 83%, 95%)', // Light purple
      accent: 'hsl(262, 83%, 48%)', // Darker purple
      background: 'hsl(262, 20%, 98%)', // Very light purple background
      cardBg: 'hsl(262, 30%, 96%)', // Light purple card background
      text: 'hsl(262, 83%, 25%)', // Dark purple text
      chartColors: [
        'hsl(262, 83%, 58%)', // Primary purple for launches
        'hsl(142, 76%, 36%)'  // Green for graduations
      ]
    }
  },
  { 
    id: 'launchlab', 
    name: 'LaunchLab', 
    icon: LaunchLabIcon, 
    category: 'Launchpads', 
    chain: 'solana',
    description: 'Token launchpad on Solana',
    theme: {
      primary: 'hsl(200, 95%, 50%)', // Bright blue
      secondary: 'hsl(200, 95%, 95%)', // Light blue
      accent: 'hsl(200, 95%, 40%)', // Darker blue
      background: 'hsl(200, 20%, 98%)', // Very light blue background
      cardBg: 'hsl(200, 30%, 96%)', // Light blue card background
      text: 'hsl(200, 95%, 25%)', // Dark blue text
      chartColors: [
        'hsl(200, 95%, 50%)', // Primary blue for launches
        'hsl(142, 76%, 36%)'  // Green for graduations
      ]
    }
  },
  { 
    id: 'letsbonk', 
    name: 'LetsBonk', 
    icon: LetsBonkIcon, 
    category: 'Launchpads', 
    chain: 'solana',
    description: 'Token launchpad on Solana',
    theme: {
      primary: 'hsl(18, 100%, 55%)', // Orange
      secondary: 'hsl(18, 100%, 95%)', // Light orange
      accent: 'hsl(18, 100%, 45%)', // Darker orange
      background: 'hsl(18, 20%, 98%)', // Very light orange background
      cardBg: 'hsl(18, 30%, 96%)', // Light orange card background
      text: 'hsl(18, 100%, 25%)', // Dark orange text
      chartColors: [
        'hsl(18, 100%, 55%)', // Primary orange for launches
        'hsl(142, 76%, 36%)'  // Green for graduations
      ]
    }
  },
  { 
    id: 'moonshot', 
    name: 'Moonshot', 
    icon: MoonshotIcon, 
    category: 'Launchpads', 
    chain: 'solana',
    description: 'Token launchpad on Solana',
    theme: {
      primary: 'hsl(240, 100%, 60%)', // Blue-purple
      secondary: 'hsl(240, 100%, 95%)', // Light blue-purple
      accent: 'hsl(240, 100%, 50%)', // Darker blue-purple
      background: 'hsl(240, 20%, 98%)', // Very light blue-purple background
      cardBg: 'hsl(240, 30%, 96%)', // Light blue-purple card background
      text: 'hsl(240, 100%, 25%)', // Dark blue-purple text
      chartColors: [
        'hsl(240, 100%, 60%)', // Primary blue-purple for launches
        'hsl(142, 76%, 36%)'  // Green for graduations
      ]
    }
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
    'launchlab': 'launchlab.jpg',
    'letsbonk': 'letsbonk.jpg',
    'moonshot': 'moonshot.jpg',
  };
  
  return logoMap[id] || 'default-logo.png';
};

export const getLaunchpadTheme = (id: string): LaunchpadTheme => {
  const launchpad = getLaunchpadById(id);
  return launchpad?.theme || {
    primary: 'hsl(217, 91%, 60%)', // Default blue
    secondary: 'hsl(217, 91%, 95%)',
    accent: 'hsl(217, 91%, 50%)',
    background: 'hsl(217, 20%, 98%)',
    cardBg: 'hsl(217, 30%, 96%)',
    text: 'hsl(217, 91%, 25%)',
    chartColors: ['hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)']
  };
};