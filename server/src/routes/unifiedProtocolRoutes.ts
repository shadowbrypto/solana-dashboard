import { Router, Request, Response } from 'express';
import { unifiedProtocolService, StandardQueryParams, UnifiedProtocolService } from '../services/unifiedProtocolService.js';

const router = Router();

// GET /api/protocols/metrics
// Unified endpoint for all protocol metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const params: StandardQueryParams = {
      chain: req.query.chain as any,
      protocol: req.query.protocol as string | string[],
      date: req.query.date as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      timeframe: req.query.timeframe as any
    };
    
    // Handle comma-separated protocols
    if (typeof params.protocol === 'string' && params.protocol.includes(',')) {
      params.protocol = params.protocol.split(',').map(p => p.trim());
    }
    
    const result = await unifiedProtocolService.getMetrics(params);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in unified metrics endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/daily
// Unified endpoint for daily metrics
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const params: StandardQueryParams = {
      chain: req.query.chain as any,
      protocol: req.query.protocol as string | string[],
      date: req.query.date as string
    };
    
    if (!params.date) {
      return res.status(400).json({
        success: false,
        error: 'date parameter is required for daily metrics'
      });
    }
    
    // Handle comma-separated protocols
    if (typeof params.protocol === 'string' && params.protocol.includes(',')) {
      params.protocol = params.protocol.split(',').map(p => p.trim());
    }
    
    const result = await unifiedProtocolService.getDailyMetrics(params);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in unified daily metrics endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/weekly
// Unified endpoint for weekly metrics
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const params: StandardQueryParams = {
      chain: req.query.chain as any,
      protocol: req.query.protocol as string | string[],
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };
    
    if (!params.startDate || !params.endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate parameters are required for weekly metrics'
      });
    }
    
    // Handle comma-separated protocols
    if (typeof params.protocol === 'string' && params.protocol.includes(',')) {
      params.protocol = params.protocol.split(',').map(p => p.trim());
    }
    
    const result = await unifiedProtocolService.getWeeklyMetrics(params);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in unified weekly metrics endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/chain-breakdown
// Unified endpoint for chain breakdown (primarily for EVM protocols)
router.get('/chain-breakdown', async (req: Request, res: Response) => {
  try {
    const params: StandardQueryParams = {
      protocol: req.query.protocol as string,
      chain: req.query.chain as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      timeframe: req.query.timeframe as any
    };
    
    if (!params.protocol) {
      return res.status(400).json({
        success: false,
        error: 'protocol parameter is required for chain breakdown'
      });
    }
    
    const result = await unifiedProtocolService.getChainBreakdown(params);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in unified chain breakdown endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocols/trends
// Unified endpoint for trend analysis
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const params: StandardQueryParams = {
      chain: req.query.chain as any,
      protocol: req.query.protocol as string | string[],
      timeframe: req.query.timeframe as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };
    
    // Default to 30 days if no timeframe or date range specified
    if (!params.timeframe && !params.startDate && !params.endDate) {
      params.timeframe = '30d';
    }
    
    // Handle comma-separated protocols
    if (typeof params.protocol === 'string' && params.protocol.includes(',')) {
      params.protocol = params.protocol.split(',').map(p => p.trim());
    }
    
    const result = await unifiedProtocolService.getMetrics(params);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Group data by date for trend analysis
    const trendData = result.data?.reduce((acc: any, row: any) => {
      const date = row.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          protocols: {},
          totalVolume: 0,
          totalUsers: 0,
          totalTrades: 0
        };
      }
      
      const protocol = row.protocol_name;
      if (!acc[date].protocols[protocol]) {
        acc[date].protocols[protocol] = {
          volume: 0,
          users: 0,
          trades: 0,
          chains: []
        };
      }
      
      acc[date].protocols[protocol].volume += Number(row.volume_usd) || 0;
      acc[date].protocols[protocol].users += Number(row.daily_users) || 0;
      acc[date].protocols[protocol].trades += Number(row.trades) || 0;
      acc[date].protocols[protocol].chains.push(row.chain);
      
      acc[date].totalVolume += Number(row.volume_usd) || 0;
      acc[date].totalUsers += Number(row.daily_users) || 0;
      acc[date].totalTrades += Number(row.trades) || 0;
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    const trendsArray = Object.values(trendData || {}).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    res.json({
      success: true,
      data: trendsArray,
      metadata: {
        ...result.metadata,
        totalRecords: trendsArray.length
      }
    });
  } catch (error) {
    console.error('Error in unified trends endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/protocols/clear-cache
// Clear cache endpoint
router.post('/clear-cache', async (req: Request, res: Response) => {
  try {
    const { pattern } = req.body;
    
    UnifiedProtocolService.clearCache(pattern);
    
    res.json({
      success: true,
      message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;