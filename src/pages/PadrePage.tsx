import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ProtocolMetrics, Protocol } from '../types/protocol';
import { DailyMetricsTable } from '../components/DailyMetricsTable';
import { DailyHighlights } from '../components/DailyHighlights';
import { EVMDailyMetricsTable } from '../components/EVMDailyMetricsTable';
import { EVMDailyHighlights } from '../components/EVMDailyHighlights';
import { MetricCard } from '../components/MetricCard';
import { getAllProtocols } from '../lib/protocol-categories';
import { getProtocolsByChain } from '../lib/protocol-config';
import { Settings } from '../lib/settings';
import { Skeleton } from '../components/ui/skeleton';
import { protocolApi } from '../lib/api';
import { ComponentActions } from '../components/ComponentActions';
import { PadreIcon } from '../components/icons';
import { getTotalProtocolStats } from '../lib/protocol';

type ChainType = 'solana' | 'evm';

export default function PadrePage() {
  // Initialize chain type from localStorage or default to solana
  const [chainType, setChainType] = useState<ChainType>(() => {
    const saved = localStorage.getItem('padrePreferredChainType') as ChainType;
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
  
  const [solanaMetrics, setSolanaMetrics] = useState<ProtocolMetrics>({
    total_volume_usd: 0,
    daily_users: 0,
    numberOfNewUsers: 0,
    daily_trades: 0,
    total_fees_usd: 0,
  });
  
  const [evmMetrics, setEvmMetrics] = useState<ProtocolMetrics>({
    total_volume_usd: 0,
    daily_users: 0,
    numberOfNewUsers: 0,
    daily_trades: 0,
    total_fees_usd: 0,
  });

  // Fetch lifetime metrics for both chains
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const dataType = Settings.getDataTypePreference();
        
        // Fetch Solana metrics (use user preference)
        const solanaStats = await getTotalProtocolStats('padre', 'solana', dataType);
        setSolanaMetrics(solanaStats);
        
        // Fetch EVM metrics (always use 'public' for EVM)
        const evmStats = await getTotalProtocolStats('padre', 'evm', 'public');
        setEvmMetrics(evmStats);
      } catch (error) {
        console.error('Error fetching Padre metrics:', error);
      }
    };

    fetchMetrics();
  }, []);

  // Memoize protocols based on chain type
  const protocols = useMemo(() => {
    if (chainType === 'evm') {
      return ['padre_evm'] as Protocol[];
    } else {
      return ['padre'] as Protocol[];
    }
  }, [chainType]);

  // Handle chain type switching with loading state
  const handleChainTypeChange = async (newChainType: ChainType) => {
    if (newChainType === chainType) return;
    
    setIsLoading(true);
    
    // Store the previous chain type for potential rollback
    const previousChainType = chainType;
    setChainType(newChainType);
    
    try {
      // Simulate API call delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Persist the chain type preference
      localStorage.setItem('padrePreferredChainType', newChainType);
    } catch (error) {
      console.error('Failed to switch chain type:', error);
      // Rollback on error
      setChainType(previousChainType);
    } finally {
      setIsLoading(false);
    }
  };

  // Persist date changes
  useEffect(() => {
    Settings.setLastSelectedDate('daily', date.toISOString());
  }, [date]);

  const currentMetrics = chainType === 'solana' ? solanaMetrics : evmMetrics;

  return (
    <div className="space-y-4 lg:space-y-6 p-2 sm:p-0">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-muted/10 ring-1 ring-border">
            <img 
              src="/assets/logos/padre.jpg"
              alt="Padre" 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const container = target.parentElement;
                if (container) {
                  container.innerHTML = '';
                  container.className = 'w-8 h-8 sm:w-10 sm:h-10 bg-muted/10 rounded-lg flex items-center justify-center ring-1 ring-border';
                  // Fallback to icon
                }
              }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Padre Analytics
          </h1>
        </div>
        
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
                className={`w-full h-full object-cover transition-all duration-300 ${
                  chainType === 'solana' ? 'brightness-110' : ''
                }`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <span className={`transition-all duration-300 ${
              chainType === 'solana' ? 'font-semibold' : ''
            }`}>
              Solana
            </span>
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
                className={`w-full h-full object-cover transition-all duration-300 ${
                  chainType === 'evm' ? 'brightness-110' : ''
                }`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <span className={`transition-all duration-300 ${
              chainType === 'evm' ? 'font-semibold' : ''
            }`}>
              EVM
            </span>
          </button>
        </div>
      </div>

      {/* Lifetime Metrics Cards */}
      <ComponentActions 
        componentName="Padre Lifetime Metrics"
        filename={`Padre_Lifetime_Metrics_${chainType.toUpperCase()}.png`}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Lifetime Volume"
            value={`$${currentMetrics.total_volume_usd.toLocaleString()}`}
            type="volume"
            protocolName="Padre"
            protocolLogo="padre.jpg"
            description={`${chainType === 'solana' ? 'Solana' : 'EVM'} total volume`}
          />
          <MetricCard
            title="Lifetime Users"
            value={currentMetrics.numberOfNewUsers.toLocaleString()}
            type="users"
            protocolName="Padre"
            protocolLogo="padre.jpg"
            description={`${chainType === 'solana' ? 'Solana' : 'EVM'} total users`}
          />
          <MetricCard
            title="Lifetime Trades"
            value={currentMetrics.daily_trades.toLocaleString()}
            type="trades"
            protocolName="Padre"
            protocolLogo="padre.jpg"
            description={`${chainType === 'solana' ? 'Solana' : 'EVM'} total trades`}
          />
          <MetricCard
            title="Lifetime Fees"
            value={`$${currentMetrics.total_fees_usd.toLocaleString()}`}
            type="fees"
            protocolName="Padre"
            protocolLogo="padre.jpg"
            description={`${chainType === 'solana' ? 'Solana' : 'EVM'} total fees`}
          />
        </div>
      </ComponentActions>

      {/* Content Section - Shows skeleton when loading */}
      {isLoading ? (
        <div className="space-y-4 lg:space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
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