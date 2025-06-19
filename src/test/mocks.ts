import { vi } from 'vitest';
import { 
  generateMockProtocolStats, 
  generateMockAggregatedData, 
  generateMockMetrics, 
  generateMockDailyMetrics,
  ALL_PROTOCOLS 
} from './utils';

// Mock API functions
export const mockProtocolApi = {
  getProtocolStats: vi.fn(),
  getTotalProtocolStats: vi.fn(),
  getDailyMetrics: vi.fn(),
  getAggregatedProtocolStats: vi.fn(),
  healthCheck: vi.fn(),
};

// Mock protocol data
export const setupMockApiResponses = () => {
  // Mock individual protocol stats
  mockProtocolApi.getProtocolStats.mockImplementation((protocolName: string | string[]) => {
    if (Array.isArray(protocolName)) {
      return Promise.resolve(
        protocolName.flatMap(p => generateMockProtocolStats(p, 90))
      );
    }
    return Promise.resolve(generateMockProtocolStats(protocolName, 90));
  });

  // Mock aggregated stats
  mockProtocolApi.getAggregatedProtocolStats.mockImplementation(() => {
    return Promise.resolve(generateMockAggregatedData(749)); // Full historical data
  });

  // Mock total protocol stats
  mockProtocolApi.getTotalProtocolStats.mockImplementation((protocolName?: string) => {
    return Promise.resolve(generateMockMetrics());
  });

  // Mock daily metrics
  mockProtocolApi.getDailyMetrics.mockImplementation((date: Date) => {
    return Promise.resolve(generateMockDailyMetrics(ALL_PROTOCOLS));
  });

  // Mock health check
  mockProtocolApi.healthCheck.mockImplementation(() => {
    return Promise.resolve({
      success: true,
      message: 'Protocol API is healthy',
      timestamp: new Date().toISOString(),
    });
  });
};

// Mock the protocol service module
vi.mock('../lib/protocol', () => ({
  getProtocolStats: mockProtocolApi.getProtocolStats,
  getTotalProtocolStats: mockProtocolApi.getTotalProtocolStats,
  getDailyMetrics: mockProtocolApi.getDailyMetrics,
  getAggregatedProtocolStats: mockProtocolApi.getAggregatedProtocolStats,
  formatDate: (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
  },
}));

// Mock the API module
vi.mock('../lib/api', () => ({
  protocolApi: mockProtocolApi,
}));

// Reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
  setupMockApiResponses();
};

// Specific mock scenarios
export const mockApiError = (errorMessage: string = 'API Error') => {
  mockProtocolApi.getProtocolStats.mockRejectedValue(new Error(errorMessage));
  mockProtocolApi.getAggregatedProtocolStats.mockRejectedValue(new Error(errorMessage));
  mockProtocolApi.getTotalProtocolStats.mockRejectedValue(new Error(errorMessage));
  mockProtocolApi.getDailyMetrics.mockRejectedValue(new Error(errorMessage));
};

export const mockApiLoading = (delay: number = 1000) => {
  const createDelayedPromise = (data: any) => 
    new Promise(resolve => setTimeout(() => resolve(data), delay));

  mockProtocolApi.getProtocolStats.mockImplementation((protocolName: string | string[]) => {
    const data = Array.isArray(protocolName) 
      ? protocolName.flatMap(p => generateMockProtocolStats(p, 90))
      : generateMockProtocolStats(protocolName, 90);
    return createDelayedPromise(data);
  });

  mockProtocolApi.getAggregatedProtocolStats.mockImplementation(() => {
    return createDelayedPromise(generateMockAggregatedData(749));
  });

  mockProtocolApi.getTotalProtocolStats.mockImplementation(() => {
    return createDelayedPromise(generateMockMetrics());
  });

  mockProtocolApi.getDailyMetrics.mockImplementation(() => {
    return createDelayedPromise(generateMockDailyMetrics(ALL_PROTOCOLS));
  });
};

export const mockEmptyData = () => {
  mockProtocolApi.getProtocolStats.mockResolvedValue([]);
  mockProtocolApi.getAggregatedProtocolStats.mockResolvedValue([]);
  mockProtocolApi.getTotalProtocolStats.mockResolvedValue({
    total_volume_usd: 0,
    daily_users: 0,
    numberOfNewUsers: 0,
    daily_trades: 0,
    total_fees_usd: 0,
  });
  mockProtocolApi.getDailyMetrics.mockResolvedValue({});
};