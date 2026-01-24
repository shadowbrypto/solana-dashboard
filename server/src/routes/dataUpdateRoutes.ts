import { Router, Request, Response } from 'express';
import { syncData, getSyncStatus } from '../services/dataUpdateService.js';
import { dataManagementService } from '../services/dataManagementService.js';
import { launchpadDataService } from '../services/launchpadDataService.js';
import { getProtocolsWithRollingRefresh, getProtocolsWithRollingRefreshByChain, getRollingRefreshSource } from '../config/rolling-refresh-config.js';
import { getProtocolsWithPublicRollingRefresh, getPublicRollingRefreshSource } from '../config/rolling-refresh-config-public.js';
import { protocolSyncStatusService } from '../services/protocolSyncStatusService.js';

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
          rowsImported: 0, // Solana sync doesn't import rows, just fetches CSV files
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

// POST /api/data-update/sync/launchpads
// Sync data for all launchpads
router.post('/sync/launchpads', async (req: Request, res: Response) => {
  try {
    console.log('Starting launchpad data sync...');
    
    const result = await launchpadDataService.syncData();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Launchpad data sync completed successfully',
        data: {
          csvFilesFetched: result.csvFilesFetched,
          rowsImported: result.rowsImported,
          timestamp: result.timestamp
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Unexpected error in launchpad sync:', error);
    res.status(500).json({
      success: false,
      error: 'Unexpected error during launchpad sync',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/data-update/sync/launchpad/:launchpadName
// Sync data for a specific launchpad
router.post('/sync/launchpad/:launchpadName', async (req: Request, res: Response) => {
  try {
    const { launchpadName } = req.params;
    
    if (!launchpadName) {
      return res.status(400).json({
        success: false,
        error: 'Launchpad name is required'
      });
    }

    console.log(`Starting data sync for launchpad: ${launchpadName}...`);
    
    const result = await launchpadDataService.syncLaunchpadData(launchpadName);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Data sync completed successfully for ${launchpadName}`,
        data: {
          launchpad: launchpadName,
          rowsImported: result.rowsImported,
          timestamp: result.timestamp
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        launchpad: launchpadName
      });
    }
  } catch (error) {
    console.error(`Unexpected error in launchpad sync:`, error);
    res.status(500).json({
      success: false,
      error: 'Unexpected error during launchpad sync',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/data-update/sync-rolling
// Sync data for protocols with rolling refresh configuration
// Query params: dataType (optional - 'public', 'private'), chain (optional - 'solana', 'evm', 'monad')
router.post('/sync-rolling', async (req: Request, res: Response) => {
  try {
    const { dataType, chain } = req.query;
    const dataTypeFilter = typeof dataType === 'string' ? dataType : 'private';
    const chainFilter = typeof chain === 'string' ? chain as 'solana' | 'evm' | 'monad' : undefined;

    console.log(`Starting rolling refresh sync for ${chainFilter || 'all'} protocols (${dataTypeFilter} data)...`);

    // Get protocols based on data type and chain filter
    let rollingProtocols: string[];
    if (dataTypeFilter === 'public') {
      rollingProtocols = getProtocolsWithPublicRollingRefresh();
    } else if (chainFilter) {
      rollingProtocols = getProtocolsWithRollingRefreshByChain(chainFilter);
    } else {
      rollingProtocols = getProtocolsWithRollingRefresh();
    }

    if (rollingProtocols.length === 0) {
      return res.json({
        success: true,
        message: `No protocols configured for ${dataTypeFilter} rolling refresh`,
        data: {
          dataType: dataTypeFilter,
          protocolsSynced: 0,
          results: [],
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log(`Found ${rollingProtocols.length} protocols with ${dataTypeFilter} rolling refresh config:`, rollingProtocols);

    // Sync each protocol
    const results = [];
    let successCount = 0;
    let totalRowsImported = 0;

    for (const protocol of rollingProtocols) {
      try {
        // Get the Dune query IDs for logging
        const source = dataTypeFilter === 'public'
          ? getPublicRollingRefreshSource(protocol)
          : getRollingRefreshSource(protocol);
        const queryIds = source?.queryIds?.join(', ') || 'N/A';
        console.log(`Syncing ${dataTypeFilter} rolling refresh data for ${protocol} (Dune ID: ${queryIds})...`);
        const result = await dataManagementService.syncProtocolData(protocol, dataTypeFilter);

        if (result.success) {
          successCount++;
          totalRowsImported += result.rowsImported;
          results.push({
            protocol,
            success: true,
            rowsImported: result.rowsImported
          });
          console.log(`✓ Successfully synced ${protocol}: ${result.rowsImported} rows`);
        } else {
          results.push({
            protocol,
            success: false,
            error: result.error
          });
          console.error(`✗ Failed to sync ${protocol}:`, result.error);
        }
      } catch (error) {
        results.push({
          protocol,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`✗ Error syncing ${protocol}:`, error);
      }
    }

    console.log(`Rolling refresh sync completed: ${successCount}/${rollingProtocols.length} ${dataTypeFilter} protocols synced successfully`);

    res.json({
      success: true,
      message: `Rolling refresh sync completed: ${successCount}/${rollingProtocols.length} ${dataTypeFilter} protocols synced successfully`,
      data: {
        dataType: dataTypeFilter,
        protocolsSynced: successCount,
        totalProtocols: rollingProtocols.length,
        totalRowsImported,
        results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Unexpected error in rolling refresh sync:', error);
    res.status(500).json({
      success: false,
      error: 'Unexpected error during rolling refresh sync',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/data-update/sync-public-rolling
// Sync public rolling refresh data for all configured protocols
router.post('/sync-public-rolling', async (req: Request, res: Response) => {
  try {
    console.log('Starting public rolling refresh sync for all configured protocols...');

    const rollingProtocols = getProtocolsWithPublicRollingRefresh();

    if (rollingProtocols.length === 0) {
      return res.json({
        success: true,
        message: 'No protocols configured for public rolling refresh',
        data: {
          protocolsSynced: 0,
          totalProtocols: 0,
          results: [],
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log(`Found ${rollingProtocols.length} protocols with public rolling refresh config:`, rollingProtocols);

    const results: Array<{ protocol: string; success: boolean; rowsImported?: number; error?: string }> = [];
    let successCount = 0;
    let totalRowsImported = 0;

    for (const protocol of rollingProtocols) {
      try {
        // Get the Dune query IDs for logging
        const source = getPublicRollingRefreshSource(protocol);
        const queryIds = source?.queryIds?.join(', ') || 'N/A';
        console.log(`Syncing public rolling refresh data for ${protocol} (Dune ID: ${queryIds})...`);
        const result = await dataManagementService.syncProtocolData(protocol, 'public');

        if (result.success) {
          successCount++;
          totalRowsImported += result.rowsImported;
          results.push({
            protocol,
            success: true,
            rowsImported: result.rowsImported
          });
          console.log(`✓ Successfully synced ${protocol}: ${result.rowsImported} rows`);
        } else {
          results.push({
            protocol,
            success: false,
            error: result.error
          });
          console.error(`✗ Failed to sync ${protocol}:`, result.error);
        }
      } catch (error) {
        results.push({
          protocol,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`✗ Error syncing ${protocol}:`, error);
      }
    }

    console.log(`Public rolling refresh sync completed: ${successCount}/${rollingProtocols.length} protocols synced successfully`);

    res.json({
      success: true,
      message: `Public rolling refresh sync completed: ${successCount}/${rollingProtocols.length} protocols synced successfully`,
      data: {
        protocolsSynced: successCount,
        totalProtocols: rollingProtocols.length,
        totalRowsImported,
        results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Unexpected error in public rolling refresh sync:', error);
    res.status(500).json({
      success: false,
      error: 'Unexpected error during public rolling refresh sync',
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

    // Get the Dune query IDs for logging
    const source = dataTypeFilter === 'public'
      ? getPublicRollingRefreshSource(protocol)
      : getRollingRefreshSource(protocol);
    const queryIds = source?.queryIds?.join(', ') || 'N/A';
    console.log(`Starting data sync for protocol: ${protocol} with ${dataTypeFilter} data (Dune ID: ${queryIds})...`);

    const result = await dataManagementService.syncProtocolData(protocol, dataTypeFilter);

    // Update sync status
    await protocolSyncStatusService.updateProtocolSyncStatus(
      protocol,
      result.success,
      result.rowsImported,
      result.error
    );

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