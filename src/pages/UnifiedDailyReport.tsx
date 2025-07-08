import { useEffect, useState, useMemo, useCallback } from "react";
import { format, subDays } from "date-fns";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DailyMetricsTable } from "../components/DailyMetricsTable";
import { DailyHighlights } from "../components/DailyHighlights";
import { EVMDailyMetricsTable } from "../components/EVMDailyMetricsTable";
import { EVMDailyHighlights } from "../components/EVMDailyHighlights";
import { getAllProtocols } from "../lib/protocol-categories";
import { getProtocolsByChain } from "../lib/protocol-config";
import { Settings } from "../lib/settings";
import { Skeleton } from "../components/ui/skeleton";

type ChainType = 'solana' | 'evm';

// Skeleton component for the toggle area
const ToggleSkeleton = () => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-32" /> {/* Title */}
      <Skeleton className="h-6 w-12" /> {/* Badge */}
    </div>
    <Skeleton className="h-10 w-32" /> {/* Toggle */}
  </div>
);

// Skeleton component for content area
const ContentSkeleton = () => (
  <div className="space-y-4 lg:space-y-6">
    {/* Daily Highlights Skeleton */}
    <div className="border rounded-lg">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => {
          const isRightColumn = (i + 1) % 2 === 0;
          const isBottomRow = i >= 2;
          
          return (
            <div 
              key={i}
              className={`p-4 ${
                !isRightColumn ? 'border-r' : ''
              } ${
                !isBottomRow ? 'border-b' : ''
              }`}
            >
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="w-16 h-4 rounded" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="w-20 h-3 rounded" />
                  <Skeleton className="w-full h-4 rounded" />
                  <Skeleton className="w-24 h-3 rounded" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Daily Metrics Table Skeleton */}
    <div className="border rounded-lg">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function UnifiedDailyReport() {
  // Initialize chain type from localStorage or default to solana
  const [chainType, setChainType] = useState<ChainType>(() => {
    const saved = localStorage.getItem('preferredChainType') as ChainType;
    return saved && ['solana', 'evm'].includes(saved) ? saved : 'solana';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date>(() => {
    const lastSelectedDates = Settings.getLastSelectedDates();
    if (lastSelectedDates.daily) {
      return new Date(lastSelectedDates.daily);
    }
    return subDays(new Date(), 1);
  });
  const [data, setData] = useState<
    Record<string, Record<Protocol, ProtocolMetrics>>
  >({});

  // Memoize protocols based on chain type
  const protocols = useMemo(() => {
    if (chainType === 'evm') {
      const evmProtocols = getProtocolsByChain('evm').map(p => p.id);
      return [...evmProtocols, "all"] as Protocol[];
    } else {
      return [...getAllProtocols(), "all"] as Protocol[];
    }
  }, [chainType]);

  // Handle chain type switching with loading state
  const handleChainTypeChange = useCallback(async (newChainType: ChainType) => {
    if (newChainType === chainType) return;
    
    setIsLoading(true);
    
    // Store the previous chain type for potential rollback
    const previousChainType = chainType;
    setChainType(newChainType);
    
    try {
      // Simulate API call delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Persist the chain type preference
      localStorage.setItem('preferredChainType', newChainType);
    } catch (error) {
      console.error('Failed to switch chain type:', error);
      // Rollback on error
      setChainType(previousChainType);
    } finally {
      setIsLoading(false);
    }
  }, [chainType]);

  useEffect(() => {
    // Generate mock data based on chain type
    const emptyMetrics = {
      total_volume_usd: 0,
      daily_users: 0,
      numberOfNewUsers: 0,
      daily_trades: 0,
      total_fees_usd: 0,
    };

    const mockDataForDate: Record<Protocol, ProtocolMetrics> = {};
    
    protocols.forEach(protocol => {
      if (chainType === 'solana') {
        // Solana-specific mock data
        if (protocol === 'trojan') {
          mockDataForDate[protocol] = {
            total_volume_usd: 3000000,
            daily_users: 300,
            numberOfNewUsers: 30,
            daily_trades: 1500,
            total_fees_usd: 15000,
          };
        } else if (protocol === 'photon') {
          mockDataForDate[protocol] = {
            total_volume_usd: 2000000,
            daily_users: 200,
            numberOfNewUsers: 20,
            daily_trades: 1000,
            total_fees_usd: 10000,
          };
        } else if (protocol === 'bullx') {
          mockDataForDate[protocol] = {
            total_volume_usd: 1000000,
            daily_users: 100,
            numberOfNewUsers: 10,
            daily_trades: 500,
            total_fees_usd: 5000,
          };
        } else {
          mockDataForDate[protocol] = { ...emptyMetrics };
        }
      } else {
        // EVM-specific mock data (smaller volumes)
        if (protocol === 'uniswap_evm') {
          mockDataForDate[protocol] = {
            total_volume_usd: 500000,
            daily_users: 150,
            numberOfNewUsers: 15,
            daily_trades: 750,
            total_fees_usd: 2500,
          };
        } else if (protocol === 'jupiter_evm') {
          mockDataForDate[protocol] = {
            total_volume_usd: 300000,
            daily_users: 80,
            numberOfNewUsers: 8,
            daily_trades: 400,
            total_fees_usd: 1500,
          };
        } else {
          mockDataForDate[protocol] = { ...emptyMetrics };
        }
      }
    });

    const mockData: Record<string, Record<Protocol, ProtocolMetrics>> = {
      [format(date, "dd/MM/yyyy")]: mockDataForDate,
    };
    setData(mockData);
  }, [date, protocols, chainType]);

  // Persist date changes
  useEffect(() => {
    Settings.setLastSelectedDate('daily', date.toISOString());
  }, [date]);

  return (
    <div className="space-y-4 lg:space-y-6 p-2 sm:p-0">
      {isLoading ? (
        <ToggleSkeleton />
      ) : (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            Daily Report
            <span className={`text-xs px-2 py-1 rounded-md font-medium ${
              chainType === 'solana' 
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}>
              {chainType === 'solana' ? 'SOL' : 'EVM'}
            </span>
          </h1>
          
          {/* Chain Type Toggle */}
          <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => handleChainTypeChange('solana')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                chainType === 'solana'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Solana
            </button>
            <button
              onClick={() => handleChainTypeChange('evm')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                chainType === 'evm'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EVM
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <ContentSkeleton />
      ) : (
        <div key={chainType} className="space-y-4 lg:space-y-6">
          {chainType === 'solana' ? (
            <>
              <DailyHighlights date={date} />
              <DailyMetricsTable protocols={protocols} date={date} onDateChange={setDate} />
            </>
          ) : (
            <>
              <EVMDailyHighlights date={date} />
              <EVMDailyMetricsTable 
                protocols={protocols}
                date={date}
                onDateChange={setDate}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}