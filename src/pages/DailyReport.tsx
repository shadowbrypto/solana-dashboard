import { useEffect, useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DailyMetricsTable } from "../components/DailyMetricsTable";
import { DailyHighlights } from "../components/DailyHighlights";
import { getAllProtocols } from "../lib/protocol-categories";
import { Settings } from "../lib/settings";

export default function DailyReport() {
  // Simple daily report - no query parameters needed
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
  
  // Memoize protocols to prevent infinite re-renders
  const protocols = useMemo(() => [...getAllProtocols(), "all"] as Protocol[], []);

  useEffect(() => {
    // In a real app, you would fetch data here
    // For now, we'll use mock data
    const emptyMetrics = {
      total_volume_usd: 0,
      daily_users: 0,
      numberOfNewUsers: 0,
      daily_trades: 0,
      total_fees_usd: 0,
    };

    // Generate mock data for all protocols dynamically
    const mockDataForDate: Record<Protocol, ProtocolMetrics> = {};
    
    protocols.forEach(protocol => {
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
    });

    const mockData: Record<string, Record<Protocol, ProtocolMetrics>> = {
      [format(date, "dd/MM/yyyy")]: mockDataForDate,
    };
    setData(mockData);
  }, [date, protocols]);

  // Persist date changes
  useEffect(() => {
    Settings.setLastSelectedDate('daily', date.toISOString());
  }, [date]);

  return (
    <div className="space-y-4 lg:space-y-6 p-2 sm:p-0">
      <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
        Daily Report
        <span className="text-xs px-2 py-1 rounded-md font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
          SOL
        </span>
      </h1>
      <DailyHighlights date={date} />
      <DailyMetricsTable protocols={protocols} date={date} onDateChange={setDate} />
    </div>
  );
}