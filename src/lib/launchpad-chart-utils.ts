import { LaunchpadMetrics } from './launchpad-api';
import { getAllLaunchpads } from './launchpad-config';

export interface LaunchpadData {
  launchpad: string;
  name: string;
  data: LaunchpadMetrics[];
  color: string;
}

export interface LaunchpadStackedChartData {
  formattedDay: string;
  date: string;
  [key: string]: string | number; // Dynamic keys for each launchpad
}

/**
 * Transform launchpad data into format suitable for StackedBarChart component
 */
export function transformLaunchpadDataForStackedChart(
  launchpadData: LaunchpadData[],
  metric: 'launches' | 'graduations'
): {
  data: LaunchpadStackedChartData[];
  dataKeys: string[];
  labels: string[];
  colors: string[];
} {
  // Get all unique dates from all launchpads
  const allDates = new Set<string>();
  launchpadData.forEach(lp => {
    lp.data.forEach(item => allDates.add(item.date));
  });

  // Sort dates
  const sortedDates = Array.from(allDates).sort();

  // Create the chart data structure
  const chartData: LaunchpadStackedChartData[] = sortedDates.map(date => {
    const [year, month, day] = date.split('-');
    const formattedDay = `${day}-${month}-${year}`;
    
    const dataPoint: LaunchpadStackedChartData = {
      formattedDay,
      date
    };

    // Add data for each launchpad
    launchpadData.forEach(lp => {
      const dayData = lp.data.find(item => item.date === date);
      dataPoint[lp.launchpad] = dayData ? dayData[metric] : 0;
    });

    return dataPoint;
  });

  // Prepare keys, labels, and colors
  const dataKeys = launchpadData.map(lp => lp.launchpad);
  const labels = launchpadData.map(lp => lp.name);
  const colors = launchpadData.map(lp => lp.color);

  return {
    data: chartData,
    dataKeys,
    labels,
    colors
  };
}

/**
 * Get default colors for launchpads (consistent with existing app)
 */
export const LAUNCHPAD_CHART_COLORS = [
  'hsl(142, 76%, 36%)', // Green for PumpFun
  'hsl(200, 95%, 50%)', // Blue for LaunchLab
  'hsl(18, 100%, 55%)', // Orange for LetsBonk
  'hsl(240, 100%, 60%)', // Purple for Moonshot
  'hsl(346, 77%, 49%)', // Red
  'hsl(262, 83%, 58%)', // Purple variant
];

/**
 * Apply default colors to launchpad data
 */
export function applyDefaultColors(launchpadData: LaunchpadData[]): LaunchpadData[] {
  return launchpadData.map((lp, index) => ({
    ...lp,
    color: LAUNCHPAD_CHART_COLORS[index % LAUNCHPAD_CHART_COLORS.length]
  }));
}

/**
 * Filter launchpad data by timeframe
 */
export function filterLaunchpadDataByTimeframe(
  launchpadData: LaunchpadData[],
  timeframe: '7d' | '30d' | '3m' | '6m' | '1y' | 'all'
): LaunchpadData[] {
  if (timeframe === 'all') {
    return launchpadData;
  }

  const now = new Date();
  let daysToSubtract: number;

  switch (timeframe) {
    case '7d':
      daysToSubtract = 7;
      break;
    case '30d':
      daysToSubtract = 30;
      break;
    case '3m':
      daysToSubtract = 90;
      break;
    case '6m':
      daysToSubtract = 180;
      break;
    case '1y':
      daysToSubtract = 365;
      break;
    default:
      daysToSubtract = 90;
  }

  const cutoffDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);

  return launchpadData.map(lp => ({
    ...lp,
    data: lp.data.filter(item => new Date(item.date) >= cutoffDate)
  }));
}

/**
 * Format number for chart display
 */
export function formatChartNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}