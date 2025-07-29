import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { LaunchpadApi, LaunchpadMetrics } from '../lib/launchpad-api';
import { getLaunchpadById } from '../lib/launchpad-config';
import { MetricCard } from '../components/MetricCard';
import { MetricCardSkeleton } from '../components/MetricCardSkeleton';
import { StackedBarChart } from '../components/charts/StackedBarChart';
import { StackedBarChartSkeleton } from '../components/charts/StackedBarChartSkeleton';
import { TimelineChart } from '../components/charts/TimelineChart';
import { TimelineChartSkeleton } from '../components/charts/TimelineChartSkeleton';
import { Rocket, TrendingUp, Calendar, Target } from 'lucide-react';

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

  const launchpadConfig = getLaunchpadById(launchpadId);
  const launchpadName = launchpadConfig?.name || launchpadId;

  useEffect(() => {
    fetchAllData();
  }, [launchpadId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all available data for lifetime metrics and chart filtering
      const metrics = await LaunchpadApi.getMetrics({
        launchpad: launchpadId,
        timeframe: 'all'
      });
      setAllData(metrics);
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

  if (loading) {
    return (
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="flex items-center justify-center gap-3 mb-6 lg:mb-8">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted animate-pulse rounded-lg" />
          <div className="h-8 sm:h-10 w-48 bg-muted animate-pulse rounded" />
        </div>
        
        <div className="mb-6 lg:mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>

        <StackedBarChartSkeleton />
        <TimelineChartSkeleton />
      </div>
    );
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
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-muted/10 ring-1 ring-border">
          <img 
            src="/assets/logos/pumpfun.jpg"
            alt={launchpadName} 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to rocket icon if logo not found
              const target = e.target as HTMLImageElement;
              const container = target.parentElement;
              if (container) {
                container.innerHTML = '';
                container.className = 'w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center';
                const iconElement = document.createElement('div');
                iconElement.innerHTML = '<svg class="w-4 h-4 sm:w-5 sm:h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.25-2 5.2-2 5.2s4-0.5 5.2-2c1.6-2 2.8-7 2.8-7s-5 1.2-7 2.8Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>';
                container.appendChild(iconElement);
              }
            }}
          />
        </div>
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-2xl sm:text-3xl text-foreground text-center font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            {launchpadName} Launchpad
          </h1>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="mb-6 lg:mb-8 grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-3 lg:grid-cols-3">
        <MetricCard
          title="Tokens Launched"
          type="trades"
          value={totalLaunches}
          subtitle={launchpadName}
        />
        <MetricCard
          title="Tokens Graduated"
          type="users"
          value={totalGraduations}
          subtitle={launchpadName}
        />
        <MetricCard
          title="Graduation Rate"
          type="fees"
          value={`${graduationRate}%`}
          subtitle={launchpadName}
        />
      </div>

      {/* Charts */}
      <div className="space-y-4 lg:space-y-6">
        <StackedBarChart
          title="Daily Launches and Graduations"
          subtitle={launchpadName}
          data={chartData}
          dataKeys={['launches', 'graduations']}
          labels={['Launches', 'Graduations']}
          colors={[
            'hsl(217, 91%, 60%)', // Blue for launches (more visible)
            'hsl(142, 76%, 36%)'  // Green for graduations (high contrast)
          ]}
          valueFormatter={(value) => value.toLocaleString()}
          loading={loading}
        />
        
        <TimelineChart
          title="Daily Graduation Rate"
          subtitle={launchpadName}
          data={graduationRatioData}
          dataKey="graduation_ratio"
          color="hsl(217, 91%, 60%)" // Blue color for graduation rate
          valueFormatter={(value) => `${value.toFixed(2)}%`}
          loading={loading}
        />
      </div>
    </div>
  );
}