import { Router, Request, Response } from 'express';
import { getProtocolStats, getTotalProtocolStats, getDailyMetrics } from '../services/protocolService.js';

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

// GET /api/protocols/health
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Protocol API is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
