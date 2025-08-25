import React, { useState, useCallback, useMemo } from 'react';
import { MonthlyHighlights } from "../components/MonthlyHighlights";
import { MonthlyMetricsTable } from "../components/MonthlyMetricsTable";
import { EVMMonthlyMetricsTable } from "../components/EVMMonthlyMetricsTable";
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
    <div className="p-2 sm:p-4 lg:p-6">
      {/* Header with Toggle */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Monthly Report
          </h1>
          
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

      {/* Content based on chain type */}
      {chainType === 'solana' && <MonthlyHighlights date={date} loading={loading} />}
      
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
  );
}