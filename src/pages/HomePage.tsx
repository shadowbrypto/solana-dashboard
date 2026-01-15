import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { GradientAreaCard } from '../components/GradientAreaCard';
import { GradientBarCard } from '../components/GradientBarCard';
import { FearGreedIndex } from '../components/FearGreedIndex';
import { LogoButtonCard } from '../components/LogoButtonCard';
import { DailyStatsCard } from '../components/DailyStatsCard';
import { dashboardApi, DashboardStats } from '../lib/dashboard-api';
import { FearGreedSkeleton } from '../components/skeletons/FearGreedSkeleton';
import { GradientAreaSkeleton } from '../components/skeletons/GradientAreaSkeleton';
import { LogoButtonSkeleton } from '../components/skeletons/LogoButtonSkeleton';
import { GradientBarSkeleton } from '../components/skeletons/GradientBarSkeleton';
import { DailyStatsSkeleton } from '../components/skeletons/DailyStatsSkeleton';
import { formatCurrency, formatNumber } from '../lib/utils';

export function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const data = await dashboardApi.getDashboardStats();
        setStats(data);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard stats');
        console.error('Dashboard stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
    
    // Refresh data every 60 seconds
    const interval = setInterval(fetchDashboardStats, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to Solana Analytics
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Professional analytics dashboard for Solana and EVM trading protocols
        </p>
      </div>

      {/* Main grid layout - coherent tile system */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            {/* Fear & Greed Index - 1 tile */}
            <FearGreedSkeleton />

            {/* Token Launches - 2 tiles */}
            <div className="xl:col-span-2 h-full">
              <GradientAreaSkeleton className="h-full" />
            </div>

            {/* Volume by Chain - 1 tile */}
            <LogoButtonSkeleton />

            {/* Core metrics - 4 tiles */}
            <GradientAreaSkeleton />
            <GradientAreaSkeleton />
            <GradientAreaSkeleton />
            <GradientAreaSkeleton />
          </>
        ) : error ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        ) : stats ? (
          <>
            {/* Fear & Greed Index - 1 tile */}
            <FearGreedIndex 
              value={stats.fearGreedIndex}
            />

            {/* Token Launches - 2 tiles */}
            <div className="xl:col-span-2 h-full">
              <GradientAreaCard
                title="Token Launches"
                subtitle={formatNumber(stats.launchpad.launches)}
                data={stats.trends.launches}
                growth={stats.launchpad.growth.launches}
                gradientId="tokenLaunches"
                strokeColor="#f59e0b"
                gradientStartColor="#f59e0b"
                gradientEndColor="#fbbf24"
                className="h-full"
              />
            </div>

            {/* Volume by Chain - 1 tile */}
            <LogoButtonCard
              title="Volume by Chain"
              defaultValue={stats?.chainVolumes?.total || 24750000}
              formatValue={(val) => {
                if (val >= 1000000) {
                  return `$${(val / 1000000).toFixed(1)}M`;
                } else if (val >= 1000) {
                  return `$${(val / 1000).toFixed(1)}K`;
                }
                return `$${val.toLocaleString()}`;
              }}
              buttons={[
                {
                  id: 'solana',
                  logo: '/assets/logos/solana.jpg',
                  value: stats?.chainVolumes?.solana || 15420000,
                  label: 'Solana'
                },
                {
                  id: 'ethereum',
                  logo: '/assets/logos/ethereum.jpg',
                  value: stats?.chainVolumes?.ethereum || 6890000,
                  label: 'Ethereum'
                },
                {
                  id: 'bsc',
                  logo: '/assets/logos/bsc.jpg',
                  value: stats?.chainVolumes?.bsc || 2440000,
                  label: 'BSC'
                },
                {
                  id: 'base',
                  logo: '/assets/logos/base.jpg',
                  value: stats?.chainVolumes?.base || 1850000,
                  label: 'Base'
                }
              ]}
            />

            {/* Core metrics - 4 tiles */}
            <GradientAreaCard
              title="Trading Volume"
              subtitle={formatCurrency(stats.yesterday.volume)}
              data={stats.trends.volume}
              growth={stats.growth.volume}
              gradientId="volume"
              strokeColor="#8b5cf6"
              gradientStartColor="#8b5cf6"
              gradientEndColor="#a78bfa"
            />

            <GradientAreaCard
              title="Daily Active Users"
              subtitle={formatNumber(stats.yesterday.users)}
              data={stats.trends.users}
              growth={stats.growth.users}
              gradientId="users"
              strokeColor="#3b82f6"
              gradientStartColor="#3b82f6"
              gradientEndColor="#60a5fa"
            />

            <GradientAreaCard
              title="New Users"
              subtitle={formatNumber(stats.yesterday.newUsers)}
              data={stats.trends.newUsers}
              growth={stats.growth.newUsers}
              gradientId="newUsers"
              strokeColor="#10b981"
              gradientStartColor="#10b981"
              gradientEndColor="#34d399"
            />

            <GradientAreaCard
              title="Trades"
              subtitle={formatNumber(stats.yesterday.trades)}
              data={stats.trends.trades}
              growth={stats.growth.trades}
              gradientId="trades"
              strokeColor="#06b6d4"
              gradientStartColor="#06b6d4"
              gradientEndColor="#67e8f9"
            />
          </>
        ) : null}
      </div>

      {/* Protocol rankings - coherent 4-column grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <GradientBarSkeleton />
          <GradientBarSkeleton />
          <div className="xl:col-span-2 xl:row-span-2">
            <DailyStatsSkeleton />
          </div>
        </div>
      ) : stats?.rankings ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <GradientBarCard
            title="Top Protocols by Volume"
            subtitle={formatCurrency(stats.rankings.byVolume.reduce((sum, item) => sum + item.value, 0))}
            data={stats.rankings.byVolume}
            barColor="#8b5cf6"
            gradientId="volumeBar"
            gradientStartColor="#8b5cf6"
            gradientEndColor="#a78bfa"
          />

          <GradientBarCard
            title="Top Protocols by Users"
            subtitle={formatNumber(stats.rankings.byUsers.reduce((sum, item) => sum + item.value, 0))}
            data={stats.rankings.byUsers}
            barColor="#ec4899"
            gradientId="usersBar"
            gradientStartColor="#ec4899"
            gradientEndColor="#f9a8d4"
          />


          {/* Daily Stats Card - 2x2 tiles */}
          {stats?.topProtocols && (
            <div className="xl:col-span-2 xl:row-span-2">
              <DailyStatsCard
                data={stats.topProtocols}
              />
            </div>
          )}
        </div>
      ) : null}

    </div>
  );
}