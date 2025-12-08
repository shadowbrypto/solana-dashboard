import { Router, Request, Response } from 'express';
import { getProtocolStats, getTotalProtocolStats, getDailyMetrics, getAggregatedProtocolStats, generateWeeklyInsights, getEVMChainBreakdown, getEVMDailyChainBreakdown, getEVMDailyData, getSolanaDailyMetrics, getEVMDailyMetrics, getMonadDailyMetrics, getSolanaDailyHighlights, getLatestDataDates, getCumulativeVolume, getSolanaWeeklyMetrics, getEVMWeeklyMetrics, getSolanaMonthlyMetrics, getEVMMonthlyMetrics, getMonthlyInsights, getSolanaMonthlyMetricsWithDaily, getEVMMonthlyMetricsWithDaily } from '../services/protocolService.js';
import { protocolSyncStatusService } from '../services/protocolSyncStatusService.js';
import { getMonadProtocols, getEVMProtocols } from '../config/chainProtocols.js';
import { dataManagementService } from '../services/dataManagementService.js';

const router = Router();

// GET /api/protocols/stats
// Query params: protocol (optional, can be single string or comma-separated list), chain (optional - 'solana', 'evm', or specific chain), dataType (optional - 'public', 'private')
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { protocol, chain, dataType } = req.query;
    
    let protocolName: string | string[] | undefined;
    if (protocol) {
      if (typeof protocol === 'string') {
        protocolName = protocol.includes(',') ? protocol.split(',').map(p => p.trim()) : protocol;
      } else if (Array.isArray(protocol)) {
        protocolName = protocol.filter(p => typeof p === 'string') as string[];
      }
    }

    const chainFilter = typeof chain === 'string' ? chain : undefined;
    const dataTypeFilter = typeof dataType === 'string' ? dataType : undefined;
    const stats = await getProtocolStats(protocolName, chainFilter, dataTypeFilter);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching protocol stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch protocol stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/total-stats
// Query params: protocol (optional), chain (optional - 'solana', 'evm', or specific chain), dataType (optional - 'public', 'private')
router.get('/total-stats', async (req: Request, res: Response) => {
  try {
    const { protocol, chain, dataType } = req.query;
    const protocolName = typeof protocol === 'string' ? protocol : undefined;
    const chainFilter = typeof chain === 'string' ? chain : undefined;
    const dataTypeFilter = typeof dataType === 'string' ? dataType : undefined;

    const totalStats = await getTotalProtocolStats(protocolName, chainFilter, dataTypeFilter);
    res.json({ success: true, data: totalStats });
  } catch (error) {
    console.error('Error fetching total protocol stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch total protocol stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/daily-metrics
// Query params: date (required, format: YYYY-MM-DD), dataType (optional, 'public' or 'private', defaults to 'private'), chain (optional, 'solana' or 'evm', defaults based on dataType)
router.get('/daily-metrics', async (req: Request, res: Response) => {
  try {
    const { date, dataType, chain } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Date parameter is required and must be in YYYY-MM-DD format' 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date must be in YYYY-MM-DD format' 
      });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date provided' 
      });
    }

    const chainFilter = typeof chain === 'string' ? chain : 'solana';
    const dataTypeFilter = typeof dataType === 'string' ? dataType : (chainFilter === 'evm' ? 'public' : 'private');

    // Use the optimized functions for each chain
    let dailyMetrics;
    if (chainFilter === 'evm') {
      dailyMetrics = await getEVMDailyMetrics(dateObj, dataTypeFilter);
    } else if (chainFilter === 'monad') {
      dailyMetrics = await getMonadDailyMetrics(dateObj, dataTypeFilter);
    } else {
      dailyMetrics = await getSolanaDailyMetrics(dateObj, dataTypeFilter);
    }

    res.json({ success: true, data: dailyMetrics });
  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch daily metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/daily-highlights-sol
// Query params: date (required, format: YYYY-MM-DD), dataType (optional, 'private' or 'public', defaults to 'private')
router.get('/daily-highlights-sol', async (req: Request, res: Response) => {
  try {
    const { date, dataType } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Date parameter is required and must be in YYYY-MM-DD format' 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date must be in YYYY-MM-DD format' 
      });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date provided' 
      });
    }

    const dataTypeFilter = typeof dataType === 'string' ? dataType : 'private';
    
    console.log(`Fetching Solana daily highlights for date: ${date}, dataType: ${dataTypeFilter}`);
    const highlights = await getSolanaDailyHighlights(dateObj, dataTypeFilter);
    
    res.json({ success: true, data: highlights });
  } catch (error) {
    console.error('Error fetching Solana daily highlights:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch daily highlights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/weekly-metrics
// Query params: endDate (required, format: YYYY-MM-DD), dataType (optional, 'public' or 'private', defaults to 'private'), chain (optional, 'solana' or 'evm', defaults to 'solana'), metric (optional, ranking metric for topProtocols)
router.get('/weekly-metrics', async (req: Request, res: Response) => {
  try {
    const { endDate, dataType, chain, metric } = req.query;
    
    if (!endDate || typeof endDate !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'endDate parameter is required and must be in YYYY-MM-DD format' 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        error: 'endDate must be in YYYY-MM-DD format' 
      });
    }

    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid endDate provided' 
      });
    }

    const chainFilter = typeof chain === 'string' ? chain : 'solana';
    const dataTypeFilter = typeof dataType === 'string' ? dataType : (chainFilter === 'evm' ? 'public' : 'private');
    const rankingMetric = typeof metric === 'string' ? metric : 'volume';
    
    let weeklyMetrics;
    if (chainFilter === 'evm') {
      weeklyMetrics = await getEVMWeeklyMetrics(endDateObj, dataTypeFilter);
    } else {
      weeklyMetrics = await getSolanaWeeklyMetrics(endDateObj, dataTypeFilter, rankingMetric);
    }
    
    res.json({ success: true, data: weeklyMetrics });
  } catch (error) {
    console.error('Error fetching weekly metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch weekly metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/:protocol/cumulative-volume
// Get cumulative volume for a specific protocol up to a given date
router.get('/:protocol/cumulative-volume', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { endDate, dataType } = req.query;
    
    if (!endDate || typeof endDate !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'endDate parameter is required and must be in YYYY-MM-DD format' 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        error: 'endDate must be in YYYY-MM-DD format' 
      });
    }

    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid endDate provided' 
      });
    }

    const cumulativeVolume = await getCumulativeVolume(protocol, endDateObj, dataType as string);
    res.json({ success: true, data: cumulativeVolume });
  } catch (error) {
    console.error(`Error fetching cumulative volume for ${req.params.protocol}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch cumulative volume',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/aggregated-stats
// Returns pre-aggregated data for all protocols by date
router.get('/aggregated-stats', async (req: Request, res: Response) => {
  try {
    const dataType = req.query.dataType as string;
    const aggregatedStats = await getAggregatedProtocolStats(dataType);
    res.json({ success: true, data: aggregatedStats });
  } catch (error) {
    console.error('Error fetching aggregated protocol stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch aggregated protocol stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/weekly-insights
// Returns AI-generated insights for the past week
router.get('/weekly-insights', async (req: Request, res: Response) => {
  try {
    const insights = await generateWeeklyInsights();
    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Error generating weekly insights:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate weekly insights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// GET /api/protocols/evm-metrics/:protocol
// Get EVM chain breakdown for a specific protocol
router.get('/evm-metrics/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    
    if (!protocol) {
      return res.status(400).json({ 
        success: false, 
        error: 'Protocol parameter is required' 
      });
    }

    const evmMetrics = await getEVMChainBreakdown(protocol);
    res.json({ success: true, data: evmMetrics });
  } catch (error) {
    console.error('Error fetching EVM metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch EVM metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/evm-daily-metrics/:protocol
// Get EVM daily chain breakdown for a specific protocol with timeframe
router.get('/evm-daily-metrics/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { timeframe = '30d' } = req.query;
    
    if (!protocol) {
      return res.status(400).json({ 
        success: false, 
        error: 'Protocol parameter is required' 
      });
    }

    if (typeof timeframe !== 'string' || !['7d', '30d', '90d', '6m', '1y'].includes(timeframe)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid timeframe. Must be one of: 7d, 30d, 90d, 6m, 1y' 
      });
    }

    const dailyMetrics = await getEVMDailyChainBreakdown(protocol, timeframe);
    res.json({ success: true, data: dailyMetrics });
  } catch (error) {
    console.error('Error fetching EVM daily metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch EVM daily metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/evm-daily/:protocol
// Get EVM protocol data for a specific date for daily report
router.get('/evm-daily/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { date } = req.query;
    
    if (!protocol) {
      return res.status(400).json({ 
        success: false, 
        error: 'Protocol parameter is required' 
      });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Date parameter is required in YYYY-MM-DD format' 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    const dailyData = await getEVMDailyData(protocol, date);
    res.json({ success: true, data: dailyData });
  } catch (error) {
    console.error('Error fetching EVM daily data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch EVM daily data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// GET /api/protocols/health
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Protocol API is healthy',
    timestamp: new Date().toISOString()
  });
});

// GET /api/protocols/clear-cache/:protocol
// Debug endpoint to clear cache for specific protocol
router.get('/clear-cache/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { clearAllCaches } = await import('../services/protocolService.js');
    
    // Clear all caches to be sure
    clearAllCaches();
    
    res.json({
      success: true,
      message: `Cache cleared for ${protocol}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/sync-status
// Get sync status for all protocols
router.get('/sync-status', async (req: Request, res: Response) => {
  try {
    const syncStatus = await protocolSyncStatusService.getAllProtocolSyncStatus();
    res.json({ success: true, data: syncStatus });
  } catch (error) {
    console.error('Error fetching protocol sync status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch protocol sync status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/sync-status/:protocol
// Get sync status for a specific protocol
router.get('/sync-status/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const syncStatus = await protocolSyncStatusService.getProtocolSyncStatus(protocol);
    
    if (!syncStatus) {
      return res.status(404).json({ 
        success: false, 
        error: 'Protocol sync status not found' 
      });
    }
    
    res.json({ success: true, data: syncStatus });
  } catch (error) {
    console.error('Error fetching protocol sync status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch protocol sync status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/latest-dates
// Get latest data dates for SOL protocols only
router.get('/latest-dates', async (req: Request, res: Response) => {
  try {
    const latestDates = await getLatestDataDates();
    res.json({ success: true, data: latestDates });
  } catch (error) {
    console.error('Error fetching latest data dates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch latest data dates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/protocols/sync-evm
// Sync all EVM protocol data
router.post('/sync-evm', async (req: Request, res: Response) => {
  try {
    console.log('Starting EVM data sync for all protocols...');

    // Get all EVM protocols from chain configuration
    const evmProtocols = getEVMProtocols();
    console.log(`Syncing ${evmProtocols.length} EVM protocols:`, evmProtocols);
    const results: Array<{ protocol: string; success: boolean; rowsImported?: number; error?: string }> = [];

    for (const protocol of evmProtocols) {
      try {
        // Use dataManagementService to sync EVM data
        const result = await dataManagementService.syncProtocolData(protocol, 'public');
        results.push({
          protocol,
          success: true,
          rowsImported: result.rowsImported
        });
      } catch (error) {
        results.push({
          protocol,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const totalRowsImported = results.reduce((sum, r) => sum + (r.rowsImported || 0), 0);
    const successfulSyncs = results.filter(r => r.success).length;

    res.json({
      success: successfulSyncs > 0,
      csvFilesFetched: successfulSyncs,
      protocolsSynced: successfulSyncs,
      totalProtocols: evmProtocols.length,
      totalRowsImported,
      rowsImported: totalRowsImported,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in EVM data sync:', error);
    res.status(500).json({
      success: false,
      error: 'EVM data sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/protocols/sync-monad
// Sync all Monad protocol data
router.post('/sync-monad', async (req: Request, res: Response) => {
  try {
    console.log('Starting Monad data sync for all protocols...');

    // Get all Monad protocols from chain configuration
    const monadProtocols = getMonadProtocols();
    console.log(`Syncing ${monadProtocols.length} Monad protocols:`, monadProtocols);
    const results: Array<{ protocol: string; success: boolean; rowsImported?: number; error?: string }> = [];

    for (const protocol of monadProtocols) {
      try {
        // Use dataManagementService to sync Monad data (same as Solana protocols)
        const result = await dataManagementService.syncProtocolData(protocol, 'private');
        results.push({
          protocol,
          success: true,
          rowsImported: result.rowsImported
        });
      } catch (error) {
        results.push({
          protocol,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const totalRowsImported = results.reduce((sum, r) => sum + (r.rowsImported || 0), 0);
    const successfulSyncs = results.filter(r => r.success).length;

    res.json({
      success: successfulSyncs > 0,
      data: {
        protocolsSynced: successfulSyncs,
        totalProtocols: monadProtocols.length,
        totalRowsImported,
        results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in Monad data sync:', error);
    res.status(500).json({
      success: false,
      error: 'Monad data sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/monthly-metrics
// Query params: endDate (required, format: YYYY-MM-DD), dataType (optional, 'public' or 'private', defaults to 'private'), chain (optional, 'solana' or 'evm', defaults to 'solana')
router.get('/monthly-metrics', async (req: Request, res: Response) => {
  try {
    const { endDate, dataType, chain } = req.query;
    
    if (!endDate || typeof endDate !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'endDate parameter is required and must be in YYYY-MM-DD format' 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        error: 'endDate must be in YYYY-MM-DD format' 
      });
    }

    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid endDate provided' 
      });
    }

    const chainFilter = typeof chain === 'string' ? chain : 'solana';
    const dataTypeFilter = typeof dataType === 'string' ? dataType : (chainFilter === 'evm' ? 'public' : 'private');

    let monthlyMetrics;
    if (chainFilter === 'evm') {
      monthlyMetrics = await getEVMMonthlyMetrics(endDateObj, dataTypeFilter);
    } else {
      monthlyMetrics = await getSolanaMonthlyMetrics(endDateObj, dataTypeFilter);
    }

    res.json({ success: true, data: monthlyMetrics });
  } catch (error) {
    console.error('Error fetching monthly metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/monthly-chart-metrics
// Query params: endDate (required, format: YYYY-MM-DD), chain (optional, 'solana' or 'evm'), dataType (optional)
// Returns monthly metrics with daily breakdowns for chart visualization
router.get('/monthly-chart-metrics', async (req: Request, res: Response) => {
  try {
    const { endDate, chain, dataType } = req.query;

    if (!endDate || typeof endDate !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'endDate parameter is required and must be in YYYY-MM-DD format'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'endDate must be in YYYY-MM-DD format'
      });
    }

    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid endDate provided'
      });
    }

    const chainFilter = typeof chain === 'string' ? chain : 'solana';
    const dataTypeFilter = typeof dataType === 'string' ? dataType : (chainFilter === 'evm' ? 'public' : 'private');

    let monthlyChartMetrics;
    if (chainFilter === 'evm') {
      monthlyChartMetrics = await getEVMMonthlyMetricsWithDaily(endDateObj, dataTypeFilter);
    } else {
      monthlyChartMetrics = await getSolanaMonthlyMetricsWithDaily(endDateObj, dataTypeFilter);
    }

    res.json({ success: true, data: monthlyChartMetrics });
  } catch (error) {
    console.error('Error fetching monthly chart metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly chart metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/monthly-insights
// Query params: endDate (required, format: YYYY-MM-DD), dataType (optional, 'public' or 'private', defaults to 'private')
router.get('/monthly-insights', async (req: Request, res: Response) => {
  try {
    const { endDate, dataType } = req.query;
    
    if (!endDate || typeof endDate !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'endDate parameter is required and must be in YYYY-MM-DD format' 
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        error: 'endDate must be in YYYY-MM-DD format' 
      });
    }

    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid endDate provided' 
      });
    }

    const dataTypeFilter = typeof dataType === 'string' ? dataType : 'private';
    
    const monthlyInsights = await getMonthlyInsights(endDateObj, dataTypeFilter);
    
    res.json({ success: true, data: monthlyInsights });
  } catch (error) {
    console.error('Error fetching monthly insights:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch monthly insights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
