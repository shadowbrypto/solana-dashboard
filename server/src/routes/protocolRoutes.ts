import { Router, Request, Response } from 'express';
import { getProtocolStats, getTotalProtocolStats, getDailyMetrics, getAggregatedProtocolStats, generateWeeklyInsights } from '../services/protocolService.js';
import { protocolSyncStatusService } from '../services/protocolSyncStatusService.js';
import { evmDataMigrationService } from '../services/evmDataMigrationService.js';

const router = Router();

// GET /api/protocols/stats
// Query params: protocol (optional, can be single string or comma-separated list)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.query;
    
    let protocolName: string | string[] | undefined;
    if (protocol) {
      if (typeof protocol === 'string') {
        protocolName = protocol.includes(',') ? protocol.split(',').map(p => p.trim()) : protocol;
      } else if (Array.isArray(protocol)) {
        protocolName = protocol.filter(p => typeof p === 'string') as string[];
      }
    }

    const stats = await getProtocolStats(protocolName);
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
// Query params: protocol (optional)
router.get('/total-stats', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.query;
    const protocolName = typeof protocol === 'string' ? protocol : undefined;

    const totalStats = await getTotalProtocolStats(protocolName);
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
    const aggregatedStats = await getAggregatedProtocolStats();
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

// GET /api/protocols/health
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Protocol API is healthy',
    timestamp: new Date().toISOString()
  });
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

// POST /api/protocols/sync-evm
// Sync all EVM protocol data
router.post('/sync-evm', async (req: Request, res: Response) => {
  try {
    console.log('Starting EVM data sync...');
    const result = await evmDataMigrationService.syncAllEVMData();
    
    res.json({
      success: true,
      message: 'EVM data sync completed',
      data: result
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
    console.log(`Starting EVM data sync for protocol: ${protocol}`);
    
    const result = await evmDataMigrationService.syncEVMProtocolData(protocol);
    
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

export default router;
