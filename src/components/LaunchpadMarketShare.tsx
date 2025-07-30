import React, { useMemo, useState } from 'react';
import { formatNumber } from '../lib/utils';
import { getLaunchpadLogoFilename } from '../lib/launchpad-config';
import { Rocket, Trophy } from 'lucide-react';

interface LaunchpadData {
  launchpad: string;
  name: string;
  metrics: {
    total_launches: number;
    total_graduations: number;
  };
  color: string;
}

interface LaunchpadMarketShareProps {
  data: LaunchpadData[];
  loading?: boolean;
}

interface SingleMetricComponentProps {
  data: LaunchpadData[];
  metricType: 'launches' | 'graduations';
  title: string;
  icon: React.ReactNode;
  hiddenLaunchpads: string[];
  onToggleLaunchpad: (launchpadId: string) => void;
}

function SingleMetricComponent({ data, metricType, title, icon, hiddenLaunchpads, onToggleLaunchpad }: SingleMetricComponentProps) {
  const { sortedData, totalValue, visibleData } = useMemo(() => {
    const metric = metricType === 'launches' ? 'total_launches' : 'total_graduations';
    
    // Sort by the metric
    const sorted = [...data]
      .filter(lp => lp.metrics[metric] > 0)
      .sort((a, b) => b.metrics[metric] - a.metrics[metric]);
    
    // Filter visible data (excluding hidden launchpads)
    const visible = sorted.filter(lp => !hiddenLaunchpads.includes(lp.launchpad));
    
    // Calculate total from visible data only
    const total = visible.reduce((sum, lp) => sum + lp.metrics[metric], 0);
    
    return {
      sortedData: sorted,
      visibleData: visible,
      totalValue: total
    };
  }, [data, metricType, hiddenLaunchpads]);

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        
        {/* Total value */}
        <div className="text-right">
          <div className="text-3xl font-bold">
            {formatNumber(totalValue)}
          </div>
          
          {/* Stacked avatars below value */}
          <div className="flex justify-end mt-2">
            <div className="flex -space-x-2">
              {visibleData.slice(0, 10).map((launchpad, index) => (
                <div 
                  key={launchpad.launchpad}
                  className="w-6 h-6 rounded-full border border-background bg-muted overflow-hidden shadow-sm hover:z-10 transition-all hover:scale-110"
                  style={{ 
                    zIndex: sortedData.length - index,
                  }}
                  title={launchpad.name}
                >
                  <img 
                    src={`/assets/logos/${getLaunchpadLogoFilename(launchpad.launchpad)}`}
                    alt={launchpad.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const container = target.parentElement;
                      if (container) {
                        container.innerHTML = '';
                        container.className = 'w-6 h-6 rounded-full border border-background bg-muted/50 flex items-center justify-center shadow-sm';
                        const iconEl = document.createElement('div');
                        iconEl.innerHTML = '<svg class="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.25-2 5.2-2 5.2s4-0.5 5.2-2c1.6-2 2.8-7 2.8-7s-5 1.2-7 2.8Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>';
                        container.appendChild(iconEl);
                      }
                    }}
                  />
                </div>
              ))}
              {visibleData.length > 10 && (
                <div className="w-6 h-6 rounded-full border border-background bg-muted/80 flex items-center justify-center text-[10px] font-medium text-muted-foreground shadow-sm">
                  +{visibleData.length - 10}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Market share bar */}
      <div className="mb-4">
        <div className="relative h-10 bg-muted/30 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex">
            {visibleData.map((launchpad, index) => {
              const value = launchpad.metrics[metricType === 'launches' ? 'total_launches' : 'total_graduations'];
              const percentage = (value / totalValue) * 100;
              
              if (percentage < 0.5) return null; // Hide very small segments
              
              return (
                <div
                  key={launchpad.launchpad}
                  className="relative group transition-all duration-300 hover:opacity-90"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: launchpad.color,
                  }}
                >
                  {/* Show name on larger segments */}
                  {percentage > 5 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white/90 truncate px-1">
                        {launchpad.name}
                      </span>
                    </div>
                  )}
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <div className="text-xs font-medium">{launchpad.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(value)} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Launchpad legends - 4 column grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sortedData.map((launchpad) => {
          const value = launchpad.metrics[metricType === 'launches' ? 'total_launches' : 'total_graduations'];
          const isHidden = hiddenLaunchpads.includes(launchpad.launchpad);
          const percentage = isHidden ? 0 : (value / totalValue) * 100;
          
          return (
            <div 
              key={launchpad.launchpad}
              className={`rounded-lg px-4 py-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                isHidden ? 'opacity-50 grayscale' : ''
              }`}
              style={{
                backgroundColor: `${launchpad.color}${isHidden ? '08' : '15'}`
              }}
              onClick={() => onToggleLaunchpad(launchpad.launchpad)}
              title={isHidden ? `Click to show ${launchpad.name}` : `Click to hide ${launchpad.name}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Color indicator */}
                  <div 
                    className={`w-3 h-3 rounded-full shrink-0 transition-all ${
                      isHidden ? 'border-2 border-dashed border-muted-foreground' : ''
                    }`}
                    style={{ 
                      backgroundColor: isHidden ? 'transparent' : launchpad.color
                    }}
                  />
                  
                  {/* Name */}
                  <span className={`text-sm font-medium truncate transition-all ${
                    isHidden ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}>
                    {launchpad.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {/* Value */}
                  <span className={`text-sm font-bold transition-all ${
                    isHidden ? 'text-muted-foreground' : 'text-foreground'
                  }`}>
                    {formatNumber(value)}
                  </span>
                  
                  {/* Percentage */}
                  <span className="text-sm text-muted-foreground">
                    {isHidden ? '0.0%' : percentage.toFixed(1) + '%'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LaunchpadMarketShare({ data, loading }: LaunchpadMarketShareProps) {
  const [hiddenLaunchesLaunchpads, setHiddenLaunchesLaunchpads] = useState<string[]>([]);
  const [hiddenGraduationsLaunchpads, setHiddenGraduationsLaunchpads] = useState<string[]>([]);

  const handleToggleLaunchesLaunchpad = (launchpadId: string) => {
    setHiddenLaunchesLaunchpads(prev => 
      prev.includes(launchpadId)
        ? prev.filter(id => id !== launchpadId)
        : [...prev, launchpadId]
    );
  };

  const handleToggleGraduationsLaunchpad = (launchpadId: string) => {
    setHiddenGraduationsLaunchpads(prev => 
      prev.includes(launchpadId)
        ? prev.filter(id => id !== launchpadId)
        : [...prev, launchpadId]
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4 animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4" />
          <div className="h-10 bg-muted rounded mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4" />
          <div className="h-10 bg-muted rounded mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <SingleMetricComponent 
        data={data} 
        metricType="launches" 
        title="Lifetime Launches"
        icon={<Rocket className="w-6 h-6 text-orange-500" />}
        hiddenLaunchpads={hiddenLaunchesLaunchpads}
        onToggleLaunchpad={handleToggleLaunchesLaunchpad}
      />
      <SingleMetricComponent 
        data={data} 
        metricType="graduations" 
        title="Lifetime Graduations"
        icon={<Trophy className="w-6 h-6 text-yellow-500" />}
        hiddenLaunchpads={hiddenGraduationsLaunchpads}
        onToggleLaunchpad={handleToggleGraduationsLaunchpad}
      />
    </div>
  );
}