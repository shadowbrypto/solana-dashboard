import { useEffect, useState, useMemo, useCallback } from "react";
import { format, subDays } from "date-fns";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DailyMetricsTable } from "../components/DailyMetricsTable";
import { EVMDailyMetricsTable } from "../components/EVMDailyMetricsTable";
import { ChainVolumeBreakdown } from "../components/ChainVolumeBreakdown";
import { getAllProtocols } from "../lib/protocol-categories";
import { getProtocolsByChain } from "../lib/protocol-config";
import { Settings } from "../lib/settings";
import { Skeleton } from "../components/ui/skeleton";

type ChainType = 'solana' | 'evm';

// Skeleton component for content area
const ContentSkeleton = () => (
  <div className="space-y-6">
    {/* Table Card Skeleton */}
    <div className="bg-card rounded-lg shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <div className="flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function DailyReport() {
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
  const [axiomRevenue, setAxiomRevenue] = useState<number>(0);
  const [axiomLoading, setAxiomLoading] = useState(false);

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
        if (protocol === 'trojanonsolana') {
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

  // Fetch Axiom revenue for Trojan Terminal missed revenue card
  useEffect(() => {
    const fetchAxiomRevenue = async () => {
      if (chainType !== 'solana') {
        setAxiomRevenue(0);
        setAxiomLoading(false);
        return;
      }
      
      setAxiomLoading(true);
      try {
        console.log('Fetching Axiom revenue for date:', format(date, 'yyyy-MM-dd'));
        const dataType = 'private'; // Use private data for Solana
        
        // Fetch daily metrics for the specific date
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const dateStr = format(date, 'yyyy-MM-dd');
        const response = await fetch(`${API_BASE_URL}/protocols/daily-metrics?date=${dateStr}&chain=solana&dataType=${dataType}`);
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Daily metrics response:', result);
        
        if (result.success && result.data && result.data.protocols) {
          // Access Axiom from the protocols object
          const axiomData = result.data.protocols.axiom;
          const adjustedFees = axiomData?.projectedFees || 0; // Use projected fees as adjusted fees
          // Trojan Terminal missed revenue = adjusted fees * 50%
          const trojanTerminalMissedRevenue = adjustedFees * 0.5;
          
          console.log('Axiom calculations for', dateStr, ':', {
            adjustedFees,
            trojanTerminalMissedRevenue
          });
          setAxiomRevenue(trojanTerminalMissedRevenue);
        } else {
          console.warn('No data found for date:', dateStr);
          setAxiomRevenue(0);
        }
      } catch (error) {
        console.error('Error fetching Axiom revenue:', error);
        setAxiomRevenue(0);
      } finally {
        setAxiomLoading(false);
      }
    };

    fetchAxiomRevenue();
  }, [date, chainType]);

  // Persist date changes
  useEffect(() => {
    Settings.setLastSelectedDate('daily', date.toISOString());
  }, [date]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-title-1 font-semibold text-foreground">Daily Report</h1>
        <p className="text-subhead text-muted-foreground mt-1">Real-time trading metrics and protocol performance</p>
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

      {/* Content Section - Shows skeleton when loading */}
      {isLoading ? (
        <ContentSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Chain Volume Distribution */}
          <ChainVolumeBreakdown date={date} />

          {/* Chain-specific tables */}
          <div key={chainType}>
            {chainType === 'solana' ? (
              <DailyMetricsTable protocols={protocols} date={date} onDateChange={setDate} />
            ) : (
              <EVMDailyMetricsTable protocols={protocols} date={date} onDateChange={setDate} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}