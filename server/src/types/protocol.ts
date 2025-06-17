export interface ProtocolStats {
  id: number;
  protocol_name: string;
  date: string;
  volume_usd: number;
  daily_users: number;
  new_users: number;
  trades: number;
  fees_usd: number;
  created_at: string;
  formattedDay?: string;
}

export interface ProtocolMetrics {
  total_volume_usd: number;
  daily_users: number;
  numberOfNewUsers: number;
  daily_trades: number;
  total_fees_usd: number;
}

export type Protocol = 
  | 'bullx'
  | 'photon'
  | 'trojan'
  | 'axiom'
  | 'gmgnai'
  | 'bloom'
  | 'bonkbot'
  | 'nova'
  | 'soltradingbot'
  | 'maestro'
  | 'banana'
  | 'padre'
  | 'moonshot'
  | 'vector';

export interface ProtocolStatsWithDay extends Omit<ProtocolStats, 'formattedDay'> {
  formattedDay: string;
  [key: string]: ProtocolStats | string | number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
