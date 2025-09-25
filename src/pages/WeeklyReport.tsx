import React, { useState, useCallback, useMemo } from 'react';
import { WeeklyMetricsTable } from '../components/WeeklyMetricsTable';
import { EVMWeeklyMetricsTable } from '../components/EVMWeeklyMetricsTable';
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
    <div className="p-2 sm:p-4 lg:p-6">
      {/* Header with Title and Toggle */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-4">
          {/* Empty space for balance */}
          <div className="flex-1"></div>
          
          {/* Title Section - Centered */}
          <div className="flex flex-col text-center flex-1">
            <h1 className="text-3xl sm:text-4xl font-semibold bg-gradient-to-br from-purple-600 via-purple-500 to-teal-500 bg-clip-text text-transparent">
              Weekly Report
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              7-day trending analysis and growth metrics
            </p>
          </div>
          
          {/* Toggle Section */}
          <div className="flex justify-end flex-1">
              
              {/* Chain Type Toggle */}
              <div className="relative flex items-center bg-gradient-to-r from-muted/30 to-muted/50 p-1 rounded-xl border border-border/50 shadow-sm">
                {/* Sliding background indicator with glow effect */}
                <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-background to-background/95 rounded-lg shadow-md transition-all duration-500 ease-out ${
                    chainType === 'solana' 
                      ? 'left-1 shadow-purple-500/20' 
                      : 'left-[calc(50%+2px)] shadow-blue-500/20'
                  }`}
                />
                
                {/* Animated glow background */}
                <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg opacity-20 transition-all duration-500 ease-out ${
                    chainType === 'solana' 
                      ? 'left-1 bg-gradient-to-r from-purple-500 to-violet-500' 
                      : 'left-[calc(50%+2px)] bg-gradient-to-r from-blue-500 to-cyan-500'
                  }`}
                />
                
                {/* Solana Button */}
                <button
                  onClick={() => handleChainTypeChange('solana')}
                  className={`relative z-10 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 min-w-[100px] justify-center ${
                    chainType === 'solana'
                      ? 'text-foreground scale-105'
                      : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full overflow-hidden ring-1 ring-border/20 bg-background transition-all duration-300 ${
                    chainType === 'solana' ? 'ring-purple-500/30 scale-110' : ''
                  }`}>
                    <img 
                      src="/assets/logos/solana.jpg" 
                      alt="Solana" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span>SOL</span>
                </button>
                
                {/* EVM Button */}
                <button
                  onClick={() => handleChainTypeChange('evm')}
                  className={`relative z-10 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 min-w-[100px] justify-center ${
                    chainType === 'evm'
                      ? 'text-foreground scale-105'
                      : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full overflow-hidden ring-1 ring-border/20 bg-background transition-all duration-300 ${
                    chainType === 'evm' ? 'ring-blue-500/30 scale-110' : ''
                  }`}>
                    <img 
                      src="/assets/logos/ethereum.jpg" 
                      alt="Ethereum" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span>EVM</span>
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* Content based on chain type */}
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
  );
}