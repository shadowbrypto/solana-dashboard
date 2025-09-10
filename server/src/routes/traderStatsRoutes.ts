import express, { Request, Response } from 'express';
import TraderStatsService from '../services/traderStatsService.js';
import DuneTraderStatsService from '../services/duneTraderStatsService.js';
import { format, parseISO, isValid } from 'date-fns';

const router = express.Router();

// Get trader stats for a specific protocol
router.get('/protocol/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

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

    const limitNum = parseInt(limit as string);
    const data = await TraderStatsService.getTraderStats(
      protocol,
      start,
      end,
      limitNum === 0 ? undefined : limitNum // Pass undefined for no limit
    );

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching trader stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trader stats'
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

export default router;