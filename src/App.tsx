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

      const validProtocols = ["bullx", "photon", "trojan", "axiom", "gmgnai", "bloom", "all", "newprotocol1", "newprotocol2"];
      if (!validProtocols.includes(selectedProtocol)) {
        setInvalidProtocol(true);
        setLoading(false);
        return;
      }

      const fetchedData = await getProtocolStats(selectedProtocol === "all" ? undefined : selectedProtocol);
      const formattedData = fetchedData.map(item => ({
        ...item,
        formattedDay: item.formattedDay || formatDate(item.date)
      })) as ProtocolStatsWithDay[];
      setData(formattedData);

      const totalStats = await getTotalProtocolStats(selectedProtocol === 'all' ? undefined : selectedProtocol);
      if (!totalStats) {
        throw new Error('Failed to fetch total protocol stats');
      }
      
      setTotalMetrics(totalStats);

      if (selectedProtocol === 'all') {
        const processedData = formattedData.reduce((acc: ProtocolStatsWithDay[], item: ProtocolStatsWithDay) => {
          const existingDay = acc.find(
            (d) => d.formattedDay === item.formattedDay
          );
          if (existingDay) {
            existingDay[item.protocol_name] = item;
          } else {
            const newDay: ProtocolStatsWithDay = {
              formattedDay: item.formattedDay,
              protocol_name: item.protocol_name,
              date: item.date,
              volume_usd: item.volume_usd,
              daily_users: item.daily_users,
              new_users: item.new_users,
              trades: item.trades,
              fees_usd: item.fees_usd,
              [item.protocol_name]: item
            };
            acc.push(newDay);
          }
          return acc;
        }, [] as ProtocolStatsWithDay[]);
        setData(processedData);
      } else {
        setData(formattedData);
      }

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
                ]}
                labels={["BullX", "Photon", "Trojan", "Axiom", "GMG Nai", "Bloom"]}
                colors={[
                  "hsl(var(--chart-1))",
                  "hsl(var(--chart-2))",
                  "hsl(var(--chart-3))",
                  "hsl(var(--chart-4))",
                  "hsl(var(--chart-5))",
                  "hsl(var(--chart-1))",
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
                ]}
                labels={["BullX", "Photon", "Trojan", "Axiom", "GMG Nai", "Bloom"]}
                colors={[
                  "hsl(var(--chart-1))",
                  "hsl(var(--chart-2))",
                  "hsl(var(--chart-3))",
                  "hsl(var(--chart-4))",
                  "hsl(var(--chart-5))",
                  "hsl(var(--chart-1))",
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
                ]}
                labels={["BullX", "Photon", "Trojan", "Axiom", "GMG Nai", "Bloom"]}
                colors={[
                  "hsl(var(--chart-1))",
                  "hsl(var(--chart-2))",
                  "hsl(var(--chart-3))",
                  "hsl(var(--chart-4))",
                  "hsl(var(--chart-5))",
                  "hsl(var(--chart-6))",
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
                ]}
                labels={["BullX", "Photon", "Trojan", "Axiom", "GMG Nai", "Bloom"]}
                colors={[
                  "hsl(var(--chart-1))",
                  "hsl(var(--chart-2))",
                  "hsl(var(--chart-3))",
                  "hsl(var(--chart-4))",
                  "hsl(var(--chart-5))",
                  "hsl(var(--chart-1))",
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
                  acc[date] = {
                    axiom: {
                      total_volume_usd: 0,
                      daily_users: 0,
                      numberOfNewUsers: 0,
                      daily_trades: 0,
                      total_fees_usd: 0,
                    },
                    bullx: {
                      total_volume_usd: 0,
                      daily_users: 0,
                      numberOfNewUsers: 0,
                      daily_trades: 0,
                      total_fees_usd: 0,
                    },
                    bloom: {
                      total_volume_usd: 0,
                      daily_users: 0,
                      numberOfNewUsers: 0,
                      daily_trades: 0,
                      total_fees_usd: 0,
                    },
                    gmgnai: {
                      total_volume_usd: 0,
                      daily_users: 0,
                      numberOfNewUsers: 0,
                      daily_trades: 0,
                      total_fees_usd: 0,
                    },
                    photon: {
                      total_volume_usd: 0,
                      daily_users: 0,
                      numberOfNewUsers: 0,
                      daily_trades: 0,
                      total_fees_usd: 0,
                    },
                    trojan: {
                      total_volume_usd: 0,
                      daily_users: 0,
                      numberOfNewUsers: 0,
                      daily_trades: 0,
                      total_fees_usd: 0,
                    }
                  };
                }

                ["axiom", "bullx", "bloom", "gmgnai", "photon", "trojan"].forEach((protocol) => {
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
            protocols={["axiom", "bullx", "bloom", "gmgnai", "photon", "trojan"] as Protocol[]}
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
