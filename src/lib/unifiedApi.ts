import { ProtocolStats, ProtocolMetrics, Protocol } from '../types/protocol';
import { format } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Debug log for deployment troubleshooting
console.log('Unified API Environment variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL,
  mode: import.meta.env.MODE,
  prod: import.meta.env.PROD
});

export interface StandardQueryParams {
  chain?: 'solana' | 'ethereum' | 'base' | 'bsc' | 'avax' | 'arbitrum' | 'evm';
  protocol?: string | string[];
  date?: string;
  startDate?: string;
  endDate?: string;
  timeframe?: '7d' | '30d' | '90d' | '6m' | '1y';
  dataType?: 'private' | 'public';
}

export interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    chain?: string;
    protocol?: string;
    dateRange?: { start: string; end: string };
    totalRecords?: number;
    cacheHit?: boolean;
  };
}

class UnifiedApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'UnifiedApiError';
  }
}

async function unifiedApiRequest<T>(endpoint: string, options?: RequestInit): Promise<StandardApiResponse<T>> {
  const url = `${API_BASE_URL}/unified${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', { url, status: response.status, contentType, text: text.substring(0, 200) });
      throw new UnifiedApiError(
        `API returned ${contentType || 'unknown content type'} instead of JSON. Status: ${response.status}`,
        response.status
      );
    }

    const data: StandardApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new UnifiedApiError(
        data.error || `HTTP ${response.status}`,
        response.status
      );
    }

    return data;
  } catch (error) {
    if (error instanceof UnifiedApiError) {
      throw error;
    }
    
    // Check if it's a JSON parsing error
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      throw new UnifiedApiError(
        'Server returned invalid JSON response. This usually means the API server is down or misconfigured.'
      );
    }
    
    // Network or other parsing error
    throw new UnifiedApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

// Helper function to build query string
function buildQueryString(params: StandardQueryParams): string {
  const searchParams = new URLSearchParams();
  
  if (params.chain) searchParams.append('chain', params.chain);
  if (params.protocol) {
    const protocols = Array.isArray(params.protocol) 
      ? params.protocol.join(',') 
      : params.protocol;
    searchParams.append('protocol', protocols);
  }
  if (params.date) searchParams.append('date', params.date);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  if (params.timeframe) searchParams.append('timeframe', params.timeframe);
  if (params.dataType) searchParams.append('dataType', params.dataType);
  
  return searchParams.toString();
}

export class UnifiedProtocolApi {
  // Main unified metrics method
  async getMetrics(params: StandardQueryParams): Promise<StandardApiResponse<any>> {
    const queryString = buildQueryString(params);
    const endpoint = `/metrics${queryString ? `?${queryString}` : ''}`;
    
    return unifiedApiRequest<any>(endpoint);
  }
  
  // Daily metrics
  async getDailyMetrics(date: Date, chain?: string, protocol?: string | string[], dataType?: 'private' | 'public'): Promise<StandardApiResponse<Record<Protocol, ProtocolMetrics>>> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const params: StandardQueryParams = { date: dateStr };
    
    if (chain) params.chain = chain as any;
    if (protocol) params.protocol = protocol;
    if (dataType) params.dataType = dataType;
    
    const queryString = buildQueryString(params);
    const endpoint = `/daily${queryString ? `?${queryString}` : ''}`;
    
    return unifiedApiRequest<Record<Protocol, ProtocolMetrics>>(endpoint);
  }
  
  // Weekly metrics
  async getWeeklyMetrics(startDate: Date, endDate: Date, chain?: string, protocol?: string | string[], dataType?: 'private' | 'public'): Promise<StandardApiResponse<{
    dailyVolumes: Record<Protocol, Record<string, number>>;
    chainDistribution: Record<Protocol, Record<string, number>>;
  }>> {
    const params: StandardQueryParams = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
    
    if (chain) params.chain = chain as any;
    if (protocol) params.protocol = protocol;
    if (dataType) params.dataType = dataType;
    
    const queryString = buildQueryString(params);
    const endpoint = `/weekly${queryString ? `?${queryString}` : ''}`;
    
    return unifiedApiRequest<{
      dailyVolumes: Record<Protocol, Record<string, number>>;
      chainDistribution: Record<Protocol, Record<string, number>>;
    }>(endpoint);
  }
  
  // Chain breakdown (for EVM protocols)
  async getChainBreakdown(protocol: string, timeframe?: string): Promise<StandardApiResponse<{
    lifetimeVolume: number;
    chainBreakdown: Array<{
      chain: string;
      volume: number;
      percentage: number;
    }>;
    totalChains: number;
  }>> {
    const params: StandardQueryParams = { protocol, chain: 'evm' };
    if (timeframe) params.timeframe = timeframe as any;
    
    const queryString = buildQueryString(params);
    const endpoint = `/chain-breakdown${queryString ? `?${queryString}` : ''}`;
    
    return unifiedApiRequest<{
      lifetimeVolume: number;
      chainBreakdown: Array<{
        chain: string;
        volume: number;
        percentage: number;
      }>;
      totalChains: number;
    }>(endpoint);
  }
  
  // Trends analysis
  async getTrends(params: StandardQueryParams): Promise<StandardApiResponse<any[]>> {
    const queryString = buildQueryString(params);
    const endpoint = `/trends${queryString ? `?${queryString}` : ''}`;
    
    return unifiedApiRequest<any[]>(endpoint);
  }
  
  // Convenience methods for common use cases
  
  // Get all Solana protocols for a specific date
  async getSolanaDaily(date: Date): Promise<StandardApiResponse<Record<Protocol, ProtocolMetrics>>> {
    return this.getDailyMetrics(date, 'solana');
  }
  
  // Get all EVM protocols for a specific date
  async getEVMDaily(date: Date, dataType?: 'private' | 'public'): Promise<StandardApiResponse<Record<Protocol, ProtocolMetrics>>> {
    return this.getDailyMetrics(date, 'evm', dataType);
  }
  
  // Get EVM weekly metrics
  async getEVMWeekly(startDate: Date, endDate: Date, dataType?: 'private' | 'public'): Promise<StandardApiResponse<{
    dailyVolumes: Record<Protocol, Record<string, number>>;
    chainDistribution: Record<Protocol, Record<string, number>>;
  }>> {
    return this.getWeeklyMetrics(startDate, endDate, 'evm', dataType);
  }
  
  // Get Solana weekly metrics
  async getSolanaWeekly(startDate: Date, endDate: Date): Promise<StandardApiResponse<{
    dailyVolumes: Record<Protocol, Record<string, number>>;
    chainDistribution: Record<Protocol, Record<string, number>>;
  }>> {
    return this.getWeeklyMetrics(startDate, endDate, 'solana');
  }
  
  // Get specific protocol across all chains
  async getProtocolAllChains(protocol: string, timeframe?: string): Promise<StandardApiResponse<any>> {
    const params: StandardQueryParams = { protocol };
    if (timeframe) params.timeframe = timeframe as any;
    
    return this.getMetrics(params);
  }
  
  // Get specific chain data
  async getChainData(chain: string, timeframe?: string): Promise<StandardApiResponse<any>> {
    const params: StandardQueryParams = { chain: chain as any };
    if (timeframe) params.timeframe = timeframe as any;
    
    return this.getMetrics(params);
  }
  
  // Clear cache
  async clearCache(pattern?: string): Promise<StandardApiResponse<{ message: string; timestamp: string }>> {
    const endpoint = '/clear-cache';
    
    return unifiedApiRequest<{ message: string; timestamp: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ pattern })
    });
  }
}

// Export singleton instance
export const unifiedProtocolApi = new UnifiedProtocolApi();

// Wrapper functions to maintain backward compatibility
export const unifiedApi = {
  // Protocol metrics
  async getProtocolStats(protocolName?: string | string[], chain?: string, dataType?: string): Promise<ProtocolStats[]> {
    const params: StandardQueryParams = {};
    if (protocolName) params.protocol = protocolName;
    if (chain) params.chain = chain as any;
    if (dataType) params.dataType = dataType as any;
    
    const result = await unifiedProtocolApi.getMetrics(params);
    if (!result.success) {
      throw new UnifiedApiError(result.error || 'Failed to fetch protocol stats');
    }
    
    // Transform to legacy format if needed
    return result.data || [];
  },
  
  async getTotalProtocolStats(protocolName?: string, chain?: string, dataType?: string): Promise<ProtocolMetrics> {
    const params: StandardQueryParams = {};
    if (protocolName) params.protocol = protocolName;
    if (chain) params.chain = chain as any;
    if (dataType) params.dataType = dataType as any;
    
    const result = await unifiedProtocolApi.getMetrics(params);
    if (!result.success) {
      throw new UnifiedApiError(result.error || 'Failed to fetch total protocol stats');
    }
    
    // Aggregate the data to match legacy format
    const aggregated = result.data?.reduce((acc: ProtocolMetrics, row: any) => {
      acc.total_volume_usd += Number(row.volume_usd) || 0;
      acc.daily_users += Number(row.daily_users) || 0;
      acc.numberOfNewUsers += Number(row.new_users) || 0;
      acc.daily_trades += Number(row.trades) || 0;
      acc.total_fees_usd += Number(row.fees_usd) || 0;
      return acc;
    }, {
      total_volume_usd: 0,
      daily_users: 0,
      numberOfNewUsers: 0,
      daily_trades: 0,
      total_fees_usd: 0
    });
    
    return aggregated || {
      total_volume_usd: 0,
      daily_users: 0,
      numberOfNewUsers: 0,
      daily_trades: 0,
      total_fees_usd: 0
    };
  },
  
  async getDailyMetrics(date: Date, chain?: string, protocol?: string | string[], dataType?: string): Promise<Record<Protocol, ProtocolMetrics>> {
    const result = await unifiedProtocolApi.getDailyMetrics(date, chain || 'solana', protocol, dataType);
    if (!result.success) {
      throw new UnifiedApiError(result.error || 'Failed to fetch daily metrics');
    }
    
    return result.data || {};
  },
  
  async getEVMWeeklyMetrics(startDate: Date, endDate: Date, dataType?: 'private' | 'public'): Promise<{
    dailyVolumes: Record<Protocol, Record<string, number>>;
    chainDistribution: Record<Protocol, Record<string, number>>;
  }> {
    const result = await unifiedProtocolApi.getEVMWeekly(startDate, endDate, dataType);
    if (!result.success) {
      throw new UnifiedApiError(result.error || 'Failed to fetch EVM weekly metrics');
    }
    
    return result.data || { dailyVolumes: {}, chainDistribution: {} };
  }
};

export { UnifiedApiError };