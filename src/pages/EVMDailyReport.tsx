import { useEffect, useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { Protocol } from "../types/protocol";
import { EVMDailyMetricsTable } from "../components/EVMDailyMetricsTable";
import { EVMDailyHighlights } from "../components/EVMDailyHighlights";
import { getProtocolsByChain } from "../lib/protocol-config";
import { Settings } from "../lib/settings";

export default function EVMDailyReport() {
  const [date, setDate] = useState<Date>(() => {
    const lastSelectedDates = Settings.getLastSelectedDates();
    if (lastSelectedDates.daily) {
      return new Date(lastSelectedDates.daily);
    }
    return subDays(new Date(), 1);
  });
  
  // Get only EVM protocols
  const evmProtocols = useMemo(() => {
    const allEVMProtocols = getProtocolsByChain('evm').map(p => p.id);
    return [...allEVMProtocols, "all"] as Protocol[];
  }, []);

  // Persist date changes
  useEffect(() => {
    Settings.setLastSelectedDate('daily', date.toISOString());
  }, [date]);

  return (
    <div className="space-y-4 lg:space-y-6 p-2 sm:p-0">
      <h1 className="text-2xl sm:text-3xl font-bold">
        Daily Report
      </h1>
      <EVMDailyHighlights date={date} />
      <EVMDailyMetricsTable 
        protocols={evmProtocols}
        date={date}
        onDateChange={setDate}
      />
    </div>
  );
}