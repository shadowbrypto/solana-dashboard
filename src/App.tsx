import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import { MetricCard } from "./components/MetricCard";
import { TimelineChart } from "./components/charts/TimelineChart";
import { TabSwitcher } from "./components/TabSwitcher";
import { DataTable } from "./components/DataTable";
import { ProtocolStats, ProtocolMetrics } from "./types/protocol";

import { CombinedChart } from "./components/charts/CombinedChart";
import { ProtocolDataTable } from "./components/ProtocolDataTable";
import { StackedBarChart } from "./components/charts/StackedBarChart";
import { Protocol } from "./types";
import { getProtocolStats, getTotalProtocolStats } from "./lib/protocol";

interface DailyData extends ProtocolMetrics {
  formattedDay: string;
  [key: string]: string | number;
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
      }).format(totalMetrics.total_volume_usd)}
    />
    <MetricCard
      title="Daily Users"
      type="users"
      value={new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(totalMetrics.numberOfNewUsers)}
    />
    <MetricCard
      title="Trades"
      type="trades"
      value={new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(totalMetrics.daily_trades)}
    />
    <MetricCard
      title="Fees"
      type="fees"
      value={new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(totalMetrics.total_fees_usd)}
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

      const validProtocols = ["bullx", "photon", "trojan", "all"];
      if (!validProtocols.includes(selectedProtocol)) {
        setInvalidProtocol(true);
        setLoading(false);
        return;
      }

      const [stats, totalStats] = await Promise.all([
        getProtocolStats(selectedProtocol === 'all' ? undefined : selectedProtocol),
        getTotalProtocolStats(selectedProtocol === 'all' ? undefined : selectedProtocol)
      ]);
      
      if (!stats || !totalStats) {
        throw new Error('Failed to fetch protocol stats');
      }
      
      setTotalMetrics(totalStats);

      if (selectedProtocol === 'all') {
        const processedData = stats.reduce((acc: ProtocolStatsWithDay[], item: ProtocolStatsWithDay) => {
          const existingDay = acc.find(
            (d) => d.formattedDay === item.formattedDay
          );

          if (existingDay) {
            existingDay.volume_usd = (existingDay.volume_usd || 0) + item.volume_usd;
            existingDay.daily_users = (existingDay.daily_users || 0) + item.daily_users;
            existingDay.new_users = (existingDay.new_users || 0) + item.new_users;
            existingDay.trades = (existingDay.trades || 0) + item.trades;
            existingDay.fees_usd = (existingDay.fees_usd || 0) + item.fees_usd;
          } else {
            acc.push({
              ...item,
              formattedDay: item.formattedDay
            });
          }

          return acc;
        }, []);

        setData(processedData);
      } else {
        setData(stats);
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
                ]}
                labels={["BullX", "Photon", "Trojan"]}
                valueFormatter={(value) => `$${(value / 1e6).toFixed(2)}M`}
              />
              <StackedBarChart
                title="Users by Protocol"
                data={data}
                dataKeys={[
                  "bullx_users",
                  "photon_users",
                  "trojan_users",
                ]}
                labels={["BullX", "Photon", "Trojan"]}
                valueFormatter={(value) => value.toFixed(0)}
              />
              <StackedBarChart
                title="Trades by Protocol"
                data={data}
                dataKeys={[
                  "bullx_trades",
                  "photon_trades",
                  "trojan_trades",
                ]}
                labels={["BullX", "Photon", "Trojan"]}
                valueFormatter={(value) => value.toFixed(0)}
              />
              <StackedBarChart
                title="Fees by Protocol"
                data={data}
                dataKeys={[
                  "bullx_fees",
                  "photon_fees",
                  "trojan_fees",
                ]}
                labels={["BullX", "Photon", "Trojan"]}
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
                    d.daily_users !== undefined
                )}
                volumeKey="daily_users"
                barChartLabel="Daily Active Users"
                leftAxisFormatter={(value) => `${value.toFixed(0)}`}
                rightAxisFormatter={(value) => `${value.toFixed(0)}`}
              />
              <TimelineChart
                title="New Users"
                data={data.filter((d) => d.new_users !== undefined)}
                dataKey="new_users"
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
                    bullx: {
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
                    },
                  };
                }

                ["bullx", "photon", "trojan"].forEach((protocol) => {
                  acc[date][protocol as Protocol] = {
                    total_volume_usd:
                      (item[`${protocol}_total_volume_usd`] as number) || 0,
                    daily_users:
                      (item[`${protocol}_daily_users`] as number) || 0,
                    numberOfNewUsers:
                      (item[`${protocol}_numberOfNewUsers`] as number) || 0,
                    daily_trades:
                      (item[`${protocol}_daily_trades`] as number) || 0,
                    total_fees_usd:
                      (item[`${protocol}_total_fees_usd`] as number) || 0,
                  };
                });

                return acc;
              },
              {} as Record<string, Record<Protocol, ProtocolMetrics>>
            )}
            protocols={["bullx", "photon", "trojan"] as Protocol[]}
          />
        </div>
      ) : (
        <DataTable protocol={protocol} />
      )}
    </div>
  );
};

const App = (): JSX.Element => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MainContent />
    </ErrorBoundary>
  );
};

export default App;
