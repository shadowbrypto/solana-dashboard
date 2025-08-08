import React from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { LifetimeVolumeBreakdownSkeleton } from "./LifetimeVolumeBreakdownSkeleton";
import { ComponentActions } from "./ComponentActions";

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
  loading?: boolean;
}

const formatVolume = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const getColorWithOpacity = (hslColor: string, opacity: number): string => {
  // Convert hsl(h s% l%) to hsla(h, s%, l%, opacity)
  const match = hslColor.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (match) {
    const [, h, s, l] = match;
    return `hsla(${h}, ${s}%, ${l}%, ${opacity})`;
  }
  // Fallback for any other format
  return hslColor;
};

export function LifetimeVolumeBreakdown({ totalVolume, protocolData, loading = false }: LifetimeVolumeBreakdownProps) {
  if (loading) {
    return <LifetimeVolumeBreakdownSkeleton />;
  }
  // Filter and sort protocols by volume (descending), show all protocols with any volume
  const significantProtocols = protocolData
    .filter(protocol => protocol.value > 0) // Show all protocols with any volume
    .sort((a, b) => b.value - a.value);

  const activeProtocolsCount = significantProtocols.length;

  return (
    <ComponentActions 
      componentName="Lifetime Volume Breakdown"
      filename="Lifetime_Volume_Breakdown.png"
    >
      <Card className="w-full">
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-col items-start sm:items-start justify-start w-full sm:w-auto">
              {/* Mobile: Title and Total Volume on same line, Desktop: separate */}
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex flex-col">
                  <div className="text-lg sm:text-3xl font-bold tracking-tight">
                    Lifetime Volume
                  </div>
                  {/* Active protocols indicator - under title for both mobile and desktop */}
                  <div className="flex items-center gap-2 sm:gap-2.5 mt-1 sm:mt-2">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {activeProtocolsCount} Active Protocols
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end sm:hidden">
                  <div className="text-lg font-bold">
                    {formatVolume(totalVolume)}
                  </div>
                  {/* Mobile stacked avatars below the number */}
                  <div className="flex items-center mt-1">
                    {significantProtocols.slice(0, 4).map((protocol, index) => (
                      <div
                        key={protocol.id}
                        className="relative inline-block"
                        style={{ 
                          marginLeft: index > 0 ? '-8px' : '0',
                          zIndex: 4 - index
                        }}
                      >
                        <img
                          src={`/assets/logos/${protocol.id.includes('terminal') ? protocol.id.split(' ')[0] : protocol.id === 'bull x' ? 'bullx' : protocol.id}.jpg`}
                          alt={protocol.name}
                          className="w-5 h-5 rounded-full border-2 border-background object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                    {significantProtocols.length > 4 && (
                      <div 
                        className="w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-semibold text-muted-foreground"
                        style={{ marginLeft: '-8px', zIndex: 0 }}
                      >
                        +{significantProtocols.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Desktop total volume and avatars */}
            <div className="hidden sm:block text-right">
              <div className="text-3xl font-bold mb-2">
                {formatVolume(totalVolume)}
              </div>
              <div className="flex justify-end">
                {significantProtocols.map((protocol, index) => (
                  <div
                    key={protocol.id}
                    className="relative inline-block group cursor-pointer"
                    style={{ 
                      marginLeft: index > 0 ? '-3px' : '0',
                      zIndex: significantProtocols.length - index
                    }}
                  >
                    <img
                      src={`/assets/logos/${protocol.id.includes('terminal') ? protocol.id.split(' ')[0] : protocol.id === 'bull x' ? 'bullx' : protocol.id}.jpg`}
                      alt={protocol.name}
                      className="w-6 h-6 rounded-full border border-background object-cover ring-1 ring-background transition-all duration-300 ease-in-out group-hover:ring-2 group-hover:shadow-lg group-hover:-translate-y-1 relative"
                      style={{
                        zIndex: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        target.style.zIndex = '100';
                        target.style.transform = 'translateY(-4px)';
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        target.style.zIndex = 'inherit';
                        target.style.transform = '';
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                      {protocol.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
          
          {/* Horizontal Bar Chart */}
          <div className="space-y-3 sm:space-y-4">
            <div className="relative h-6 sm:h-8 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
              {significantProtocols.reduce((acc, protocol, index) => {
                const prevPercentage = acc.total;
                acc.total += protocol.percentage;
                acc.bars.push(
                  <div
                    key={protocol.id}
                    className="absolute top-0 h-full flex items-center justify-center text-white text-[10px] sm:text-xs font-medium transition-all duration-300 hover:opacity-80"
                    style={{
                      left: `${prevPercentage}%`,
                      width: `${protocol.percentage}%`,
                      backgroundColor: protocol.color,
                      minWidth: protocol.percentage > 15 ? 'auto' : '0',
                    }}
                    title={`${protocol.name}: ${formatVolume(protocol.value)} (${protocol.percentage.toFixed(1)}%)`}
                  >
                    {protocol.percentage > 15 && (
                      <span className="px-0.5 sm:px-1">
                        {protocol.name}
                      </span>
                    )}
                  </div>
                );
                return acc;
              }, { total: 0, bars: [] as JSX.Element[] }).bars}
            </div>

            {/* Protocol Details - Mobile: 2 cols, Tablet: 3 cols, Desktop: 5 cols */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2">
              {significantProtocols.slice(0, 15).map((protocol) => (
                <Badge
                  key={protocol.id}
                  variant="secondary"
                  className="flex items-center justify-between p-2 rounded-lg border-0 h-auto w-full min-w-0"
                  style={{ 
                    backgroundColor: getColorWithOpacity(protocol.color, 0.15),
                    color: 'inherit'
                  }}
                >
                  <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
                    <div 
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: protocol.color }}
                    />
                    <span className="text-[10px] sm:text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {protocol.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {formatVolume(protocol.value)}
                    </span>
                    <span className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400">
                      {protocol.percentage.toFixed(1)}%
                    </span>
                  </div>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </ComponentActions>
  );
}