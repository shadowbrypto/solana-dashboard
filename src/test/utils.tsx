import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

// Test data generators
export const generateMockProtocolStats = (protocol: string, days: number = 30) => {
  const data = [];
  const baseDate = new Date('2025-06-19');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    
    data.push({
      id: `${protocol}-${date.toISOString().split('T')[0]}`,
      protocol_name: protocol,
      date: date.toISOString().split('T')[0],
      volume_usd: Math.random() * 10000000,
      daily_users: Math.floor(Math.random() * 1000),
      new_users: Math.floor(Math.random() * 200),
      trades: Math.floor(Math.random() * 5000),
      fees_usd: Math.random() * 100000,
      formattedDay: `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`,
    });
  }
  
  return data;
};

export const generateMockAggregatedData = (days: number = 90) => {
  const protocols = ["bullx", "photon", "trojanonsolana", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "terminal", "moonshot", "vector"];
  const data = [];
  const baseDate = new Date('2025-06-19');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const entry: any = {
      date: dateStr,
      formattedDay: `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`,
    };
    
    protocols.forEach(protocol => {
      entry[`${protocol}_volume`] = Math.random() * 5000000;
      entry[`${protocol}_users`] = Math.floor(Math.random() * 500);
      entry[`${protocol}_new_users`] = Math.floor(Math.random() * 100);
      entry[`${protocol}_trades`] = Math.floor(Math.random() * 2500);
      entry[`${protocol}_fees`] = Math.random() * 50000;
    });
    
    data.push(entry);
  }
  
  return data;
};

export const generateMockMetrics = () => ({
  total_volume_usd: Math.random() * 100000000,
  daily_users: Math.floor(Math.random() * 10000),
  numberOfNewUsers: Math.floor(Math.random() * 2000),
  daily_trades: Math.floor(Math.random() * 50000),
  total_fees_usd: Math.random() * 1000000,
});

export const generateMockDailyMetrics = (protocols: string[]) => {
  const metrics: any = {};
  protocols.forEach(protocol => {
    metrics[protocol] = generateMockMetrics();
  });
  return metrics;
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const ErrorFallback = ({ error }: { error: Error }) => (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Helper functions for testing
export const waitForLoadingToFinish = async () => {
  // Wait for loading states to complete
  await new Promise(resolve => setTimeout(resolve, 100));
};

export const mockApiResponse = (data: any, delay: number = 0) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), delay);
  });
};

// Protocol constants for testing
export const ALL_PROTOCOLS = ["bullx", "photon", "trojanonsolana", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "terminal", "moonshot", "vector"];

export const TIMEFRAMES = ["7d", "30d", "3m", "6m", "1y", "all"];

// Chart types that should be present
export const CHART_TYPES = {
  INDIVIDUAL_PROTOCOL: ['combined-chart', 'timeline-chart'],
  ALL_PROTOCOLS: ['horizontal-bar-chart', 'stacked-bar-chart', 'stacked-area-chart'],
};

// Metric card types
export const METRIC_TYPES = ['volume', 'users', 'trades', 'fees'];