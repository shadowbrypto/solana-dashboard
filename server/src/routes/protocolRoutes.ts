import { Router, Request, Response } from 'express';
import { getProtocolStats, getTotalProtocolStats, getDailyMetrics, getAggregatedProtocolStats, generateWeeklyInsights, getEVMChainBreakdown, getEVMDailyChainBreakdown, getEVMDailyData, getLatestDataDates, getEVMWeeklyMetrics } from '../services/protocolService.js';
import { protocolSyncStatusService } from '../services/protocolSyncStatusService.js';
import { simpleEVMDataMigrationService } from '../services/evmDataMigrationServiceSimple.js';
import { supabase } from '../lib/supabase.js';

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
// Query params: date (required, format: YYYY-MM-DD)
router.get('/daily-metrics', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    
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

    const dailyMetrics = await getDailyMetrics(dateObj);
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


// GET /api/protocols/debug-sigma
// Temporary debug endpoint to check sigma data
router.get('/debug-sigma', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('protocol_stats')
      .select('chain, volume_usd, protocol_name, date')
      .eq('protocol_name', 'sigma')
      .eq('data_type', 'public') // Default to public data for EVM debug endpoint
      .in('chain', ['ethereum', 'base', 'bsc', 'avax', 'arbitrum', 'polygon']);

    if (error) throw error;

    const totalVolume = data?.reduce((sum, row) => sum + (row.volume_usd || 0), 0) || 0;
    
    res.json({ 
      success: true, 
      data: {
        rows: data?.length || 0,
        totalVolume,
        chains: [...new Set(data?.map(r => r.chain) || [])],
        recentDates: [...new Set(data?.map(r => r.date) || [])].slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/protocols/debug-sigma-raw
// Test exact same query as getEVMChainBreakdown
router.get('/debug-sigma-raw', async (req: Request, res: Response) => {
  try {
    console.log('SIGMA RAW DEBUG: Starting query...');
    
    const { data, error } = await supabase
      .from('protocol_stats')
      .select('chain, volume_usd')
      .eq('protocol_name', 'sigma')
      .eq('data_type', 'public') // Default to public data for EVM debug endpoint
      .in('chain', ['ethereum', 'base', 'bsc', 'avax', 'polygon', 'arbitrum']);

    console.log('SIGMA RAW DEBUG: Query completed', { 
      error: error?.message, 
      rowCount: data?.length,
      firstRow: data?.[0]
    });

    if (error) throw error;

    // Group by chain and calculate totals - exactly like getEVMChainBreakdown
    const chainTotals = data?.reduce((acc: Record<string, number>, row: any) => {
      const chain = row.chain;
      const volume = Number(row.volume_usd) || 0;
      
      if (!acc[chain]) {
        acc[chain] = 0;
      }
      acc[chain] += volume;
      
      return acc;
    }, {}) || {};

    const totalVolume = (Object.values(chainTotals) as number[]).reduce((sum: number, vol: number) => sum + vol, 0);
    
    const chainBreakdown = (Object.entries(chainTotals) as [string, number][])
      .map(([chain, volume]) => ({
        chain,
        volume,
        percentage: totalVolume > 0 ? (volume / totalVolume) * 100 : 0
      }))
      .sort((a, b) => b.volume - a.volume)
      .filter(item => item.volume > 0);

    const result = {
      lifetimeVolume: totalVolume,
      chainBreakdown,
      totalChains: chainBreakdown.length
    };

    console.log('SIGMA RAW DEBUG: Result', result);
    
    res.json({ 
      success: true, 
      data: result
    });
  } catch (error) {
    console.error('SIGMA RAW DEBUG: Error', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
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
    
    // Get all EVM protocols and sync them individually
    const evmProtocols = ['sigma_evm', 'maestro_evm', 'bloom_evm', 'banana_evm'];
    const results = [];
    
    for (const protocol of evmProtocols) {
      try {
        const result = await simpleEVMDataMigrationService.syncEVMProtocolData(protocol);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          protocol,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const totalRowsImported = results.reduce((sum, r) => sum + (r.rowsImported || 0), 0);
    const successfulSyncs = results.filter(r => r.success).length;
    
    res.json({
      success: successfulSyncs > 0,
      message: `EVM data sync completed: ${successfulSyncs}/${results.length} protocols successful`,
      data: {
        rowsImported: totalRowsImported,
        csvFilesFetched: successfulSyncs,
        timestamp: new Date().toISOString()
      }
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

// POST /api/protocols/sync-evm/:protocol
// Sync specific EVM protocol data
router.post('/sync-evm/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    console.log(`Starting simple EVM data sync for protocol: ${protocol}`);
    
    const result = await simpleEVMDataMigrationService.syncEVMProtocolData(protocol);
    
    res.json({
      success: true,
      message: `EVM data sync completed for ${protocol}`,
      data: result
    });
  } catch (error) {
    console.error(`Error in EVM data sync for ${req.params.protocol}:`, error);
    res.status(500).json({
      success: false,
      error: `EVM data sync failed for ${req.params.protocol}`,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/evm-weekly-metrics
// Get EVM weekly metrics for all protocols
router.get('/evm-weekly-metrics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, dataType } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'startDate and endDate parameters are required' 
      });
    }

    if (typeof startDate !== 'string' || typeof endDate !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'startDate and endDate must be strings in YYYY-MM-DD format' 
      });
    }

    console.log(`Fetching EVM weekly metrics from ${startDate} to ${endDate} with dataType: ${dataType || 'public'}`);
    const weeklyData = await getEVMWeeklyMetrics(startDate, endDate, typeof dataType === 'string' ? dataType : 'public');

    res.json({ success: true, data: weeklyData });
  } catch (error) {
    console.error('Error fetching EVM weekly metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch EVM weekly metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
