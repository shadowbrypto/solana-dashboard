import { Router, Request, Response } from 'express';
import { PROTOCOL_FEES, getProtocolFee, getProtocolsWithFees } from '../config/fee-config.js';
import { db } from '../lib/db.js';

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

// GET /api/fee-config/net-fees
// Calculate net fees from November 1st to November 10th, 2025
// Solana chain only - filters by chain='solana'
// Most protocols use fees_usd and volume_usd from protocol_stats (private data)
// Bonkbot, telemetry, and banana use fees_usd from projected_stats, volume_usd from protocol_stats
router.get('/net-fees', async (req: Request, res: Response) => {
  try {
    // Fixed date range: November 1st to November 10th, 2025
    const startDate = '2025-11-01';
    const endDate = '2025-11-10';

    // Protocols that use projected_stats for fees (exceptions)
    const projectedStatsProtocols = ['bonkbot', 'telemetry', 'banana'];

    console.log(`Calculating net fees from ${startDate} to ${endDate}`);
    console.log(`Protocols using projected_stats for fees: ${projectedStatsProtocols.join(', ')}`);
    console.log(`All other protocols use both fees_usd and volume_usd from protocol_stats (private data)`);

    // Query projected_stats for fees_usd (only for bonkbot, telemetry, and banana)
    const projectedStatsData = await db.query<{
      protocol_name: string;
      fees_usd: number;
      formatted_day: string;
    }>(`
      SELECT protocol_name, fees_usd, formatted_day
      FROM projected_stats
      WHERE formatted_day >= ? AND formatted_day <= ?
      ORDER BY protocol_name
    `, [startDate, endDate]);

    // Query protocol_stats for volume_usd (all protocols) and fees_usd (all except bonkbot/telemetry/banana)
    const protocolStatsData = await db.query<{
      protocol_name: string;
      volume_usd: number;
      fees_usd: number;
      date: string;
    }>(`
      SELECT protocol_name, volume_usd, fees_usd, date
      FROM protocol_stats
      WHERE data_type = 'private'
        AND chain = 'solana'
        AND date >= ? AND date <= ?
        AND volume_usd > 0
      ORDER BY protocol_name
    `, [startDate, endDate]);

    console.log(`Found ${projectedStatsData?.length || 0} records from projected_stats (fees for bonkbot/telemetry/banana)`);
    console.log(`Found ${protocolStatsData?.length || 0} records from protocol_stats (volume + fees)`);

    // Calculate average net fee per protocol with detailed breakdown
    const netFees: Record<string, number> = {};
    const protocolData: Record<string, { totalFees: number; totalVolume: number }> = {};
    const protocolDailyData: Record<string, Array<{ date: string; fees: number; volume: number }>> = {};
    const protocolDetails: Record<string, {
      totalFees: number;
      totalVolume: number;
      netFeePercentage: number;
      dateRange: { start: string; end: string };
      feesSource: string;
      volumeSource: string;
      dailyBreakdown: Array<{ date: string; fees: number; volume: number; feePercentage: number }>;
    }> = {};

    // Process projected_stats data for fees (only bonkbot, telemetry, and banana)
    projectedStatsData?.forEach(row => {
      const protocol = row.protocol_name.toLowerCase();

      // Only process bonkbot, telemetry, and banana - all others use protocol_stats for fees
      if (!projectedStatsProtocols.includes(protocol)) {
        return;
      }

      if (!protocolData[protocol]) {
        protocolData[protocol] = { totalFees: 0, totalVolume: 0 };
      }
      if (!protocolDailyData[protocol]) {
        protocolDailyData[protocol] = [];
      }

      protocolData[protocol].totalFees += row.fees_usd || 0;

      // Track daily fees
      const existingDay = protocolDailyData[protocol].find(d => d.date === row.formatted_day);
      if (existingDay) {
        existingDay.fees += row.fees_usd || 0;
      } else {
        protocolDailyData[protocol].push({
          date: row.formatted_day,
          fees: row.fees_usd || 0,
          volume: 0
        });
      }
    });

    // Process protocol_stats data
    protocolStatsData?.forEach(row => {
      const protocol = row.protocol_name.toLowerCase();

      if (!protocolData[protocol]) {
        protocolData[protocol] = { totalFees: 0, totalVolume: 0 };
      }
      if (!protocolDailyData[protocol]) {
        protocolDailyData[protocol] = [];
      }

      // Always add volume
      protocolData[protocol].totalVolume += row.volume_usd || 0;

      // Track daily volume
      const existingDay = protocolDailyData[protocol].find(d => d.date === row.date);
      if (existingDay) {
        existingDay.volume += row.volume_usd || 0;
      } else {
        protocolDailyData[protocol].push({
          date: row.date,
          fees: 0,
          volume: row.volume_usd || 0
        });
      }

      // Add fees for all protocols except bonkbot, telemetry, and banana (they use projected_stats)
      if (!projectedStatsProtocols.includes(protocol)) {
        protocolData[protocol].totalFees += row.fees_usd || 0;

        // Track daily fees
        const dayForFees = protocolDailyData[protocol].find(d => d.date === row.date);
        if (dayForFees) {
          dayForFees.fees += row.fees_usd || 0;
        }
      }
    });

    // Calculate net fee percentage for each protocol and create detailed breakdown
    Object.keys(protocolData).forEach(protocol => {
      const { totalFees, totalVolume } = protocolData[protocol];
      if (totalVolume > 0) {
        const netFeePercentage = (totalFees / totalVolume) * 100;
        netFees[protocol] = netFeePercentage;

        // Calculate daily breakdown with fee percentages
        const dailyBreakdown = (protocolDailyData[protocol] || [])
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(day => ({
            date: day.date,
            fees: day.fees,
            volume: day.volume,
            feePercentage: day.volume > 0 ? (day.fees / day.volume) * 100 : 0
          }));

        protocolDetails[protocol] = {
          totalFees,
          totalVolume,
          netFeePercentage,
          dateRange: { start: startDate, end: endDate },
          feesSource: projectedStatsProtocols.includes(protocol) ? 'projected_stats' : 'protocol_stats',
          volumeSource: 'protocol_stats',
          dailyBreakdown
        };
      }
    });

    console.log(`Calculated net fees for ${Object.keys(netFees).length} protocols`);

    res.json({
      success: true,
      data: netFees,
      details: protocolDetails,
      metadata: {
        dateRange: { start: startDate, end: endDate },
        totalProtocols: Object.keys(netFees).length
      }
    });
  } catch (error) {
    console.error('Error calculating net fees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate net fees',
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
