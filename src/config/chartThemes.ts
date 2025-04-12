import { type Protocol } from '@/types/protocols';

// Emerald theme colors from shadcn/ui
export const chartThemes = {
  BullX: {
    primary: 'hsl(167 68% 39%)', // emerald-600
    secondary: 'hsl(167 70% 24%)', // emerald-800
    gradient: {
      start: 'hsl(167 65% 66%)', // emerald-300
      end: 'hsl(167 68% 39%)', // emerald-600
    },
  },
  Jupiter: {
    primary: 'hsl(262 83% 58%)', // purple-600
    secondary: 'hsl(263 70% 50%)', // purple-700
    gradient: {
      start: 'hsl(262 83% 74%)', // purple-400
      end: 'hsl(262 83% 58%)', // purple-600
    },
  },
  Raydium: {
    primary: 'hsl(221 83% 53%)', // blue-600
    secondary: 'hsl(221 83% 45%)', // blue-700
    gradient: {
      start: 'hsl(221 83% 71%)', // blue-400
      end: 'hsl(221 83% 53%)', // blue-600
    },
  },
  Orca: {
    primary: 'hsl(142 71% 45%)', // green-600
    secondary: 'hsl(142 64% 38%)', // green-700
    gradient: {
      start: 'hsl(142 77% 73%)', // green-400
      end: 'hsl(142 71% 45%)', // green-600
    },
  },
  Drift: {
    primary: 'hsl(346 87% 43%)', // red-600
    secondary: 'hsl(346 77% 37%)', // red-700
    gradient: {
      start: 'hsl(346 87% 73%)', // red-400
      end: 'hsl(346 87% 43%)', // red-600
    },
  },
} as const;

export type ChartTheme = typeof chartThemes[keyof typeof chartThemes];

// Helper function to get theme for a protocol
export const getProtocolTheme = (protocol: Protocol): ChartTheme => {
  return chartThemes[protocol] || chartThemes.BullX;
};
