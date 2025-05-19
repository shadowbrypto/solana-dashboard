import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MetricCard } from "./components/MetricCard";
import { TimelineChart } from "./components/charts/TimelineChart";
import { TabSwitcher } from "./components/TabSwitcher";
import { DataTable } from "./components/DataTable";
import { ProtocolStats, ProtocolMetrics } from "./types/protocol";

import { CombinedChart } from "./components/charts/CombinedChart";
import { ProtocolDataTable } from "./components/ProtocolDataTable";
import { StackedBarChart } from "./components/charts/StackedBarChart";
import { Protocol } from "./types/protocol";
import { getProtocolStats, getTotalProtocolStats, formatDate } from "./lib/protocol";

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
      value={new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(totalMetrics.total_volume_usd ?? 0)}
    />
    <MetricCard
      title="Daily Users"
      type="users"
      value={new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(totalMetrics.numberOfNewUsers ?? 0)}
    />
    <MetricCard
      title="Trades"
      type="trades"
      value={new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(totalMetrics.daily_trades ?? 0)}
    />
    <MetricCard
      title="Fees"
      type="fees"
      value={new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(totalMetrics.total_fees_usd ?? 0)}
    />
  </div>
);

const MainContent = (): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidProtocol, setInvalidProtocol] = useState(false);
  const [totalMetrics, setTotalMetrics] = useState<ProtocolMetrics>({total_volume_usd: 0, daily_users: 0, numberOfNewUsers: 0, daily_trades: 0, total_fees_usd: 0});

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark:bg-background");
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const [protocolData, setProtocolData] = useState<ProtocolStats[]>([]);
  const [data, setData] = useState<ProtocolStatsWithDay[]>([]);
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
        // For 'all', fetch data for each protocol separately
        const protocols = ["bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"];
        const protocolDataMap = new Map<string, any>();

        // Initialize empty data structure for all days
        const allDays = new Set<string>();
        const emptyMetrics = protocols.reduce((acc, protocol) => {
          acc[`${protocol}_volume`] = 0;
          acc[`${protocol}_users`] = 0;
          acc[`${protocol}_trades`] = 0;
          acc[`${protocol}_fees`] = 0;
          return acc;
        }, {} as Record<string, number>);

        // Fetch data for each protocol
        for (const protocol of protocols) {
          console.log(`Fetching data for ${protocol}...`);
          const protocolData = await getProtocolStats(protocol);
          if (!protocolData) continue;
          
          // First collect all unique days
          for (const data of protocolData) {
            allDays.add(data.date);
          }

          // Then add protocol data
          for (const data of protocolData) {
            if (!protocolDataMap.has(data.date)) {
              protocolDataMap.set(data.date, {
                date: data.date,
                formattedDay: formatDate(data.date),
                ...emptyMetrics
              });
            }
            const dayData = protocolDataMap.get(data.date)!;
            dayData[`${protocol}_volume`] = data.volume_usd || 0;
            dayData[`${protocol}_users`] = data.daily_users || 0;
            dayData[`${protocol}_trades`] = data.trades || 0;
            dayData[`${protocol}_fees`] = data.fees_usd || 0;
          }
        }

        // Make sure all days have data for all protocols
        for (const day of Array.from(allDays)) {
          if (!protocolDataMap.has(day)) {
            protocolDataMap.set(day, {
              date: day,
              formattedDay: formatDate(day),
              ...emptyMetrics
            });
          }
        }

        fetchedData = Array.from(protocolDataMap.values());
        console.log('First day of combined data:', fetchedData[0]);
        console.log('Combined data example:', fetchedData[0]); // Log first day's combined data
      } else {
        fetchedData = await getProtocolStats(selectedProtocol);
      }
      
      interface ProtocolMetrics {
        date: string;
        formattedDay: string;
        [key: `${string}_volume`]: number;
        [key: `${string}_users`]: number;
        [key: `${string}_trades`]: number;
        [key: `${string}_fees`]: number;
      }

      if (selectedProtocol === 'all') {
        // First, get data for each protocol
        const protocols = ["bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"];
        const protocolData = new Map<string, any[]>();
        
        // Fetch data for each protocol
        for (const protocol of protocols) {
          console.log(`Fetching data for ${protocol}...`);
          const data = await getProtocolStats(protocol);
          if (data && data.length > 0) {
            protocolData.set(protocol, data);
          }
        }

        // Get all unique dates
        const allDates = new Set<string>();
        protocolData.forEach(data => {
          data.forEach(item => allDates.add(item.date));
        });

        // Create combined data structure
        const dataByDate = new Map<string, any>();

        // Initialize data structure for each date
        Array.from(allDates).forEach(date => {
          const entry: ProtocolMetrics = {
            date,
            formattedDay: formatDate(date)
          };

          // Initialize all protocol metrics to 0
          protocols.forEach(protocol => {
            entry[`${protocol}_volume`] = 0;
            entry[`${protocol}_users`] = 0;
            entry[`${protocol}_trades`] = 0;
            entry[`${protocol}_fees`] = 0;
          });

          dataByDate.set(date, entry);
        });

        // Fill in actual values
        protocolData.forEach((data, protocol) => {
          data.forEach(item => {
            const dateEntry = dataByDate.get(item.date);
            if (dateEntry) {
              dateEntry[`${protocol}_volume`] = item.volume_usd || 0;
              dateEntry[`${protocol}_users`] = item.daily_users || 0;
              dateEntry[`${protocol}_trades`] = item.trades || 0;
              dateEntry[`${protocol}_fees`] = item.fees_usd || 0;
            }
          });
        });

        // Convert to array and sort by date
        const combinedData = Array.from(dataByDate.values())
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log('First day of combined data:', combinedData[0]);
        console.log('Available metrics:', Object.keys(combinedData[0]));
        setData(combinedData);
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
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Error: {error}</h1>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-8 text-white/90 text-center">
        {protocol === "all"
          ? "Combined Protocols"
          : protocol.charAt(0).toUpperCase() + protocol.slice(1)}{" "}
        Dashboard
      </h1>

      <MetricCards totalMetrics={totalMetrics} />

      <div className="mt-8 mb-4">
        <TabSwitcher
          activeTab={activeView}
          onTabChange={(view) => {
            setActiveView(view);
            setSearchParams((params) => {
              params.set("view", view);
              return params;
            });
          }}
        />
      </div>

      {activeView === "charts" ? (
        <div className="space-y-6">
          {protocol === "all" ? (
            <>
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
                colors={[
                  "hsl(0 94% 65%)",    // Vibrant Red
                  "hsl(280 91% 65%)",  // Bright Purple
                  "hsl(145 80% 42%)",  // Deep Green
                  "hsl(45 93% 47%)",   // Golden Yellow
                  "hsl(200 98% 50%)",  // Electric Blue
                  "hsl(326 100% 59%)", // Hot Pink
                  "hsl(31 94% 52%)",   // Bright Orange
                  "hsl(168 83% 45%)",  // Turquoise
                  "hsl(142 76% 36%)",  // Emerald
                  "hsl(262 83% 58%)",  // Purple
                  "hsl(221 83% 53%)",  // Blue
                  "hsl(346 84% 61%)",  // Rose
                  "hsl(15 72% 50%)",   // Orange
                  "hsl(172 66% 50%)",  // Teal
                ]}
                valueFormatter={(value) => `$${(value / 1e6).toFixed(2)}M`}
              />
              <StackedBarChart
                title="Users by Protocol"
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
                colors={[
                  "hsl(0 94% 65%)",    // Vibrant Red
                  "hsl(280 91% 65%)",  // Bright Purple
                  "hsl(145 80% 42%)",  // Deep Green
                  "hsl(45 93% 47%)",   // Golden Yellow
                  "hsl(200 98% 50%)",  // Electric Blue
                  "hsl(326 100% 59%)", // Hot Pink
                  "hsl(31 94% 52%)",   // Bright Orange
                  "hsl(168 83% 45%)",  // Turquoise
                  "hsl(142 76% 36%)",  // Emerald
                  "hsl(262 83% 58%)",  // Purple
                  "hsl(221 83% 53%)",  // Blue
                  "hsl(346 84% 61%)",  // Rose
                  "hsl(15 72% 50%)",   // Orange
                  "hsl(172 66% 50%)",  // Teal
                ]}
                valueFormatter={(value) => value.toFixed(0)}
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
                colors={[
                  "hsl(0 94% 65%)",    // Vibrant Red
                  "hsl(280 91% 65%)",  // Bright Purple
                  "hsl(145 80% 42%)",  // Deep Green
                  "hsl(45 93% 47%)",   // Golden Yellow
                  "hsl(200 98% 50%)",  // Electric Blue
                  "hsl(326 100% 59%)", // Hot Pink
                  "hsl(31 94% 52%)",   // Bright Orange
                  "hsl(168 83% 45%)",  // Turquoise
                  "hsl(142 76% 36%)",  // Emerald
                  "hsl(262 83% 58%)",  // Purple
                  "hsl(221 83% 53%)",  // Blue
                  "hsl(346 84% 61%)",  // Rose
                  "hsl(15 72% 50%)",   // Orange
                  "hsl(172 66% 50%)",  // Teal
                ]}
                valueFormatter={(value) => `${value.toFixed(0)}`}
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
                colors={[
                  "hsl(0 94% 65%)",    // Vibrant Red
                  "hsl(280 91% 65%)",  // Bright Purple
                  "hsl(145 80% 42%)",  // Deep Green
                  "hsl(45 93% 47%)",   // Golden Yellow
                  "hsl(200 98% 50%)",  // Electric Blue
                  "hsl(326 100% 59%)", // Hot Pink
                  "hsl(31 94% 52%)",   // Bright Orange
                  "hsl(168 83% 45%)",  // Turquoise
                  "hsl(142 76% 36%)",  // Emerald
                  "hsl(262 83% 58%)",  // Purple
                  "hsl(221 83% 53%)",  // Blue
                  "hsl(346 84% 61%)",  // Rose
                  "hsl(15 72% 50%)",   // Orange
                  "hsl(172 66% 50%)",  // Teal
                ]}
                valueFormatter={(value) => `$${(value / 1e6).toFixed(2)}M`}
              />
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
              />
              <TimelineChart
                title="Trades"
                data={data.filter((d) => d.trades !== undefined)}
                dataKey="trades"
              />
            </>
          )}
        </div>
      ) : protocol === "all" ? (
        <div className="min-h-screen bg-background text-foreground dark:bg-background dark:text-foreground">
          <ProtocolDataTable
            data={data.reduce(
              (
                acc: Record<string, Record<Protocol, ProtocolMetrics>>,
                item
              ) => {
                const date = item.formattedDay;
                if (!acc[date]) {
                  const emptyMetrics = {
                    total_volume_usd: 0,
                    daily_users: 0,
                    numberOfNewUsers: 0,
                    daily_trades: 0,
                    total_fees_usd: 0,
                  };
                  acc[date] = {
                    axiom: { ...emptyMetrics },
                    bullx: { ...emptyMetrics },
                    bloom: { ...emptyMetrics },
                    gmgnai: { ...emptyMetrics },
                    photon: { ...emptyMetrics },
                    trojan: { ...emptyMetrics },
                    bonkbot: { ...emptyMetrics },
                    nova: { ...emptyMetrics },
                    soltradingbot: { ...emptyMetrics },
                    maestro: { ...emptyMetrics },
                    banana: { ...emptyMetrics },
                    padre: { ...emptyMetrics },
                    moonshot: { ...emptyMetrics },
                    vector: { ...emptyMetrics },
                    all: { ...emptyMetrics }
                  };
                }

                ["axiom", "bullx", "bloom", "gmgnai", "photon", "trojan", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"].forEach((protocol) => {
                  acc[date][protocol as Protocol] = {
                    total_volume_usd:
                      (item[`${protocol}_total_volume_usd`] as number) ?? 0,
                    daily_users:
                      (item[`${protocol}_daily_users`] as number) ?? 0,
                    numberOfNewUsers:
                      (item[`${protocol}_numberOfNewUsers`] as number) ?? 0,
                    daily_trades:
                      (item[`${protocol}_daily_trades`] as number) ?? 0,
                    total_fees_usd:
                      (item[`${protocol}_total_fees_usd`] as number) ?? 0,
                  };
                });

                return acc;
              },
              {} as Record<string, Record<Protocol, ProtocolMetrics>>
            )}
            protocols={["axiom", "bullx", "bloom", "gmgnai", "photon", "trojan", "bonkbot", "nova", "soltradingbot", "maestro", "banana", "padre", "moonshot", "vector"] as Protocol[]}
          />
        </div>
      ) : (
        <DataTable protocol={protocol} />
      )}
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
