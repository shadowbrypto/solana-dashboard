import { Router, Request, Response } from 'express';
import { syncData, getSyncStatus } from '../services/dataUpdateService.js';
import { dataManagementService } from '../services/dataManagementService.js';

const router = Router();

// POST /api/data-update/sync
// Runs the update script to fetch CSV data and import to database
// Query params: dataType (optional - 'public', 'private')
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { dataType } = req.query;
    const dataTypeFilter = typeof dataType === 'string' ? dataType : 'private';
    
    console.log(`Starting data sync process for ${dataTypeFilter} data...`);
    
    const result = await syncData(dataTypeFilter);
    
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

// POST /api/data-update/sync/:protocol
// Sync data for a specific protocol
// Query params: dataType (optional - 'public', 'private')
router.post('/sync/:protocol', async (req: Request, res: Response) => {
  try {
    const { protocol } = req.params;
    const { dataType } = req.query;
    const dataTypeFilter = typeof dataType === 'string' ? dataType : 'private';
    
    if (!protocol) {
      return res.status(400).json({
        success: false,
        error: 'Protocol name is required'
      });
    }

    console.log(`Starting data sync for protocol: ${protocol} with ${dataTypeFilter} data...`);
    
    const result = await dataManagementService.syncProtocolData(protocol, dataTypeFilter);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Data sync completed successfully for ${protocol}`,
        data: {
          protocol,
          rowsImported: result.rowsImported,
          timestamp: result.timestamp
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        protocol
      });
    }
  } catch (error) {
    console.error(`Unexpected error in protocol sync:`, error);
    res.status(500).json({
      success: false,
      error: 'Unexpected error during protocol sync',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;