import { useEffect, useState, useMemo, useCallback, lazy } from "react";
import Papa from "papaparse";
import { useSearchParams } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import { MetricCard } from "./components/MetricCard";
import { TimelineChart } from "./components/charts/TimelineChart";
import { TabSwitcher } from "./components/TabSwitcher";
import { DataTable } from "./components/DataTable";
import { DailyData } from "./types";

import { CombinedChart } from "./components/charts/CombinedChart";
import { ProtocolDataTable } from "./components/ProtocolDataTable";
import { StackedBarChart } from "./components/charts/StackedBarChart";
import { ProtocolMetrics, Protocol } from "./types";

const DailyReport = lazy(() => import("./pages/DailyReport"));
const MonthlyReport = lazy(() => import("./pages/MonthlyReport"));

const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="p-4 text-red-600">
    <h2 className="text-lg font-bold">Something went wrong:</h2>
    <pre className="mt-2">{error.message}</pre>
  </div>
);

const MetricCards = ({
  latestData,
}: {
  latestData: Record<string, number>;
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
      }).format(latestData.total_volume_usd)}
    />
    <MetricCard
      title="Users"
      type="users"
      value={new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(latestData.numberOfNewUsers)}
    />
    <MetricCard
      title="Trades"
      type="trades"
      value={new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(latestData.daily_trades)}
    />
    <MetricCard
      title="Fees"
      type="fees"
      value={new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(latestData.total_fees_usd)}
    />
  </div>
);

const MainContent = (): JSX.Element => {
  // Apply dark theme by default
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark:bg-background");
  }, []);

  // Use React Router's useSearchParams hook instead of directly accessing window.location
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<DailyData[]>([]);
  const [activeView, setActiveView] = useState<"charts" | "data">(
    searchParams.get("view") === "data" ? "data" : "charts"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const protocol = searchParams.get("protocol")?.toLowerCase() || "bullx";
  const [invalidProtocol, setInvalidProtocol] = useState<boolean>(false);

  // Load data for the selected protocol
  const loadData = useCallback(async (selectedProtocol: string) => {
    try {
      setLoading(true);
      setError(null);
      setInvalidProtocol(false);

      // Validate protocol
      const validProtocols = ["bullx", "photon", "trojan", "all"];
      if (!validProtocols.includes(selectedProtocol)) {
        // Instead of throwing an error, set the invalidProtocol flag to true
        setInvalidProtocol(true);
        setLoading(false);
        return; // Exit early
      }

      if (selectedProtocol === "all") {
        // Load data from all protocols
        const protocols: Protocol[] = ["bullx", "photon", "trojan"];
        const allData: Array<DailyData & { protocol: string }> = [];

        for (const protocol of protocols) {
          const response = await fetch(`/data/${protocol}.csv`);
          if (!response.ok) throw new Error(`Failed to fetch ${protocol} data`);

          const csvText = await response.text();
          const result = Papa.parse<DailyData>(csvText, {
            header: true,
            dynamicTyping: true,
            delimiter: ",",
          });

          // Filter out empty rows and rows with missing fields
          const validData = result.data.filter(
            (row) =>
              row &&
              typeof row.total_volume_usd === "number" &&
              typeof row.daily_users === "number" &&
              typeof row.daily_trades === "number" &&
              typeof row.total_fees_usd === "number" &&
              typeof row.numberOfNewUsers === "number" &&
              row.formattedDay
          );

          // Format dates and add protocol identifier
          const formattedData = validData.map((row) => {
            if (!row.formattedDay) return null;
            // Ensure date parts are valid strings
            const dateParts = (row.formattedDay || "").split("/");
            if (dateParts.length !== 3) return null;
            const [day, month, year] = dateParts;
            if (!day || !month || !year) return null;

            const date = new Date(`${year}-${month}-${day}`);
            if (isNaN(date.getTime())) return null;

            // Convert protocol name to proper Protocol type
            let protocolName: Protocol;
            switch (protocol) {
              case "bullx":
                protocolName = "bullx";
                break;
              case "photon":
                protocolName = "photon";
                break;
              case "trojan":
                protocolName = "trojan";
                break;
              default:
                return null; // Skip invalid protocols
            }

            return {
              ...row,
              protocol: protocolName,
              formattedDay: `${String(day).padStart(2, "0")}-${String(
                month
              ).padStart(2, "0")}-${year}`,
              // Add protocol-specific keys for the chart
              [`${protocol}_total_volume_usd`]: row.total_volume_usd,
              [`${protocol}_daily_users`]: row.daily_users,
              [`${protocol}_numberOfNewUsers`]: row.numberOfNewUsers,
              [`${protocol}_daily_trades`]: row.daily_trades,
              [`${protocol}_total_fees_usd`]: row.total_fees_usd,
            };
          });

          // Filter out null values and sort by date
          const sortedData = formattedData
            .filter((d): d is DailyData & { protocol: Protocol } => d !== null)
            .sort((a, b) => {
              const [dayA, monthA, yearA] = a.formattedDay.split("-");
              const [dayB, monthB, yearB] = b.formattedDay.split("-");
              const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
              const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
              return dateA.getTime() - dateB.getTime();
            });

          allData.push(...sortedData);
        }

        if (allData.length === 0) {
          throw new Error("No valid data found");
        }

        // Combine data by date
        const dateMap = new Map<string, DailyData>();

        allData.forEach((item) => {
          if (!dateMap.has(item.formattedDay)) {
            dateMap.set(item.formattedDay, {
              formattedDay: item.formattedDay,
              total_volume_usd: 0,
              daily_users: 0,
              daily_trades: 0,
              total_fees_usd: 0,
              numberOfNewUsers: 0,
              bullx_total_volume_usd: 0,
              bullx_daily_users: 0,
              bullx_daily_trades: 0,
              bullx_total_fees_usd: 0,
              bullx_numberOfNewUsers: 0,
              photon_total_volume_usd: 0,
              photon_daily_users: 0,
              photon_daily_trades: 0,
              photon_total_fees_usd: 0,
              photon_numberOfNewUsers: 0,
              trojan_total_volume_usd: 0,
              trojan_daily_users: 0,
              trojan_daily_trades: 0,
              trojan_total_fees_usd: 0,
              trojan_numberOfNewUsers: 0,
            });
          }

          const dailyData = dateMap.get(item.formattedDay)!;
          const prefix = item.protocol;

          // Update protocol-specific metrics
          dailyData[`${prefix}_total_volume_usd`] = item.total_volume_usd;
          dailyData[`${prefix}_daily_users`] = item.daily_users;
          dailyData[`${prefix}_daily_trades`] = item.daily_trades;
          dailyData[`${prefix}_total_fees_usd`] = item.total_fees_usd;
          dailyData[`${prefix}_numberOfNewUsers`] = item.numberOfNewUsers;

          // Update total metrics
          dailyData.total_volume_usd += item.total_volume_usd;
          dailyData.daily_users += item.daily_users;
          dailyData.daily_trades += item.daily_trades;
          dailyData.total_fees_usd += item.total_fees_usd;
          dailyData.numberOfNewUsers += item.numberOfNewUsers;

          dateMap.set(item.formattedDay, dailyData);
        });

        // Convert Map to array and sort by date
        const sortedData = Array.from(dateMap.values()).sort((a, b) => {
          const [dayA, monthA, yearA] = (a.formattedDay || "").split("-");
          const [dayB, monthB, yearB] = (b.formattedDay || "").split("-");
          if (!dayA || !monthA || !yearA || !dayB || !monthB || !yearB)
            return 0;

          const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
          const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
          return dateA.getTime() - dateB.getTime();
        });

        setData(sortedData);
        setLoading(false);
      } else {
        // Load data for a single protocol
        const response = await fetch(`/data/${selectedProtocol}.csv`);
        if (!response.ok) throw new Error("Failed to fetch data");

        const csvText = await response.text();
        const result = Papa.parse<DailyData>(csvText, {
          header: true,
          dynamicTyping: true,
          delimiter: ",",
        });

        // Filter out empty rows and rows with missing fields and sort by date
        const validData = result.data
          .filter(
            (row) =>
              row &&
              typeof row.total_volume_usd === "number" &&
              typeof row.daily_users === "number" &&
              typeof row.daily_trades === "number" &&
              typeof row.total_fees_usd === "number" &&
              row.formattedDay
          )
          .sort((a, b) => {
            const [dayA, monthA, yearA] = a.formattedDay.split("/");
            const [dayB, monthB, yearB] = b.formattedDay.split("/");
            const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
            const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
            return dateB.getTime() - dateA.getTime();
          });

        if (validData.length === 0) {
          throw new Error("No valid data found");
        }

        // Format dates and sort data by date in descending order
        const sortedData = validData
          .map((row) => {
            if (!row.formattedDay) return null;
            // Ensure date parts are valid strings
            const dateParts = (row.formattedDay || "").split("/");
            if (dateParts.length !== 3) return null;
            const [day, month, year] = dateParts;
            if (!day || !month || !year) return null;

            const date = new Date(`${year}-${month}-${day}`);
            if (isNaN(date.getTime())) return null;

            return {
              ...row,
              formattedDay: `${String(day).padStart(2, "0")}-${String(
                month
              ).padStart(2, "0")}-${year}`,
            };
          })
          .filter((item): item is DailyData => item !== null)
          .sort((a, b) => {
            // Safely parse dates for comparison
            const partsA = (a.formattedDay || "").split("-");
            const partsB = (b.formattedDay || "").split("-");
            if (partsA.length !== 3 || partsB.length !== 3) return 0;

            const [dayA, monthA, yearA] = partsA;
            const [dayB, monthB, yearB] = partsB;
            if (!dayA || !monthA || !yearA || !dayB || !monthB || !yearB)
              return 0;

            const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
            const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
            return dateB.getTime() - dateA.getTime();
          });

        // Filter out null values before setting state
        const validSortedData = sortedData.filter(
          (item): item is DailyData => item !== null
        );
        setData(validSortedData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);
  // Load data when protocol changes
  useEffect(() => {
    loadData(protocol);
  }, [protocol]);

  const latestData = useMemo(
    () =>
      data.reduce(
        (acc, curr) => ({
          total_volume_usd: acc.total_volume_usd + curr.total_volume_usd,
          numberOfNewUsers: acc.numberOfNewUsers + curr.numberOfNewUsers,
          daily_users: acc.daily_users + curr.daily_users,
          daily_trades: acc.daily_trades + curr.daily_trades,
          total_fees_usd: acc.total_fees_usd + curr.total_fees_usd,
        }),
        {
          total_volume_usd: 0,
          numberOfNewUsers: 0,
          daily_users: 0,
          daily_trades: 0,
          total_fees_usd: 0,
        }
      ),
    [data]
  );

  // If the protocol is invalid, redirect to the NotFound page
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

  // Calculate percentage changes comparing current with 30-day average
  const calculatePercentageChange = (
    metric: keyof Omit<DailyData, "formattedDay">
  ): number => {
    if (!data || data.length === 0) return 0;

    // Get the latest value
    const latestValue = data[data.length - 1][metric];

    // Calculate the average of the last 30 days
    const thirtyDayAverage =
      data
        .slice(-30)
        .reduce((acc: number, curr) => acc + (curr[metric] as number), 0) / 30;

    // Calculate the percentage change
    if (thirtyDayAverage === 0) return 0;
    return (
      (((latestValue as number) - thirtyDayAverage) / thirtyDayAverage) * 100
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-8 text-white/90 text-center">
        {protocol === "all"
          ? "Combined Protocols"
          : protocol.charAt(0).toUpperCase() + protocol.slice(1)}{" "}
        Dashboard
      </h1>

      <MetricCards latestData={latestData} />

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
                  "bullx_total_volume_usd",
                  "photon_total_volume_usd",
                  "trojan_total_volume_usd",
                ]}
                labels={["BullX", "Photon", "Trojan"]}
                valueFormatter={(value) => `$${(value / 1e6).toFixed(2)}M`}
              />
              <StackedBarChart
                title="Daily Users by Protocol"
                data={data}
                dataKeys={[
                  "bullx_daily_users",
                  "photon_daily_users",
                  "trojan_daily_users",
                ]}
                labels={["BullX", "Photon", "Trojan"]}
                valueFormatter={(value) => value.toLocaleString()}
              />
              <StackedBarChart
                title="New Users by Protocol"
                data={data}
                dataKeys={[
                  "bullx_numberOfNewUsers",
                  "photon_numberOfNewUsers",
                  "trojan_numberOfNewUsers",
                ]}
                labels={["BullX", "Photon", "Trojan"]}
                valueFormatter={(value) => value.toLocaleString()}
              />
              <StackedBarChart
                title="Daily Trades by Protocol"
                data={data}
                dataKeys={[
                  "bullx_daily_trades",
                  "photon_daily_trades",
                  "trojan_daily_trades",
                ]}
                labels={["BullX", "Photon", "Trojan"]}
                valueFormatter={(value) => value.toLocaleString()}
              />
              <StackedBarChart
                title="Fees by Protocol"
                data={data}
                dataKeys={[
                  "bullx_total_fees_usd",
                  "photon_total_fees_usd",
                  "trojan_total_fees_usd",
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
                    d.total_volume_usd !== undefined &&
                    d.total_fees_usd !== undefined
                )}
                volumeKey="total_volume_usd"
                feesKey="total_fees_usd"
              />
              <CombinedChart
                title="User Activity"
                data={data.filter(
                  (d) =>
                    d.daily_users !== undefined &&
                    d.numberOfNewUsers !== undefined
                )}
                volumeKey="daily_users"
                feesKey="numberOfNewUsers"
                barChartLabel="Daily Active Users"
                lineChartLabel="New Users"
                leftAxisFormatter={(value) => `${value.toFixed(0)}`}
                rightAxisFormatter={(value) => `${value.toFixed(0)}`}
              />
              <TimelineChart
                title="Trades"
                data={data.filter((d) => d.daily_trades !== undefined)}
                dataKey="daily_trades"
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
        <DataTable data={data} />
      )}
    </div>
  );
};

const App = (): JSX.Element => {
  const location = window.location.pathname;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {location === "/reports/daily" ? (
        <DailyReport />
      ) : location === "/reports/monthly" ? (
        <MonthlyReport />
      ) : (
        <MainContent />
      )}
    </ErrorBoundary>
  );
};

export default App;
