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
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Comprehensive cache for all trader stats data
const comprehensiveCache = new Map<string, { data: any, timestamp: number }>();
const COMPREHENSIVE_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// Comprehensive endpoint that provides ALL data needed for frontend
router.get('/comprehensive/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { page = 1, limit = 10, clearCache } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    console.log(`📊 Comprehensive request for ${protocol} - page ${pageNum}, limit ${limitNum}`);
    
    // Check cache first (unless clearCache is requested)
    const cacheKey = `comprehensive_${protocol}`;
    const cached = clearCache ? null : comprehensiveCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp < COMPREHENSIVE_CACHE_DURATION)) {
      const cacheAge = Math.round((now - cached.timestamp) / 1000 / 60);
      console.log(`✅ Returning cached comprehensive data for ${protocol} (${cacheAge} minutes old)`);
      
      // Apply pagination to cached rank data
      const rankData = cached.data.rankData;
      const startIdx = (pageNum - 1) * limitNum;
      const endIdx = startIdx + limitNum;
      const paginatedRankData = rankData.slice(startIdx, endIdx);
      
      return res.json({
        success: true,
        data: {
          ...cached.data,
          rankData: paginatedRankData,
          pagination: {
            currentPage: pageNum,
            pageSize: limitNum,
            totalItems: rankData.length,
            totalPages: Math.ceil(rankData.length / limitNum)
          }
        },
        cached: true,
        cacheAge: cacheAge
      });
    }
    
    console.log(`🔄 Processing comprehensive data for ${protocol}...`);
    
    // Get all raw trader data
    const total = await TraderStatsService.getTraderStatsCount(protocol);
    console.log(`Found ${total} traders for ${protocol}`);
    
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
    
    // Get all trader data (sorted by volume descending)
    const allData = await TraderStatsService.getTraderStatsPaginated(protocol, 0, total);
    console.log(`Retrieved ${allData.length} trader records`);
    
    // Calculate total volume from actual data (more accurate)
    const totalVolume = allData.reduce((sum, trader) => {
      return sum + parseFloat(trader.volume_usd?.toString() || '0');
    }, 0);
    console.log(`Total volume calculated from data: $${totalVolume.toLocaleString()}`);
    
    // Calculate metrics
    const avgVolumePerTrader = total > 0 ? totalVolume / total : 0;
    const top1Count = Math.floor(0.01 * total);
    const top5Count = Math.floor(0.05 * total);
    
    const top1Volume = allData.slice(0, top1Count).reduce((sum, trader) => {
      return sum + parseFloat(trader.volume_usd?.toString() || '0');
    }, 0);
    
    const top5Volume = allData.slice(0, top5Count).reduce((sum, trader) => {
      return sum + parseFloat(trader.volume_usd?.toString() || '0');
    }, 0);
    
    const percentile99Volume = allData[top1Count - 1] ? parseFloat(allData[top1Count - 1].volume_usd?.toString() || '0') : 0;
    const percentile95Volume = allData[top5Count - 1] ? parseFloat(allData[top5Count - 1].volume_usd?.toString() || '0') : 0;
    
    const top1PercentShare = totalVolume > 0 ? (top1Volume / totalVolume) * 100 : 0;
    const top5PercentShare = totalVolume > 0 ? (top5Volume / totalVolume) * 100 : 0;
    
    console.log(`📈 Metrics calculated: top1%=${top1Volume.toLocaleString()}, top5%=${top5Volume.toLocaleString()}`);
    
    // Prepare rank data with all calculations done
    const rankData = allData.map((trader, index) => ({
      ...trader,
      rank: index + 1,
      volumeShare: totalVolume > 0 ? ((parseFloat(trader.volume_usd?.toString() || '0') / totalVolume) * 100) : 0,
      volume_usd: parseFloat(trader.volume_usd?.toString() || '0')
    }));
    
    // Calculate percentile brackets
    const percentiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 50, 75, 100];
    const percentileBrackets = percentiles.map(percentile => {
      const rankCutoff = Math.floor((percentile / 100) * total);
      const tradersInPercentile = allData.slice(0, rankCutoff);
      const traderCount = tradersInPercentile.length;
      const bracketVolume = tradersInPercentile.reduce((sum, trader) => {
        return sum + parseFloat(trader.volume_usd?.toString() || '0');
      }, 0);
      const volumeShare = totalVolume > 0 ? (bracketVolume / totalVolume) * 100 : 0;
      const rankRange = traderCount > 0 ? `1-${traderCount}` : '0';
      
      return {
        percentile,
        traderCount,
        rankRange,
        volume: bracketVolume,
        volumeShare
      };
    });
    
    console.log(`📊 Calculated ${percentileBrackets.length} percentile brackets`);
    
    // Prepare comprehensive response
    const comprehensiveData = {
      metrics: {
        totalTraders: total,
        totalVolume,
        avgVolumePerTrader,
        top1PercentVolume: top1Volume,
        top5PercentVolume: top5Volume,
        percentile99Volume,
        percentile95Volume,
        top1PercentShare,
        top5PercentShare
      },
      rankData,
      percentileBrackets
    };
    
    // Cache the comprehensive data
    comprehensiveCache.set(cacheKey, {
      data: comprehensiveData,
      timestamp: now
    });
    
    console.log(`💾 Cached comprehensive data for ${protocol} (4 hour expiry)`);
    
    // Apply pagination to rank data for response
    const startIdx = (pageNum - 1) * limitNum;
    const endIdx = startIdx + limitNum;
    const paginatedRankData = rankData.slice(startIdx, endIdx);
    
    res.json({
      success: true,
      data: {
        ...comprehensiveData,
        rankData: paginatedRankData,
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalItems: rankData.length,
          totalPages: Math.ceil(rankData.length / limitNum)
        }
      },
      cached: false
    });
    
  } catch (error) {
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
    
    let formattedBrackets = [];
    
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
        const volumeShare = totalVolume > 0 ? (bracketVolume / totalVolume) * 100 : 0;
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
      console.log(`Cached percentiles for ${protocol} (30 minute expiry)`);
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
    
    if (!['photon', 'axiom'].includes(protocol.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Refresh not supported for protocol: ${protocol}. Only 'photon' and 'axiom' are supported.`
      });
    }
    
    // Step 1: Delete existing data
    console.log(`Deleting existing ${protocol} trader data...`);
    const { error: deleteError } = await supabase
      .from('trader_stats')
      .delete()
      .eq('protocol_name', protocol.toLowerCase());
    
    if (deleteError) throw deleteError;
    
    // Step 2: Fetch fresh data from Dune
    console.log(`Fetching fresh ${protocol} data from Dune...`);
    await DuneTraderStatsService.fetchAndImportTraderStats(protocol, new Date());
    
    // Step 3: Verify the data was imported
    const { count, error: countError } = await supabase
      .from('trader_stats')
      .select('*', { count: 'exact', head: true })
      .eq('protocol_name', protocol.toLowerCase());
      
    if (countError) throw countError;
    
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
    console.log('Full data refresh request for all protocols (Photon + Axiom)');
    
    const protocols = ['photon', 'axiom'];
    const results = [];
    
    for (const protocol of protocols) {
      try {
        console.log(`\n=== Processing ${protocol} ===`);
        
        // Delete existing data
        const { error: deleteError } = await supabase
          .from('trader_stats')
          .delete()
          .eq('protocol_name', protocol);
        
        if (deleteError) throw deleteError;
        console.log(`Deleted existing ${protocol} data`);
        
        // Fetch fresh data from Dune
        await DuneTraderStatsService.fetchAndImportTraderStats(protocol, new Date());
        
        // Verify import
        const { count, error: countError } = await supabase
          .from('trader_stats')
          .select('*', { count: 'exact', head: true })
          .eq('protocol_name', protocol);
          
        if (countError) throw countError;
        
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

export default router;