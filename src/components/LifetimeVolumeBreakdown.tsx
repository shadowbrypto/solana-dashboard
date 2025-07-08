import React from "react";
import { Card, CardContent } from "./ui/card";

interface ProtocolVolumeData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  id: string;
}

interface LifetimeVolumeBreakdownProps {
  totalVolume: number;
  protocolData: ProtocolVolumeData[];
}

const formatVolume = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

export function LifetimeVolumeBreakdown({ totalVolume, protocolData }: LifetimeVolumeBreakdownProps) {
  // Filter and sort protocols by volume (descending), only show protocols with meaningful volume
  const significantProtocols = protocolData
    .filter(protocol => protocol.value > 0 && protocol.percentage > 0.5) // At least 0.5% of total volume
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Show top 6 protocols to match the image

  const activeProtocolsCount = significantProtocols.length;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-3">
            <div className="text-3xl font-bold tracking-tight">
              Lifetime Volume
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
              <span className="text-sm font-medium text-muted-foreground">
                {activeProtocolsCount} Active Protocols
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold mb-2">
              {formatVolume(totalVolume)}
            </div>
            <div className="flex gap-1 justify-end">
              {significantProtocols.map((protocol) => (
                <div
                  key={protocol.id}
                  className="p-1 rounded-md"
                  style={{ 
                    backgroundColor: `${protocol.color}15`
                  }}
                >
                  <img
                    src={`/assets/logos/${protocol.id.includes('terminal') ? protocol.id.split(' ')[0] : protocol.id === 'bull x' ? 'bullx' : protocol.id}.jpg`}
                    alt={protocol.name}
                    className="w-5 h-5 rounded-full border border-background object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Horizontal Bar Chart */}
        <div className="space-y-4">
          <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
            {significantProtocols.reduce((acc, protocol, index) => {
              const prevPercentage = acc.total;
              acc.total += protocol.percentage;
              acc.bars.push(
                <div
                  key={protocol.id}
                  className="absolute top-0 h-full flex items-center justify-center text-white text-xs font-medium transition-all duration-300 hover:opacity-80"
                  style={{
                    left: `${prevPercentage}%`,
                    width: `${protocol.percentage}%`,
                    backgroundColor: protocol.color,
                    minWidth: protocol.percentage > 12 ? 'auto' : '0',
                  }}
                  title={`${protocol.name}: ${formatVolume(protocol.value)} (${protocol.percentage.toFixed(1)}%)`}
                >
                  {protocol.percentage > 12 && (
                    <span className="px-1">
                      {protocol.name}
                    </span>
                  )}
                </div>
              );
              return acc;
            }, { total: 0, bars: [] as JSX.Element[] }).bars}
          </div>

          {/* Protocol Details in Single Row */}
          <div className="flex justify-between items-center w-full gap-2">
            {significantProtocols.map((protocol) => (
              <div 
                key={protocol.id}
                className="flex items-center gap-2 flex-1 justify-center p-2 rounded-lg"
                style={{ 
                  backgroundColor: `${protocol.color}10`
                }}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: protocol.color }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {protocol.name}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatVolume(protocol.value)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {protocol.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}