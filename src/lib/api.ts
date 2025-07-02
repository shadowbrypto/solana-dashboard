import { ProtocolStats, ProtocolMetrics, Protocol } from '../types/protocol';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Debug log for deployment troubleshooting
console.log('Environment variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL,
  mode: import.meta.env.MODE,
  prod: import.meta.env.PROD
});

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || data.message || `HTTP ${response.status}`,
        response.status
      );
    }

    if (!data.success) {
      throw new ApiError(data.error || 'API request failed');
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or parsing error
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

export const protocolApi = {
  // Get protocol stats with optional filtering
  async getProtocolStats(protocolName?: string | string[]): Promise<ProtocolStats[]> {
    let endpoint = '/protocols/stats';
    
    if (protocolName) {
      const protocols = Array.isArray(protocolName) ? protocolName.join(',') : protocolName;
      endpoint += `?protocol=${encodeURIComponent(protocols)}`;
    }
    
    return apiRequest<ProtocolStats[]>(endpoint);
  },

  // Get total protocol stats with optional filtering
  async getTotalProtocolStats(protocolName?: string): Promise<ProtocolMetrics> {
    let endpoint = '/protocols/total-stats';
    
    if (protocolName) {
      endpoint += `?protocol=${encodeURIComponent(protocolName)}`;
    }
    
    return apiRequest<ProtocolMetrics>(endpoint);
  },

  // Get daily metrics for a specific date
  async getDailyMetrics(date: Date): Promise<Record<Protocol, ProtocolMetrics>> {
    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const endpoint = `/protocols/daily-metrics?date=${dateStr}`;
    
    return apiRequest<Record<Protocol, ProtocolMetrics>>(endpoint);
  },

  // Get aggregated stats for all protocols (optimized for "all" view)
  async getAggregatedProtocolStats(): Promise<any[]> {
    return apiRequest<any[]>('/protocols/aggregated-stats');
  },

  // Health check
  async healthCheck(): Promise<{ message: string; timestamp: string }> {
    return apiRequest<{ message: string; timestamp: string }>('/protocols/health');
  }
};

export const dataSyncApi = {
  // Sync data from Dune API to database
  async syncData(): Promise<{ csvFilesFetched: number; timestamp: string }> {
    return apiRequest<{ csvFilesFetched: number; timestamp: string }>('/data-update/sync', {
      method: 'POST'
    });
  },

  // Get sync status
  async getSyncStatus(): Promise<{ 
    lastSync: string | null; 
    csvFilesCount: number; 
    csvFiles: string[];
    message?: string;
    hasCurrentData: boolean;
    missingProtocols?: string[];
  }> {
    return apiRequest<{ 
      lastSync: string | null; 
      csvFilesCount: number; 
      csvFiles: string[];
      message?: string;
      hasCurrentData: boolean;
      missingProtocols?: string[];
    }>('/data-update/status');
  },

  // Sync data for a specific protocol
  async syncProtocolData(protocolName: string): Promise<{
    message: string;
    data: {
      protocol: string;
      rowsImported: number;
      timestamp: string;
    };
  }> {
    return apiRequest<{
      message: string;
      data: {
        protocol: string;
        rowsImported: number;
        timestamp: string;
      };
    }>(`/data-update/sync/${protocolName}`, {
      method: 'POST'
    });
  }
};

export { ApiError };
