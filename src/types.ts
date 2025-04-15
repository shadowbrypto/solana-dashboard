export interface DailyData {
  [key: string]: string | number;
  formattedDay: string;
  total_volume_usd: number;
  daily_users: number;
  numberOfNewUsers: number;
  daily_trades: number;
  total_fees_usd: number;
}

export interface ProtocolMetrics {
  total_volume_usd: number;
  daily_users: number;
  numberOfNewUsers: number;
  daily_trades: number;
  total_fees_usd: number;
}

export type Protocol = "bullx" | "photon" | "trojan";
