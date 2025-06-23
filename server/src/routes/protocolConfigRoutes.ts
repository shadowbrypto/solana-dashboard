import { Router, Request, Response } from 'express';
import { 
  getProtocolConfigurations, 
  saveProtocolConfiguration, 
  saveProtocolConfigurations,
  deleteProtocolConfiguration,
  resetAllProtocolConfigurations,
  initializeProtocolConfigTable
} from '../services/protocolConfigService.js';

const router = Router();

// Initialize the table on server start
initializeProtocolConfigTable().catch(console.error);

// GET /api/protocol-config
// Get all protocol configurations
router.get('/', async (req: Request, res: Response) => {
  try {
    const configurations = await getProtocolConfigurations();
    res.json({ success: true, data: configurations });
  } catch (error) {
    console.error('Error fetching protocol configurations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch protocol configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/protocol-config
// Save multiple protocol configurations
router.post('/', async (req: Request, res: Response) => {
  try {
    const { configurations } = req.body;
    
    if (!configurations || !Array.isArray(configurations)) {
      return res.status(400).json({ 
        success: false, 
        error: 'configurations array is required' 
      });
    }

    // Validate configuration format
    for (const config of configurations) {
      if (!config.protocol_id || !config.category) {
        return res.status(400).json({ 
          success: false, 
          error: 'Each configuration must have protocol_id and category' 
        });
      }
    }

    const savedConfigurations = await saveProtocolConfigurations(configurations);
    res.json({ success: true, data: savedConfigurations });
  } catch (error) {
    console.error('Error saving protocol configurations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save protocol configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/protocol-config/:protocolId
// Save a single protocol configuration
router.put('/:protocolId', async (req: Request, res: Response) => {
  try {
    const { protocolId } = req.params;
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ 
        success: false, 
        error: 'category is required' 
      });
    }

    const savedConfiguration = await saveProtocolConfiguration(protocolId, category);
    res.json({ success: true, data: savedConfiguration });
  } catch (error) {
    console.error('Error saving protocol configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save protocol configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/protocol-config/:protocolId
// Delete a single protocol configuration (reset to default)
router.delete('/:protocolId', async (req: Request, res: Response) => {
  try {
    const { protocolId } = req.params;
    
    await deleteProtocolConfiguration(protocolId);
    res.json({ success: true, message: 'Protocol configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting protocol configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete protocol configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/protocol-config
// Reset all protocol configurations
router.delete('/', async (req: Request, res: Response) => {
  try {
    await resetAllProtocolConfigurations();
    res.json({ success: true, message: 'All protocol configurations reset successfully' });
  } catch (error) {
    console.error('Error resetting protocol configurations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset protocol configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/protocol-config/health
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Protocol Config API is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;