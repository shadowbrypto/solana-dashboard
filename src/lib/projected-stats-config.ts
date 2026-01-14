/**
 * Projected Stats Configuration (Frontend)
 *
 * This file fetches the configuration from the backend API, making the server
 * the single source of truth for Dune query IDs.
 *
 * The config is cached after the first fetch to avoid repeated API calls.
 */

import { API_BASE_URL } from './api';

interface DuneQueryConfig {
  [protocolId: string]: string;
}

interface ProjectedStatsConfig {
  queryIds: DuneQueryConfig;
  protocolsWithValidIds: string[];
}

// Cached config from backend
let cachedConfig: ProjectedStatsConfig | null = null;
let fetchPromise: Promise<ProjectedStatsConfig> | null = null;

/**
 * Fetch the projected stats config from the backend
 * This is the single source of truth for Dune query IDs
 */
async function fetchConfig(): Promise<ProjectedStatsConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  // If a fetch is already in progress, wait for it
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projected-stats/config`);
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }
      cachedConfig = await response.json();
      return cachedConfig!;
    } catch (error) {
      console.warn('[projected-stats-config] Failed to fetch config from backend, using fallback:', error);
      // Fallback to empty config if backend is unavailable
      cachedConfig = { queryIds: {}, protocolsWithValidIds: [] };
      return cachedConfig;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Get Dune query IDs (synchronous, uses cached value)
 * Call loadProjectedStatsConfig() first to ensure config is loaded
 */
export function getDuneQueryIds(): DuneQueryConfig {
  return cachedConfig?.queryIds || {};
}

/**
 * Load the projected stats config from the backend
 * Call this once during app initialization
 */
export async function loadProjectedStatsConfig(): Promise<void> {
  await fetchConfig();
}

/**
 * Get Dune query ID for a specific protocol
 * @param protocolId - The protocol identifier
 * @returns The Dune query ID or null if not found
 */
export function getDuneQueryId(protocolId: string): string | null {
  const queryIds = getDuneQueryIds();
  return queryIds[protocolId] || null;
}

/**
 * Check if a protocol has a valid Dune query ID
 * @param protocolId - The protocol identifier
 * @returns True if the protocol has a valid Dune query ID
 */
export function hasValidDuneQueryId(protocolId: string): boolean {
  const queryId = getDuneQueryId(protocolId);
  return queryId != null && queryId !== '';
}

/**
 * Get all protocols that have valid Dune query IDs
 * @returns Array of protocol IDs that have valid Dune query IDs
 */
export function getProtocolsWithValidDuneIds(): string[] {
  return cachedConfig?.protocolsWithValidIds || [];
}

/**
 * Get protocols with their corresponding Dune query IDs
 * Only includes protocols with valid (non-placeholder) query IDs
 */
export function getValidDuneQueryMappings(): { protocolId: string; duneQueryId: string }[] {
  const queryIds = getDuneQueryIds();
  return Object.entries(queryIds)
    .filter(([_, queryId]) => queryId !== '')
    .map(([protocolId, duneQueryId]) => ({ protocolId, duneQueryId }));
}

// Legacy export for backwards compatibility
export const DUNE_QUERY_IDS: DuneQueryConfig = new Proxy({} as DuneQueryConfig, {
  get(_, prop: string) {
    const queryIds = getDuneQueryIds();
    return queryIds[prop];
  },
  ownKeys() {
    return Object.keys(getDuneQueryIds());
  },
  getOwnPropertyDescriptor(_, prop: string) {
    const queryIds = getDuneQueryIds();
    if (prop in queryIds) {
      return { enumerable: true, configurable: true, value: queryIds[prop] };
    }
    return undefined;
  }
});
