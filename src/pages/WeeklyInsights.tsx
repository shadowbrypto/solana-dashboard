import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { getProtocolStats, getAggregatedProtocolStats } from '../lib/protocol';
import { ProtocolStats } from '../types/protocol';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Users, DollarSign, Activity, Shield, Target, GripVertical } from 'lucide-react';
import { generateAdvancedAIInsights } from '../lib/ai-insights';

interface WeeklyInsight {
  id: string;
  type: 'trend' | 'comparison' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  protocols: string[];
  metrics: {
    metric: string;
    change: number;
    value: number;
  }[];
  confidence: number;
  recommendation?: string;
}

interface WeeklyStats {
  protocol: string;
  volume_change: number;
  users_change: number;
  trades_change: number;
  fees_change: number;
  volume_total: number;
  users_total: number;
  trades_total: number;
  fees_total: number;
  market_share_volume: number;
  market_share_users: number;
}

interface TableColumn {
  key: string;
  label: string;
  align: 'left' | 'right';
  render: (stat: WeeklyStats) => React.ReactNode;
}

const WeeklyInsights: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>(['protocol', 'volume', 'users', 'trades', 'fees', 'market_share']);

  useEffect(() => {
    loadWeeklyData();
  }, []);

  const loadWeeklyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get aggregated data for all protocols
      const allData = await getAggregatedProtocolStats();
      
      if (!allData || allData.length === 0) {
        throw new Error('No data available');
      }

      // Get last 7 days and previous 7 days for comparison
      const sortedData = allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last7Days = sortedData.slice(0, 7);
      const previous7Days = sortedData.slice(7, 14);

      const protocols = ["bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"];
      
      // Calculate weekly stats for each protocol
      const weeklyStatsData: WeeklyStats[] = protocols.map(protocol => {
        const currentWeekTotals = last7Days.reduce((acc, day) => ({
          volume: acc.volume + (day[`${protocol}_volume`] || 0),
          users: acc.users + (day[`${protocol}_users`] || 0),
          trades: acc.trades + (day[`${protocol}_trades`] || 0),
          fees: acc.fees + (day[`${protocol}_fees`] || 0)
        }), { volume: 0, users: 0, trades: 0, fees: 0 });

        const previousWeekTotals = previous7Days.reduce((acc, day) => ({
          volume: acc.volume + (day[`${protocol}_volume`] || 0),
          users: acc.users + (day[`${protocol}_users`] || 0),
          trades: acc.trades + (day[`${protocol}_trades`] || 0),
          fees: acc.fees + (day[`${protocol}_fees`] || 0)
        }), { volume: 0, users: 0, trades: 0, fees: 0 });

        // Calculate total market for market share
        const totalMarketVolume = last7Days.reduce((acc, day) => 
          acc + protocols.reduce((sum, p) => sum + (day[`${p}_volume`] || 0), 0), 0);
        const totalMarketUsers = last7Days.reduce((acc, day) => 
          acc + protocols.reduce((sum, p) => sum + (day[`${p}_users`] || 0), 0), 0);

        return {
          protocol,
          volume_change: previousWeekTotals.volume > 0 ? 
            ((currentWeekTotals.volume - previousWeekTotals.volume) / previousWeekTotals.volume) * 100 : 0,
          users_change: previousWeekTotals.users > 0 ? 
            ((currentWeekTotals.users - previousWeekTotals.users) / previousWeekTotals.users) * 100 : 0,
          trades_change: previousWeekTotals.trades > 0 ? 
            ((currentWeekTotals.trades - previousWeekTotals.trades) / previousWeekTotals.trades) * 100 : 0,
          fees_change: previousWeekTotals.fees > 0 ? 
            ((currentWeekTotals.fees - previousWeekTotals.fees) / previousWeekTotals.fees) * 100 : 0,
          volume_total: currentWeekTotals.volume,
          users_total: currentWeekTotals.users,
          trades_total: currentWeekTotals.trades,
          fees_total: currentWeekTotals.fees,
          market_share_volume: totalMarketVolume > 0 ? (currentWeekTotals.volume / totalMarketVolume) * 100 : 0,
          market_share_users: totalMarketUsers > 0 ? (currentWeekTotals.users / totalMarketUsers) * 100 : 0
        };
      });

      setWeeklyStats(weeklyStatsData);
      
      // Generate AI insights using advanced AI analysis
      const generatedInsights = await generateAdvancedAIInsights(weeklyStatsData);
      setInsights(generatedInsights);

    } catch (err) {
      console.error('Error loading weekly data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load weekly insights');
    } finally {
      setLoading(false);
    }
  };


  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  const formatValue = (value: number, type: 'volume' | 'users' | 'trades' | 'fees') => {
    if (type === 'volume' || type === 'fees') {
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      return `$${(value / 1e3).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  const columns: Record<string, TableColumn> = {
    protocol: {
      key: 'protocol',
      label: 'Protocol',
      align: 'left',
      render: (stat: WeeklyStats) => (
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize text-foreground">{stat.protocol}</span>
          {stat.protocol === 'trojan' && (
            <Badge variant="outline" className="text-xs">Focus</Badge>
          )}
        </div>
      )
    },
    volume: {
      key: 'volume',
      label: 'Volume',
      align: 'right',
      render: (stat: WeeklyStats) => (
        <div className="space-y-1">
          <div className="text-foreground">{formatValue(stat.volume_total, 'volume')}</div>
          <div>{formatChange(stat.volume_change)}</div>
        </div>
      )
    },
    users: {
      key: 'users',
      label: 'Users',
      align: 'right',
      render: (stat: WeeklyStats) => (
        <div className="space-y-1">
          <div className="text-foreground">{formatValue(stat.users_total, 'users')}</div>
          <div>{formatChange(stat.users_change)}</div>
        </div>
      )
    },
    trades: {
      key: 'trades',
      label: 'Trades',
      align: 'right',
      render: (stat: WeeklyStats) => (
        <div className="space-y-1">
          <div className="text-foreground">{formatValue(stat.trades_total, 'trades')}</div>
          <div>{formatChange(stat.trades_change)}</div>
        </div>
      )
    },
    fees: {
      key: 'fees',
      label: 'Fees',
      align: 'right',
      render: (stat: WeeklyStats) => (
        <div className="space-y-1">
          <div className="text-foreground">{formatValue(stat.fees_total, 'fees')}</div>
          <div>{formatChange(stat.fees_change)}</div>
        </div>
      )
    },
    market_share: {
      key: 'market_share',
      label: 'Market Share',
      align: 'right',
      render: (stat: WeeklyStats) => (
        <div className="space-y-1">
          <div className="text-foreground">{stat.market_share_volume.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">of volume</div>
        </div>
      )
    }
  };

  const handleDragStart = (e: React.DragEvent, columnIndex: number) => {
    setDraggedColumn(columnIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedColumn === null || draggedColumn === dropIndex) {
      setDraggedColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedItem = newOrder[draggedColumn];
    
    // Remove the dragged item
    newOrder.splice(draggedColumn, 1);
    
    // Insert at new position
    newOrder.splice(dropIndex, 0, draggedItem);
    
    setColumnOrder(newOrder);
    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const getInsightIcon = (type: WeeklyInsight['type']) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'comparison':
        return <BarChart3 className="w-5 h-5 text-blue-500" />;
      case 'anomaly':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'opportunity':
        return <Target className="w-5 h-5 text-purple-500" />;
      case 'risk':
        return <Shield className="w-5 h-5 text-red-500" />;
    }
  };

  const getImpactBadgeColor = (impact: WeeklyInsight['impact']) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Error loading weekly insights: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Weekly Insights</h1>
        <p className="text-muted-foreground">
          AI-powered analysis of protocol performance over the last 7 days with actionable insights and trends.
        </p>
      </div>

      {/* Key Insights */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground mb-4">🤖 AI-Generated Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {insights.map(insight => (
            <Card key={insight.id} className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    <CardTitle className="text-lg text-card-foreground">{insight.title}</CardTitle>
                  </div>
                  <Badge variant="secondary" className={getImpactBadgeColor(insight.impact)}>
                    {insight.impact}
                  </Badge>
                </div>
                <CardDescription className="text-muted-foreground">{insight.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Protocols: {insight.protocols.map(p => p.toUpperCase()).join(', ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <div className="w-16 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${insight.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-foreground">{(insight.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {insight.metrics.slice(0, 2).map((metric, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="text-muted-foreground">{metric.metric}:</div>
                        <div className="flex items-center gap-1">
                          {formatChange(metric.change)}
                          <span className="text-xs text-muted-foreground">
                            ({formatValue(metric.value, 'volume')})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {insight.recommendation && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="text-xs font-medium text-muted-foreground mb-1">💡 AI Recommendation</div>
                      <div className="text-sm text-foreground">{insight.recommendation}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Protocol Performance Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">📊 7-Day Protocol Performance</h2>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            Drag columns to reorder
          </div>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {columnOrder.map((columnKey, index) => {
                      const column = columns[columnKey];
                      return (
                        <th
                          key={columnKey}
                          className={`py-3 px-4 font-medium text-muted-foreground cursor-move select-none transition-colors hover:bg-muted/50 ${
                            column.align === 'left' ? 'text-left' : 'text-right'
                          } ${draggedColumn === index ? 'opacity-50' : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="flex items-center gap-2 justify-between">
                            <span>{column.label}</span>
                            <GripVertical className="w-3 h-3 opacity-50" />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {weeklyStats
                    .sort((a, b) => b.volume_total - a.volume_total)
                    .map(stat => (
                      <tr key={stat.protocol} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                        {columnOrder.map((columnKey) => {
                          const column = columns[columnKey];
                          return (
                            <td 
                              key={columnKey} 
                              className={`py-3 px-4 ${column.align === 'left' ? 'text-left' : 'text-right'}`}
                            >
                              {column.render(stat)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeeklyInsights;