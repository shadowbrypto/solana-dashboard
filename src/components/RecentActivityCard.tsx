import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { LaunchpadSplitBar } from './LaunchpadSplitBar';
import { formatNumber } from '../lib/utils';

interface RecentActivityData {
  launches: number;
  graduations: number;
  ratio: number;
}

interface LaunchpadBreakdown {
  launches: Array<{ name: string; value: number; color: string }>;
  graduations: Array<{ name: string; value: number; color: string }>;
}

interface GrowthData {
  value: number;
  isPositive: boolean;
}

interface RecentActivityCardProps {
  title: string;
  subtitle: string;
  stats: RecentActivityData;
  breakdown: LaunchpadBreakdown;
  growth: GrowthData;
  accentColor: 'blue' | 'green' | 'purple';
}

const ACCENT_COLORS = {
  blue: {
    gradient: 'from-blue-50/30 to-blue-50/30 dark:from-blue-950/10 dark:to-blue-950/10',
    accent: 'from-blue-500 to-cyan-500',
    shadow: 'hover:shadow-blue-500/5',
    border: 'hover:border-blue-500/20',
    dot: 'from-blue-500 to-blue-600'
  },
  green: {
    gradient: 'from-green-50/30 to-green-50/30 dark:from-green-950/10 dark:to-green-950/10',
    accent: 'from-green-500 to-emerald-500',
    shadow: 'hover:shadow-green-500/5',
    border: 'hover:border-green-500/20',
    dot: 'from-green-500 to-green-600'
  },
  purple: {
    gradient: 'from-purple-50/30 to-purple-50/30 dark:from-purple-950/10 dark:to-purple-950/10',
    accent: 'from-purple-500 to-violet-500',
    shadow: 'hover:shadow-purple-500/5',
    border: 'hover:border-purple-500/20',
    dot: 'from-purple-500 to-purple-600'
  }
};

export function RecentActivityCard({
  title,
  subtitle,
  stats,
  breakdown,
  growth,
  accentColor
}: RecentActivityCardProps) {
  const colors = ACCENT_COLORS[accentColor];

  return (
    <div className={`group relative bg-gradient-to-br from-card via-card/95 ${colors.gradient} border border-border/50 rounded-xl p-3 sm:p-5 shadow-sm hover:shadow-lg ${colors.shadow} transition-all duration-300 ${colors.border} overflow-hidden`}>
      {/* Subtle accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r ${colors.dot} shadow-sm`}></div>
            <div>
              <h4 className="font-semibold text-xs sm:text-sm text-foreground">{title}</h4>
              <div className="text-[10px] text-muted-foreground font-medium">
                {subtitle}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm transition-all duration-200 ${
            growth.isPositive 
              ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border border-green-200/50 dark:from-green-900/30 dark:to-emerald-900/20 dark:text-green-400 dark:border-green-800/30' 
              : 'bg-gradient-to-r from-red-100 to-rose-50 text-red-700 border border-red-200/50 dark:from-red-900/30 dark:to-rose-900/20 dark:text-red-400 dark:border-red-800/30'
          }`}>
            {growth.isPositive ? (
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            )}
            {growth.value.toFixed(1)}%
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {/* Launches Box */}
          <div className="bg-muted/60 border border-border rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Launches</span>
              <span className="text-base sm:text-lg font-bold text-foreground">{formatNumber(stats.launches)}</span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <LaunchpadSplitBar data={breakdown.launches} />
            </div>
          </div>
          
          {/* Graduations Box */}
          <div className="bg-muted/60 border border-border rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Graduations</span>
              <span className="text-base sm:text-lg font-bold text-foreground">{formatNumber(stats.graduations)}</span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <LaunchpadSplitBar data={breakdown.graduations} />
            </div>
          </div>
          
          {/* Graduation Rate Box */}
          <div className="bg-muted/60 border border-border rounded-lg p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Graduation Rate</span>
              <span className="text-base sm:text-lg font-bold text-foreground">{stats.ratio.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}