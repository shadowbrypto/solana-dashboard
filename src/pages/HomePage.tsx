import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { GradientAreaCard } from '../components/GradientAreaCard';
import { GradientBarCard } from '../components/GradientBarCard';
import { FearGreedIndex } from '../components/FearGreedIndex';
import { LogoButtonCard } from '../components/LogoButtonCard';
import { DailyStatsCard } from '../components/DailyStatsCard';
import { dashboardApi, DashboardStats } from '../lib/dashboard-api';
import { Skeleton } from '../components/ui/skeleton';

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

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to Solana Analytics
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Professional analytics dashboard for Solana and EVM trading protocols
        </p>
      </div>

      {/* Top row with 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32 mt-2" />
                </CardHeader>
                <CardContent className="p-0">
                  <Skeleton className="h-[100px] w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : error ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        ) : stats ? (
          <>
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
              strokeColor="#f59e0b"
              gradientStartColor="#f59e0b"
              gradientEndColor="#fbbf24"
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

      {/* Bar chart cards row */}
      {stats?.rankings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          <GradientBarCard
            title="Top Protocols by Trades"
            subtitle={formatNumber(stats.rankings.byTrades.reduce((sum, item) => sum + item.value, 0))}
            data={stats.rankings.byTrades}
            barColor="#14b8a6"
            gradientId="tradesBar"
            gradientStartColor="#14b8a6"
            gradientEndColor="#5eead4"
          />
        </div>
      )}

      {/* Fear & Greed Index, Logo Button Card and Daily Volume Card row */}
      {stats?.fearGreedIndex !== undefined && (
        <div className="flex justify-center gap-6">
          <div className="w-56">
            <FearGreedIndex 
              value={stats.fearGreedIndex}
            />
          </div>
          <div className="w-full max-w-xs">
            <LogoButtonCard
              title="Volume by Chain"
              defaultValue={24750000}
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
                  value: 15420000,
                  label: 'Solana'
                },
                {
                  id: 'ethereum',
                  logo: '/assets/logos/ethereum.jpg',
                  value: 6890000,
                  label: 'Ethereum'
                },
                {
                  id: 'bsc',
                  logo: '/assets/logos/bsc.jpg',
                  value: 2440000,
                  label: 'BSC'
                },
                {
                  id: 'base',
                  logo: '/assets/logos/base.jpg',
                  value: 1850000,
                  label: 'Base'
                }
              ]}
            />
          </div>
          <div className="w-full max-w-sm">
            <DailyStatsCard
              data={[
                {
                  app: "Trojan",
                  protocolId: "trojan",
                  volume: 45200000,
                  volumeGrowth: 12.5,
                  daus: 125000,
                  dausGrowth: 8.3,
                  newUsers: 8500,
                  newUsersGrowth: 15.2,
                  trades: 890000,
                  tradesGrowth: 10.7
                },
                {
                  app: "Photon",
                  protocolId: "photon",
                  volume: 32100000,
                  volumeGrowth: -3.2,
                  daus: 98000,
                  dausGrowth: -2.1,
                  newUsers: 6200,
                  newUsersGrowth: 4.8,
                  trades: 650000,
                  tradesGrowth: -1.5
                },
                {
                  app: "BonkBot",
                  protocolId: "bonkbot",
                  volume: 18900000,
                  volumeGrowth: 8.7,
                  daus: 65000,
                  dausGrowth: 12.4,
                  newUsers: 4100,
                  newUsersGrowth: 18.9,
                  trades: 420000,
                  tradesGrowth: 6.3
                },
                {
                  app: "Bloom",
                  protocolId: "bloom",
                  volume: 12400000,
                  volumeGrowth: 15.3,
                  daus: 42000,
                  dausGrowth: 9.7,
                  newUsers: 2800,
                  newUsersGrowth: 22.1,
                  trades: 280000,
                  tradesGrowth: 13.8
                },
                {
                  app: "Maestro",
                  protocolId: "maestro",
                  volume: 8600000,
                  volumeGrowth: -1.8,
                  daus: 28000,
                  dausGrowth: 3.2,
                  newUsers: 1900,
                  newUsersGrowth: 7.4,
                  trades: 185000,
                  tradesGrowth: -0.9
                }
              ]}
            />
          </div>
        </div>
      )}

    </div>
  );
}