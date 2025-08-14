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
   * Trigger update of projected data from Dune
   */
  static async updateProjectedData(): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/projected-stats/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update projected data: ${response.statusText}`);
      }

      await response.json();
    } catch (error) {
      console.error('Error updating projected data:', error);
      throw error;
    }
  }
}