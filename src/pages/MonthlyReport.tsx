import React, { useState, useCallback, useMemo } from 'react';
import { MonthlyHighlights } from "../components/MonthlyHighlights";
import { MonthlyMetricsTable } from "../components/MonthlyMetricsTable";
import { EVMMonthlyMetricsTable } from "../components/EVMMonthlyMetricsTable";
import { MonthlyChainVolumeChart } from '../components/MonthlyChainVolumeChart';
import { getAllProtocols, getMutableAllCategories, getMutableProtocolsByCategory, getProtocolsByChain } from "../lib/protocol-config";
import { Protocol } from "../types/protocol";
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent } from '../components/ui/card';
import { format, endOfMonth, subMonths } from 'date-fns';

type ChainType = 'solana' | 'evm';

export default function MonthlyReport() {
  const [isLoading, setIsLoading] = useState(false);

  // Initialize chain type from localStorage or default to solana
  const [chainType, setChainType] = useState<ChainType>(() => {
    const saved = localStorage.getItem('preferredMonthlyChainType') as ChainType;
    return saved && ['solana', 'evm'].includes(saved) ? saved : 'solana';
  });

  // Initialize with end of current month
  const [date, setDate] = useState<Date>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(false);

  // Get protocols based on chain type
  const protocols = useMemo(() => {
    if (chainType === 'evm') {
      // Return EVM protocols
      return getProtocolsByChain('evm').map(p => p.id as Protocol);
    } else {
      // Return Solana protocols
      const solProtocols: Protocol[] = [];
      getMutableAllCategories().forEach(categoryName => {
        const categoryProtocols = getMutableProtocolsByCategory(categoryName);
        categoryProtocols.forEach(p => {
          if (!solProtocols.includes(p.id as Protocol)) {
            solProtocols.push(p.id as Protocol);
          }
        });
      });
      solProtocols.push("all" as Protocol);
      return solProtocols;
    }
  }, [chainType]);

  // Handle chain type switching
  const handleChainTypeChange = useCallback((newChainType: ChainType) => {
    if (newChainType === chainType) return;

    setChainType(newChainType);
    localStorage.setItem('preferredMonthlyChainType', newChainType);
  }, [chainType]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-title-1 font-semibold text-foreground">Monthly Report</h1>
        <p className="text-subhead text-muted-foreground mt-1">Month-over-month comparisons and performance insights</p>
      </div>

      {/* Chain Toggle - Apple Segmented Control Style - Centered */}
      <div className="flex justify-center">
        <div className="relative flex items-center bg-secondary p-1 rounded-lg">
          {/* Sliding indicator */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-background rounded-md shadow-sm transition-all duration-200 ease-out ${
              chainType === 'solana' ? 'left-1' : 'left-[calc(50%+2px)]'
            }`}
          />

          {/* Solana Button */}
          <button
            onClick={() => handleChainTypeChange('solana')}
            className={`relative z-10 flex items-center gap-2 px-4 py-1.5 text-callout font-medium rounded-md transition-colors duration-150 min-w-[90px] justify-center ${
              chainType === 'solana' ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <div className="w-4 h-4 rounded-full overflow-hidden bg-muted">
              <img
                src="/assets/logos/solana.jpg"
                alt="Solana"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <span>Solana</span>
          </button>

          {/* EVM Button */}
          <button
            onClick={() => handleChainTypeChange('evm')}
            className={`relative z-10 flex items-center gap-2 px-4 py-1.5 text-callout font-medium rounded-md transition-colors duration-150 min-w-[90px] justify-center ${
              chainType === 'evm' ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <div className="w-4 h-4 rounded-full overflow-hidden bg-muted">
              <img
                src="/assets/logos/ethereum.jpg"
                alt="Ethereum"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <span>EVM</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Chain Volume Distribution - Combined view for all chains */}
        <MonthlyChainVolumeChart endDate={date} />

        {/* Chain-specific tables */}
        {isLoading ? (
          <div className="rounded-lg border border-border bg-background animate-pulse">
            <div className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        ) : chainType === 'solana' ? (
          <MonthlyMetricsTable protocols={protocols} date={date} onDateChange={setDate} loading={loading} />
        ) : (
          // EVM Monthly Report
          <EVMMonthlyMetricsTable
            protocols={protocols}
            endDate={date}
            onDateChange={setDate}
          />
        )}
      </div>
    </div>
  );
}
