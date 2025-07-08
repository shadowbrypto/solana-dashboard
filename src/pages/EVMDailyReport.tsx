import { useEffect, useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DailyMetricsTable } from "../components/DailyMetricsTable";
import { DailyHighlights } from "../components/DailyHighlights";
import { getAllProtocolsIncludingEVM } from "../lib/protocol-categories";
import { getProtocolsByChain } from "../lib/protocol-config";
import { Settings } from "../lib/settings";

export default function EVMDailyReport() {
  // EVM daily report
  const reportType = 'daily';
  
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
  
  // Get only EVM protocols
  const evmProtocols = useMemo(() => {
    const allEVMProtocols = getProtocolsByChain('evm').map(p => p.id);
    return [...allEVMProtocols, "all"] as Protocol[];
  }, []);

  useEffect(() => {
    // In a real app, you would fetch EVM data here
    // For now, we'll use mock data for EVM protocols
    const emptyMetrics = {
      total_volume_usd: 0,
      daily_users: 0,
      numberOfNewUsers: 0,
      daily_trades: 0,
      total_fees_usd: 0,
    };

    // Generate mock data for EVM protocols dynamically
    const mockDataForDate: Record<Protocol, ProtocolMetrics> = {};
    
    evmProtocols.forEach(protocol => {
      if (protocol === 'sigma_evm') {
        mockDataForDate[protocol] = {
          total_volume_usd: 15000000, // $15M daily volume for Sigma
          daily_users: 2500,
          numberOfNewUsers: 150,
          daily_trades: 8500,
          total_fees_usd: 75000,
        };
      } else if (protocol === 'maestro_evm') {
        mockDataForDate[protocol] = {
          total_volume_usd: 8000000, // $8M daily volume for Maestro
          daily_users: 1800,
          numberOfNewUsers: 120,
          daily_trades: 4200,
          total_fees_usd: 40000,
        };
      } else if (protocol === 'bloom_evm') {
        mockDataForDate[protocol] = {
          total_volume_usd: 5500000, // $5.5M daily volume for Bloom
          daily_users: 1200,
          numberOfNewUsers: 80,
          daily_trades: 2800,
          total_fees_usd: 27500,
        };
      } else if (protocol === 'banana_evm') {
        mockDataForDate[protocol] = {
          total_volume_usd: 3200000, // $3.2M daily volume for Banana
          daily_users: 900,
          numberOfNewUsers: 65,
          daily_trades: 1900,
          total_fees_usd: 16000,
        };
      } else if (protocol === 'all') {
        // Calculate totals for all EVM protocols
        const totalVolume = 15000000 + 8000000 + 5500000 + 3200000;
        const totalUsers = 2500 + 1800 + 1200 + 900;
        const totalNewUsers = 150 + 120 + 80 + 65;
        const totalTrades = 8500 + 4200 + 2800 + 1900;
        const totalFees = 75000 + 40000 + 27500 + 16000;
        
        mockDataForDate[protocol] = {
          total_volume_usd: totalVolume,
          daily_users: totalUsers,
          numberOfNewUsers: totalNewUsers,
          daily_trades: totalTrades,
          total_fees_usd: totalFees,
        };
      } else {
        mockDataForDate[protocol] = emptyMetrics;
      }
    });
    
    const dateStr = format(date, 'yyyy-MM-dd');
    setData({ [dateStr]: mockDataForDate });
    
    // Save date selection
    Settings.setLastSelectedDate('daily', date);
  }, [date, evmProtocols]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              EVM Daily Report
              <span className="text-xs px-2 py-1 rounded-md font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                EVM
              </span>
            </h1>
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={format(date, 'yyyy-MM-dd')}
                onChange={(e) => setDate(new Date(e.target.value))}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
          </div>
          <p className="text-muted-foreground">
            Daily performance metrics for EVM protocols on {format(date, 'MMMM do, yyyy')}
          </p>
        </div>

        {/* Daily Highlights for EVM */}
        <div className="mb-8">
          <DailyHighlights date={date} />
        </div>

        {/* Daily Metrics Table for EVM */}
        <div className="mb-8">
          <DailyMetricsTable 
            data={data}
            protocols={evmProtocols}
            reportType={reportType}
          />
        </div>
      </div>
    </div>
  );
}