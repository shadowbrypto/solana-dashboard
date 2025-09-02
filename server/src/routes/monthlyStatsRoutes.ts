import express from 'express';
import { MonthlyStatsService } from '../services/monthlyStatsService.js';

const router = express.Router();

// Cache for monthly stats (1 hour)
const monthlyStatsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * GET /api/monthly-stats/:year/:month
 * Get monthly statistics for all protocols
 * 
 * Query parameters:
 * - chain: 'solana' | 'evm' (default: 'solana')
 * - dataType: 'public' | 'private' (default: 'public')
 */
router.get('/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const { chain = 'solana', dataType = 'public' } = req.query;

    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ error: 'Invalid year parameter' });
    }
    
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid month parameter' });
    }

    if (!['solana', 'evm'].includes(chain as string)) {
      return res.status(400).json({ error: 'Invalid chain parameter. Must be solana or evm' });
    }

    if (!['public', 'private'].includes(dataType as string)) {
      return res.status(400).json({ error: 'Invalid dataType parameter. Must be public or private' });
    }

    // Create cache key
    const cacheKey = `${year}-${month}-${chain}-${dataType}`;
    
    // Check cache
    const cached = monthlyStatsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Monthly Stats API: Cache hit for ${cacheKey}`);
      return res.json(cached.data);
    }

    // Create date object (end of month for consistency)
    const date = new Date(yearNum, monthNum - 1, 1);
    const endOfMonth = new Date(yearNum, monthNum, 0); // Last day of the month

    console.log(`Monthly Stats API: Fetching stats for ${year}-${month.padStart(2, '0')} (${chain}/${dataType})`);

    // Fetch data
    const stats = await MonthlyStatsService.getMonthlyStats(
      endOfMonth,
      chain as string,
      dataType as string
    );

    // Cache the result
    monthlyStatsCache.set(cacheKey, {
      data: stats,
      timestamp: Date.now()
    });

    // Clean up old cache entries (keep only last 10 entries)
    if (monthlyStatsCache.size > 10) {
      const entries = Array.from(monthlyStatsCache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      monthlyStatsCache.clear();
      entries.slice(0, 10).forEach(([key, value]) => {
        monthlyStatsCache.set(key, value);
      });
    }

    console.log(`Monthly Stats API: Successfully processed ${Object.keys(stats.protocols).length} protocols`);

    res.json(stats);
  } catch (error) {
    console.error('Monthly Stats API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch monthly statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monthly-stats/cache/clear
 * Clear the monthly stats cache (useful for debugging)
 */
router.get('/cache/clear', (req, res) => {
  monthlyStatsCache.clear();
  res.json({ message: 'Monthly stats cache cleared successfully' });
});

/**
 * GET /api/monthly-stats/cache/status
 * Get cache status information
 */
router.get('/cache/status', (req, res) => {
  const cacheEntries = Array.from(monthlyStatsCache.entries()).map(([key, value]) => ({
    key,
    age: Date.now() - value.timestamp,
    protocols: Object.keys(value.data.protocols || {}).length
  }));

  res.json({
    cacheSize: monthlyStatsCache.size,
    entries: cacheEntries
  });
});

export default router;