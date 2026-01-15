import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with K/M/B suffixes
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 */
export function formatNumber(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
  return value.toFixed(0);
}

/**
 * Format a currency value with $ prefix and K/M/B suffixes
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `$${(value / 1e9).toFixed(decimals)}B`;
  if (absValue >= 1e6) return `$${(value / 1e6).toFixed(decimals)}M`;
  if (absValue >= 1e3) return `$${(value / 1e3).toFixed(decimals)}K`;
  return `$${value.toFixed(decimals)}`;
}

/**
 * Format a percentage value
 * @param value - The decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a volume value (alias for formatCurrency for semantic clarity)
 */
export const formatVolume = formatCurrency;

/**
 * Format a compact number for display (no decimals for small values)
 * @param value - The number to format
 */
export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

/**
 * Format a number with locale-specific thousands separators
 * @param value - The number to format
 */
export function formatWithCommas(value: number): string {
  return value.toLocaleString();
}
