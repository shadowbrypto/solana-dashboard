import { ProtocolStats, ProtocolMetrics, Protocol } from '../types/protocol';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const endpoint = `/protocols/daily-metrics?date=${dateStr}`;
    
    return apiRequest<Record<Protocol, ProtocolMetrics>>(endpoint);
  },

  // Health check
  async healthCheck(): Promise<{ message: string; timestamp: string }> {
    return apiRequest<{ message: string; timestamp: string }>('/protocols/health');
  }
};

export { ApiError };
