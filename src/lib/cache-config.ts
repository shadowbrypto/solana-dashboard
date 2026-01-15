/**
 * Centralized Cache Configuration
 *
 * All cache TTL values are defined here as a single source of truth.
 * This ensures consistency across the application and makes it easy
 * to adjust caching behavior.
 */

// Time constants (in milliseconds)
export const SECONDS = 1000;
export const MINUTES = 60 * SECONDS;
export const HOURS = 60 * MINUTES;

/**
 * Cache TTL configuration for different data types
 *
 * Guidelines:
 * - Frequently changing data (dashboard stats): 1-5 minutes
 * - Semi-static data (protocol metrics): 5-15 minutes
 * - Rarely changing data (trader stats): 1-4 hours
 */
export const CACHE_TTL = {
  // Dashboard and real-time data - refresh frequently
  DASHBOARD_STATS: 1 * MINUTES,

  // Protocol metrics - moderate refresh
  PROTOCOL_STATS: 5 * MINUTES,
  DAILY_METRICS: 5 * MINUTES,
  AGGREGATED_STATS: 5 * MINUTES,
  TOTAL_STATS: 5 * MINUTES,

  // Launchpad data - moderate refresh
  LAUNCHPAD_DATA: 5 * MINUTES,

  // Trader stats - slower refresh (expensive queries)
  TRADER_STATS: 5 * MINUTES,
  TRADER_PERCENTILES: 4 * HOURS,

  // Default fallback
  DEFAULT: 5 * MINUTES,
} as const;

/**
 * Get a human-readable description of cache duration
 */
export function formatCacheDuration(ms: number): string {
  if (ms >= HOURS) {
    return `${ms / HOURS} hour(s)`;
  }
  if (ms >= MINUTES) {
    return `${ms / MINUTES} minute(s)`;
  }
  return `${ms / SECONDS} second(s)`;
}
