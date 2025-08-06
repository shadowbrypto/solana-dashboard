import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Rocket, TrendingUp, TrendingDown, Calendar, BarChart3, Activity, Users } from 'lucide-react';
import { getAllLaunchpads, getLaunchpadLogoFilename } from '../lib/launchpad-config';
import { LaunchpadApi, LaunchpadSummaryMetrics } from '../lib/launchpad-api';
import { formatNumber, formatCurrency } from '../lib/utils';
import { LaunchpadComparisonChart } from '../components/LaunchpadComparisonChart';
import { Skeleton } from '../components/ui/skeleton';
import { MetricCardSkeleton } from '../components/MetricCardSkeleton';
import { MetricCard } from '../components/MetricCard';
import { LaunchpadMarketShare } from '../components/LaunchpadMarketShare';
import { StackedBarChart } from '../components/charts/StackedBarChart';
import { DominanceChart } from '../components/charts/DominanceChart';
import { PieChart } from '../components/charts/PieChart';
import { PieChartSkeleton } from '../components/charts/PieChartSkeleton';
import { transformLaunchpadDataForStackedChart, formatChartNumber } from '../lib/launchpad-chart-utils';
import { LaunchpadSplitBar } from '../components/LaunchpadSplitBar';

type TimeFrame = "1d" | "7d" | "30d" | "3m" | "6m" | "1y" | "all";

interface LaunchpadData {
  launchpad: string;
  name: string;
  data: any[];
  metrics: LaunchpadSummaryMetrics;
  color: string;
}

const LAUNCHPAD_COLORS: Record<string, string> = {
  'pumpfun': '#10b981', // Green for PumpFun
  'launchlab': '#06b6d4', // Blue for LaunchLab  
  'letsbonk': '#f59e0b', // Orange for LetsBonk
  'moonshot': '#8b5cf6', // Purple for Moonshot
};

export default function AllLaunchpads() {
  const [launchpadData, setLaunchpadData] = useState<LaunchpadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchesTimeframe, setLaunchesTimeframe] = useState<TimeFrame>("3m");
  const [launchesDominanceTimeframe, setLaunchesDominanceTimeframe] = useState<TimeFrame>("3m");
  const [graduationsTimeframe, setGraduationsTimeframe] = useState<TimeFrame>("3m");
  const [graduationsDominanceTimeframe, setGraduationsDominanceTimeframe] = useState<TimeFrame>("3m");
  const [launchesPieTimeframe, setLaunchesPieTimeframe] = useState<TimeFrame>("all");
  const [graduationsPieTimeframe, setGraduationsPieTimeframe] = useState<TimeFrame>("all");
  const [selectedMetric, setSelectedMetric] = useState<'launches' | 'graduations'>('launches');

  const allLaunchpads = getAllLaunchpads();

  // Load data for all launchpads (excluding LaunchLab by default)
  useEffect(() => {
    const loadLaunchpadData = async () => {
      setLoading(true);
      try {
        // Filter out LaunchLab by default
        const filteredLaunchpads = allLaunchpads.filter(lp => lp.id !== 'launchlab');
        const dataPromises = filteredLaunchpads.map(async (launchpad, index) => {
          try {
            const [data, metrics] = await Promise.all([
              LaunchpadApi.getLaunchpadData(launchpad.id, 'all'),
              LaunchpadApi.getLaunchpadMetrics(launchpad.id, 'all')
            ]);

            return {
              launchpad: launchpad.id,
              name: launchpad.name,
              data: data || [],
              metrics: metrics || {
                launchpad_name: launchpad.id,
                total_launches: 0,
                total_graduations: 0,
                success_rate: 0,
                avg_daily_launches: 0,
                avg_daily_graduations: 0
              },
              color: LAUNCHPAD_COLORS[launchpad.id] || '#6366f1'
            };
          } catch (error) {
            console.error(`Failed to load data for ${launchpad.id}:`, error);
            return {
              launchpad: launchpad.id,
              name: launchpad.name,
              data: [],
              metrics: {
                launchpad_name: launchpad.id,
                total_launches: 0,
                total_graduations: 0,
                success_rate: 0,
                avg_daily_launches: 0,
                avg_daily_graduations: 0
              },
              color: LAUNCHPAD_COLORS[launchpad.id] || '#6366f1'
            };
          }
        });

        const results = await Promise.all(dataPromises);
        setLaunchpadData(results);
      } catch (error) {
        console.error('Failed to load launchpad data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLaunchpadData();
  }, []);

  // Helper function to filter data by timeframe
  const getFilteredData = (timeframe: TimeFrame) => {
    console.log('getFilteredData called with timeframe:', timeframe);
    
    if (timeframe === "all") {
      return launchpadData;
    }

    if (timeframe === "1d") {
      // For "1d", get only the most recent day's data across all launchpads
      const allDates = new Set<string>();
      launchpadData.forEach(lp => {
        lp.data.forEach(item => allDates.add(item.date));
      });
      
      if (allDates.size === 0) {
        console.log('No dates found for 1d filter');
        return launchpadData.map(lp => ({ ...lp, data: [] }));
      }
      
      const sortedDates = Array.from(allDates).sort();
      const mostRecentDate = sortedDates[sortedDates.length - 1];
      console.log('Most recent date for 1d:', mostRecentDate, 'from dates:', sortedDates);
      
      const filtered = launchpadData.map(lp => ({
        ...lp,
        data: lp.data.filter(item => item.date === mostRecentDate)
      }));
      
      console.log('Filtered data for 1d (most recent date):', filtered.map(lp => ({ 
        name: lp.name, 
        dataLength: lp.data.length, 
        data: lp.data
      })));
      
      return filtered;
    }

    // For other timeframes, use the original logic
    const now = new Date();
    let daysToSubtract: number;

    switch (timeframe) {
      case "7d":
        daysToSubtract = 7;
        break;
      case "30d":
        daysToSubtract = 30;
        break;
      case "3m":
        daysToSubtract = 90;
        break;
      case "6m":
        daysToSubtract = 180;
        break;
      case "1y":
        daysToSubtract = 365;
        break;
      default:
        daysToSubtract = 90;
    }

    const cutoffDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    
    return launchpadData.map(launchpadData => ({
      ...launchpadData,
      data: launchpadData.data.filter(item => new Date(item.date) >= cutoffDate)
    }));
  };

  // Aggregate metrics
  const aggregatedMetrics = useMemo(() => {
    const totalLaunches = launchpadData.reduce((sum, lp) => sum + lp.metrics.total_launches, 0);
    const totalGraduations = launchpadData.reduce((sum, lp) => sum + lp.metrics.total_graduations, 0);
    const avgSuccessRate = launchpadData.length > 0 
      ? launchpadData.reduce((sum, lp) => sum + lp.metrics.success_rate, 0) / launchpadData.length
      : 0;

    return {
      totalLaunches,
      totalGraduations,
      avgSuccessRate,
      totalLaunchpads: launchpadData.length
    };
  }, [launchpadData]);

  // Helper function to get launchpad breakdown for the last single day
  const getLastDayBreakdown = (metric: 'launches' | 'graduations') => {
    if (launchpadData.length === 0) return [];

    // Get the most recent date across all launchpads
    const allDates = launchpadData.flatMap(lp => lp.data.map(item => item.date));
    if (allDates.length === 0) return [];
    
    const sortedDates = [...new Set(allDates)].sort();
    const mostRecentDate = sortedDates[sortedDates.length - 1];

    const breakdown = launchpadData.map(lp => {
        const dayData = lp.data.find(item => item.date === mostRecentDate);
        const value = dayData ? (dayData[metric] || 0) : 0;
        
        return {
          name: lp.name,
          value,
          color: lp.color
        };
      });

    return breakdown.filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  };

  // Helper function to get launchpad breakdown for a specific timeframe (7d, 30d)
  const getLaunchpadBreakdown = (days: number, metric: 'launches' | 'graduations') => {
    if (launchpadData.length === 0) return [];

    // Get today's date string for comparison
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get the last N days of data (same logic as existing calculateTimeStats)
    const allData = launchpadData.flatMap(lp => lp.data.map(item => ({
      ...item,
      launchpad: lp.launchpad,
      name: lp.name,
      color: lp.color
    }))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by date and get the last N days (excluding today for 7d and 30d)
    const dailyTotals = allData.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = {};
      }
      if (!acc[date][item.launchpad]) {
        acc[date][item.launchpad] = { launches: 0, graduations: 0, name: item.name, color: item.color };
      }
      acc[date][item.launchpad].launches += item.launches || 0;
      acc[date][item.launchpad].graduations += item.graduations || 0;
      return acc;
    }, {} as Record<string, Record<string, { launches: number; graduations: number; name: string; color: string }>>);

    const sortedDates = Object.keys(dailyTotals).sort();
    // Exclude today's data for multi-day periods
    const datesExcludingToday = sortedDates.filter(date => date !== today);
    const recentDates = datesExcludingToday.slice(-days);

    // Aggregate across the recent days for each launchpad
    const breakdown = launchpadData.map(lp => {
        const value = recentDates.reduce((sum, date) => {
          const dayData = dailyTotals[date]?.[lp.launchpad];
          return sum + (dayData ? (dayData[metric] || 0) : 0);
        }, 0);
        
        return {
          name: lp.name,
          value,
          color: lp.color
        };
      });

    return breakdown.filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  };

  // Recent activity calculations
  const recentActivity = useMemo(() => {
    if (launchpadData.length === 0) return null;

    // Combine all data from all launchpads
    const allData = launchpadData.flatMap(lp => lp.data.map(item => ({
      ...item,
      launchpad: lp.launchpad
    }))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by date and sum across all launchpads
    const dailyTotals = allData.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = { launches: 0, graduations: 0, date };
      }
      acc[date].launches += item.launches || 0;
      acc[date].graduations += item.graduations || 0;
      return acc;
    }, {} as Record<string, { launches: number; graduations: number; date: string }>);

    const sortedDailyTotals = Object.values(dailyTotals).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    console.log('Daily totals sample:', {
      totalDays: sortedDailyTotals.length,
      latestDates: sortedDailyTotals.slice(-5).map(d => ({ date: d.date, launches: d.launches, graduations: d.graduations })),
      earliestDates: sortedDailyTotals.slice(0, 3).map(d => ({ date: d.date, launches: d.launches, graduations: d.graduations }))
    });

    // Get the most recent complete day data (for "Last Day")
    const getLastDayStats = () => {
      if (sortedDailyTotals.length === 0) return { launches: 0, graduations: 0, ratio: 0 };
      
      // Get the most recent day with data
      const lastDay = sortedDailyTotals[sortedDailyTotals.length - 1];
      const launches = lastDay.launches;
      const graduations = lastDay.graduations;
      const ratio = launches > 0 ? ((graduations / launches) * 100) : 0;

      console.log('Last day stats:', { 
        date: lastDay.date, 
        launches, 
        graduations, 
        ratio: ratio.toFixed(1) + '%'
      });

      return { launches, graduations, ratio };
    };

    // Calculate time-based stats for periods (excluding today)
    const calculateTimeStats = (days: number) => {
      if (sortedDailyTotals.length === 0) return { launches: 0, graduations: 0, ratio: 0 };
      
      // Get today's date string for comparison
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Filter out today's data and get the last N days
      const dataExcludingToday = sortedDailyTotals.filter(item => item.date !== today);
      const recentData = dataExcludingToday.slice(-days);
      
      const launches = recentData.reduce((sum, item) => sum + item.launches, 0);
      const graduations = recentData.reduce((sum, item) => sum + item.graduations, 0);
      const ratio = launches > 0 ? ((graduations / launches) * 100) : 0;

      console.log(`Stats for last ${days} days (excluding today):`, { 
        dataPoints: recentData.length, 
        launches, 
        graduations, 
        ratio: ratio.toFixed(1) + '%',
        dateRange: recentData.length > 0 ? `${recentData[0].date} to ${recentData[recentData.length - 1].date}` : 'no data',
        excludedToday: today
      });

      return { launches, graduations, ratio };
    };

    // Get stats for different periods
    const stats1d = getLastDayStats();
    const stats7d = calculateTimeStats(7);
    const stats30d = calculateTimeStats(30);

    // Calculate growth (compare current period vs previous period)
    const calculateGrowth = (current: number, previous: number): { value: number; isPositive: boolean } => {
      if (previous === 0) return { value: 0, isPositive: true };
      const growth = ((current - previous) / previous) * 100;
      return { value: Math.abs(growth), isPositive: growth >= 0 };
    };

    // Get previous period stats for growth calculation
    const getPreviousDayStats = () => {
      if (sortedDailyTotals.length < 2) return { launches: 0, graduations: 0 };
      
      // Get the day before the most recent day
      const previousDay = sortedDailyTotals[sortedDailyTotals.length - 2];
      return { launches: previousDay.launches, graduations: previousDay.graduations };
    };

    const getPreviousStats = (currentDays: number) => {
      if (sortedDailyTotals.length < currentDays * 2) return { launches: 0, graduations: 0 };
      
      // Get the previous period data (same number of days as current period, but before current period)
      const previousData = sortedDailyTotals.slice(-(currentDays * 2), -currentDays);
      
      const launches = previousData.reduce((sum, item) => sum + item.launches, 0);
      const graduations = previousData.reduce((sum, item) => sum + item.graduations, 0);
      
      console.log(`Previous ${currentDays} days stats:`, {
        dataPoints: previousData.length,
        launches,
        graduations,
        dateRange: previousData.length > 0 ? `${previousData[0].date} to ${previousData[previousData.length - 1].date}` : 'no data'
      });
      
      return { launches, graduations };
    };

    const previous1d = getPreviousDayStats();
    const previous7d = getPreviousStats(7);
    const previous30d = getPreviousStats(30);

    const dailyGrowth = calculateGrowth(stats1d.launches, previous1d.launches);
    const weeklyGrowth = calculateGrowth(stats7d.launches, previous7d.launches);
    const monthlyGrowth = calculateGrowth(stats30d.launches, previous30d.launches);

    // Add launchpad breakdowns
    const breakdown1d = {
      launches: getLastDayBreakdown('launches'),
      graduations: getLastDayBreakdown('graduations')
    };
    const breakdown7d = {
      launches: getLaunchpadBreakdown(7, 'launches'),
      graduations: getLaunchpadBreakdown(7, 'graduations')
    };
    const breakdown30d = {
      launches: getLaunchpadBreakdown(30, 'launches'),
      graduations: getLaunchpadBreakdown(30, 'graduations')
    };

    return {
      stats1d,
      stats7d,
      stats30d,
      dailyGrowth,
      weeklyGrowth,
      monthlyGrowth,
      breakdown1d,
      breakdown7d,
      breakdown30d
    };
  }, [launchpadData]);

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-6 lg:mb-8">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl text-foreground text-center font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          All Launchpads Overview
        </h1>
      </div>

      {/* Lifetime Metrics - 3 Card Layout */}
      <div className="mb-6 lg:mb-8 grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-3 lg:grid-cols-3">
        {loading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Tokens Launched"
              type="launches"
              value={aggregatedMetrics.totalLaunches}
              subtitle="All Launchpads"
            />
            <MetricCard
              title="Tokens Graduated"
              type="graduations"
              value={aggregatedMetrics.totalGraduations}
              subtitle="All Launchpads"
            />
            <MetricCard
              title="Graduation Rate"
              type="graduation_rate"
              value={`${aggregatedMetrics.totalLaunches > 0 
                ? ((aggregatedMetrics.totalGraduations / aggregatedMetrics.totalLaunches) * 100).toFixed(1)
                : '0.0'}%`}
              subtitle="All Launchpads"
            />
          </>
        )}
      </div>


      {/* Pie Charts Section */}
      <div className="mb-6 lg:mb-8">
        <h2 className="text-lg font-semibold mb-4">Lifetime Distribution</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartSkeleton />
            <PieChartSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Launches Pie Chart */}
            {(() => {
              const launchesChartData = transformLaunchpadDataForStackedChart(
                getFilteredData(launchesPieTimeframe),
                'launches'
              );
              return (
                <PieChart
                  title="Token Launches Distribution"
                  subtitle="Lifetime launches across all launchpads"
                  data={launchesChartData.data}
                  dataKeys={launchesChartData.dataKeys}
                  labels={launchesChartData.labels}
                  colors={launchesChartData.colors}
                  valueFormatter={formatChartNumber}
                  timeframe={launchesPieTimeframe}
                  onTimeframeChange={(value) => setLaunchesPieTimeframe(value as TimeFrame)}
                  showPercentages={true}
                  innerRadius={70}
                  outerRadius={140}
                  centerLabel="Launches"
                />
              );
            })()}

            {/* Graduations Pie Chart */}
            {(() => {
              const graduationsChartData = transformLaunchpadDataForStackedChart(
                getFilteredData(graduationsPieTimeframe),
                'graduations'
              );
              return (
                <PieChart
                  title="Token Graduations Distribution"
                  subtitle="Lifetime graduations across all launchpads"
                  data={graduationsChartData.data}
                  dataKeys={graduationsChartData.dataKeys}
                  labels={graduationsChartData.labels}
                  colors={graduationsChartData.colors}
                  valueFormatter={formatChartNumber}
                  timeframe={graduationsPieTimeframe}
                  onTimeframeChange={(value) => setGraduationsPieTimeframe(value as TimeFrame)}
                  showPercentages={true}
                  innerRadius={70}
                  outerRadius={140}
                  centerLabel="Graduations"
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {!loading && recentActivity && (
        <div className="mb-6 lg:mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Last Day Stats */}
            <div className="group relative bg-gradient-to-br from-card via-card/95 to-blue-50/30 dark:to-blue-950/10 border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 hover:border-blue-500/20 overflow-hidden">
              {/* Subtle accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"></div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">Last Day</h4>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {(() => {
                          if (recentActivity && launchpadData.length > 0) {
                            const allDates = launchpadData.flatMap(lp => lp.data.map(item => item.date));
                            if (allDates.length > 0) {
                              const sortedDates = [...new Set(allDates)].sort();
                              const mostRecentDate = sortedDates[sortedDates.length - 1];
                              return new Date(mostRecentDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric' 
                              });
                            }
                          }
                          return '';
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 ${
                    recentActivity.dailyGrowth.isPositive 
                      ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border border-green-200/50 dark:from-green-900/30 dark:to-emerald-900/20 dark:text-green-400 dark:border-green-800/30' 
                      : 'bg-gradient-to-r from-red-100 to-rose-50 text-red-700 border border-red-200/50 dark:from-red-900/30 dark:to-rose-900/20 dark:text-red-400 dark:border-red-800/30'
                  }`}>
                    {recentActivity.dailyGrowth.isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {recentActivity.dailyGrowth.value.toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Launches Box */}
                  <div className="bg-muted/60 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Launches</span>
                      <span className="text-lg font-bold text-foreground">{formatNumber(recentActivity.stats1d.launches)}</span>
                    </div>
                    <div className="mt-2">
                      <LaunchpadSplitBar data={recentActivity.breakdown1d.launches} />
                    </div>
                  </div>
                  
                  {/* Graduations Box */}
                  <div className="bg-muted/60 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Graduations</span>
                      <span className="text-lg font-bold text-foreground">{formatNumber(recentActivity.stats1d.graduations)}</span>
                    </div>
                    <div className="mt-2">
                      <LaunchpadSplitBar data={recentActivity.breakdown1d.graduations} />
                    </div>
                  </div>
                  
                  {/* Graduation Rate Box */}
                  <div className="bg-muted/60 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Graduation Rate</span>
                      <span className="text-lg font-bold text-foreground">{recentActivity.stats1d.ratio.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Last 7 Days Stats */}
            <div className="group relative bg-gradient-to-br from-card via-card/95 to-green-50/30 dark:to-green-950/10 border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300 hover:border-green-500/20 overflow-hidden">
              {/* Subtle accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-sm"></div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">Last 7 Days</h4>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {(() => {
                          const now = new Date();
                          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                          const startDate = new Date(yesterday.getTime() - 6 * 24 * 60 * 60 * 1000); // 7 days excluding today
                          const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          });
                          return `${formatDate(startDate)} - ${formatDate(yesterday)}`;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 ${
                    recentActivity.weeklyGrowth.isPositive 
                      ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border border-green-200/50 dark:from-green-900/30 dark:to-emerald-900/20 dark:text-green-400 dark:border-green-800/30' 
                      : 'bg-gradient-to-r from-red-100 to-rose-50 text-red-700 border border-red-200/50 dark:from-red-900/30 dark:to-rose-900/20 dark:text-red-400 dark:border-red-800/30'
                  }`}>
                    {recentActivity.weeklyGrowth.isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {recentActivity.weeklyGrowth.value.toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Launches Box */}
                  <div className="bg-muted/60 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Launches</span>
                      <span className="text-lg font-bold text-foreground">{formatNumber(recentActivity.stats7d.launches)}</span>
                    </div>
                    <div className="mt-2">
                      <LaunchpadSplitBar data={recentActivity.breakdown7d.launches} />
                    </div>
                  </div>
                  
                  {/* Graduations Box */}
                  <div className="bg-muted/60 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Graduations</span>
                      <span className="text-lg font-bold text-foreground">{formatNumber(recentActivity.stats7d.graduations)}</span>
                    </div>
                    <div className="mt-2">
                      <LaunchpadSplitBar data={recentActivity.breakdown7d.graduations} />
                    </div>
                  </div>
                  
                  {/* Graduation Rate Box */}
                  <div className="bg-muted/60 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Graduation Rate</span>
                      <span className="text-lg font-bold text-foreground">{recentActivity.stats7d.ratio.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Last 30 Days Stats */}
            <div className="group relative bg-gradient-to-br from-card via-card/95 to-purple-50/30 dark:to-purple-950/10 border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:border-purple-500/20 overflow-hidden">
              {/* Subtle accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 shadow-sm"></div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">Last 30 Days</h4>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {(() => {
                          const now = new Date();
                          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                          const startDate = new Date(yesterday.getTime() - 29 * 24 * 60 * 60 * 1000); // 30 days excluding today
                          const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          });
                          return `${formatDate(startDate)} - ${formatDate(yesterday)}`;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 ${
                    recentActivity.monthlyGrowth.isPositive 
                      ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border border-green-200/50 dark:from-green-900/30 dark:to-emerald-900/20 dark:text-green-400 dark:border-green-800/30' 
                      : 'bg-gradient-to-r from-red-100 to-rose-50 text-red-700 border border-red-200/50 dark:from-red-900/30 dark:to-rose-900/20 dark:text-red-400 dark:border-red-800/30'
                  }`}>
                    {recentActivity.monthlyGrowth.isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {recentActivity.monthlyGrowth.value.toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Launches Box */}
                  <div className="bg-muted/60 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Launches</span>
                      <span className="text-lg font-bold text-foreground">{formatNumber(recentActivity.stats30d.launches)}</span>
                    </div>
                    <div className="mt-2">
                      <LaunchpadSplitBar data={recentActivity.breakdown30d.launches} />
                    </div>
                  </div>
                  
                  {/* Graduations Box */}
                  <div className="bg-muted/60 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Graduations</span>
                      <span className="text-lg font-bold text-foreground">{formatNumber(recentActivity.stats30d.graduations)}</span>
                    </div>
                    <div className="mt-2">
                      <LaunchpadSplitBar data={recentActivity.breakdown30d.graduations} />
                    </div>
                  </div>
                  
                  {/* Graduation Rate Box */}
                  <div className="bg-muted/60 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Graduation Rate</span>
                      <span className="text-lg font-bold text-foreground">{recentActivity.stats30d.ratio.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stacked Bar Charts */}
      <div className="space-y-6 mb-6 lg:mb-8">
        
        {loading ? (
          <>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-6">
            {/* Launches Stacked Bar Chart */}
            {(() => {
              const launchesChartData = transformLaunchpadDataForStackedChart(
                getFilteredData("all"), // Always pass full data for DateRangeSelector
                'launches'
              );
              return (
                <StackedBarChart
                  title="Token Launches by Launchpad"
                  subtitle="Daily launches across all launchpads"
                  data={launchesChartData.data}
                  dataKeys={launchesChartData.dataKeys}
                  labels={launchesChartData.labels}
                  colors={launchesChartData.colors}
                  valueFormatter={formatChartNumber}
                  timeframe={launchesTimeframe}
                  onTimeframeChange={(value) => setLaunchesTimeframe(value as TimeFrame)}
                />
              );
            })()}

            {/* Launches Dominance Chart */}
            {(() => {
              const launchesChartData = transformLaunchpadDataForStackedChart(
                getFilteredData("all"), // Always pass full data for DateRangeSelector
                'launches'
              );
              return (
                <DominanceChart
                  title="Launch Market Dominance"
                  subtitle="Market share percentage by launchpad"
                  data={launchesChartData.data}
                  dataKeys={launchesChartData.dataKeys}
                  labels={launchesChartData.labels}
                  colors={launchesChartData.colors}
                  timeframe={launchesDominanceTimeframe}
                  onTimeframeChange={(value) => setLaunchesDominanceTimeframe(value as TimeFrame)}
                />
              );
            })()}

            {/* Graduations Stacked Bar Chart */}
            {(() => {
              const graduationsChartData = transformLaunchpadDataForStackedChart(
                getFilteredData("all"), // Always pass full data for DateRangeSelector
                'graduations'
              );
              return (
                <StackedBarChart
                  title="Token Graduations by Launchpad"
                  subtitle="Daily graduations across all launchpads"
                  data={graduationsChartData.data}
                  dataKeys={graduationsChartData.dataKeys}
                  labels={graduationsChartData.labels}
                  colors={graduationsChartData.colors}
                  valueFormatter={formatChartNumber}
                  timeframe={graduationsTimeframe}
                  onTimeframeChange={(value) => setGraduationsTimeframe(value as TimeFrame)}
                />
              );
            })()}

            {/* Graduations Dominance Chart */}
            {(() => {
              const graduationsChartData = transformLaunchpadDataForStackedChart(
                getFilteredData("all"), // Always pass full data for DateRangeSelector
                'graduations'
              );
              return (
                <DominanceChart
                  title="Graduation Market Dominance"
                  subtitle="Market share percentage by launchpad"
                  data={graduationsChartData.data}
                  dataKeys={graduationsChartData.dataKeys}
                  labels={graduationsChartData.labels}
                  colors={graduationsChartData.colors}
                  timeframe={graduationsDominanceTimeframe}
                  onTimeframeChange={(value) => setGraduationsDominanceTimeframe(value as TimeFrame)}
                />
              );
            })()}
          </div>
        )}
      </div>

    </div>
  );
}