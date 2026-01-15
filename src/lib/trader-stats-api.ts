import { API_BASE_URL } from './api';
import { CACHE_TTL } from './cache-config';

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

export interface TraderRankData {
  user_address: string;
  volume_usd: number;
  rank: number;
  volumeShare: number;
  protocol_name: string;
  date: string;
  chain?: string;
}

export interface ComprehensiveTraderStats {
  metrics: {
    totalTraders: number;
    totalVolume: number;
    avgVolumePerTrader: number;
    top1PercentVolume: number;
    top5PercentVolume: number;
    percentile99Volume: number;
    percentile95Volume: number;
    top1PercentShare: number;
    top5PercentShare: number;
  };
  percentileBrackets: {
    percentile: number;
    traderCount: number;
    rankRange: string;
    volume: number;
    volumeShare: number;
  }[];
}

export interface PaginatedTraderResponse {
  success: boolean;
  data: TraderRankData[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  cached?: boolean;
  cacheAge?: number;
}

export interface VolumeRangeData {
  rangeLabel: string; // Descriptive label (e.g., "Volume Less than 50,000")
  shortLabel: string; // Short label for file names (e.g., "sub-50k")
  min: number;
  max: number | null;
  traderCount: number;
  totalVolume: number;
  volumeShare: number;
  traderShare: number;
}

class TraderStatsApi {
  private baseUrl = `${API_BASE_URL}/trader-stats`;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = CACHE_TTL.TRADER_STATS;

  // Get comprehensive stats (metrics + percentiles only) for Custom Reports
  async getComprehensiveStats(protocol: string): Promise<ComprehensiveTraderStats> {
    // Backend has smart 4-hour caching that clears on refresh, so we rely on that
    // Use minimal frontend caching to avoid stale data after refreshes
    const cacheKey = `comprehensive_${protocol}`;
    const cached = this.cache.get(cacheKey);
    
    // Only use frontend cache for 30 seconds to allow quick re-renders
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }

    const response = await fetch(`${this.baseUrl}/comprehensive/${protocol}?page=1&limit=1`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch comprehensive stats');
    }
    
    const comprehensiveStats = {
      metrics: result.data.metrics,
      percentileBrackets: result.data.percentileBrackets
    };
    
    // Store with timestamp and backend cache info
    this.cache.set(cacheKey, { 
      data: { 
        ...comprehensiveStats,
        _cached: result.cached,
        _cacheAge: result.cacheAge 
      }, 
      timestamp: Date.now() 
    });
    
    return comprehensiveStats;
  }

  // Get paginated trader rank data for Rank tab with lazy loading
  async getTraderRankData(
    protocol: string,
    page: number = 1,
    pageSize: number = 100,
    clearCache: boolean = false
  ): Promise<PaginatedTraderResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString()
    });
    
    if (clearCache) {
      params.append('clearCache', 'true');
    }

    // Backend handles smart 4-hour caching that clears on refresh
    // We rely on backend caching and only do minimal frontend caching for UI responsiveness
    const response = await fetch(`${this.baseUrl}/comprehensive/${protocol}?${params}`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch trader rank data');
    }
    
    return {
      success: true,
      data: result.data.rankData,
      pagination: result.data.pagination,
      cached: result.cached,
      cacheAge: result.cacheAge
    };
  }
  
  // Clear frontend cache when protocol is refreshed (call this after refresh operations)
  clearProtocolCache(protocol: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(protocol.toLowerCase())
    );
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`Cleared frontend cache for ${protocol}: ${keysToDelete.length} entries`);
  }
  
  // Clear all frontend cache
  clearAllCache(): void {
    this.cache.clear();
    console.log('Cleared all frontend trader stats cache');
  }

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

  // Get volume ranges for a protocol
  async getVolumeRanges(protocol: string): Promise<VolumeRangeData[]> {
    const cacheKey = `volume_ranges_${protocol}`;
    const cached = this.cache.get(cacheKey);

    // Use 5-minute cache like other methods
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const response = await fetch(`${this.baseUrl}/volume-ranges/${protocol}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch volume ranges');
    }

    // Cache the results
    this.cache.set(cacheKey, {
      data: result.data,
      timestamp: Date.now()
    });

    return result.data;
  }

  // Download CSV for a specific volume range
  async downloadVolumeRangeCsv(protocol: string, rangeLabel: string): Promise<void> {
    const url = `${this.baseUrl}/volume-range-export/${protocol}/${rangeLabel}`;

    // Trigger download by creating a temporary anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = `${protocol}_${rangeLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const traderStatsApi = new TraderStatsApi();