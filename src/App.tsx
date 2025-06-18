import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import * as AccordionPrimitive from '@radix-ui/react-accordion';

const Accordion = AccordionPrimitive.Root;
const AccordionItem = AccordionPrimitive.Item;
const AccordionTrigger = AccordionPrimitive.Trigger;
const AccordionContent = AccordionPrimitive.Content;

import { MetricCard } from "./components/MetricCard";
import { MetricCardSkeleton } from "./components/MetricCardSkeleton";
import { Skeleton } from "./components/ui/skeleton";
import { TimelineChart } from "./components/charts/TimelineChart";
import { TimelineChartSkeleton } from "./components/charts/TimelineChartSkeleton";
import { HorizontalBarChartSkeleton } from "./components/charts/HorizontalBarChartSkeleton";
import { StackedBarChartSkeleton } from "./components/charts/StackedBarChartSkeleton";
import { ProtocolStats, ProtocolMetrics } from "./types/protocol";
import { protocolColorsList, getProtocolColor } from "./lib/colors";

import { CombinedChart } from "./components/charts/CombinedChart";
import { ProtocolDataTable } from "./components/ProtocolDataTable";
import { StackedBarChart } from "./components/charts/StackedBarChart";
import { StackedAreaChart } from "./components/charts/StackedAreaChart";
import { Protocol } from "./types/protocol";
import { getProtocolStats, getTotalProtocolStats, formatDate, getAggregatedProtocolStats } from "./lib/protocol";
import { HorizontalBarChart } from "./components/charts/HorizontalBarChart";

interface DailyData {
  formattedDay: string;
  volume_usd: number;
  daily_users: number;
  new_users: number;
  trades: number;
  fees_usd: number;
  [key: string]: string | number | ProtocolStats;
}

type ProtocolStatsWithDay = ProtocolStats & DailyData & {
  volume_usd: number;
  daily_users: number;
  new_users: number;
  trades: number;
  fees_usd: number;
};

const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="p-4 text-red-600">
    <h2 className="text-lg font-bold">Something went wrong:</h2>
    <pre className="mt-2">{error.message}</pre>
  </div>
);

const MetricCards = ({
  totalMetrics,
}: {
  totalMetrics: ProtocolMetrics;
}) => (
  <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
    <MetricCard
      title="Volume"
      type="volume"
      value={totalMetrics.total_volume_usd ?? 0}
      prefix="$"
    />
    <MetricCard
      title="Daily Users"
      type="users"
      value={totalMetrics.numberOfNewUsers ?? 0}
    />
    <MetricCard
      title="Trades"
      type="trades"
      value={totalMetrics.daily_trades ?? 0}
    />
    <MetricCard
      title="Fees"
      type="fees"
      value={totalMetrics.total_fees_usd ?? 0}
      prefix="$"
    />
  </div>
);

const MainContent = (): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidProtocol, setInvalidProtocol] = useState(false);
  const [totalMetrics, setTotalMetrics] = useState<ProtocolMetrics>({total_volume_usd: 0, daily_users: 0, numberOfNewUsers: 0, daily_trades: 0, total_fees_usd: 0});
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark:bg-background");
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const [protocolData, setProtocolData] = useState<ProtocolStats[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"charts" | "data">(
    searchParams.get("view") === "data" ? "data" : "charts"
  );
  const protocol = searchParams.get("protocol")?.toLowerCase() || "bullx";

  const loadData = useCallback(async (selectedProtocol: string) => {
    try {
      setLoading(true);
      setError(null);
      setInvalidProtocol(false);

      const validProtocols = ["bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "all", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"];
      if (!validProtocols.includes(selectedProtocol)) {
        setInvalidProtocol(true);
        setLoading(false);
        return;
      }

      let fetchedData;
      if (selectedProtocol === "all") {
        // Use the new optimized aggregated endpoint
        console.log('Fetching aggregated data for all protocols...');
        fetchedData = await getAggregatedProtocolStats();
        console.log(`Fetched ${fetchedData.length} aggregated records`);
      } else {
        fetchedData = await getProtocolStats(selectedProtocol);
      }
      
      if (selectedProtocol === 'all') {
        // Data is already aggregated and formatted by the backend
        setData(fetchedData);
      } else {
        // For single protocol, just format the data
        const formattedData = fetchedData.map((item: any) => ({
          ...item,
          formattedDay: formatDate(item.date)
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setData(formattedData);
      }

      const totalStats = await getTotalProtocolStats(selectedProtocol === 'all' ? undefined : selectedProtocol);
      if (!totalStats) {
        throw new Error('Failed to fetch total protocol stats');
      }
      
      setTotalMetrics(totalStats);

      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while loading the data"
      );
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const protocol = searchParams.get("protocol") || "all";
    loadData(protocol);
  }, [searchParams, loadData]);


  const latestData = useMemo<ProtocolStatsWithDay | undefined>(() => data[data.length - 1], [data]);

  // Memoize expensive dominance calculations
  const volumeDominanceData = useMemo(() => {
    return data.map(day => {
      const totalVolume = [
        "bullx_volume", "photon_volume", "trojan_volume", "axiom_volume",
        "gmgnai_volume", "bloom_volume", "bonkbot_volume", "nova_volume",
        "soltradingbot_volume", "maestro_volume", "banana_volume",
        "padre_volume", "moonshot_volume", "vector_volume"
      ].reduce((sum, key) => sum + (day[key] || 0), 0);

      return {
        formattedDay: day.formattedDay,
        bullx_dominance: totalVolume > 0 ? day.bullx_volume / totalVolume : 0,
        photon_dominance: totalVolume > 0 ? day.photon_volume / totalVolume : 0,
        trojan_dominance: totalVolume > 0 ? day.trojan_volume / totalVolume : 0,
        axiom_dominance: totalVolume > 0 ? day.axiom_volume / totalVolume : 0,
        gmgnai_dominance: totalVolume > 0 ? day.gmgnai_volume / totalVolume : 0,
        bloom_dominance: totalVolume > 0 ? day.bloom_volume / totalVolume : 0,
        bonkbot_dominance: totalVolume > 0 ? day.bonkbot_volume / totalVolume : 0,
        nova_dominance: totalVolume > 0 ? day.nova_volume / totalVolume : 0,
        soltradingbot_dominance: totalVolume > 0 ? day.soltradingbot_volume / totalVolume : 0,
        maestro_dominance: totalVolume > 0 ? day.maestro_volume / totalVolume : 0,
        banana_dominance: totalVolume > 0 ? day.banana_volume / totalVolume : 0,
        padre_dominance: totalVolume > 0 ? day.padre_volume / totalVolume : 0,
        moonshot_dominance: totalVolume > 0 ? day.moonshot_volume / totalVolume : 0,
        vector_dominance: totalVolume > 0 ? day.vector_volume / totalVolume : 0
      };
    });
  }, [data]);

  const usersDominanceData = useMemo(() => {
    return data.map(day => {
      const totalDAU = [
        "bullx_users", "photon_users", "trojan_users", "axiom_users",
        "gmgnai_users", "bloom_users", "bonkbot_users", "nova_users",
        "soltradingbot_users", "maestro_users", "banana_users",
        "padre_users", "moonshot_users", "vector_users"
      ].reduce((sum, key) => sum + (day[key] || 0), 0);

      return {
        formattedDay: day.formattedDay,
        bullx_dominance: totalDAU > 0 ? day.bullx_users / totalDAU : 0,
        photon_dominance: totalDAU > 0 ? day.photon_users / totalDAU : 0,
        trojan_dominance: totalDAU > 0 ? day.trojan_users / totalDAU : 0,
        axiom_dominance: totalDAU > 0 ? day.axiom_users / totalDAU : 0,
        gmgnai_dominance: totalDAU > 0 ? day.gmgnai_users / totalDAU : 0,
        bloom_dominance: totalDAU > 0 ? day.bloom_users / totalDAU : 0,
        bonkbot_dominance: totalDAU > 0 ? day.bonkbot_users / totalDAU : 0,
        nova_dominance: totalDAU > 0 ? day.nova_users / totalDAU : 0,
        soltradingbot_dominance: totalDAU > 0 ? day.soltradingbot_users / totalDAU : 0,
        maestro_dominance: totalDAU > 0 ? day.maestro_users / totalDAU : 0,
        banana_dominance: totalDAU > 0 ? day.banana_users / totalDAU : 0,
        padre_dominance: totalDAU > 0 ? day.padre_users / totalDAU : 0,
        moonshot_dominance: totalDAU > 0 ? day.moonshot_users / totalDAU : 0,
        vector_dominance: totalDAU > 0 ? day.vector_users / totalDAU : 0
      };
    });
  }, [data]);

  const newUsersDominanceData = useMemo(() => {
    return data.map(day => {
      const totalNewUsers = [
        "bullx_new_users", "photon_new_users", "trojan_new_users", "axiom_new_users",
        "gmgnai_new_users", "bloom_new_users", "bonkbot_new_users", "nova_new_users",
        "soltradingbot_new_users", "maestro_new_users", "banana_new_users",
        "padre_new_users", "moonshot_new_users", "vector_new_users"
      ].reduce((sum, key) => sum + (day[key] || 0), 0);

      return {
        formattedDay: day.formattedDay,
        bullx_dominance: totalNewUsers > 0 ? day.bullx_new_users / totalNewUsers : 0,
        photon_dominance: totalNewUsers > 0 ? day.photon_new_users / totalNewUsers : 0,
        trojan_dominance: totalNewUsers > 0 ? day.trojan_new_users / totalNewUsers : 0,
        axiom_dominance: totalNewUsers > 0 ? day.axiom_new_users / totalNewUsers : 0,
        gmgnai_dominance: totalNewUsers > 0 ? day.gmgnai_new_users / totalNewUsers : 0,
        bloom_dominance: totalNewUsers > 0 ? day.bloom_new_users / totalNewUsers : 0,
        bonkbot_dominance: totalNewUsers > 0 ? day.bonkbot_new_users / totalNewUsers : 0,
        nova_dominance: totalNewUsers > 0 ? day.nova_new_users / totalNewUsers : 0,
        soltradingbot_dominance: totalNewUsers > 0 ? day.soltradingbot_new_users / totalNewUsers : 0,
        maestro_dominance: totalNewUsers > 0 ? day.maestro_new_users / totalNewUsers : 0,
        banana_dominance: totalNewUsers > 0 ? day.banana_new_users / totalNewUsers : 0,
        padre_dominance: totalNewUsers > 0 ? day.padre_new_users / totalNewUsers : 0,
        moonshot_dominance: totalNewUsers > 0 ? day.moonshot_new_users / totalNewUsers : 0,
        vector_dominance: totalNewUsers > 0 ? day.vector_new_users / totalNewUsers : 0
      };
    });
  }, [data]);

  const tradesDominanceData = useMemo(() => {
    return data.map(day => {
      const totalTrades = [
        "bullx_trades", "photon_trades", "trojan_trades", "axiom_trades",
        "gmgnai_trades", "bloom_trades", "bonkbot_trades", "nova_trades",
        "soltradingbot_trades", "maestro_trades", "banana_trades",
        "padre_trades", "moonshot_trades", "vector_trades"
      ].reduce((sum, key) => sum + (day[key] || 0), 0);

      return {
        formattedDay: day.formattedDay,
        bullx_dominance: totalTrades > 0 ? day.bullx_trades / totalTrades : 0,
        photon_dominance: totalTrades > 0 ? day.photon_trades / totalTrades : 0,
        trojan_dominance: totalTrades > 0 ? day.trojan_trades / totalTrades : 0,
        axiom_dominance: totalTrades > 0 ? day.axiom_trades / totalTrades : 0,
        gmgnai_dominance: totalTrades > 0 ? day.gmgnai_trades / totalTrades : 0,
        bloom_dominance: totalTrades > 0 ? day.bloom_trades / totalTrades : 0,
        bonkbot_dominance: totalTrades > 0 ? day.bonkbot_trades / totalTrades : 0,
        nova_dominance: totalTrades > 0 ? day.nova_trades / totalTrades : 0,
        soltradingbot_dominance: totalTrades > 0 ? day.soltradingbot_trades / totalTrades : 0,
        maestro_dominance: totalTrades > 0 ? day.maestro_trades / totalTrades : 0,
        banana_dominance: totalTrades > 0 ? day.banana_trades / totalTrades : 0,
        padre_dominance: totalTrades > 0 ? day.padre_trades / totalTrades : 0,
        moonshot_dominance: totalTrades > 0 ? day.moonshot_trades / totalTrades : 0,
        vector_dominance: totalTrades > 0 ? day.vector_trades / totalTrades : 0
      };
    });
  }, [data]);

  const feesDominanceData = useMemo(() => {
    return data.map(day => {
      const totalFees = [
        "bullx_fees", "photon_fees", "trojan_fees", "axiom_fees",
        "gmgnai_fees", "bloom_fees", "bonkbot_fees", "nova_fees",
        "soltradingbot_fees", "maestro_fees", "banana_fees",
        "padre_fees", "moonshot_fees", "vector_fees"
      ].reduce((sum, key) => sum + (day[key] || 0), 0);

      return {
        formattedDay: day.formattedDay,
        bullx_dominance: totalFees > 0 ? day.bullx_fees / totalFees : 0,
        photon_dominance: totalFees > 0 ? day.photon_fees / totalFees : 0,
        trojan_dominance: totalFees > 0 ? day.trojan_fees / totalFees : 0,
        axiom_dominance: totalFees > 0 ? day.axiom_fees / totalFees : 0,
        gmgnai_dominance: totalFees > 0 ? day.gmgnai_fees / totalFees : 0,
        bloom_dominance: totalFees > 0 ? day.bloom_fees / totalFees : 0,
        bonkbot_dominance: totalFees > 0 ? day.bonkbot_fees / totalFees : 0,
        nova_dominance: totalFees > 0 ? day.nova_fees / totalFees : 0,
        soltradingbot_dominance: totalFees > 0 ? day.soltradingbot_fees / totalFees : 0,
        maestro_dominance: totalFees > 0 ? day.maestro_fees / totalFees : 0,
        banana_dominance: totalFees > 0 ? day.banana_fees / totalFees : 0,
        padre_dominance: totalFees > 0 ? day.padre_fees / totalFees : 0,
        moonshot_dominance: totalFees > 0 ? day.moonshot_fees / totalFees : 0,
        vector_dominance: totalFees > 0 ? day.vector_fees / totalFees : 0
      };
    });
  }, [data]);

  if (invalidProtocol) {
    window.location.href = "/not-found";
    return (
      <div className="flex items-center justify-center min-h-screen">
        Redirecting...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-3xl mb-8 text-white/90 text-center">
          <Skeleton className="h-10 w-48 mx-auto" />
        </div>
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <div className="space-y-6">
          <TimelineChartSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HorizontalBarChartSkeleton />
            <StackedBarChartSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl mb-4 text-red-600">Error: {error}</h1>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl mb-8 text-white/90 text-center">
        {protocol === "all"
          ? "Overview"
          : protocol.charAt(0).toUpperCase() + protocol.slice(1)}{" "}
        Dashboard
      </h1>

      <MetricCards totalMetrics={totalMetrics} />


        <div className="space-y-6">
          {protocol === "all" ? (
            <>
              <Accordion 
                type="multiple" 
                value={openAccordionItems}
                onValueChange={setOpenAccordionItems}
                className="w-full space-y-4 rounded-xl overflow-hidden"
              >
                {/* Volume Metrics */}
                <AccordionItem value="volume" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-3 w-full px-6 py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-6 h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>

                      <span className="text-lg font-semibold flex-1 text-left">Volume Metrics</span>
                      <svg
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m6 9 6 6 6-6"
                        />
                      </svg>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-6 pt-2 pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("volume") && (
                      <>
                        <HorizontalBarChart
                          title="Total Volume by Protocol"
                          data={[
                            "bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"
                          ].map(p => ({
                            name: p.charAt(0).toUpperCase() + p.slice(1),
                            values: data.map(item => ({
                              value: item[`${p}_volume`] || 0,
                              date: item.date
                            })),
                            value: data.reduce((sum, item) => sum + (item[`${p}_volume`] || 0), 0),
                            color: getProtocolColor(p)
                          }))}
                          valueFormatter={(value) => {
                            if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
                            if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
                            return `$${(value / 1e3).toFixed(2)}K`;
                          }}
                          loading={loading}
                        />
                        <StackedBarChart
                          title="Volume by Protocol"
                          data={data}
                          dataKeys={[
                            "bullx_volume",
                            "photon_volume",
                            "trojan_volume",
                            "axiom_volume",
                            "gmgnai_volume",
                            "bloom_volume",
                            "bonkbot_volume",
                            "nova_volume",
                            "soltradingbot_volume",
                            "maestro_volume",
                            "banana_volume",
                            "padre_volume",
                            "moonshot_volume",
                            "vector_volume",
                          ]}
                          labels={["BullX", "Photon", "Trojan", "Axiom", "GmGnAi", "Bloom", "BonkBot", "Nova", "SolTradingBot", "Maestro", "Banana", "Padre", "Moonshot", "Vector"]}
                          colors={protocolColorsList}
                          valueFormatter={(value) => `$${(value / 1e6).toFixed(2)}M`}
                          loading={loading}
                        />
                        <StackedAreaChart
                          title="Volume Dominance by Protocol"
                          data={volumeDominanceData}
                          keys={[
                            "bullx_dominance",
                            "photon_dominance",
                            "trojan_dominance",
                            "axiom_dominance",
                            "gmgnai_dominance",
                            "bloom_dominance",
                            "bonkbot_dominance",
                            "nova_dominance",
                            "soltradingbot_dominance",
                            "maestro_dominance",
                            "banana_dominance",
                            "padre_dominance",
                            "moonshot_dominance",
                            "vector_dominance"
                          ]}
                          colors={protocolColorsList}
                          loading={loading}
                        />
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="users" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-3 w-full px-6 py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-6 h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>

                      <span className="text-lg font-semibold flex-1 text-left">DAU Metrics</span>
                      <svg
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m6 9 6 6 6-6"
                        />
                      </svg>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-6 pt-2 pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("users") && (
                      <>
                        <StackedBarChart
                          title="Daily Active Users by Protocol"
                          data={data}
                          dataKeys={[
                            "bullx_users",
                            "photon_users",
                            "trojan_users",
                            "axiom_users",
                            "gmgnai_users",
                            "bloom_users",
                            "bonkbot_users",
                            "nova_users",
                            "soltradingbot_users",
                            "maestro_users",
                            "banana_users",
                            "padre_users",
                            "moonshot_users",
                            "vector_users",
                          ]}
                          labels={["BullX", "Photon", "Trojan", "Axiom", "GmGnAi", "Bloom", "BonkBot", "Nova", "SolTradingBot", "Maestro", "Banana", "Padre", "Moonshot", "Vector"]}
                          colors={protocolColorsList}
                          valueFormatter={(value) => value.toFixed(0)}
                        />
                        <StackedAreaChart
                          title="DAU Dominance by Protocol"
                          data={usersDominanceData}
                          keys={[
                            "bullx_dominance",
                            "photon_dominance",
                            "trojan_dominance",
                            "axiom_dominance",
                            "gmgnai_dominance",
                            "bloom_dominance",
                            "bonkbot_dominance",
                            "nova_dominance",
                            "soltradingbot_dominance",
                            "maestro_dominance",
                            "banana_dominance",
                            "padre_dominance",
                            "moonshot_dominance",
                            "vector_dominance"
                          ]}
                          colors={protocolColorsList}
                        />
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="new_users" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-3 w-full px-6 py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-6 h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>

                      <span className="text-lg font-semibold flex-1 text-left">New Users Metrics</span>
                      <svg
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m6 9 6 6 6-6"
                        />
                      </svg>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-6 pt-2 pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("new_users") && (
                      <>
                        <HorizontalBarChart
                          title="Total Users by Protocol"
                          data={[
                            "bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"
                          ].map(p => ({
                            name: p.charAt(0).toUpperCase() + p.slice(1),
                            values: data.map(item => ({
                              value: item[`${p}_users`] || 0,
                              date: item.date
                            })),
                            value: data.reduce((sum, item) => sum + (item[`${p}_users`] || 0), 0),
                            color: getProtocolColor(p)
                          }))}
                        />
                        <StackedBarChart
                          title="New Users by Protocol"
                          data={data}
                          dataKeys={[
                            "bullx_new_users",
                            "photon_new_users",
                            "trojan_new_users",
                            "axiom_new_users",
                            "gmgnai_new_users",
                            "bloom_new_users",
                            "bonkbot_new_users",
                            "nova_new_users",
                            "soltradingbot_new_users",
                            "maestro_new_users",
                            "banana_new_users",
                            "padre_new_users",
                            "moonshot_new_users",
                            "vector_new_users",
                          ]}
                          labels={["BullX", "Photon", "Trojan", "Axiom", "GmGnAi", "Bloom", "BonkBot", "Nova", "SolTradingBot", "Maestro", "Banana", "Padre", "Moonshot", "Vector"]}
                          colors={protocolColorsList}
                          valueFormatter={(value) => value.toFixed(0)}
                        />
                        <StackedAreaChart
                          title="New Users Dominance by Protocol"
                          data={newUsersDominanceData}
                          keys={[
                            "bullx_dominance",
                            "photon_dominance",
                            "trojan_dominance",
                            "axiom_dominance",
                            "gmgnai_dominance",
                            "bloom_dominance",
                            "bonkbot_dominance",
                            "nova_dominance",
                            "soltradingbot_dominance",
                            "maestro_dominance",
                            "banana_dominance",
                            "padre_dominance",
                            "moonshot_dominance",
                            "vector_dominance"
                          ]}
                          colors={protocolColorsList}
                        />
                      </>
                    )}
                  </AccordionContent>
                                </AccordionItem>

                <AccordionItem value="trades" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-3 w-full px-6 py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-6 h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>

                      <span className="text-lg font-semibold flex-1 text-left">Trades Metrics</span>
                      <svg
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m6 9 6 6 6-6"
                        />
                      </svg>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-6 pt-2 pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("trades") && (
                      <>
                        <HorizontalBarChart
                          title="Total Trades by Protocol"
                          data={[
                            "bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"
                          ].map(p => ({
                            name: p.charAt(0).toUpperCase() + p.slice(1),
                            values: data.map(item => ({
                              value: item[`${p}_trades`] || 0,
                              date: item.date
                            })),
                            value: data.reduce((sum, item) => sum + (item[`${p}_trades`] || 0), 0),
                            color: getProtocolColor(p)
                          }))}
                        />
                        <StackedBarChart
                          title="Trades by Protocol"
                          data={data}
                          dataKeys={[
                            "bullx_trades",
                            "photon_trades",
                            "trojan_trades",
                            "axiom_trades",
                            "gmgnai_trades",
                            "bloom_trades",
                            "bonkbot_trades",
                            "nova_trades",
                            "soltradingbot_trades",
                            "maestro_trades",
                            "banana_trades",
                            "padre_trades",
                            "moonshot_trades",
                            "vector_trades",
                          ]}
                          labels={["BullX", "Photon", "Trojan", "Axiom", "GmGnAi", "Bloom", "BonkBot", "Nova", "SolTradingBot", "Maestro", "Banana", "Padre", "Moonshot", "Vector"]}
                          colors={protocolColorsList}
                          valueFormatter={(value) => `${value.toFixed(0)}`}
                        />
                        <StackedAreaChart
                          title="Trades Dominance by Protocol"
                          data={tradesDominanceData}
                          keys={[
                            "bullx_dominance",
                            "photon_dominance",
                            "trojan_dominance",
                            "axiom_dominance",
                            "gmgnai_dominance",
                            "bloom_dominance",
                            "bonkbot_dominance",
                            "nova_dominance",
                            "soltradingbot_dominance",
                            "maestro_dominance",
                            "banana_dominance",
                            "padre_dominance",
                            "moonshot_dominance",
                            "vector_dominance"
                          ]}
                          colors={protocolColorsList}
                        />
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="fees" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-3 w-full px-6 py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-6 h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>

                      <span className="text-lg font-semibold flex-1 text-left">Fee Metrics</span>
                      <svg
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="m6 9 6 6 6-6"
                        />
                      </svg>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-6 pt-2 pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("fees") && (
                      <>
                        <HorizontalBarChart
                          title="Total Fees by Protocol"
                          data={[
                            "bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"
                          ].map(p => ({
                            name: p.charAt(0).toUpperCase() + p.slice(1),
                            values: data.map(item => ({
                              value: item[`${p}_fees`] || 0,
                              date: item.date
                            })),
                            value: data.reduce((sum, item) => sum + (item[`${p}_fees`] || 0), 0),
                            color: getProtocolColor(p)
                          }))}
                          valueFormatter={(value) => {
                            if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
                            if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
                            return `$${(value / 1e3).toFixed(2)}K`;
                          }}
                          loading={loading}
                        />
                        <StackedBarChart
                          title="Fees by Protocol"
                          data={data}
                          dataKeys={[
                            "bullx_fees",
                            "photon_fees",
                            "trojan_fees",
                            "axiom_fees",
                            "gmgnai_fees",
                            "bloom_fees",
                            "bonkbot_fees",
                            "nova_fees",
                            "soltradingbot_fees",
                            "maestro_fees",
                            "banana_fees",
                            "padre_fees",
                            "moonshot_fees",
                            "vector_fees",
                          ]}
                          labels={["BullX", "Photon", "Trojan", "Axiom", "GmGnAi", "Bloom", "BonkBot", "Nova", "SolTradingBot", "Maestro", "Banana", "Padre", "Moonshot", "Vector"]}
                          colors={protocolColorsList}
                          valueFormatter={(value) => `$${(value / 1e6).toFixed(2)}M`}
                          loading={loading}
                        />
                        <StackedAreaChart
                          title="Fee Dominance by Protocol"
                          data={feesDominanceData}
                          keys={[
                            "bullx_dominance",
                            "photon_dominance",
                            "trojan_dominance",
                            "axiom_dominance",
                            "gmgnai_dominance",
                            "bloom_dominance",
                            "bonkbot_dominance",
                            "nova_dominance",
                            "soltradingbot_dominance",
                            "maestro_dominance",
                            "banana_dominance",
                            "padre_dominance",
                            "moonshot_dominance",
                            "vector_dominance"
                          ]}
                          colors={protocolColorsList}
                          loading={loading}
                        />
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          ) : (
            <>
              <CombinedChart
                title="Volume & Fees"
                data={data.filter(
                  (d) =>
                    d.volume_usd !== undefined &&
                    d.fees_usd !== undefined
                )}
                volumeKey="volume_usd"
                feesKey="fees_usd"
                colors={[getProtocolColor(protocol), getProtocolColor(protocol)]}
                loading={loading}
              />
              <CombinedChart
                title="Daily Users"
                data={data.filter(
                  (d) =>
                    d.daily_users !== undefined &&
                    d.new_users !== undefined
                )}
                volumeKey="daily_users"
                feesKey="new_users"
                colors={[getProtocolColor(protocol), getProtocolColor(protocol)]}
                loading={loading}
              />
              <TimelineChart
                title="Trades"
                data={data.filter((d) => d.trades !== undefined)}
                dataKey="trades"
                color={getProtocolColor(protocol)}
                loading={loading}
              />
            </>
          )}
        </div>
    </div>
  );
};

const queryClient = new QueryClient();

const App = (): JSX.Element => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <MainContent />
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
