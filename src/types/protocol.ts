export interface ProtocolMetrics {
  date: string;
  volume_usd: number;
  daily_users: number;
  new_users: number;
  trades: number;
  fees_usd: number;
}

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
