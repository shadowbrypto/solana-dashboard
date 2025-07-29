import { format } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface LaunchpadMetrics {
  date: string;
  launchpad_name: string;
  launches: number;
  graduations: number;
  total: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

class LaunchpadApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'LaunchpadApiError';
  }
}

async function launchpadApiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}/launchpads${endpoint}`;
  
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
      throw new LaunchpadApiError(
        `API returned ${contentType || 'unknown content type'} instead of JSON. Status: ${response.status}`,
        response.status
      );
    }

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new LaunchpadApiError(
        data.error || `Request failed with status ${response.status}`,
        response.status
      );
    }

    if (!data.success) {
      throw new LaunchpadApiError(data.error || 'Request failed');
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof LaunchpadApiError) {
      throw error;
    }
    
    console.error('Network error:', error);
    throw new LaunchpadApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

export class LaunchpadApi {
  /**
   * Get launchpad metrics for a specific timeframe
   */
  static async getMetrics(params: {
    launchpad?: string;
    startDate?: string;
    endDate?: string;
    timeframe?: '7d' | '30d' | '90d' | '3m' | '6m' | '1y' | 'all';
    all?: boolean;
  }): Promise<LaunchpadMetrics[]> {
    const queryParams = new URLSearchParams();
    
    if (params.launchpad) queryParams.set('launchpad', params.launchpad);
    if (params.startDate) queryParams.set('startDate', params.startDate);
    if (params.endDate) queryParams.set('endDate', params.endDate);
    if (params.timeframe) queryParams.set('timeframe', params.timeframe);
    if (params.all) queryParams.set('all', 'true');

    const endpoint = `/metrics?${queryParams.toString()}`;
    return launchpadApiRequest<LaunchpadMetrics[]>(endpoint);
  }

  /**
   * Get daily metrics for a specific launchpad
   */
  static async getDailyMetrics(launchpad: string, date?: Date): Promise<LaunchpadMetrics> {
    const queryParams = new URLSearchParams();
    if (date) {
      queryParams.set('date', format(date, 'yyyy-MM-dd'));
    }
    
    const endpoint = `/daily/${launchpad}?${queryParams.toString()}`;
    return launchpadApiRequest<LaunchpadMetrics>(endpoint);
  }

  /**
   * Get list of available launchpads
   */
  static async getLaunchpadsList(): Promise<string[]> {
    return launchpadApiRequest<string[]>('/list');
  }

  /**
   * Clear API cache (useful for development)
   */
  static async clearCache(): Promise<void> {
    await launchpadApiRequest<void>('/clear-cache', {
      method: 'POST'
    });
  }
}

export { LaunchpadApiError };