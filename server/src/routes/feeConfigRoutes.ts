import { Router, Request, Response } from 'express';
import { PROTOCOL_FEES, getProtocolFee, getProtocolsWithFees } from '../config/fee-config.js';

const router = Router();

// GET /api/fee-config
// Get all protocol fee configurations
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: PROTOCOL_FEES
    });
  } catch (error) {
    console.error('Error fetching fee configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fee configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/fee-config/:protocolId
// Get fee for a specific protocol
router.get('/:protocolId', async (req: Request, res: Response) => {
  try {
    const { protocolId } = req.params;
    const fee = getProtocolFee(protocolId);

    res.json({
      success: true,
      data: {
        protocolId,
        fee
      }
    });
  } catch (error) {
    console.error('Error fetching protocol fee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch protocol fee',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
