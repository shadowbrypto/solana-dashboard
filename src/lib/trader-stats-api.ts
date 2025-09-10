import { API_BASE_URL } from './api';

export interface TraderStats {
  protocol_name: string;
  user_address: string;
  volume_usd: number;
  date: string;
  chain?: string;
}

export interface TraderAnalytics {
  topTraders: {
    address: string;
    volume: number;
    tradeCount: number;
    percentageOfTotal: number;
  }[];
  totalUniqueTraders: number;
  totalVolume: number;
  volumeDistribution: {
    top10Percentage: number;
    top50Percentage: number;
    top100Percentage: number;
  };
  traderCategories: {
    whales: number;
    sharks: number;
    fish: number;
  };
  percentileDistribution?: {
    top1: number;
    top5: number;
    top10: number;
    top20: number;
    top30: number;
    top50: number;
    top75: number;
    top100: number;
  };
}

class TraderStatsApi {
  private baseUrl = `${API_BASE_URL}/trader-stats`;

  async getTraderStats(
    protocol: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<TraderStats[]> {
    const params = new URLSearchParams({
      startDate,
      endDate,
      limit: limit.toString()
    });

    const response = await fetch(`${this.baseUrl}/protocol/${protocol}?${params}`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch trader stats');
    }
    
    return result.data;
  }

  async getTraderAnalytics(
    protocol: string,
    startDate: string,
    endDate: string
  ): Promise<TraderAnalytics> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });

    const response = await fetch(`${this.baseUrl}/analytics/${protocol}?${params}`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch trader analytics');
    }
    
    return result.data;
  }

  async getTopTradersAcrossProtocols(
    startDate: Date,
    endDate: Date,
    limit: number = 50
  ): Promise<any[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      limit: limit.toString()
    });

    const response = await fetch(`${this.baseUrl}/top-traders?${params}`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch top traders');
    }
    
    return result.data;
  }
}

export const traderStatsApi = new TraderStatsApi();