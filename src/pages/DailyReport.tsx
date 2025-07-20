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
    // Data fetching is now handled by the DailyMetricsTable component
    // which uses the getDailyMetrics function from lib/protocol.ts
    // This component just manages the date state
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