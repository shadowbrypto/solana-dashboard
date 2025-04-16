import { supabase } from './supabase';
import { ProtocolStats } from '../types/protocol';

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

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}
