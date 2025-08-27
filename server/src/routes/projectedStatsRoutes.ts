import express from 'express';
import { 
  getProjectedStats, 
  getProjectedStatsForDate, 
  updateAllProjectedData,
  getLatestProjectedVolumes,
  getMonthlyAdjustedVolumes
} from '../services/projectedStatsService';

const router = express.Router();

/**
 * GET /api/projected-stats
 * Get projected stats with optional filters
 * Query params: protocols (comma-separated), startDate, endDate
 */
router.get('/projected-stats', async (req, res) => {
  try {
    const { protocols, startDate, endDate } = req.query;
    
    let protocolNames: string[] | undefined;
    if (protocols && typeof protocols === 'string') {
      protocolNames = protocols.split(',').map(p => p.trim());
    }

    const data = await getProjectedStats(
      protocolNames,
      startDate as string,
      endDate as string
    );

    res.json(data);
  } catch (error) {
    console.error('Error fetching projected stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch projected stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/projected-stats/date/:date
 * Get projected stats for a specific date
 */
router.get('/projected-stats/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const data = await getProjectedStatsForDate(date);
    res.json(data);
  } catch (error) {
    console.error('Error fetching projected stats for date:', error);
    res.status(500).json({ 
      error: 'Failed to fetch projected stats for date',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/projected-stats/latest-volumes
 * Get latest projected volumes for all protocols
 */
router.get('/projected-stats/latest-volumes', async (req, res) => {
  try {
    const data = await getLatestProjectedVolumes();
    res.json(data);
  } catch (error) {
    console.error('Error fetching latest projected volumes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch latest projected volumes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/projected-stats/monthly/:year/:month
 * Get monthly adjusted volumes for all protocols
 */
router.get('/projected-stats/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month parameters are required' });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid year or month parameter' });
    }

    const data = await getMonthlyAdjustedVolumes(yearNum, monthNum);
    res.json(data);
  } catch (error) {
    console.error('Error fetching monthly adjusted volumes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch monthly adjusted volumes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/projected-stats/update
 * Trigger update of projected data from Dune
 */
router.post('/projected-stats/update', async (req, res) => {
  try {
    console.log('Projected stats update endpoint called');
    console.log('Environment check:', {
      hasDuneApiKey: !!process.env.DUNE_API_KEY,
      nodeEnv: process.env.NODE_ENV
    });
    
    const result = await updateAllProjectedData();
    res.json({ 
      message: `Projected data update completed successfully. Updated ${result.successCount} out of ${result.totalCount} protocols.`,
      successCount: result.successCount,
      totalCount: result.totalCount,
      protocols: result.protocols
    });
  } catch (error) {
    console.error('Error updating projected data:', error);
    res.status(500).json({ 
      error: 'Failed to update projected data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;