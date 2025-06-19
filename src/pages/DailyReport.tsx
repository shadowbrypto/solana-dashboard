import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DailyMetricsTable } from "../components/DailyMetricsTable";
import { getAllProtocols } from "../lib/protocol-categories";

export default function DailyReport() {
  const [date, setDate] = useState<Date>(new Date());
  const [data, setData] = useState<
    Record<string, Record<Protocol, ProtocolMetrics>>
  >({});
  const protocols: Protocol[] = [...getAllProtocols(), "all"] as Protocol[];

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Daily Report</h1>
      <DailyMetricsTable protocols={protocols} />
    </div>
  );
}