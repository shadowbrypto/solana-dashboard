import { API_BASE_URL } from './api';
import { Settings } from './settings';

export interface DashboardStats {
  yesterday: {
    volume: number;
    users: number;
    newUsers: number;
    trades: number;
  };
  growth: {
    volume: number;
    users: number;
    newUsers: number;
    trades: number;
  };
  trends: {
    volume: Array<{ name: string; value: number }>;
    users: Array<{ name: string; value: number }>;
    newUsers: Array<{ name: string; value: number }>;
    trades: Array<{ name: string; value: number }>;
    launches: Array<{ name: string; value: number }>;
    graduations: Array<{ name: string; value: number }>;
  };
  rankings?: {
    byVolume: Array<{ name: string; value: number }>;
    byUsers: Array<{ name: string; value: number }>;
    byTrades: Array<{ name: string; value: number }>;
  };
  chainVolumes?: {
    solana: number;
    ethereum: number;
    bsc: number;
    base: number;
    total: number;
  };
  launchpad?: {
    launches: number;
    graduations: number;
    growth: {
      launches: number;
      graduations: number;
    };
  };
  topProtocols?: Array<{
    app: string;
    protocolId: string;
    volume: number;
    volumeGrowth: number;
    daus: number;
    dausGrowth: number;
    newUsers: number;
    newUsersGrowth: number;
    trades: number;
    tradesGrowth: number;
  }>;
  fearGreedIndex?: number;
  lastUpdated: string;
}

class DashboardApi {
  private cache: Map<string, { data: DashboardStats; timestamp: number }> = new Map();
  private CACHE_DURATION = 60 * 1000; // 1 minute cache

  async getDashboardStats(): Promise<DashboardStats> {
    const dataType = Settings.getDataTypePreference();
    const cacheKey = `dashboard-${dataType}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats?dataType=${dataType}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: DashboardStats = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      
      // Return cached data if available, even if expired
      if (cached) {
        return cached.data;
      }
      
      throw error;
    }
  }

  // Clear cache when data type preference changes
  clearCache() {
    this.cache.clear();
  }
}

export const dashboardApi = new DashboardApi();

// Clear cache when data type preference changes
Settings.addDataTypeChangeListener(() => {
  dashboardApi.clearCache();
});