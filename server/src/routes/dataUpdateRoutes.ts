import { Router, Request, Response } from 'express';
import { syncData, getSyncStatus } from '../services/dataUpdateService.js';

const router = Router();

// POST /api/data-update/sync
// Runs the update script to fetch CSV data and import to database
router.post('/sync', async (req: Request, res: Response) => {
  try {
    console.log('Starting data sync process...');
    
    const result = await syncData();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Data sync completed successfully',
        data: {
          csvFilesFetched: result.csvFilesFetched,
          timestamp: result.timestamp
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        step: result.step
      });
    }
  } catch (error) {
    console.error('Unexpected error in data sync:', error);
    res.status(500).json({
      success: false,
      error: 'Unexpected error during data sync',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/data-update/status
// Returns the last sync status and timestamp
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await getSyncStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check sync status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;