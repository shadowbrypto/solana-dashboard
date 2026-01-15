/**
 * Centralized cache management for the analytics app
 * Provides consistent caching behavior and cache invalidation
 */

import { CACHE_TTL } from './cache-config';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

class CacheManager {
  private caches = new Map<string, Map<string, CacheEntry<any>>>();
  private defaultTTL = CACHE_TTL.DEFAULT;

  /**
   * Get or create a cache namespace
   */
  private getCache(namespace: string): Map<string, CacheEntry<any>> {
    if (!this.caches.has(namespace)) {
      this.caches.set(namespace, new Map());
    }
    return this.caches.get(namespace)!;
  }

  /**
   * Set a cache entry
   */
  set<T>(namespace: string, key: string, data: T, options: CacheOptions = {}): void {
    const cache = this.getCache(namespace);
    const ttl = options.ttl || this.defaultTTL;
    const now = Date.now();
    
    cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  }

  /**
   * Get a cache entry if valid
   */
  get<T>(namespace: string, key: string): T | null {
    const cache = this.getCache(namespace);
    const entry = cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if a cache entry exists and is valid
   */
  has(namespace: string, key: string): boolean {
    return this.get(namespace, key) !== null;
  }

  /**
   * Clear a specific cache entry
   */
  delete(namespace: string, key: string): void {
    const cache = this.getCache(namespace);
    cache.delete(key);
  }

  /**
   * Clear all entries in a namespace
   */
  clearNamespace(namespace: string): void {
    const cache = this.getCache(namespace);
    cache.clear();
    console.log(`Cache namespace '${namespace}' cleared`);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.clear();
    console.log('All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): Record<string, { entries: number; totalSize: number }> {
    const stats: Record<string, { entries: number; totalSize: number }> = {};
    
    this.caches.forEach((cache, namespace) => {
      let totalSize = 0;
      cache.forEach(entry => {
        try {
          totalSize += JSON.stringify(entry.data).length;
        } catch {
          totalSize += 100; // Estimate for non-serializable data
        }
      });
      
      stats[namespace] = {
        entries: cache.size,
        totalSize
      };
    });
    
    return stats;
  }

  /**
   * Clean expired entries from all caches
   */
  cleanExpired(): void {
    const now = Date.now();
    let totalCleaned = 0;
    
    this.caches.forEach((cache, namespace) => {
      const keysToDelete: string[] = [];
      
      cache.forEach((entry, key) => {
        if (now > entry.expiresAt) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => cache.delete(key));
      totalCleaned += keysToDelete.length;
    });
    
    if (totalCleaned > 0) {
      console.log(`Cleaned ${totalCleaned} expired cache entries`);
    }
  }

  /**
   * Set default TTL for new cache entries
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * Reset all caches and settings (useful after data refresh)
   */
  reset(): void {
    this.clearAll();
    this.defaultTTL = CACHE_TTL.DEFAULT; // Reset to default from config
    console.log('Cache manager reset to default state');
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Namespace constants for consistent usage
export const CACHE_NAMESPACES = {
  PROTOCOL_STATS: 'protocol-stats',
  DAILY_METRICS: 'daily-metrics',
  MONTHLY_METRICS: 'monthly-metrics',
  WEEKLY_METRICS: 'weekly-metrics',
  TOTAL_STATS: 'total-stats',
  AGGREGATED_STATS: 'aggregated-stats',
  LAUNCHPAD_DATA: 'launchpad-data',
  EVM_DATA: 'evm-data'
} as const;

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  cacheManager.cleanExpired();
}, 5 * 60 * 1000);