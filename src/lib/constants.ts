// UI Constants
export const UI_CONSTANTS = {
  CHART_COLORS: {
    PRIMARY: '#3b82f6',
    SUCCESS: '#22c55e', 
    ERROR: '#ef4444',
    WARNING: '#f59e0b',
    NEUTRAL: '#6b7280'
  },
  
  CATEGORY_COLORS: {
    TRADING_TERMINALS: 'hsl(210 100% 50%)', // Blue
    TELEGRAM_BOTS: 'hsl(120 100% 40%)',     // Green  
    MOBILE_APPS: 'hsl(45 100% 50%)',        // Yellow
    EVM_PROTOCOLS: 'hsl(280 100% 50%)'      // Purple
  } as const,
  
  CHART_DIMENSIONS: {
    MINI_CHART: { width: 50, height: 28 },
    DEFAULT_CHART: { width: '100%', height: 300 },
    LARGE_CHART: { width: '100%', height: 400 }
  },
  
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  }
} as const;

// Format thresholds
export const FORMAT_THRESHOLDS = {
  BILLION: 1e9,
  MILLION: 1e6,  
  THOUSAND: 1e3
} as const;

// API Constants
export const API_CONSTANTS = {
  CACHE_DURATION: {
    FRONTEND: 5 * 60 * 1000, // 5 minutes
    BACKEND: 60 * 60 * 1000  // 1 hour
  },
  
  ENDPOINTS: {
    PROTOCOLS: '/api/protocols',
    UNIFIED: '/api/unified',
    LAUNCHPADS: '/api/launchpads'
  }
} as const;

// Responsive breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  XS: 475,
  SM: 640,
  MD: 768, 
  LG: 1024,
  XL: 1280,
  '2XL': 1400
} as const;

export type CategoryColor = keyof typeof UI_CONSTANTS.CATEGORY_COLORS;