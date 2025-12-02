import express from 'express';
import { db } from '../lib/db.js';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const router = express.Router();

// Cache for launchpad data
const launchpadCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_EXPIRY = 30 * 1000; // 30 seconds cache

function isCacheValid(cacheEntry: { data: any; timestamp: number }): boolean {
  return Date.now() - cacheEntry.timestamp < CACHE_EXPIRY;
}

// Get launchpad metrics for a specific date range
router.get('/metrics', async (req, res) => {
  try {
    const { 
      launchpad, 
      startDate, 
      endDate, 
      timeframe,
      all = 'false'
    } = req.query;

    const cacheKey = `metrics_${launchpad}_${startDate}_${endDate}_${timeframe}_${all}`;
    const cachedData = launchpadCache.get(cacheKey);

    if (cachedData && isCacheValid(cachedData)) {
      return res.json({
        success: true,
        data: cachedData.data,
        cached: true
      });
    }

    // Build query conditions
    const conditions: string[] = [];
    const params: any[] = [];

    // Apply launchpad filter
    if (launchpad && launchpad !== 'all') {
      conditions.push('launchpad_name = ?');
      params.push(launchpad);
    }

    // Apply date range - fetch all data if all=true, otherwise apply timeframe/date filters
    if (all === 'true') {
      // Fetch all data without date restrictions for lifetime metrics
      console.log('Fetching all launchpad data for lifetime metrics');
    } else if (startDate && endDate) {
      conditions.push('date >= ? AND date <= ?');
      params.push(startDate, endDate);
    } else if (timeframe) {
      const endDateCalc = new Date();
      const startDateCalc = new Date();

      switch (timeframe) {
        case '7d':
          startDateCalc.setDate(startDateCalc.getDate() - 7);
          break;
        case '30d':
          startDateCalc.setDate(startDateCalc.getDate() - 30);
          break;
        case '90d':
          startDateCalc.setDate(startDateCalc.getDate() - 90);
          break;
        case '3m':
          startDateCalc.setMonth(startDateCalc.getMonth() - 3);
          break;
        case '6m':
          startDateCalc.setMonth(startDateCalc.getMonth() - 6);
          break;
        case '1y':
          startDateCalc.setFullYear(startDateCalc.getFullYear() - 1);
          break;
        case 'all':
          // Fetch all available data
          break;
        default:
          startDateCalc.setDate(startDateCalc.getDate() - 30);
      }

      if (timeframe !== 'all') {
        conditions.push('date >= ? AND date <= ?');
        params.push(format(startDateCalc, 'yyyy-MM-dd'), format(endDateCalc, 'yyyy-MM-dd'));
      }
    }

    // Build and execute query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM launchpad_stats ${whereClause} ORDER BY date ASC`;

    const allData = await db.query<{
      date: string;
      launchpad_name: string;
      launches: number;
      graduations: number;
    }>(sql, params);

    console.log(`Fetched ${allData.length} launchpad records for ${launchpad || 'all'} with timeframe ${timeframe || 'default'}`);

    // Process data for frontend consumption
    const processedData = allData.map(row => ({
      date: row.date,
      launchpad_name: row.launchpad_name,
      launches: parseInt(row.launches) || 0,
      graduations: parseInt(row.graduations) || 0,
      total: (parseInt(row.launches) || 0) + (parseInt(row.graduations) || 0)
    }));

    // Filter out data for the current calendar date (as it might have incomplete data)
    if (processedData.length > 0) {
      // Get the current date in the same format as the data
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const filteredData = processedData.filter(item => item.date < currentDate);
      
      console.log(`LaunchpadAPI: Filtering out data for current date ${currentDate} and beyond. Records: ${processedData.length} -> ${filteredData.length}`);
      
      // Use filtered data if we still have records, otherwise keep original data
      const finalData = filteredData.length > 0 ? filteredData : processedData;

      // Cache the result
      launchpadCache.set(cacheKey, {
        data: finalData,
        timestamp: Date.now()
      });

      res.json({
        success: true,
        data: finalData,
        cached: false
      });
    } else {
      // No data to filter
      launchpadCache.set(cacheKey, {
        data: processedData,
        timestamp: Date.now()
      });

      res.json({
        success: true,
        data: processedData,
        cached: false
      });
    }

  } catch (error) {
    console.error('Error fetching launchpad metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get daily metrics for a specific launchpad and date
router.get('/daily/:launchpad', async (req, res) => {
  try {
    const { launchpad } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    const cacheKey = `daily_${launchpad}_${dateStr}`;
    const cachedData = launchpadCache.get(cacheKey);

    if (cachedData && isCacheValid(cachedData)) {
      return res.json({
        success: true,
        data: cachedData.data,
        cached: true
      });
    }

    const data = await db.query<{
      date: string;
      launchpad_name: string;
      launches: number;
      graduations: number;
    }>(`
      SELECT * FROM launchpad_stats
      WHERE launchpad_name = ? AND date = ?
      LIMIT 1
    `, [launchpad, dateStr]);

    const row = data[0];
    const result = row ? {
      date: row.date,
      launchpad_name: row.launchpad_name,
      launches: Number(row.launches) || 0,
      graduations: Number(row.graduations) || 0,
      total: (Number(row.launches) || 0) + (Number(row.graduations) || 0)
    } : {
      date: dateStr,
      launchpad_name: launchpad,
      launches: 0,
      graduations: 0,
      total: 0
    };

    // Cache the result
    launchpadCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: result,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching daily launchpad metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available launchpads
router.get('/list', async (req, res) => {
  try {
    const cacheKey = 'launchpads_list';
    const cachedData = launchpadCache.get(cacheKey);

    if (cachedData && isCacheValid(cachedData)) {
      return res.json({
        success: true,
        data: cachedData.data,
        cached: true
      });
    }

    const data = await db.query<{ launchpad_name: string }>(`
      SELECT DISTINCT launchpad_name FROM launchpad_stats
    `);

    const launchpads = data.map(row => row.launchpad_name);

    // Cache the result
    launchpadCache.set(cacheKey, {
      data: launchpads,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: launchpads,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching launchpads list:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get latest data dates for all launchpads
router.get('/latest-dates', async (req, res) => {
  try {
    const cacheKey = 'latest_dates';
    const cachedData = launchpadCache.get(cacheKey);

    if (cachedData && isCacheValid(cachedData)) {
      return res.json({
        success: true,
        data: cachedData.data,
        cached: true
      });
    }

    // Get the latest date for each launchpad using SQL GROUP BY
    const data = await db.query<{
      launchpad_name: string;
      latest_date: string;
    }>(`
      SELECT launchpad_name, MAX(date) as latest_date
      FROM launchpad_stats
      GROUP BY launchpad_name
    `);

    // Calculate days behind for each launchpad
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const result = data.map(row => {
      const latestDate = new Date(row.latest_date);
      latestDate.setHours(0, 0, 0, 0);

      // Calculate days behind
      const timeDiff = currentDate.getTime() - latestDate.getTime();
      const daysBehind = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      return {
        launchpad_name: row.launchpad_name,
        latest_date: row.latest_date,
        is_current: daysBehind <= 1, // Consider current if within 1 day
        days_behind: Math.max(0, daysBehind)
      };
    });

    // Cache the result
    launchpadCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: result,
      cached: false
    });

  } catch (error) {
    console.error('Error fetching launchpad latest dates:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear cache endpoint (useful for development)
router.post('/clear-cache', (req, res) => {
  launchpadCache.clear();
  res.json({
    success: true,
    message: 'Launchpad cache cleared'
  });
});

export { router as launchpadRoutes };