import { supabase } from './supabase';
import { ProtocolStats, ProtocolMetrics } from '../types/protocol';

export async function getProtocolStats(protocolName?: string) {
  let query = supabase
    .from('protocol_stats')
    .select('*');
  
  if (protocolName) {
    query = query.eq('protocol_name', protocolName);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching protocol stats:', error);
    return [];
  }

  return data.map((row: ProtocolStats) => ({
    ...row,
    formattedDay: formatDate(row.date),
  }));
}

export async function getTotalProtocolStats(protocolName?: string): Promise<ProtocolMetrics> {
  let query = supabase
    .from('protocol_stats')
    .select('volume_usd, daily_users, new_users, trades, fees_usd');

  if (protocolName) {
    query = query.eq('protocol_name', protocolName);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    console.error('Error fetching total protocol stats:', error);
    return {
      total_volume_usd: 0,
      daily_users: 0,
      numberOfNewUsers: 0,
      daily_trades: 0,
      total_fees_usd: 0
    };
  }

  const metrics: ProtocolMetrics = {
    total_volume_usd: data.reduce((sum, row) => sum + (Number(row.volume_usd) || 0), 0),
    daily_users: data.reduce((sum, row) => sum + (Number(row.daily_users) || 0), 0),
    numberOfNewUsers: data.reduce((sum, row) => sum + (Number(row.new_users) || 0), 0),
    daily_trades: data.reduce((sum, row) => sum + (Number(row.trades) || 0), 0),
    total_fees_usd: data.reduce((sum, row) => sum + (Number(row.fees_usd) || 0), 0)
  };

  return metrics;
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}
