import express, { Request, Response } from 'express';
import TraderStatsService from '../services/traderStatsService.js';
import DuneTraderStatsService from '../services/duneTraderStatsService.js';
import { supabase } from '../lib/supabase.js';
import { format, parseISO, isValid } from 'date-fns';

const router = express.Router();

// Get trader stats for a specific protocol with pagination
router.get('/protocol/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { page = 1, limit = 20, all } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    console.log(`Request for ${protocol}: page=${page}, limit=${limit}, all=${all}`);

    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page and limit must be positive numbers'
      });
    }

    // Get total count first
    const total = await TraderStatsService.getTraderStatsCount(protocol);
    console.log(`Total ${protocol} traders: ${total}`);

    if (all === 'true') {
      // Return all data for statistics calculations
      console.log(`Fetching all ${total} records for ${protocol} statistics`);
      const allData = await TraderStatsService.getTraderStatsPaginated(
        protocol,
        0,
        total // Get all records
      );

      console.log(`Retrieved ${allData.length} records for volume calculation`);

      // Calculate total volume
      const totalVolume = allData.reduce((sum, trader) => {
        const volume = parseFloat(trader.volume_usd?.toString() || '0');
        return sum + (isNaN(volume) ? 0 : volume);
      }, 0);

      console.log(`Calculated total volume: $${totalVolume.toLocaleString()}`);

      res.json({
        success: true,
        data: allData,
        total,
        totalVolume,
        page: 1,
        limit: total,
        totalPages: 1
      });
    } else {
      // Calculate offset for pagination
      const offset = (pageNum - 1) * limitNum;

      console.log(`Fetching paginated data: offset=${offset}, limit=${limitNum}`);
      
      // Get total volume for volume share calculations
      const totalVolume = await TraderStatsService.getTotalVolumeForProtocol(protocol);
      
      // Get paginated data
      const data = await TraderStatsService.getTraderStatsPaginated(
        protocol,
        offset,
        limitNum
      );

      // Add volume share calculations to each trader
      const dataWithVolumeShare = data.map((trader, index) => ({
        ...trader,
        rank: offset + index + 1,
        volumeShare: totalVolume > 0 ? ((parseFloat(trader.volume_usd?.toString() || '0') / totalVolume) * 100) : 0
      }));

      console.log(`Retrieved ${data.length} paginated records with volume share`);

      res.json({
        success: true,
        data: dataWithVolumeShare,
        total,
        totalVolume,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    }
  } catch (error) {
    console.error('Error fetching trader stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trader stats'
    });
  }
});

// In-memory cache for percentile calculations
const percentileCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// Comprehensive cache for all trader stats data
const comprehensiveCache = new Map<string, { data: any, timestamp: number }>();
const COMPREHENSIVE_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// Progress tracking for loading states
const progressCache = new Map<string, any>();
// Comprehensive endpoint that provides calculated metrics with lazy loading
router.get('/comprehensive/:protocol', async (req: Request, res: Response) => {
  const { protocol } = req.params;
  
  try {
    const { page = 1, limit = 10, clearCache } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 500); // Cap initial load at 500
    
    console.log(`📊 Comprehensive request for ${protocol} - page ${pageNum}, limit ${limitNum}`);
    
    // Check cache first (unless clearCache is requested)
    const cacheKey = `comprehensive_metrics_${protocol}`;
    const progressKey = `loading_${protocol}`;
    const cached = clearCache ? null : comprehensiveCache.get(cacheKey);
    const now = Date.now();
    
    // Initialize progress tracking
    progressCache.set(progressKey, {
      isLoading: true,
      step: 'Initializing trader analysis...',
      percentage: 5,
      startTime: now,
      totalSteps: 10,
      currentStep: 1,
      processedCount: 0,
      totalCount: 0
    });
    
    // Get total count and volume (lightweight operations)
    progressCache.set(progressKey, {
      isLoading: true,
      step: 'Counting traders in database...',
      percentage: 10,
      startTime: now,
      totalSteps: 10,
      currentStep: 2,
      processedCount: 0,
      totalCount: 0
    });
    
    const total = await TraderStatsService.getTraderStatsCount(protocol);
    console.log(`Found ${total} traders for ${protocol}`);
    
    // Update progress with total count
    progressCache.set(progressKey, {
      isLoading: true,
      step: 'Preparing data analysis...',
      percentage: 20,
      startTime: now,
      totalSteps: 10,
      currentStep: 3,
      processedCount: 0,
      totalCount: total
    });
    
    if (total === 0) {
      return res.json({
        success: true,
        data: {
          metrics: {
            totalTraders: 0,
            totalVolume: 0,
            avgVolumePerTrader: 0,
            top1PercentVolume: 0,
            top5PercentVolume: 0,
            percentile99Volume: 0,
            percentile95Volume: 0,
            top1PercentShare: 0,
            top5PercentShare: 0
          },
          rankData: [],
          percentileBrackets: [],
          pagination: {
            currentPage: pageNum,
            pageSize: limitNum,
            totalItems: 0,
            totalPages: 0
          }
        },
        cached: false
      });
    }
    
    let metrics: any, percentileBrackets: any[], totalVolume: number;
    
    // Check if we have cached metrics (expensive calculations)
    if (cached && (now - cached.timestamp < COMPREHENSIVE_CACHE_DURATION)) {
      const cacheAge = Math.round((now - cached.timestamp) / 1000 / 60);
      console.log(`✅ Using cached metrics for ${protocol} (${cacheAge} minutes old)`);
      metrics = cached.data.metrics;
      percentileBrackets = cached.data.percentileBrackets;
      totalVolume = cached.data.totalVolume;
      
      // Clear progress since we're using cached data
      progressCache.delete(progressKey);
    } else {
      console.log(`🔄 Calculating comprehensive metrics for ${protocol}...`);
      
      // Update progress for calculation phase
      const processedAt30 = Math.floor(total * 0.3); // Show 30% processed
      progressCache.set(progressKey, {
        isLoading: true,
        step: 'Calculating total volume...',
        percentage: 30,
        startTime: now,
        totalSteps: 10,
        currentStep: 4,
        processedCount: processedAt30,
        totalCount: total
      });
      
      try {
        
        // Fetch ALL traders to get accurate statistics (no sampling)
        console.log(`Fetching all ${total} traders for accurate percentile calculations...`);
        
        // Update progress for trader data fetch
        const processedAt40 = Math.floor(total * 0.4); // Show 40% processed
        progressCache.set(progressKey, {
          isLoading: true,
          step: `Fetching all ${total} traders for accurate calculations...`,
          percentage: 40,
          startTime: now,
          totalSteps: 10,
          currentStep: 5,
          processedCount: processedAt40,
          totalCount: total,
          fetchingCount: total
        });
        
        // Fetch ALL traders using paginated queries
        const allTradersData = await TraderStatsService.getTraderStatsPaginated(protocol, 0, total);
        console.log(`Fetched ${allTradersData.length} traders for calculation`);
        
        // Step 6: Progress after fetching trader data
        const currentProcessed = Math.floor(total * 0.5); // Show 50% of records processed at this step
        progressCache.set(progressKey, {
          isLoading: true,
          step: 'Processing trader records...',
          percentage: 50,
          startTime: now,
          totalSteps: 10,
          currentStep: 6,
          processedCount: currentProcessed,
          totalCount: total,
          fetchingCount: total
        });
        
        totalVolume = await TraderStatsService.getTotalVolumeForProtocol(protocol);
        console.log(`Total volume: $${totalVolume.toLocaleString()}`);
        
        // Step 7: Volume calculation complete
        const processedAt60 = Math.floor(total * 0.6); // Show 60% of records processed
        progressCache.set(progressKey, {
          isLoading: true,
          step: 'Computing volume metrics...',
          percentage: 60,
          startTime: now,
          totalSteps: 10,
          currentStep: 7,
          processedCount: processedAt60,
          totalCount: total,
          fetchingCount: total
        });
        
        // Step 8: Calculate key metrics
        const processedAt70 = Math.floor(total * 0.7); // Show 70% of records processed
        progressCache.set(progressKey, {
          isLoading: true,
          step: 'Calculating percentiles...',
          percentage: 70,
          startTime: now,
          totalSteps: 10,
          currentStep: 8,
          processedCount: processedAt70,
          totalCount: total,
          fetchingCount: total
        });
        
        // Calculate metrics using ALL trader data for accuracy
        const avgVolumePerTrader = total > 0 ? totalVolume / total : 0;
        const top1Count = Math.floor(0.01 * total);
        const top5Count = Math.floor(0.05 * total);
        
        const top1Volume = allTradersData.slice(0, Math.min(top1Count, allTradersData.length)).reduce((sum, trader) => {
          return sum + parseFloat(trader.volume_usd?.toString() || '0');
        }, 0);
        
        const top5Volume = allTradersData.slice(0, Math.min(top5Count, allTradersData.length)).reduce((sum, trader) => {
          return sum + parseFloat(trader.volume_usd?.toString() || '0');
        }, 0);
        
        const percentile99Volume = allTradersData[Math.min(top1Count - 1, allTradersData.length - 1)] ? 
          parseFloat(allTradersData[Math.min(top1Count - 1, allTradersData.length - 1)].volume_usd?.toString() || '0') : 0;
        const percentile95Volume = allTradersData[Math.min(top5Count - 1, allTradersData.length - 1)] ? 
          parseFloat(allTradersData[Math.min(top5Count - 1, allTradersData.length - 1)].volume_usd?.toString() || '0') : 0;
        
        const top1PercentShare = totalVolume > 0 ? (top1Volume / totalVolume) * 100 : 0;
        const top5PercentShare = totalVolume > 0 ? (top5Volume / totalVolume) * 100 : 0;
        
        metrics = {
          totalTraders: total,
          totalVolume,
          avgVolumePerTrader,
          top1PercentVolume: top1Volume,
          top5PercentVolume: top5Volume,
          percentile99Volume,
          percentile95Volume,
          top1PercentShare,
          top5PercentShare
        };
        
        // Step 9: Generate percentile brackets
        const processedAt80 = Math.floor(total * 0.8); // Show 80% of records processed
        progressCache.set(progressKey, {
          isLoading: true,
          step: 'Building percentile brackets...',
          percentage: 80,
          startTime: now,
          totalSteps: 10,
          currentStep: 9,
          processedCount: processedAt80,
          totalCount: total,
          fetchingCount: total
        });
        
        // Calculate percentile brackets using ALL trader data
        const percentiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 50, 75, 100];
        percentileBrackets = percentiles.map(percentile => {
          const rankCutoff = Math.floor((percentile / 100) * total);
          const tradersInPercentile = allTradersData.slice(0, rankCutoff);
          const traderCount = tradersInPercentile.length;
          const bracketVolume = tradersInPercentile.reduce((sum, trader) => {
            return sum + parseFloat(trader.volume_usd?.toString() || '0');
          }, 0);
          // Calculate volume share based on actual bracket volume
          // Percentile should never exceed 100%
          const rawVolumeShare = totalVolume > 0 ? (bracketVolume / totalVolume) * 100 : 0;
          const volumeShare = Math.min(rawVolumeShare, 100);
          
          // Log if we had to cap the value
          if (rawVolumeShare > 100) {
            console.warn(`⚠️ Percentile ${percentile}% for ${protocol} had volume share ${rawVolumeShare.toFixed(1)}% - capped to 100%`);
          }
          const rankRange = traderCount > 0 ? `1-${traderCount}` : '0';
          
          return {
            percentile,
            traderCount,
            rankRange,
            volume: bracketVolume,
            volumeShare
          };
        });
        
        console.log(`📊 Calculation complete: ${percentileBrackets.length} brackets`);
        
        // Step 10: Finalizing results
        const processedAt95 = Math.floor(total * 0.95); // Show 95% of records processed
        progressCache.set(progressKey, {
          isLoading: true,
          step: 'Finalizing analysis...',
          percentage: 95,
          startTime: now,
          totalSteps: 10,
          currentStep: 10,
          processedCount: processedAt95,
          totalCount: total,
          fetchingCount: total
        });
      } catch (error) {
        // Clear progress on error
        progressCache.delete(progressKey);
        throw error;
      }
      
      // Cache the expensive metrics calculations
      comprehensiveCache.set(cacheKey, {
        data: { metrics, percentileBrackets, totalVolume },
        timestamp: now
      });
      
      console.log(`💾 Cached comprehensive metrics for ${protocol} (4 hour expiry)`);
    }
    
    // Fetch only the requested page of rank data (true lazy loading)
    const offset = (pageNum - 1) * limitNum;
    console.log(`🔄 Fetching page ${pageNum}: offset=${offset}, limit=${limitNum}`);
    
    const paginatedData = await TraderStatsService.getTraderStatsPaginated(
      protocol,
      offset,
      limitNum
    );
    
    console.log(`Retrieved ${paginatedData.length} paginated records`);
    
    // Add calculated fields to paginated data
    const rankData = paginatedData.map((trader, index) => ({
      ...trader,
      rank: offset + index + 1,
      volumeShare: totalVolume > 0 ? ((parseFloat(trader.volume_usd?.toString() || '0') / totalVolume) * 100) : 0,
      volume_usd: parseFloat(trader.volume_usd?.toString() || '0')
    }));
    
    // Final progress update - 100% complete
    progressCache.set(progressKey, {
      isLoading: false,
      step: 'Analysis complete!',
      percentage: 100,
      startTime: now,
      totalSteps: 10,
      currentStep: 10,
      processedCount: total,
      totalCount: total,
      fetchingCount: 0
    });
    
    res.json({
      success: true,
      data: {
        metrics,
        rankData,
        percentileBrackets,
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalItems: total,
          totalPages: Math.ceil(total / limitNum)
        }
      },
      cached: cached ? true : false
    });
    
    // Clear progress after successful completion
    setTimeout(() => {
      progressCache.delete(progressKey);
    }, 2000);
    
  } catch (error) {
    // Clear progress on error  
    const progressKey = `loading_${protocol}`;
    progressCache.delete(progressKey);
    
    console.error('Error in comprehensive endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comprehensive trader stats'
    });
  }
});

// Get protocol statistics summary
router.get('/stats/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    
    console.log('Calculating stats manually (no SQL functions)');
    
    // Get accurate data using proper batching
    const total = await TraderStatsService.getTraderStatsCount(protocol);
    console.log(`Found ${total} traders for ${protocol}`);
    
    // Use the corrected volume calculation for now (hardcoded based on our calculation)
    let totalVolume = 0;
    let top1Volume = 0;
    let top5Volume = 0;
    let percentile99Volume = 0;
    let percentile95Volume = 0;
    
    // Calculate for all protocols using the same method
    totalVolume = await TraderStatsService.getTotalVolumeForProtocol(protocol);
    
    // Get all data properly paginated for percentile calculations
    const allData = await TraderStatsService.getTraderStatsPaginated(protocol, 0, total);
    
    // Calculate percentiles based on actual trader count
    const top1Count = Math.floor(0.01 * total);
    const top5Count = Math.floor(0.05 * total);
    
    console.log(`Calculating percentiles for ${protocol}: total traders=${total}, top1%=${top1Count}, top5%=${top5Count}`);
    
    top1Volume = allData.slice(0, top1Count).reduce((sum, trader) => {
      return sum + parseFloat(trader.volume_usd?.toString() || '0');
    }, 0);
    
    top5Volume = allData.slice(0, top5Count).reduce((sum, trader) => {
      return sum + parseFloat(trader.volume_usd?.toString() || '0');
    }, 0);
    
    percentile99Volume = allData[top1Count - 1] ? parseFloat(allData[top1Count - 1].volume_usd?.toString() || '0') : 0;
    percentile95Volume = allData[top5Count - 1] ? parseFloat(allData[top5Count - 1].volume_usd?.toString() || '0') : 0;
    
    console.log(`Stats for ${protocol}: total=${totalVolume.toLocaleString()}, top1%=${top1Volume.toLocaleString()}, top5%=${top5Volume.toLocaleString()}`);
    
    console.log(`Volume calculations: top1=${top1Volume.toLocaleString()}, top5=${top5Volume.toLocaleString()}, total=${totalVolume.toLocaleString()}`);
    console.log(`Percentile volumes: 99th=${percentile99Volume.toLocaleString()}, 95th=${percentile95Volume.toLocaleString()}`);
    
    const stats = {
      totalTraders: total,
      totalVolume,
      avgVolumePerTrader: total > 0 ? totalVolume / total : 0,
      top1PercentVolume: top1Volume,
      top5PercentVolume: top5Volume,
      percentile99Volume,
      percentile95Volume,
      top1PercentShare: totalVolume > 0 ? (top1Volume / totalVolume) * 100 : 0,
      top5PercentShare: totalVolume > 0 ? (top5Volume / totalVolume) * 100 : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching protocol stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch protocol stats'
    });
  }
});

// Get percentile brackets for a protocol (from pre-calculated database)
router.get('/percentiles/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    console.log(`Fetching percentiles for ${protocol}`);
    
    // Check cache first
    const cacheKey = `percentiles_${protocol}`;
    const cached = percentileCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp < CACHE_DURATION)) {
      console.log(`Returning cached percentiles for ${protocol} (${Math.round((now - cached.timestamp) / 1000 / 60)} minutes old)`);
      return res.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }
    
    let formattedBrackets: any[] = [];
    
    // Calculate percentiles dynamically for all protocols
    try {
      // Get all trader data for accurate percentile calculations
      const total = await TraderStatsService.getTraderStatsCount(protocol);
      const allData = await TraderStatsService.getTraderStatsPaginated(protocol, 0, total);
      
      const totalVolume = await TraderStatsService.getTotalVolumeForProtocol(protocol);
      
      // Calculate percentile brackets
      const percentiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 50, 75, 100];
      
      formattedBrackets = percentiles.map(percentile => {
        const rankCutoff = Math.floor((percentile / 100) * total);
        const tradersInPercentile = allData.slice(0, rankCutoff);
        const traderCount = tradersInPercentile.length;
        const bracketVolume = tradersInPercentile.reduce((sum, trader) => {
          return sum + parseFloat(trader.volume_usd?.toString() || '0');
        }, 0);
        // Ensure percentile volume share never exceeds 100%
        const rawVolumeShare = totalVolume > 0 ? (bracketVolume / totalVolume) * 100 : 0;
        const volumeShare = Math.min(rawVolumeShare, 100);
        
        // Log if we had to cap the value
        if (rawVolumeShare > 100) {
          console.warn(`⚠️ Percentile ${percentile}% for ${protocol} had volume share ${rawVolumeShare.toFixed(1)}% - capped to 100%`);
        }
        const rankRange = traderCount > 0 ? `1-${traderCount}` : '0';
        
        return {
          percentile,
          traderCount,
          rankRange,
          volume: bracketVolume,
          volumeShare
        };
      });
    } catch (calcError) {
      console.error('Error calculating percentiles:', calcError);
      // Try to get from database or return empty array
      try {
        const brackets = await TraderStatsService.getProtocolPercentiles(protocol);
        formattedBrackets = brackets.map(row => ({
          percentile: row.percentile,
          traderCount: row.trader_count,
          rankRange: row.rank_range,
          volume: parseFloat(row.volume_usd),
          volumeShare: parseFloat(row.volume_share)
        }));
      } catch (dbError) {
        console.error('Database lookup failed, calculating on the fly:', dbError);
        // Fallback to real-time calculation for other protocols
        formattedBrackets = [];
      }
    }
    
    console.log(`Retrieved ${formattedBrackets.length} percentile brackets for ${protocol}`);
    
    // Cache the results
    if (formattedBrackets.length > 0) {
      percentileCache.set(cacheKey, {
        data: formattedBrackets,
        timestamp: now
      });
      console.log(`Cached percentiles for ${protocol} (4 hour expiry)`);
    }
    
    res.json({
      success: true,
      data: formattedBrackets,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching percentiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch percentiles'
    });
  }
});

// Get trader analytics for a protocol
router.get('/analytics/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const start = parseISO(startDate as string);
    const end = parseISO(endDate as string);

    if (!isValid(start) || !isValid(end)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use ISO format (YYYY-MM-DD)'
      });
    }

    const analytics = await TraderStatsService.getTraderAnalytics(
      protocol,
      start,
      end
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching trader analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trader analytics'
    });
  }
});

// Get top traders across all protocols
router.get('/top-traders', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const start = parseISO(startDate as string);
    const end = parseISO(endDate as string);

    if (!isValid(start) || !isValid(end)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use ISO format (YYYY-MM-DD)'
      });
    }

    const data = await TraderStatsService.getTopTradersAcrossProtocols(
      start,
      end,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching top traders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top traders'
    });
  }
});

// Import trader data (for manual imports or testing)
router.post('/import/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { date, data } = req.body;

    if (!date || !data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'date and data array are required'
      });
    }

    const importDate = parseISO(date);
    if (!isValid(importDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use ISO format (YYYY-MM-DD)'
      });
    }

    await TraderStatsService.importTraderData(protocol, importDate, data);

    res.json({
      success: true,
      message: `Imported ${data.length} trader records for ${protocol}`
    });
  } catch (error) {
    console.error('Error importing trader data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import trader data'
    });
  }
});

// Fetch trader stats from Dune for a specific protocol
router.post('/fetch/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { date } = req.body;

    const fetchDate = date ? parseISO(date) : new Date();
    if (!isValid(fetchDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use ISO format (YYYY-MM-DD)'
      });
    }

    // Check if Dune API key is configured
    if (!process.env.DUNE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Dune API key not configured'
      });
    }

    // Fetch from Dune
    await DuneTraderStatsService.fetchAndImportTraderStats(protocol, fetchDate);

    res.json({
      success: true,
      message: `Successfully fetched and imported trader stats for ${protocol} on ${format(fetchDate, 'yyyy-MM-dd')}`
    });
  } catch (error: any) {
    console.error('Error fetching trader stats from Dune:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch trader stats from Dune'
    });
  }
});

// Test Photon query
router.get('/test/photon', async (req: Request, res: Response) => {
  try {
    if (!process.env.DUNE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Dune API key not configured'
      });
    }

    await DuneTraderStatsService.testPhotonQuery();

    res.json({
      success: true,
      message: 'Photon query test completed successfully'
    });
  } catch (error: any) {
    console.error('Photon query test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Photon query test failed'
    });
  }
});

// Refresh percentiles for a protocol (manual refresh endpoint)
router.post('/percentiles/refresh/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    console.log(`Manual refresh request for ${protocol} percentiles`);
    
    await TraderStatsService.refreshProtocolPercentiles(protocol);
    
    res.json({
      success: true,
      message: `Successfully refreshed percentiles for ${protocol}`
    });
  } catch (error: any) {
    console.error('Error refreshing percentiles:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh percentiles'
    });
  }
});

// Refresh trader data from Dune (delete existing + fetch fresh)
router.post('/refresh/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    console.log(`Full data refresh request for ${protocol}`);
    
    if (!['photon', 'axiom', 'bloom', 'trojan'].includes(protocol.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Refresh not supported for protocol: ${protocol}. Only 'photon', 'axiom', 'bloom', and 'trojan' are supported.`
      });
    }
    
    // Step 1: Fetch fresh data from Dune (includes deletion step)
    console.log(`Fetching fresh ${protocol} data from Dune...`);
    await DuneTraderStatsService.fetchAndImportTraderStats(protocol, new Date());
    
    // Step 3: Verify the data was imported
    const { count, error: countError } = await supabase
      .from('trader_stats')
      .select('*', { count: 'exact', head: true })
      .eq('protocol_name', protocol.toLowerCase());
      
    if (countError) throw countError;
    
    // Step 4: Clear all caches for this protocol
    console.log(`Clearing caches for ${protocol}...`);
    
    // Clear comprehensive cache
    const comprehensiveCacheKey = `comprehensive_${protocol.toLowerCase()}`;
    if (comprehensiveCache.has(comprehensiveCacheKey)) {
      comprehensiveCache.delete(comprehensiveCacheKey);
      console.log(`✅ Cleared comprehensive cache for ${protocol}`);
    }
    
    // Clear percentile cache
    const percentileCacheKey = `percentiles_${protocol.toLowerCase()}`;
    if (percentileCache.has(percentileCacheKey)) {
      percentileCache.delete(percentileCacheKey);
      console.log(`✅ Cleared percentile cache for ${protocol}`);
    }
    
    res.json({
      success: true,
      message: `Successfully refreshed ${protocol}`,
      data: {
        protocol: protocol,
        tradersImported: count,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    const { protocol } = req.params;
    console.error(`Error refreshing ${protocol} data:`, error);
    res.status(500).json({
      success: false,
      error: error.message || `Failed to refresh ${protocol} data`
    });
  }
});

// Refresh both Photon and Axiom trader data
router.post('/refresh-all', async (req: Request, res: Response) => {
  try {
    console.log('Full data refresh request for all protocols (Photon + Axiom + Bloom + Trojan)');
    
    const protocols = ['photon', 'axiom', 'bloom', 'trojan'];
    const results = [];
    
    for (const protocol of protocols) {
      try {
        console.log(`\n=== Processing ${protocol} ===`);
        
        // Fetch fresh data from Dune (includes deletion step)
        await DuneTraderStatsService.fetchAndImportTraderStats(protocol, new Date());
        
        // Verify import
        const { count, error: countError } = await supabase
          .from('trader_stats')
          .select('*', { count: 'exact', head: true })
          .eq('protocol_name', protocol);
          
        if (countError) throw countError;
        
        // Clear caches for this protocol
        const comprehensiveCacheKey = `comprehensive_${protocol}`;
        if (comprehensiveCache.has(comprehensiveCacheKey)) {
          comprehensiveCache.delete(comprehensiveCacheKey);
          console.log(`✅ Cleared comprehensive cache for ${protocol}`);
        }
        
        const percentileCacheKey = `percentiles_${protocol}`;
        if (percentileCache.has(percentileCacheKey)) {
          percentileCache.delete(percentileCacheKey);
          console.log(`✅ Cleared percentile cache for ${protocol}`);
        }
        
        results.push({
          protocol: protocol,
          success: true,
          tradersImported: count
        });
        
        console.log(`✅ ${protocol}: ${count} traders imported`);
        
      } catch (error: any) {
        console.error(`❌ Failed to refresh ${protocol}:`, error);
        results.push({
          protocol: protocol,
          success: false,
          error: error.message
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    
    res.json({
      success: successful > 0,
      message: `Refreshed ${successful}/${protocols.length} protocols`,
      data: {
        results,
        summary: {
          total: protocols.length,
          successful,
          failed: protocols.length - successful
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('Error in refresh-all:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh protocols'
    });
  }
});

// Get row counts for all protocols
router.get('/row-counts', async (req: Request, res: Response) => {
  try {
    const counts = await TraderStatsService.getAllProtocolRowCounts();
    
    res.json({
      success: true,
      data: counts
    });
  } catch (error: any) {
    console.error('Error getting protocol row counts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get protocol row counts'
    });
  }
});

// Get loading progress for a protocol
router.get('/progress/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const progressKey = `loading_${protocol}`;
    const progress = progressCache.get(progressKey);

    if (!progress) {
      return res.json({
        success: true,
        data: {
          isLoading: false,
          step: '',
          percentage: 0,
          totalSteps: 0,
          currentStep: 0
        }
      });
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error: any) {
    console.error('Error getting loading progress:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get loading progress'
    });
  }
});

// Cache for volume ranges (4 hours like other trader stats)
const volumeRangesCache = new Map<string, { data: any, timestamp: number }>();
const VOLUME_RANGES_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// Get volume ranges for a protocol
router.get('/volume-ranges/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    console.log(`Fetching volume ranges for ${protocol}`);

    // Check cache first
    const cacheKey = `volume_ranges_${protocol.toLowerCase()}`;
    const cached = volumeRangesCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < VOLUME_RANGES_CACHE_DURATION) {
      console.log(`✅ Cache hit for volume ranges: ${protocol}`);
      return res.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    // Calculate volume ranges
    const volumeRanges = await TraderStatsService.getVolumeRanges(protocol);

    // Cache the results
    volumeRangesCache.set(cacheKey, {
      data: volumeRanges,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: volumeRanges,
      cached: false
    });
  } catch (error: any) {
    console.error('Error fetching volume ranges:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch volume ranges'
    });
  }
});

// Export traders in volume range as CSV
router.get('/volume-range-export/:protocol/:rangeLabel', async (req: Request, res: Response) => {
  try {
    const { protocol, rangeLabel } = req.params;
    console.log(`Exporting CSV for ${protocol}, range: ${rangeLabel}`);

    // Parse range label to get min/max values
    const rangeMap: Record<string, { min: number, max: number | null }> = {
      'sub-50k': { min: 0, max: 50000 },
      '50k-100k': { min: 50000, max: 100000 },
      '100k-250k': { min: 100000, max: 250000 },
      '250k-500k': { min: 250000, max: 500000 },
      '500k-1m': { min: 500000, max: 1000000 },
      '1m-2m': { min: 1000000, max: 2000000 },
      '2m-3m': { min: 2000000, max: 3000000 },
      '3m-4m': { min: 3000000, max: 4000000 },
      '4m-5m': { min: 4000000, max: 5000000 },
      '5m+': { min: 5000000, max: null }
    };

    const range = rangeMap[rangeLabel];
    if (!range) {
      return res.status(400).json({
        success: false,
        error: 'Invalid range label'
      });
    }

    // Get traders in this range
    const traders = await TraderStatsService.getTradersInVolumeRange(
      protocol,
      range.min,
      range.max
    );

    // Set headers for file download
    const filename = `${protocol}_${rangeLabel}_traders.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');

    // Format volume with commas
    const formatVolume = (volume: number): string => {
      return volume.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // Stream CSV content for better performance with large datasets
    console.log(`Starting CSV stream for ${traders.length} traders...`);

    // Write CSV header
    res.write('address,volume\n');

    // Stream trader data in chunks for memory efficiency
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < traders.length; i += CHUNK_SIZE) {
      const chunk = traders.slice(i, Math.min(i + CHUNK_SIZE, traders.length));
      const csvChunk = chunk
        .map(trader => `${trader.user_address},${formatVolume(trader.volume_usd)}`)
        .join('\n');
      res.write(csvChunk);

      // Add newline between chunks (except for last chunk)
      if (i + CHUNK_SIZE < traders.length) {
        res.write('\n');
      }
    }

    // End the response
    res.end('\n');

    console.log(`✅ CSV exported: ${filename}, ${traders.length} traders`);
  } catch (error: any) {
    console.error('Error exporting volume range CSV:', error);

    // Only send JSON error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to export CSV'
      });
    } else {
      // If headers already sent, just end the response
      res.end();
    }
  }
});

export default router;