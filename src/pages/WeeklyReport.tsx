import React, { useState, useCallback, useMemo } from 'react';
import { WeeklyMetricsTable } from '../components/WeeklyMetricsTable';
import { EVMWeeklyMetricsTable } from '../components/EVMWeeklyMetricsTable';
import { WeeklyChainVolumeChart } from '../components/WeeklyChainVolumeChart';
import { TrojanWeeklyReport } from '../components/TrojanWeeklyReport';
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolsByChain } from '../lib/protocol-config';
import { Protocol } from '../types/protocol';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent } from '../components/ui/card';
import { format, isAfter, isBefore, subDays } from 'date-fns';

type ChainType = 'solana' | 'evm';

// Skeleton component for the toggle area
const ToggleSkeleton = () => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-32" /> {/* Title */}
      <Skeleton className="h-6 w-12" /> {/* Badge */}
    </div>
    <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50">
      <Skeleton className="h-10 w-[100px] rounded-lg" /> {/* Solana button */}
      <Skeleton className="h-10 w-[100px] rounded-lg" /> {/* EVM button */}
    </div>
  </div>
);

export default function WeeklyReport() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize chain type from localStorage or default to solana
  const [chainType, setChainType] = useState<ChainType>(() => {
    const saved = localStorage.getItem('preferredChainType') as ChainType;
    return saved && ['solana', 'evm'].includes(saved) ? saved : 'solana';
  });
  
  // Date validation - ensure we start with a valid date (excluding today)
  const getValidInitialDate = () => {
    const yesterday = subDays(new Date(), 1); // Start with yesterday since today is excluded
    const minDate = new Date('2024-01-01');
    const maxDate = subDays(new Date(), 1); // Yesterday is the latest allowed date
    
    // If yesterday is valid, use it
    if (!isBefore(yesterday, minDate) && !isAfter(yesterday, maxDate)) {
      return yesterday;
    }
    
    // If yesterday is too early, use min date
    if (isBefore(yesterday, minDate)) {
      return minDate;
    }
    
    // If yesterday is too late (shouldn't happen), use max date
    return maxDate;
  };
  
  const [selectedEndDate, setSelectedEndDate] = useState(getValidInitialDate());

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
      return solProtocols;
    }
  }, [chainType]);

  // Handle chain type switching
  const handleChainTypeChange = useCallback((newChainType: ChainType) => {
    if (newChainType === chainType) return;
    
    setChainType(newChainType);
    localStorage.setItem('preferredChainType', newChainType);
  }, [chainType]);

  const handleDateChange = (newEndDate: Date) => {
    const minDate = new Date('2024-01-01');
    const maxDate = subDays(new Date(), 1); // Yesterday is the latest allowed date
    
    // Validate the new date is within acceptable range
    if (isBefore(newEndDate, minDate) || isAfter(newEndDate, maxDate)) {
      return; // Don't allow invalid dates
    }
    
    setSelectedEndDate(newEndDate);
  };

  const startDate = subDays(selectedEndDate, 6);
  const endDate = selectedEndDate;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-title-1 font-semibold text-foreground">Weekly Report</h1>
        <p className="text-subhead text-muted-foreground mt-1">7-day trends and growth analysis across protocols</p>
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

      <div className="space-y-4 lg:space-y-6">
        {/* Chain Volume Distribution - Combined view for all chains */}
        <WeeklyChainVolumeChart endDate={endDate} />

        {/* Trojan Weekly Report - Only for Solana */}
        {chainType === 'solana' && (
          <TrojanWeeklyReport endDate={endDate} />
        )}

        {/* Chain-specific tables */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : chainType === 'solana' ? (
          <WeeklyMetricsTable
            protocols={protocols}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
        ) : (
          // EVM Weekly Report
          <EVMWeeklyMetricsTable
            protocols={protocols}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
        )}
      </div>
    </div>
  );
}