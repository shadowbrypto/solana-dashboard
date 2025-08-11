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

const BagsIcon: FunctionComponent<{ className?: string }> = ({ className }) => (
  React.createElement('svg', {
    className: className,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement('path', { d: "M7 4V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h3a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-1v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm2-1v1h6V3H9zm-2 5v11h10V8H7z" }))
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
      primary: 'hsl(142, 76%, 36%)', // Green
      secondary: 'hsl(142, 76%, 95%)', // Light green
      accent: 'hsl(142, 76%, 26%)', // Darker green
      background: 'hsl(142, 20%, 98%)', // Very light green background
      cardBg: 'hsl(142, 30%, 96%)', // Light green card background
      text: 'hsl(142, 76%, 25%)', // Dark green text
      chartColors: [
        'hsl(142, 76%, 36%)', // Green for launches
        'hsl(142, 76%, 50%)'  // Lighter green for graduations
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
        'hsl(200, 95%, 50%)', // Blue for launches
        'hsl(200, 95%, 65%)'  // Lighter blue for graduations
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
        'hsl(18, 100%, 55%)', // Orange for launches
        'hsl(18, 100%, 70%)'  // Lighter orange for graduations
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
        'hsl(240, 100%, 60%)', // Purple for launches
        'hsl(240, 100%, 75%)'  // Lighter purple for graduations
      ]
    }
  },
  { 
    id: 'bags', 
    name: 'Bags', 
    icon: BagsIcon, 
    category: 'Launchpads', 
    chain: 'solana',
    description: 'Token launchpad on Solana',
    theme: {
      primary: 'hsl(15, 100%, 55%)', // Orange-red
      secondary: 'hsl(15, 100%, 95%)', // Light orange-red
      accent: 'hsl(15, 100%, 45%)', // Darker orange-red
      background: 'hsl(15, 20%, 98%)', // Very light orange-red background
      cardBg: 'hsl(15, 30%, 96%)', // Light orange-red card background
      text: 'hsl(15, 100%, 25%)', // Dark orange-red text
      chartColors: [
        'hsl(15, 100%, 55%)', // Orange-red for launches
        'hsl(15, 100%, 70%)'  // Lighter orange-red for graduations
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
    'bags': 'bags.jpg',
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