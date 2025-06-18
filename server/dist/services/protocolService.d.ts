import { ProtocolStats, ProtocolMetrics, Protocol } from '../types/protocol.js';
export declare function formatDate(isoDate: string): string;
export declare function getProtocolStats(protocolName?: string | string[]): Promise<ProtocolStats[]>;
export declare function getTotalProtocolStats(protocolName?: string): Promise<ProtocolMetrics>;
export declare function getDailyMetrics(date: Date): Promise<Record<Protocol, ProtocolMetrics>>;
export declare function getAggregatedProtocolStats(): Promise<any[]>;
