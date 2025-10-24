export type Protocol = "axiom" | "bullx" | "photon" | "trojan" | "gmgnai" | "bloom" | "all" | "bonkbot" | "nova" | "soltradingbot" | "maestro" | "banana" | "padre" | "moonshot" | "vector" | "nova terminal" | "telemetry" | "slingshot" | "fomo" | "rhythm" | "vyper";

export interface ProtocolStats {
  protocol_name: Protocol;
  date: string;
  volume_usd: number;
  daily_users: number;
  new_users: number;
  trades: number;
  fees_usd: number;
  formattedDay?: string;
}

export interface ProtocolMetrics {
  total_volume_usd: number;
  daily_users: number;
  numberOfNewUsers: number;
  daily_trades: number;
  total_fees_usd: number;
  projected_volume?: number;
  daily_growth?: number;
}