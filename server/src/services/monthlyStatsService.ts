import { supabase } from '../config/supabase.js';
import { startOfMonth, endOfMonth, format, subMonths, eachMonthOfInterval } from 'date-fns';

interface MonthlyStatsResponse {
  protocols: {
    [protocol: string]: {
      total_volume_usd: number;
      numberOfNewUsers: number;
      daily_trades: number;
      total_fees_usd: number;
      market_share: number;
      adjusted_volume: number;
      monthly_growth: number;
      monthly_trend: {
        data: Array<{ month: number; value: number }>;
        trend: 'up' | 'down' | 'neutral';
      };
    };
  };
  categories: {
    [categoryName: string]: {
      total_volume_usd: number;
      numberOfNewUsers: number;
      daily_trades: number;
      total_fees_usd: number;
      market_share: number;
      adjusted_volume: number;
      monthly_growth: number;
      monthly_trend: {
        data: Array<{ month: number; value: number }>;
        trend: 'up' | 'down' | 'neutral';
      };
      protocols: string[];
    };
  };
  totals: {
    total_volume_usd: number;
    numberOfNewUsers: number;
    daily_trades: number;
    total_fees_usd: number;
    adjusted_volume: number;
    monthly_growth: number;
    monthly_trend: {
      data: Array<{ month: number; value: number }>;
      trend: 'up' | 'down' | 'neutral';
    };
  };
  topProtocols: string[];
  projectedVolumeData: { [protocol: string]: number };
}

interface ProtocolConfig {
  id: string;
  category: string;
  chain: string;
}

// Protocol configurations - this should match the frontend config
const PROTOCOL_CONFIGS: ProtocolConfig[] = [
  // Solana protocols
  { id: 'slingshot', category: 'Trading Terminals', chain: 'solana' },
  { id: 'photon', category: 'Trading Terminals', chain: 'solana' },
  { id: 'bullx', category: 'Trading Terminals', chain: 'solana' },
  { id: 'moonshot', category: 'Trading Terminals', chain: 'solana' },
  { id: 'maestro', category: 'Telegram Bots', chain: 'solana' },
  { id: 'trojan', category: 'Telegram Bots', chain: 'solana' },
  { id: 'bonkbot', category: 'Telegram Bots', chain: 'solana' },
  { id: 'sol_trading_bot', category: 'Telegram Bots', chain: 'solana' },
  { id: 'banana_gun', category: 'Telegram Bots', chain: 'solana' },
  { id: 'pepeboost', category: 'Telegram Bots', chain: 'solana' },
  { id: 'mango', category: 'Mobile Apps', chain: 'solana' },
  { id: 'drift', category: 'Mobile Apps', chain: 'solana' },
  { id: 'jupiter', category: 'Mobile Apps', chain: 'solana' },
  { id: 'kamino', category: 'Mobile Apps', chain: 'solana' },
];

const CATEGORIES = {
  'Trading Terminals': ['slingshot', 'photon', 'bullx', 'moonshot'],
  'Telegram Bots': ['maestro', 'trojan', 'bonkbot', 'sol_trading_bot', 'banana_gun', 'pepeboost'],
  'Mobile Apps': ['mango', 'drift', 'jupiter', 'kamino']
};

export class MonthlyStatsService {
  static async getMonthlyStats(
    date: Date,
    chain: string = 'solana',
    dataType: string = 'public'
  ): Promise<MonthlyStatsResponse> {
    try {
      const currentMonthStart = startOfMonth(date);
      const currentMonthEnd = endOfMonth(date);
      const previousMonthStart = startOfMonth(subMonths(date, 1));
      const previousMonthEnd = endOfMonth(subMonths(date, 1));

      console.log(`Monthly Stats Service: Fetching data for ${format(date, 'yyyy-MM')} (${chain}/${dataType})`);

      // Get current month data
      const { data: currentMonthData, error: currentError } = await supabase
        .from('protocol_stats')
        .select('*')
        .eq('chain', chain)
        .eq('data_type', dataType)
        .gte('date', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(currentMonthEnd, 'yyyy-MM-dd'));

      if (currentError) {
        throw new Error(`Error fetching current month data: ${currentError.message}`);
      }

      // Get previous month data for growth calculations
      const { data: previousMonthData, error: previousError } = await supabase
        .from('protocol_stats')
        .select('*')
        .eq('chain', chain)
        .eq('data_type', dataType)
        .gte('date', format(previousMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(previousMonthEnd, 'yyyy-MM-dd'));

      if (previousError) {
        throw new Error(`Error fetching previous month data: ${previousError.message}`);
      }

      // Get last 6 months data for trend analysis
      const last6Months = eachMonthOfInterval({
        start: subMonths(date, 5),
        end: date
      });

      const trendDataPromises = last6Months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        
        const { data: monthData, error } = await supabase
          .from('protocol_stats')
          .select('*')
          .eq('chain', chain)
          .eq('data_type', dataType)
          .gte('date', format(monthStart, 'yyyy-MM-dd'))
          .lte('date', format(monthEnd, 'yyyy-MM-dd'));

        if (error) {
          console.error(`Error fetching trend data for ${format(month, 'yyyy-MM')}:`, error);
          return { month: format(month, 'yyyy-MM'), data: [] };
        }

        return { month: format(month, 'yyyy-MM'), data: monthData || [] };
      });

      const trendResults = await Promise.all(trendDataPromises);

      // Get projected volume data
      const projectedVolumeData = await this.getProjectedVolumeData(date);

      // Process all the data
      const result = this.processMonthlyData(
        currentMonthData || [],
        previousMonthData || [],
        trendResults,
        projectedVolumeData
      );

      console.log(`Monthly Stats Service: Processed ${Object.keys(result.protocols).length} protocols`);
      
      return result;
    } catch (error) {
      console.error('Monthly Stats Service Error:', error);
      throw error;
    }
  }

  private static async getProjectedVolumeData(date: Date): Promise<{ [protocol: string]: number }> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const { data, error } = await supabase
        .from('projected_monthly_volumes')
        .select('*')
        .eq('year', year)
        .eq('month', month);

      if (error) {
        console.error('Error fetching projected volume data:', error);
        return {};
      }

      const projectedVolumeMap: { [protocol: string]: number } = {};
      data?.forEach(row => {
        projectedVolumeMap[row.protocol] = row.projected_volume_usd || 0;
      });

      return projectedVolumeMap;
    } catch (error) {
      console.error('Error fetching projected volume data:', error);
      return {};
    }
  }

  private static processMonthlyData(
    currentData: any[],
    previousData: any[],
    trendData: Array<{ month: string; data: any[] }>,
    projectedVolumeData: { [protocol: string]: number }
  ): MonthlyStatsResponse {
    // Get all protocols from the data
    const allProtocols = [...new Set([
      ...currentData.map(d => d.protocol),
      ...previousData.map(d => d.protocol)
    ])].filter(p => PROTOCOL_CONFIGS.find(config => config.id === p));

    // Aggregate current month data by protocol
    const currentAggregated: { [protocol: string]: any } = {};
    allProtocols.forEach(protocol => {
      const protocolData = currentData.filter(d => d.protocol === protocol);
      currentAggregated[protocol] = {
        total_volume_usd: protocolData.reduce((sum, d) => sum + (d.total_volume_usd || 0), 0),
        numberOfNewUsers: protocolData.reduce((sum, d) => sum + (d.numberOfNewUsers || 0), 0),
        daily_trades: protocolData.reduce((sum, d) => sum + (d.daily_trades || 0), 0),
        total_fees_usd: protocolData.reduce((sum, d) => sum + (d.total_fees_usd || 0), 0),
      };
    });

    // Aggregate previous month data by protocol
    const previousAggregated: { [protocol: string]: any } = {};
    allProtocols.forEach(protocol => {
      const protocolData = previousData.filter(d => d.protocol === protocol);
      previousAggregated[protocol] = {
        total_volume_usd: protocolData.reduce((sum, d) => sum + (d.total_volume_usd || 0), 0),
        numberOfNewUsers: protocolData.reduce((sum, d) => sum + (d.numberOfNewUsers || 0), 0),
        daily_trades: protocolData.reduce((sum, d) => sum + (d.daily_trades || 0), 0),
        total_fees_usd: protocolData.reduce((sum, d) => sum + (d.total_fees_usd || 0), 0),
      };
    });

    // Calculate total volume for market share calculations
    const totalVolume = Object.values(currentAggregated)
      .reduce((sum, data: any) => sum + (data.total_volume_usd || 0), 0);

    // Process trend data
    const trendByProtocol: { [protocol: string]: Array<{ month: number; value: number }> } = {};
    allProtocols.forEach(protocol => {
      trendByProtocol[protocol] = trendData.map((monthData, index) => {
        const protocolMonthData = monthData.data.filter(d => d.protocol === protocol);
        const monthlyVolume = protocolMonthData.reduce((sum, d) => sum + (d.total_volume_usd || 0), 0);
        return { month: index, value: monthlyVolume };
      });
    });

    // Build protocol results
    const protocols: { [protocol: string]: any } = {};
    allProtocols.forEach(protocol => {
      const current = currentAggregated[protocol] || {};
      const previous = previousAggregated[protocol] || {};
      const trend = this.calculateTrend(trendByProtocol[protocol]);
      
      // Calculate adjusted volume
      let adjustedVolume = 0;
      const projectedVolume = projectedVolumeData[protocol];
      const protocolConfig = PROTOCOL_CONFIGS.find(c => c.id === protocol);
      
      if (projectedVolume && projectedVolume > 0) {
        adjustedVolume = projectedVolume;
      } else if (protocolConfig?.category === 'Mobile Apps') {
        adjustedVolume = current.total_volume_usd || 0;
      }

      protocols[protocol] = {
        total_volume_usd: current.total_volume_usd || 0,
        numberOfNewUsers: current.numberOfNewUsers || 0,
        daily_trades: current.daily_trades || 0,
        total_fees_usd: current.total_fees_usd || 0,
        market_share: totalVolume > 0 ? (current.total_volume_usd || 0) / totalVolume : 0,
        adjusted_volume: adjustedVolume,
        monthly_growth: this.calculateGrowth(current.total_volume_usd || 0, previous.total_volume_usd || 0),
        monthly_trend: {
          data: trendByProtocol[protocol] || [],
          trend: trend
        }
      };
    });

    // Build category results
    const categories: { [categoryName: string]: any } = {};
    Object.entries(CATEGORIES).forEach(([categoryName, categoryProtocols]) => {
      const availableProtocols = categoryProtocols.filter(p => allProtocols.includes(p));
      
      if (availableProtocols.length === 0) return;

      // Aggregate category data
      const categoryCurrentData = availableProtocols.reduce((acc, protocol) => {
        const data = currentAggregated[protocol] || {};
        return {
          total_volume_usd: acc.total_volume_usd + (data.total_volume_usd || 0),
          numberOfNewUsers: acc.numberOfNewUsers + (data.numberOfNewUsers || 0),
          daily_trades: acc.daily_trades + (data.daily_trades || 0),
          total_fees_usd: acc.total_fees_usd + (data.total_fees_usd || 0),
        };
      }, { total_volume_usd: 0, numberOfNewUsers: 0, daily_trades: 0, total_fees_usd: 0 });

      const categoryPreviousData = availableProtocols.reduce((acc, protocol) => {
        const data = previousAggregated[protocol] || {};
        return {
          total_volume_usd: acc.total_volume_usd + (data.total_volume_usd || 0),
          numberOfNewUsers: acc.numberOfNewUsers + (data.numberOfNewUsers || 0),
          daily_trades: acc.daily_trades + (data.daily_trades || 0),
          total_fees_usd: acc.total_fees_usd + (data.total_fees_usd || 0),
        };
      }, { total_volume_usd: 0, numberOfNewUsers: 0, daily_trades: 0, total_fees_usd: 0 });

      // Calculate category trend
      const categoryTrendData = trendData.map((monthData, index) => {
        const monthlyVolume = availableProtocols.reduce((sum, protocol) => {
          const protocolMonthData = monthData.data.filter(d => d.protocol === protocol);
          return sum + protocolMonthData.reduce((pSum, d) => pSum + (d.total_volume_usd || 0), 0);
        }, 0);
        return { month: index, value: monthlyVolume };
      });

      // Calculate category adjusted volume
      const categoryAdjustedVolume = availableProtocols.reduce((sum, protocol) => {
        return sum + (protocols[protocol]?.adjusted_volume || 0);
      }, 0);

      categories[categoryName] = {
        total_volume_usd: categoryCurrentData.total_volume_usd,
        numberOfNewUsers: categoryCurrentData.numberOfNewUsers,
        daily_trades: categoryCurrentData.daily_trades,
        total_fees_usd: categoryCurrentData.total_fees_usd,
        market_share: totalVolume > 0 ? categoryCurrentData.total_volume_usd / totalVolume : 0,
        adjusted_volume: categoryAdjustedVolume,
        monthly_growth: this.calculateGrowth(
          categoryCurrentData.total_volume_usd,
          categoryPreviousData.total_volume_usd
        ),
        monthly_trend: {
          data: categoryTrendData,
          trend: this.calculateTrend(categoryTrendData)
        },
        protocols: availableProtocols
      };
    });

    // Calculate totals
    const totalCurrentData = allProtocols.reduce((acc, protocol) => {
      const data = currentAggregated[protocol] || {};
      return {
        total_volume_usd: acc.total_volume_usd + (data.total_volume_usd || 0),
        numberOfNewUsers: acc.numberOfNewUsers + (data.numberOfNewUsers || 0),
        daily_trades: acc.daily_trades + (data.daily_trades || 0),
        total_fees_usd: acc.total_fees_usd + (data.total_fees_usd || 0),
      };
    }, { total_volume_usd: 0, numberOfNewUsers: 0, daily_trades: 0, total_fees_usd: 0 });

    const totalPreviousData = allProtocols.reduce((acc, protocol) => {
      const data = previousAggregated[protocol] || {};
      return {
        total_volume_usd: acc.total_volume_usd + (data.total_volume_usd || 0),
        numberOfNewUsers: acc.numberOfNewUsers + (data.numberOfNewUsers || 0),
        daily_trades: acc.daily_trades + (data.daily_trades || 0),
        total_fees_usd: acc.total_fees_usd + (data.total_fees_usd || 0),
      };
    }, { total_volume_usd: 0, numberOfNewUsers: 0, daily_trades: 0, total_fees_usd: 0 });

    // Calculate total trend
    const totalTrendData = trendData.map((monthData, index) => {
      const monthlyVolume = allProtocols.reduce((sum, protocol) => {
        const protocolMonthData = monthData.data.filter(d => d.protocol === protocol);
        return sum + protocolMonthData.reduce((pSum, d) => pSum + (d.total_volume_usd || 0), 0);
      }, 0);
      return { month: index, value: monthlyVolume };
    });

    const totalAdjustedVolume = Object.values(protocols)
      .reduce((sum, data: any) => sum + (data.adjusted_volume || 0), 0);

    // Get top 3 protocols by volume
    const topProtocols = Object.entries(protocols)
      .filter(([_, data]: [string, any]) => data.total_volume_usd > 0)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.total_volume_usd - a.total_volume_usd)
      .slice(0, 3)
      .map(([protocol]) => protocol);

    return {
      protocols,
      categories,
      totals: {
        total_volume_usd: totalCurrentData.total_volume_usd,
        numberOfNewUsers: totalCurrentData.numberOfNewUsers,
        daily_trades: totalCurrentData.daily_trades,
        total_fees_usd: totalCurrentData.total_fees_usd,
        adjusted_volume: totalAdjustedVolume,
        monthly_growth: this.calculateGrowth(
          totalCurrentData.total_volume_usd,
          totalPreviousData.total_volume_usd
        ),
        monthly_trend: {
          data: totalTrendData,
          trend: this.calculateTrend(totalTrendData)
        }
      },
      topProtocols,
      projectedVolumeData
    };
  }

  private static calculateTrend(data: Array<{ month: number; value: number }>): 'up' | 'down' | 'neutral' {
    if (data.length < 2) return 'neutral';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
    
    if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
    if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
    return 'neutral';
  }

  private static calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return 0;
    return (current - previous) / previous;
  }
}