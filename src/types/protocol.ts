export interface ProtocolMetrics {
  // For compatibility with all usages in the app
  date?: string;
  // Old keys
  volume_usd?: number;
  daily_users?: number;
  new_users?: number;
  trades?: number;
  fees_usd?: number;
  // New keys used in metrics and tables
  total_volume_usd?: number;
  numberOfNewUsers?: number;
  daily_trades?: number;
  total_fees_usd?: number;
}

export type Protocol = 'bullx' | 'photon' | 'trojan' | 'axiom';

export interface ProtocolStats {
  protocol_name: string;
  date: string;
  volume_usd: number;
  daily_users: number;
  new_users: number;
  trades: number;
  fees_usd: number;
}

export type TimeseriesDataPoint = {
  date: string;
  value: number;
}
