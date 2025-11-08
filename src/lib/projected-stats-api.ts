const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ProjectedStatsData {
  id?: number;
  protocol_name: string;
  formatted_day: string;
  fees_sol: number;
  volume_sol: number;
  fees_usd: number;
  volume_usd: number;
  created_at?: string;
  updated_at?: string;
}

export class ProjectedStatsApi {
  /**
   * Get projected stats with optional filters
   */
  static async getProjectedStats(
    protocols?: string[],
    startDate?: string,
    endDate?: string
  ): Promise<ProjectedStatsData[]> {
    try {
      const params = new URLSearchParams();
      
      if (protocols && protocols.length > 0) {
        params.append('protocols', protocols.join(','));
      }
      
      if (startDate) {
        params.append('startDate', startDate);
      }
      
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(
        `${API_BASE_URL}/projected-stats?${params.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch projected stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching projected stats:', error);
      throw error;
    }
  }

  /**
   * Get projected stats for a specific date
   */
  static async getProjectedStatsForDate(date: string): Promise<ProjectedStatsData[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/projected-stats/date/${date}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch projected stats for date: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching projected stats for date:', error);
      throw error;
    }
  }

  /**
   * Get latest projected volumes for all protocols
   */
  static async getLatestProjectedVolumes(): Promise<Record<string, number>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/projected-stats/latest-volumes`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch latest projected volumes: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching latest projected volumes:', error);
      throw error;
    }
  }

  /**
   * Get aggregated monthly projected volumes for all protocols from backend
   */
  static async getMonthlyProjectedVolumes(year: number, month: number): Promise<Record<string, number>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/projected-stats/monthly/${year}/${month}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch monthly projected volumes: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching monthly projected volumes:', error);
      throw error;
    }
  }

  /**
   * Trigger update of projected data from Dune
   */
  static async updateProjectedData(): Promise<{ successCount: number; totalCount: number; protocols: string[] }> {
    try {
      const url = `${API_BASE_URL}/projected-stats/update`;
      console.log('[ProjectedStatsApi] Calling updateProjectedData...');
      console.log('[ProjectedStatsApi] URL:', url);
      console.log('[ProjectedStatsApi] API_BASE_URL:', API_BASE_URL);

      const response = await fetch(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[ProjectedStatsApi] Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `Failed to update projected data: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.details) {
            errorMessage = errorData.details;
          }
        } catch (e) {
          // If response is not JSON, use default error message
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[ProjectedStatsApi] Update successful:', result);
      return result;
    } catch (error) {
      console.error('Error updating projected data:', error);
      // Log more details about the error
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error - check CORS or API URL:', API_BASE_URL);
      }
      throw error;
    }
  }
}