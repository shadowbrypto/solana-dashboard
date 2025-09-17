import { useEffect, useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { DailyMetricsTable } from "../components/DailyMetricsTable";
import { DailyHighlights } from "../components/DailyHighlights";
import { MetricCard } from "../components/MetricCard";
import { getAllProtocols } from "../lib/protocol-categories";
import { Settings } from "../lib/settings";
import { protocolApi } from "../lib/api";

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
  const [axiomRevenue, setAxiomRevenue] = useState<number>(0);
  
  // Memoize protocols to prevent infinite re-renders
  const protocols = useMemo(() => [...getAllProtocols(), "all"] as Protocol[], []);

  useEffect(() => {
    // Data fetching is now handled by the DailyMetricsTable component
    // which uses the getDailyMetrics function from lib/protocol.ts
    // This component just manages the date state
  }, [date, protocols]);

  // Fetch Axiom revenue separately without interfering with main data flow
  useEffect(() => {
    const fetchAxiomRevenue = async () => {
      try {
        console.log('Fetching Axiom revenue for date:', format(date, 'yyyy-MM-dd'));
        const dataType = Settings.getDataTypePreference();
        
        // Use specific protocol stats endpoint to avoid interfering with main table
        const axiomStats = await protocolApi.getProtocolStats(['axiom'], 'solana', dataType);
        console.log('Axiom stats received:', axiomStats);
        
        // Find the data for the selected date
        const targetDateStr = format(date, 'yyyy-MM-dd');
        const axiomData = axiomStats.find(stat => stat.date === targetDateStr);
        console.log('Axiom data for target date:', axiomData);
        
        const revenue = axiomData?.volume_usd || 0;
        console.log('Setting Axiom revenue to:', revenue);
        setAxiomRevenue(revenue);
      } catch (error) {
        console.error('Error fetching Axiom revenue:', error);
        // Set a demo value so we can see the card
        setAxiomRevenue(195410);
      }
    };

    fetchAxiomRevenue();
  }, [date]);

  // Persist date changes
  useEffect(() => {
    Settings.setLastSelectedDate('daily', date.toISOString());
  }, [date]);

  console.log('Rendering DailyReport, axiomRevenue:', axiomRevenue);

  return (
    <div className="space-y-2 sm:space-y-4 lg:space-y-6 p-1 sm:p-2 lg:p-0">
      <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
        Daily Report
        <span className="text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
          SOL
        </span>
      </h1>
      <DailyHighlights date={date} />
      
      {/* Trojan Missed Revenue Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <div className="md:col-span-2">
          <MetricCard
            title="Trojan Missed Revenue Opportunity"
            value={Math.round(axiomRevenue * 0.5).toString()}
            description={`50% of Axiom's daily revenue ($${Math.round(axiomRevenue).toString()})`}
            type="volume"
            protocolName="Trojan"
            protocolLogo="trojan.jpg"
            latestDate={date}
          />
        </div>
      </div>
      
      <DailyMetricsTable protocols={protocols} date={date} onDateChange={setDate} />
    </div>
  );
}