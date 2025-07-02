import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DailyMetricsTable } from "../components/DailyMetricsTable";
import { DailyHighlights } from "../components/DailyHighlights";
import { getAllProtocols } from "../lib/protocol-categories";
import { protocolApi } from "../lib/api";

export default function DailyReport() {
  // Simple daily report - no query parameters needed
  const reportType = 'daily';
  
  const [date, setDate] = useState<Date>(new Date());
  const [data, setData] = useState<
    Record<string, Record<Protocol, ProtocolMetrics>>
  >({});
  const [isLoadingLatestDate, setIsLoadingLatestDate] = useState(true);
  
  // Memoize protocols to prevent infinite re-renders
  const protocols = useMemo(() => [...getAllProtocols(), "all"] as Protocol[], []);

  // Fetch the latest available date on component mount
  useEffect(() => {
    const fetchLatestDate = async () => {
      try {
        const response = await protocolApi.getLatestDate();
        // Convert YYYY-MM-DD to Date object
        const latestDate = new Date(response.date);
        setDate(latestDate);
      } catch (error) {
        console.error('Failed to fetch latest date, using current date:', error);
        // Keep the current date as fallback
      } finally {
        setIsLoadingLatestDate(false);
      }
    };

    fetchLatestDate();
  }, []);

  useEffect(() => {
    // Only fetch data after the latest date is loaded
    if (isLoadingLatestDate) return;

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
  }, [date, protocols, isLoadingLatestDate]);

  if (isLoadingLatestDate) {
    return (
      <div className="space-y-4 lg:space-y-6 p-2 sm:p-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Daily Report</h1>
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading latest date...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 p-2 sm:p-0">
      <h1 className="text-2xl sm:text-3xl font-bold">Daily Report</h1>
      <DailyHighlights date={date} />
      <DailyMetricsTable protocols={protocols} date={date} onDateChange={setDate} />
    </div>
  );
}