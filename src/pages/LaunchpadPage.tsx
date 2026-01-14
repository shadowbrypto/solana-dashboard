import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { LaunchpadApi, LaunchpadMetrics } from '../lib/launchpad-api';
import { getLaunchpadById, getLaunchpadLogoFilename, getLaunchpadTheme } from '../lib/launchpad-config';
import { LaunchpadLogo } from '../components/ui/logo-with-fallback';
import { MetricCard } from '../components/MetricCard';
import { StackedBarChart } from '../components/charts/StackedBarChart';
import { TimelineChart } from '../components/charts/TimelineChart';
import { LaunchpadPageSkeleton } from '../components/LaunchpadPageSkeleton';
import { Rocket, TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';

interface ChartData {
  date: string;
  launches: number;
  graduations: number;
  formattedDay: string;
}

interface GraduationRatioData {
  date: string;
  graduation_ratio: number;
  formattedDay: string;
}

export function LaunchpadPage() {
  const [searchParams] = useSearchParams();
  const launchpadId = searchParams.get('launchpad') || 'pumpfun';
  
  const [allData, setAllData] = useState<LaunchpadMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestDate, setLatestDate] = useState<Date | null>(null);

  const launchpadConfig = getLaunchpadById(launchpadId);
  const launchpadName = launchpadConfig?.name || launchpadId;
  const theme = getLaunchpadTheme(launchpadId);

  useEffect(() => {
    fetchAllData();
  }, [launchpadId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all available data for lifetime metrics and chart filtering
      const [metrics, latestDatesData] = await Promise.all([
        LaunchpadApi.getMetrics({
          launchpad: launchpadId,
          timeframe: 'all'
        }),
        LaunchpadApi.getLatestDataDates()
      ]);
      
      setAllData(metrics);
      
      // Find the latest date for this specific launchpad
      const launchpadLatestDate = latestDatesData.find(
        item => item.launchpad_name === launchpadId
      );
      
      if (launchpadLatestDate) {
        setLatestDate(new Date(launchpadLatestDate.latest_date));
      }
      
    } catch (err) {
      console.error('Error fetching launchpad data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const chartData: ChartData[] = allData.map(item => ({
    date: item.date,
    launches: item.launches,
    graduations: item.graduations,
    formattedDay: format(parseISO(item.date), 'dd-MM-yyyy')
  }));

  // Calculate graduation ratio data for area chart
  const graduationRatioData: GraduationRatioData[] = allData.map(item => {
    const ratio = item.launches > 0 ? (item.graduations / item.launches) * 100 : 0;
    return {
      date: item.date,
      graduation_ratio: ratio,
      formattedDay: format(parseISO(item.date), 'dd-MM-yyyy')
    };
  });

  // Calculate lifetime totals from all data
  const totalLaunches = allData.reduce((sum, item) => sum + item.launches, 0);
  const totalGraduations = allData.reduce((sum, item) => sum + item.graduations, 0);
  const graduationRate = totalLaunches > 0 ? ((totalGraduations / totalLaunches) * 100).toFixed(1) : '0.0';

  // Calculate time-based stats
  const calculateTimeStats = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredData = allData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });

    const launches = filteredData.reduce((sum, item) => sum + item.launches, 0);
    const graduations = filteredData.reduce((sum, item) => sum + item.graduations, 0);
    const ratio = launches > 0 ? ((graduations / launches) * 100).toFixed(1) : '0.0';

    return { launches, graduations, ratio };
  };

  const stats1d = calculateTimeStats(1);
  const stats7d = calculateTimeStats(7);
  const stats30d = calculateTimeStats(30);

  // Calculate previous day stats (day before yesterday)
  const calculatePreviousDayStats = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    
    const previousDayData = allData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= dayBeforeYesterday && itemDate < yesterday;
    });

    const launches = previousDayData.reduce((sum, item) => sum + item.launches, 0);
    const graduations = previousDayData.reduce((sum, item) => sum + item.graduations, 0);
    const ratio = launches > 0 ? ((graduations / launches) * 100).toFixed(1) : '0.0';

    return { launches, graduations, ratio };
  };

  const statsPreviousDay = calculatePreviousDayStats();

  // Calculate growth for each timeframe
  const calculateGrowth = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: 0, isPositive: true };
    const growth = ((current - previous) / previous) * 100;
    return { value: Math.abs(growth), isPositive: growth >= 0 };
  };

  // Daily growth (last day vs day before)
  const dayBeforeStats = (() => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const data = allData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= threeDaysAgo && itemDate < twoDaysAgo;
    });

    const launches = data.reduce((sum, item) => sum + item.launches, 0);
    const graduations = data.reduce((sum, item) => sum + item.graduations, 0);
    return { launches, graduations };
  })();

  // 7-day growth (last 7d vs previous 7d)
  const previous7dStats = (() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const data = allData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= fourteenDaysAgo && itemDate < sevenDaysAgo;
    });

    const launches = data.reduce((sum, item) => sum + item.launches, 0);
    const graduations = data.reduce((sum, item) => sum + item.graduations, 0);
    return { launches, graduations };
  })();

  // 30-day growth (last 30d vs previous 30d)
  const previous30dStats = (() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const data = allData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= sixtyDaysAgo && itemDate < thirtyDaysAgo;
    });

    const launches = data.reduce((sum, item) => sum + item.launches, 0);
    const graduations = data.reduce((sum, item) => sum + item.graduations, 0);
    return { launches, graduations };
  })();

  // Calculate growth percentages
  const dailyLaunchGrowth = calculateGrowth(statsPreviousDay.launches, dayBeforeStats.launches);
  const weeklyLaunchGrowth = calculateGrowth(stats7d.launches, previous7dStats.launches);
  const monthlyLaunchGrowth = calculateGrowth(stats30d.launches, previous30dStats.launches);

  if (loading) {
    return <LaunchpadPageSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl mb-4 text-red-600">Error: {error}</h1>
        <button
          onClick={fetchAllData}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-6 lg:mb-8">
        <LaunchpadLogo
          src={`/assets/logos/${getLaunchpadLogoFilename(launchpadId)}`}
          alt={launchpadName}
          size="lg"
        />
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-2xl sm:text-3xl text-center font-semibold bg-gradient-to-br from-purple-600 via-purple-500 to-teal-500 bg-clip-text text-transparent tracking-tight">
            {launchpadName} Launchpad
          </h1>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="mb-6 lg:mb-8 grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-3 lg:grid-cols-3">
        <MetricCard
          title="Tokens Launched"
          type="launches"
          value={totalLaunches}
          protocolName={launchpadName}
          protocolLogo={getLaunchpadLogoFilename(launchpadId)}
          latestDate={latestDate}
        />
        <MetricCard
          title="Tokens Graduated"
          type="graduations"
          value={totalGraduations}
          protocolName={launchpadName}
          protocolLogo={getLaunchpadLogoFilename(launchpadId)}
          latestDate={latestDate}
        />
        <MetricCard
          title="Graduation Rate"
          type="graduation_rate"
          value={`${graduationRate}%`}
          protocolName={launchpadName}
          protocolLogo={getLaunchpadLogoFilename(launchpadId)}
          latestDate={latestDate}
        />
      </div>

      {/* Time-based Statistics */}
      <div className="mb-6 lg:mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Last Day Stats */}
          <div className="group relative bg-gradient-to-br from-card via-card/95 to-blue-50/30 dark:to-blue-950/10 border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 hover:border-blue-500/20 overflow-hidden">
            {/* Subtle accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"></div>
                  <h4 className="font-semibold text-sm text-foreground">Last Day</h4>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 ${
                  dailyLaunchGrowth.isPositive 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border border-green-200/50 dark:from-green-900/30 dark:to-emerald-900/20 dark:text-green-400 dark:border-green-800/30' 
                    : 'bg-gradient-to-r from-red-100 to-rose-50 text-red-700 border border-red-200/50 dark:from-red-900/30 dark:to-rose-900/20 dark:text-red-400 dark:border-red-800/30'
                }`}>
                  {dailyLaunchGrowth.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {dailyLaunchGrowth.value.toFixed(1)}%
                </div>
              </div>
              <div className="w-full h-px bg-gradient-to-r from-blue-500/20 via-blue-500/40 to-blue-500/20 my-3"></div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-muted-foreground/80">Launched</span>
                  <span className="text-base font-semibold text-foreground tabular-nums">{statsPreviousDay.launches.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-muted-foreground/80">Graduated</span>
                  <span className="text-base font-semibold text-foreground tabular-nums">{statsPreviousDay.graduations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-muted-foreground/80">Graduation Ratio</span>
                  <span className="text-base font-semibold text-foreground tabular-nums">{statsPreviousDay.ratio}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 7 Day Stats */}
          <div className="group relative bg-gradient-to-br from-card via-card/95 to-green-50/30 dark:to-green-950/10 border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-lg hover:shadow-green-500/5 transition-all duration-300 hover:border-green-500/20 overflow-hidden">
            {/* Subtle accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-sm"></div>
                  <h4 className="font-semibold text-sm text-foreground">Last 7 Days</h4>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 ${
                  weeklyLaunchGrowth.isPositive 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border border-green-200/50 dark:from-green-900/30 dark:to-emerald-900/20 dark:text-green-400 dark:border-green-800/30' 
                    : 'bg-gradient-to-r from-red-100 to-rose-50 text-red-700 border border-red-200/50 dark:from-red-900/30 dark:to-rose-900/20 dark:text-red-400 dark:border-red-800/30'
                }`}>
                  {weeklyLaunchGrowth.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {weeklyLaunchGrowth.value.toFixed(1)}%
                </div>
              </div>
              <div className="w-full h-px bg-gradient-to-r from-green-500/20 via-green-500/40 to-green-500/20 my-3"></div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-muted-foreground/80">Launched</span>
                  <span className="text-base font-semibold text-foreground tabular-nums">{stats7d.launches.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-muted-foreground/80">Graduated</span>
                  <span className="text-base font-semibold text-foreground tabular-nums">{stats7d.graduations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-muted-foreground/80">Graduation Ratio</span>
                  <span className="text-base font-semibold text-foreground tabular-nums">{stats7d.ratio}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 30 Day Stats */}
          <div className="group relative bg-gradient-to-br from-card via-card/95 to-purple-50/30 dark:to-purple-950/10 border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:border-purple-500/20 overflow-hidden">
            {/* Subtle accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 shadow-sm"></div>
                  <h4 className="font-semibold text-sm text-foreground">Last 30 Days</h4>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 ${
                  monthlyLaunchGrowth.isPositive 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border border-green-200/50 dark:from-green-900/30 dark:to-emerald-900/20 dark:text-green-400 dark:border-green-800/30' 
                    : 'bg-gradient-to-r from-red-100 to-rose-50 text-red-700 border border-red-200/50 dark:from-red-900/30 dark:to-rose-900/20 dark:text-red-400 dark:border-red-800/30'
                }`}>
                  {monthlyLaunchGrowth.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {monthlyLaunchGrowth.value.toFixed(1)}%
                </div>
              </div>
              <div className="w-full h-px bg-gradient-to-r from-purple-500/20 via-purple-500/40 to-purple-500/20 my-3"></div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-muted-foreground/80">Launched</span>
                  <span className="text-base font-semibold text-foreground tabular-nums">{stats30d.launches.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-muted-foreground/80">Graduated</span>
                  <span className="text-base font-semibold text-foreground tabular-nums">{stats30d.graduations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-medium text-muted-foreground/80">Graduation Ratio</span>
                  <span className="text-base font-semibold text-foreground tabular-nums">{stats30d.ratio}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-4 lg:space-y-6">
        <StackedBarChart
          title="Daily Launches and Graduations"
          subtitle={launchpadName}
          data={chartData}
          dataKeys={['launches', 'graduations']}
          labels={['Launches', 'Graduations']}
          colors={theme.chartColors}
          valueFormatter={(value) => value.toLocaleString()}
          loading={loading}
        />
        
        <TimelineChart
          title="Daily Graduation Rate"
          subtitle={launchpadName}
          data={graduationRatioData}
          dataKey="graduation_ratio"
          color={theme.primary}
          valueFormatter={(value) => `${value.toFixed(2)}%`}
          loading={loading}
        />
      </div>
    </div>
  );
}