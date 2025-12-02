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

interface AIInsight {
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

// Protocol categories for comparative analysis
const PROTOCOL_CATEGORIES = {
  'trading_bots': ['bullx', 'photon', 'trojan'],
  'ai_platforms': ['gmgnai', 'axiom'],
  'dex_tools': ['bloom', 'vector'],
  'social_bots': ['bonkbot', 'soltradingbot', 'maestro'],
  'portfolio_tools': ['nova', 'banana', 'terminal'],
  'launch_platforms': ['moonshot']
};

// Advanced statistical functions
function calculateZScore(value: number, mean: number, stdDev: number): number {
  return stdDev === 0 ? 0 : (value - mean) / stdDev;
}

function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// Main AI insights generator
export async function generateAdvancedAIInsights(weeklyStats: WeeklyStats[]): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // 1. Market Leader Analysis
  const volumeLeader = weeklyStats.reduce((max, current) => 
    current.volume_total > max.volume_total ? current : max
  );
  
  if (volumeLeader.volume_change > 15) {
    insights.push({
      id: 'market-leader-surge',
      type: 'trend',
      title: `${volumeLeader.protocol.toUpperCase()} Dominates with ${volumeLeader.volume_change.toFixed(1)}% Growth`,
      description: `Market leader ${volumeLeader.protocol.toUpperCase()} has achieved exceptional growth of ${volumeLeader.volume_change.toFixed(1)}% this week, capturing ${volumeLeader.market_share_volume.toFixed(1)}% of total market volume. This surge indicates strong product-market fit and user adoption.`,
      impact: volumeLeader.volume_change > 30 ? 'high' : 'medium',
      protocols: [volumeLeader.protocol],
      metrics: [
        { metric: 'Volume Growth', change: volumeLeader.volume_change, value: volumeLeader.volume_total },
        { metric: 'Market Share', change: 0, value: volumeLeader.market_share_volume }
      ],
      confidence: 0.9,
      recommendation: `Monitor ${volumeLeader.protocol.toUpperCase()}'s competitive moat and identify factors driving this exceptional growth for potential replication.`
    });
  }

  // 2. Trojan Competitive Analysis
  const trojanStats = weeklyStats.find(s => s.protocol === 'trojan');
  if (trojanStats) {
    const tradingBotPeers = weeklyStats.filter(s => PROTOCOL_CATEGORIES.trading_bots.includes(s.protocol));
    const peerPerformance = tradingBotPeers.filter(p => p.protocol !== 'trojan');
    const avgPeerVolumeChange = peerPerformance.reduce((sum, p) => sum + p.volume_change, 0) / peerPerformance.length;
    const avgPeerMarketShare = peerPerformance.reduce((sum, p) => sum + p.market_share_volume, 0) / peerPerformance.length;
    
    const performanceGap = trojanStats.volume_change - avgPeerVolumeChange;
    const marketShareGap = trojanStats.market_share_volume - avgPeerMarketShare;

    if (Math.abs(performanceGap) > 5) {
      insights.push({
        id: 'trojan-peer-analysis',
        type: 'comparison',
        title: `Trojan ${performanceGap > 0 ? 'Outperforms' : 'Underperforms'} Trading Bot Category`,
        description: `Trojan shows a ${performanceGap.toFixed(1)}% ${performanceGap > 0 ? 'advantage' : 'disadvantage'} compared to trading bot peers (BullX, Photon). Market share gap of ${marketShareGap.toFixed(1)}% suggests ${performanceGap > 0 ? 'competitive strength' : 'need for strategic repositioning'}.`,
        impact: Math.abs(performanceGap) > 15 ? 'high' : 'medium',
        protocols: ['trojan', 'bullx', 'photon'],
        metrics: [
          { metric: 'Performance Gap', change: performanceGap, value: trojanStats.volume_total },
          { metric: 'Market Share Gap', change: marketShareGap, value: trojanStats.market_share_volume }
        ],
        confidence: 0.85,
        recommendation: performanceGap > 0 ? 
          'Analyze Trojan\'s successful strategies for potential scaling and competitive moat strengthening.' :
          'Investigate peer strategies and consider feature gaps or market positioning adjustments.'
      });
    }
  }

  // 3. Statistical Anomaly Detection
  const volumeChanges = weeklyStats.map(s => s.volume_change);
  const mean = volumeChanges.reduce((sum, val) => sum + val, 0) / volumeChanges.length;
  const stdDev = calculateStandardDeviation(volumeChanges);
  
  const anomalies = weeklyStats.filter(s => {
    const zScore = calculateZScore(s.volume_change, mean, stdDev);
    return Math.abs(zScore) > 2; // 2 standard deviations
  }).sort((a, b) => Math.abs(calculateZScore(b.volume_change, mean, stdDev)) - Math.abs(calculateZScore(a.volume_change, mean, stdDev)));

  if (anomalies.length > 0) {
    const topAnomaly = anomalies[0];
    const zScore = calculateZScore(topAnomaly.volume_change, mean, stdDev);
    
    insights.push({
      id: 'statistical-anomaly',
      type: 'anomaly',
      title: `${topAnomaly.protocol.toUpperCase()} Shows Statistical Outlier Behavior`,
      description: `${topAnomaly.protocol.toUpperCase()} exhibits ${zScore > 0 ? 'exceptional growth' : 'concerning decline'} with a z-score of ${zScore.toFixed(2)}, indicating performance ${Math.abs(zScore).toFixed(1)} standard deviations from market norm.`,
      impact: Math.abs(zScore) > 3 ? 'high' : 'medium',
      protocols: [topAnomaly.protocol],
      metrics: [
        { metric: 'Z-Score', change: zScore, value: topAnomaly.volume_change },
        { metric: 'Market Deviation', change: topAnomaly.volume_change - mean, value: topAnomaly.volume_total }
      ],
      confidence: 0.95,
      recommendation: zScore > 0 ? 
        'Investigate success factors for potential industry-wide lessons and competitive threats.' :
        'Conduct immediate analysis of underlying issues and implement corrective measures.'
    });
  }

  // 4. Cross-Category Performance Analysis
  const categoryPerformance = Object.entries(PROTOCOL_CATEGORIES).map(([category, protocols]) => {
    const categoryStats = weeklyStats.filter(s => protocols.includes(s.protocol));
    const avgVolumeChange = categoryStats.reduce((sum, s) => sum + s.volume_change, 0) / categoryStats.length;
    const totalMarketShare = categoryStats.reduce((sum, s) => sum + s.market_share_volume, 0);
    
    return {
      category,
      avgVolumeChange,
      totalMarketShare,
      protocolCount: categoryStats.length,
      protocols: protocols
    };
  }).sort((a, b) => b.avgVolumeChange - a.avgVolumeChange);

  const topCategory = categoryPerformance[0];
  const bottomCategory = categoryPerformance[categoryPerformance.length - 1];
  
  if (topCategory.avgVolumeChange > bottomCategory.avgVolumeChange + 10) {
    insights.push({
      id: 'category-divergence',
      type: 'opportunity',
      title: `${topCategory.category.replace('_', ' ').toUpperCase()} Category Leads Market`,
      description: `${topCategory.category.replace('_', ' ')} protocols show ${topCategory.avgVolumeChange.toFixed(1)}% average growth vs ${bottomCategory.avgVolumeChange.toFixed(1)}% for ${bottomCategory.category.replace('_', ' ')}, indicating sector rotation and emerging opportunities.`,
      impact: 'medium',
      protocols: [...topCategory.protocols, ...bottomCategory.protocols],
      metrics: [
        { metric: 'Category Performance Gap', change: topCategory.avgVolumeChange - bottomCategory.avgVolumeChange, value: topCategory.totalMarketShare },
        { metric: 'Leading Category Share', change: 0, value: topCategory.totalMarketShare }
      ],
      confidence: 0.8,
      recommendation: `Consider strategic positioning towards ${topCategory.category.replace('_', ' ')} category trends and evaluate portfolio exposure to declining ${bottomCategory.category.replace('_', ' ')} segment.`
    });
  }

  // 5. User-Volume Correlation Analysis
  const volumeChanges2 = weeklyStats.map(s => s.volume_change);
  const userChanges = weeklyStats.map(s => s.users_change);
  const correlation = calculateCorrelation(volumeChanges2, userChanges);
  
  if (Math.abs(correlation) > 0.7) {
    const stronglyCorrelated = weeklyStats.filter(s => 
      (s.volume_change > 0 && s.users_change > 0 && correlation > 0) ||
      (s.volume_change < 0 && s.users_change < 0 && correlation > 0) ||
      (s.volume_change > 0 && s.users_change < 0 && correlation < 0) ||
      (s.volume_change < 0 && s.users_change > 0 && correlation < 0)
    );

    insights.push({
      id: 'user-volume-correlation',
      type: correlation > 0 ? 'trend' : 'risk',
      title: `${correlation > 0 ? 'Strong Positive' : 'Concerning Negative'} User-Volume Correlation`,
      description: `Market shows ${correlation > 0 ? 'healthy' : 'concerning'} correlation (${correlation.toFixed(2)}) between user growth and volume growth, indicating ${correlation > 0 ? 'sustainable user engagement' : 'potential efficiency or retention issues'}.`,
      impact: Math.abs(correlation) > 0.8 ? 'high' : 'medium',
      protocols: stronglyCorrelated.map(s => s.protocol),
      metrics: [
        { metric: 'Correlation Coefficient', change: 0, value: correlation },
        { metric: 'Market Alignment', change: 0, value: stronglyCorrelated.length / weeklyStats.length * 100 }
      ],
      confidence: 0.9,
      recommendation: correlation > 0 ? 
        'Focus on user experience optimization to maintain positive correlation and sustainable growth.' :
        'Investigate user engagement metrics and consider strategies to improve user retention and activity.'
    });
  }

  // 6. Risk Assessment for Declining Protocols
  const decliningProtocols = weeklyStats.filter(s => s.volume_change < -15 && s.market_share_volume > 3);
  
  if (decliningProtocols.length > 0) {
    const totalDeclineImpact = decliningProtocols.reduce((sum, p) => sum + p.market_share_volume, 0);
    
    insights.push({
      id: 'market-risk-assessment',
      type: 'risk',
      title: `Market Consolidation Risk: ${decliningProtocols.length} Major Protocols Declining`,
      description: `${decliningProtocols.length} significant protocols representing ${totalDeclineImpact.toFixed(1)}% market share show substantial decline, indicating potential market consolidation or category disruption risks.`,
      impact: totalDeclineImpact > 15 ? 'high' : 'medium',
      protocols: decliningProtocols.map(p => p.protocol),
      metrics: [
        { metric: 'Affected Market Share', change: 0, value: totalDeclineImpact },
        { metric: 'Average Decline', change: decliningProtocols.reduce((sum, p) => sum + p.volume_change, 0) / decliningProtocols.length, value: 0 }
      ],
      confidence: 0.85,
      recommendation: 'Monitor for systemic risks, potential acquisition opportunities, and defensive strategies for market position protection.'
    });
  }

  return insights.sort((a, b) => {
    // Sort by impact level, then by confidence
    const impactWeight = { high: 3, medium: 2, low: 1 };
    const impactDiff = impactWeight[b.impact] - impactWeight[a.impact];
    return impactDiff !== 0 ? impactDiff : b.confidence - a.confidence;
  });
}

// Simulate advanced AI analysis with external API call capability
export async function getAIInsightsFromExternalAPI(weeklyStats: WeeklyStats[]): Promise<AIInsight[]> {
  // This function can be enhanced to call external AI APIs like OpenAI, Anthropic, etc.
  // For now, it uses the advanced local analysis
  
  try {
    // Prepare data for potential external AI API
    const dataPrompt = {
      timeframe: "7 days",
      protocols: weeklyStats.length,
      marketData: weeklyStats.map(s => ({
        protocol: s.protocol,
        volumeChange: s.volume_change,
        userChange: s.users_change,
        marketShare: s.market_share_volume
      }))
    };

    // For future integration with external AI services:
    // const response = await fetch('/api/ai-insights', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(dataPrompt)
    // });
    
    // Fall back to advanced local analysis
    return await generateAdvancedAIInsights(weeklyStats);
    
  } catch (error) {
    console.error('Error getting AI insights:', error);
    // Fallback to basic analysis
    return await generateAdvancedAIInsights(weeklyStats);
  }
}