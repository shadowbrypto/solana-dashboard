export interface ProtocolMetrics {
  total_volume_usd: number;
  daily_users: number;
  numberOfNewUsers: number;
  daily_trades: number;
  total_fees_usd: number;
}

export interface ProtocolStats {
  protocol_name: string;
  date: string;
  volume_usd: number;
  daily_users: number;
  new_users: number;
  trades: number;
  fees_usd: number;
  total_volume_usd: number;
  total_fees_usd: number;
  numberOfNewUsers: number;
  daily_trades: number;
}

export type TimeseriesDataPoint = {
  date: string;
  value: number;
}
