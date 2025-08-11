import { FORMAT_THRESHOLDS } from './constants';

/**
 * Format currency with appropriate suffixes and precision
 */
export function formatCurrency(value: number, precision: number = 2): string {
  const absValue = Math.abs(value);
  
  if (absValue >= FORMAT_THRESHOLDS.BILLION) {
    return `$${(value / FORMAT_THRESHOLDS.BILLION).toFixed(precision)}B`;
  }
  
  if (absValue >= FORMAT_THRESHOLDS.MILLION) {
    return `$${(value / FORMAT_THRESHOLDS.MILLION).toFixed(precision)}M`;
  }
  
  if (absValue >= FORMAT_THRESHOLDS.THOUSAND) {
    return `$${(value / FORMAT_THRESHOLDS.THOUSAND).toFixed(precision)}K`;
  }
  
  return `$${value.toFixed(precision)}`;
}

/**
 * Format numbers with appropriate suffixes
 */
export function formatNumber(value: number, precision: number = 1): string {
  const absValue = Math.abs(value);
  
  if (absValue >= FORMAT_THRESHOLDS.BILLION) {
    return `${(value / FORMAT_THRESHOLDS.BILLION).toFixed(precision)}B`;
  }
  
  if (absValue >= FORMAT_THRESHOLDS.MILLION) {
    return `${(value / FORMAT_THRESHOLDS.MILLION).toFixed(precision)}M`;
  }
  
  if (absValue >= FORMAT_THRESHOLDS.THOUSAND) {
    return `${(value / FORMAT_THRESHOLDS.THOUSAND).toFixed(precision)}K`;
  }
  
  return value.toLocaleString();
}

/**
 * Format percentage with specified precision
 */
export function formatPercentage(value: number, precision: number = 2): string {
  return `${(value * 100).toFixed(precision)}%`;
}

/**
 * Format percentage for display values that are already percentages
 */
export function formatDisplayPercentage(value: number, precision: number = 2): string {
  return `${value.toFixed(precision)}%`;
}

/**
 * Format compact numbers for charts and small displays
 */
export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  
  if (absValue >= FORMAT_THRESHOLDS.BILLION) {
    return `${(value / FORMAT_THRESHOLDS.BILLION).toFixed(1)}B`;
  }
  
  if (absValue >= FORMAT_THRESHOLDS.MILLION) {
    return `${(value / FORMAT_THRESHOLDS.MILLION).toFixed(1)}M`;
  }
  
  if (absValue >= FORMAT_THRESHOLDS.THOUSAND) {
    return `${(value / FORMAT_THRESHOLDS.THOUSAND).toFixed(0)}K`;
  }
  
  return value.toString();
}

/**
 * Safe number parsing with fallback
 */
export function safeParseNumber(value: any, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  
  return fallback;
}