import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ProtocolMetrics, Protocol } from "../types";
import { DailyMetricsTable } from "../components/DailyMetricsTable";

export default function DailyReport() {
  const [date, setDate] = useState<Date>(new Date());
  const [data, setData] = useState<
    Record<string, Record<Protocol, ProtocolMetrics>>
  >({});
  const protocols: Protocol[] = ["bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"];

  useEffect(() => {
    // In a real app, you would fetch data here
    // For now, we'll use mock data
    const mockData: Record<string, Record<Protocol, ProtocolMetrics>> = {
      [format(date, "dd/MM/yyyy")]: {
        bullx: {
          total_volume_usd: 1000000,
          daily_users: 100,
          numberOfNewUsers: 10,
          daily_trades: 500,
          total_fees_usd: 5000,
        },
        photon: {
          total_volume_usd: 2000000,
          daily_users: 200,
          numberOfNewUsers: 20,
          daily_trades: 1000,
          total_fees_usd: 10000,
        },
        trojan: {
          total_volume_usd: 3000000,
          daily_users: 300,
          numberOfNewUsers: 30,
          daily_trades: 1500,
          total_fees_usd: 15000,
        },
      },
    };
    setData(mockData);
  }, [date]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Daily Report</h1>
      <DailyMetricsTable
        data={data}
        protocols={protocols}
        date={date}
        onDateChange={setDate}
      />
    </div>
  );
}
