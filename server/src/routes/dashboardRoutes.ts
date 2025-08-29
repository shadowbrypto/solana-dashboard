import { Router, Request, Response } from 'express';
import dashboardService from '../services/dashboardService';

const router = Router();

// Get aggregated dashboard stats for all Solana protocols
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { dataType = 'private' } = req.query;
    
    const stats = await dashboardService.getDashboardStats(dataType as string);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;