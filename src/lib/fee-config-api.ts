import { API_BASE_URL } from './api';

export interface ProtocolFeeConfig {
  [protocolId: string]: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class FeeConfigApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'FeeConfigApiError';
  }
}

/**
 * Fetch all protocol fee configurations from the API
 * @returns Promise resolving to fee configuration object
 */
export async function fetchFeeConfig(): Promise<ProtocolFeeConfig> {
  const url = `${API_BASE_URL}/fee-config`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', { url, status: response.status, contentType, text: text.substring(0, 200) });
      throw new FeeConfigApiError(
        `API returned ${contentType || 'unknown content type'} instead of JSON. Status: ${response.status}`,
        response.status
      );
    }

    const result: ApiResponse<ProtocolFeeConfig> = await response.json();

    if (!response.ok) {
      throw new FeeConfigApiError(
        result.error || result.message || `API request failed with status ${response.status}`,
        response.status
      );
    }

    if (!result.success || !result.data) {
      throw new FeeConfigApiError(result.error || 'API returned unsuccessful response');
    }

    return result.data;
  } catch (error) {
    if (error instanceof FeeConfigApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new FeeConfigApiError('Network error: Unable to connect to API server. Please check if the server is running.');
    }

    throw new FeeConfigApiError(
      error instanceof Error ? error.message : 'Unknown error occurred while fetching fee config'
    );
  }
}

/**
 * Get fee for a specific protocol
 * @param protocolId - Protocol identifier
 * @returns Fee string (e.g., "1.0%") or "N/A" if not configured
 */
export async function fetchProtocolFee(protocolId: string): Promise<string> {
  const url = `${API_BASE_URL}/fee-config/${protocolId}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result: ApiResponse<{ protocolId: string; fee: string }> = await response.json();

    if (!response.ok || !result.success || !result.data) {
      throw new FeeConfigApiError(result.error || 'Failed to fetch protocol fee');
    }

    return result.data.fee;
  } catch (error) {
    console.error('Error fetching protocol fee:', error);
    return 'N/A';
  }
}

/**
 * Helper function to get fee for a protocol from config object
 * @param config - Protocol fee configuration object
 * @param protocolId - Protocol identifier
 * @returns Fee string or "N/A" if not found
 */
export function getProtocolFee(config: ProtocolFeeConfig, protocolId: string): string {
  return config[protocolId.toLowerCase()] || 'N/A';
}
