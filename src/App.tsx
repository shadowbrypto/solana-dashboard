import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
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
import { MultiAreaChart } from "./components/charts/MultiAreaChart";
import { CategoryStackedBarChartSkeleton, CategoryStackedAreaChartSkeleton, CategoryMultiAreaChartSkeleton } from "./components/charts/CategoryMetricsSkeletons";
import { Protocol } from "./types/protocol";
import { getProtocolStats, getTotalProtocolStats, formatDate, getAggregatedProtocolStats } from "./lib/protocol";
import { HorizontalBarChart } from "./components/charts/HorizontalBarChart";
import { getAllProtocols } from "./lib/protocol-categories";
import { getProtocolName, getAllCategories, getProtocolsByCategory } from "./lib/protocol-config";
import { generateHorizontalBarChartData, generateStackedBarChartConfig, generateStackedAreaChartKeys } from "./lib/chart-helpers";

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
  loading = false,
}: {
  totalMetrics: ProtocolMetrics;
  loading?: boolean;
}) => (
  <div className="mb-6 lg:mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {loading ? (
      <>
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </>
    ) : (
      <>
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
      </>
    )}
  </div>
);

const MainContent = (): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidProtocol, setInvalidProtocol] = useState(false);
  const [totalMetrics, setTotalMetrics] = useState<ProtocolMetrics>({total_volume_usd: 0, daily_users: 0, numberOfNewUsers: 0, daily_trades: 0, total_fees_usd: 0});
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(["categories"]);

  useEffect(() => {
    document.body.classList.add("dark:bg-background");
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
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

      const validProtocols = [...getAllProtocols(), "all"];
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
    const protocol = searchParams.get("protocol")?.toLowerCase() || "trojan";
    loadData(protocol);
  }, [searchParams, loadData]);


  const latestData = useMemo<ProtocolStatsWithDay | undefined>(() => data[data.length - 1], [data]);

  // Get all protocol IDs from centralized config
  const allProtocolIds = useMemo(() => getAllProtocols(), []);

  // Memoize expensive dominance calculations
  const volumeDominanceData = useMemo(() => {
    return data.map(day => {
      // Calculate total volume across all protocols
      const totalVolume = allProtocolIds.reduce((sum, protocolId) => {
        const key = `${protocolId.replace(/\s+/g, '_')}_volume`;
        return sum + (day[key] || 0);
      }, 0);

      // Calculate dominance for each protocol
      const dominanceData: any = { formattedDay: day.formattedDay };
      allProtocolIds.forEach(protocolId => {
        const normalizedId = protocolId.replace(/\s+/g, '_');
        const volumeKey = `${normalizedId}_volume`;
        const dominanceKey = `${normalizedId}_dominance`;
        dominanceData[dominanceKey] = totalVolume > 0 ? (day[volumeKey] || 0) / totalVolume : 0;
      });

      return dominanceData;
    });
  }, [data, allProtocolIds]);

  const usersDominanceData = useMemo(() => {
    return data.map(day => {
      // Calculate total DAU across all protocols
      const totalDAU = allProtocolIds.reduce((sum, protocolId) => {
        const key = `${protocolId.replace(/\s+/g, '_')}_users`;
        return sum + (day[key] || 0);
      }, 0);

      // Calculate dominance for each protocol
      const dominanceData: any = { formattedDay: day.formattedDay };
      allProtocolIds.forEach(protocolId => {
        const normalizedId = protocolId.replace(/\s+/g, '_');
        const usersKey = `${normalizedId}_users`;
        const dominanceKey = `${normalizedId}_dominance`;
        dominanceData[dominanceKey] = totalDAU > 0 ? (day[usersKey] || 0) / totalDAU : 0;
      });

      return dominanceData;
    });
  }, [data, allProtocolIds]);

  const newUsersDominanceData = useMemo(() => {
    return data.map(day => {
      // Calculate total new users across all protocols
      const totalNewUsers = allProtocolIds.reduce((sum, protocolId) => {
        const key = `${protocolId.replace(/\s+/g, '_')}_new_users`;
        return sum + (day[key] || 0);
      }, 0);

      // Calculate dominance for each protocol
      const dominanceData: any = { formattedDay: day.formattedDay };
      allProtocolIds.forEach(protocolId => {
        const normalizedId = protocolId.replace(/\s+/g, '_');
        const newUsersKey = `${normalizedId}_new_users`;
        const dominanceKey = `${normalizedId}_dominance`;
        dominanceData[dominanceKey] = totalNewUsers > 0 ? (day[newUsersKey] || 0) / totalNewUsers : 0;
      });

      return dominanceData;
    });
  }, [data, allProtocolIds]);

  const tradesDominanceData = useMemo(() => {
    return data.map(day => {
      // Calculate total trades across all protocols
      const totalTrades = allProtocolIds.reduce((sum, protocolId) => {
        const key = `${protocolId.replace(/\s+/g, '_')}_trades`;
        return sum + (day[key] || 0);
      }, 0);

      // Calculate dominance for each protocol
      const dominanceData: any = { formattedDay: day.formattedDay };
      allProtocolIds.forEach(protocolId => {
        const normalizedId = protocolId.replace(/\s+/g, '_');
        const tradesKey = `${normalizedId}_trades`;
        const dominanceKey = `${normalizedId}_dominance`;
        dominanceData[dominanceKey] = totalTrades > 0 ? (day[tradesKey] || 0) / totalTrades : 0;
      });

      return dominanceData;
    });
  }, [data, allProtocolIds]);

  const feesDominanceData = useMemo(() => {
    return data.map(day => {
      // Calculate total fees across all protocols
      const totalFees = allProtocolIds.reduce((sum, protocolId) => {
        const key = `${protocolId.replace(/\s+/g, '_')}_fees`;
        return sum + (day[key] || 0);
      }, 0);

      // Calculate dominance for each protocol
      const dominanceData: any = { formattedDay: day.formattedDay };
      allProtocolIds.forEach(protocolId => {
        const normalizedId = protocolId.replace(/\s+/g, '_');
        const feesKey = `${normalizedId}_fees`;
        const dominanceKey = `${normalizedId}_dominance`;
        dominanceData[dominanceKey] = totalFees > 0 ? (day[feesKey] || 0) / totalFees : 0;
      });

      return dominanceData;
    });
  }, [data, allProtocolIds]);

  // Category aggregation for volume
  const categoryVolumeData = useMemo(() => {
    const categories = getAllCategories();
    return data.map(day => {
      const categoryData: any = { formattedDay: day.formattedDay };
      
      categories.forEach(category => {
        const protocolsInCategory = getProtocolsByCategory(category);
        const categoryVolume = protocolsInCategory.reduce((sum, protocol) => {
          const key = `${protocol.id.replace(/\s+/g, '_')}_volume`;
          return sum + (day[key] || 0);
        }, 0);
        categoryData[`${category.replace(/\s+/g, '_')}_volume`] = categoryVolume;
      });
      
      return categoryData;
    });
  }, [data]);

  // Category dominance calculation
  const categoryDominanceData = useMemo(() => {
    const categories = getAllCategories();
    return data.map(day => {
      // Calculate total volume across all categories
      const totalVolume = categories.reduce((sum, category) => {
        const protocolsInCategory = getProtocolsByCategory(category);
        const categoryVolume = protocolsInCategory.reduce((categorySum, protocol) => {
          const key = `${protocol.id.replace(/\s+/g, '_')}_volume`;
          return categorySum + (day[key] || 0);
        }, 0);
        return sum + categoryVolume;
      }, 0);

      // Calculate dominance for each category
      const dominanceData: any = { formattedDay: day.formattedDay };
      categories.forEach(category => {
        const protocolsInCategory = getProtocolsByCategory(category);
        const categoryVolume = protocolsInCategory.reduce((categorySum, protocol) => {
          const key = `${protocol.id.replace(/\s+/g, '_')}_volume`;
          return categorySum + (day[key] || 0);
        }, 0);
        const dominanceKey = `${category.replace(/\s+/g, '_')}_dominance`;
        dominanceData[dominanceKey] = totalVolume > 0 ? categoryVolume / totalVolume : 0;
      });

      return dominanceData;
    });
  }, [data]);

  // Category market share calculation (percentage shares for stacked areas)
  const categoryMarketShareData = useMemo(() => {
    const categories = getAllCategories();
    return data.map(day => {
      // Calculate total volume across ALL protocols (not just categorized ones)
      const totalVolume = allProtocolIds.reduce((sum, protocolId) => {
        const key = `${protocolId.replace(/\s+/g, '_')}_volume`;
        return sum + (day[key] || 0);
      }, 0);

      // Calculate percentage share for each category relative to ALL protocols
      const marketShareData: any = { formattedDay: day.formattedDay };
      categories.forEach(category => {
        const protocolsInCategory = getProtocolsByCategory(category);
        const categoryVolume = protocolsInCategory.reduce((categorySum, protocol) => {
          const key = `${protocol.id.replace(/\s+/g, '_')}_volume`;
          return categorySum + (day[key] || 0);
        }, 0);
        const shareKey = `${category.replace(/\s+/g, '_')}_share`;
        marketShareData[shareKey] = totalVolume > 0 ? (categoryVolume / totalVolume) * 100 : 0;
      });

      return marketShareData;
    });
  }, [data, allProtocolIds]);

  if (invalidProtocol) {
    navigate("/not-found");
    return (
      <div className="flex items-center justify-center min-h-screen">
        Redirecting...
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
    <div className="p-2 sm:p-4 lg:p-6">
      {loading ? (
        <div className="text-2xl sm:text-3xl mb-6 lg:mb-8 text-white/90 text-center">
          <Skeleton className="h-8 sm:h-10 w-40 sm:w-48 mx-auto" />
        </div>
      ) : (
        <h1 className="text-2xl sm:text-3xl mb-6 lg:mb-8 text-white/90 text-center">
          {protocol === "all"
            ? "Overview"
            : getProtocolName(protocol)}{" "}
          Dashboard
        </h1>
      )}

      <MetricCards totalMetrics={totalMetrics} loading={loading} />


        <div className="space-y-4 lg:space-y-6">
          {protocol === "all" ? (
            <>
              <Accordion 
                type="multiple" 
                value={openAccordionItems}
                onValueChange={setOpenAccordionItems}
                className="w-full space-y-3 lg:space-y-4 rounded-xl overflow-hidden"
              >
                {/* Category Metrics */}
                <AccordionItem value="categories" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-2 sm:gap-3 w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>

                      <span className="text-base sm:text-lg font-semibold flex-1 text-left">Category Metrics</span>
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
                  <AccordionContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 pt-2 pb-4 sm:pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("categories") && (
                      <>
                        {loading ? (
                          <CategoryStackedBarChartSkeleton />
                        ) : (
                          <StackedBarChart
                            title="Volume by Category"
                            data={categoryVolumeData}
                            dataKeys={getAllCategories().map(category => `${category.replace(/\s+/g, '_')}_volume`)}
                            labels={getAllCategories()}
                            colors={getAllCategories().map((category, index) => {
                              const categoryColors = [
                                "hsl(210 100% 50%)", // Blue for Trading Terminals
                                "hsl(120 100% 40%)", // Green for Telegram Bots  
                                "hsl(45 100% 50%)"   // Yellow for Mobile Apps
                              ];
                              return categoryColors[index] || `hsl(${index * 120} 70% 50%)`;
                            })}
                            valueFormatter={(value) => `$${(value / 1e6).toFixed(2)}M`}
                            loading={false}
                          />
                        )}
                        {loading ? (
                          <CategoryStackedAreaChartSkeleton />
                        ) : (
                          <StackedAreaChart
                            title="Volume Dominance by Category"
                            data={categoryDominanceData}
                            keys={getAllCategories().map(category => `${category.replace(/\s+/g, '_')}_dominance`)}
                            labels={getAllCategories()}
                            colors={getAllCategories().map((category, index) => {
                              const categoryColors = [
                                "hsl(210 100% 50%)", // Blue for Trading Terminals
                                "hsl(120 100% 40%)", // Green for Telegram Bots  
                                "hsl(45 100% 50%)"   // Yellow for Mobile Apps
                              ];
                              return categoryColors[index] || `hsl(${index * 120} 70% 50%)`;
                            })}
                            loading={false}
                          />
                        )}
                        {loading ? (
                          <CategoryMultiAreaChartSkeleton />
                        ) : (
                          <MultiAreaChart
                            title="Market Share by Category"
                            data={categoryMarketShareData}
                            keys={getAllCategories().map(category => `${category.replace(/\s+/g, '_')}_share`)}
                            labels={getAllCategories()}
                            colors={getAllCategories().map((category, index) => {
                              const categoryColors = [
                                "hsl(210 100% 50%)", // Blue for Trading Terminals
                                "hsl(120 100% 40%)", // Green for Telegram Bots  
                                "hsl(45 100% 50%)"   // Yellow for Mobile Apps
                              ];
                              return categoryColors[index] || `hsl(${index * 120} 70% 50%)`;
                            })}
                            valueFormatter={(value) => `${value.toFixed(1)}%`}
                            loading={false}
                          />
                        )}
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Volume Metrics */}
                <AccordionItem value="volume" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-2 sm:gap-3 w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>

                      <span className="text-base sm:text-lg font-semibold flex-1 text-left">Volume Metrics</span>
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
                  <AccordionContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 pt-2 pb-4 sm:pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("volume") && (
                      <>
                        <HorizontalBarChart
                          title="Total Volume by Protocol"
                          data={allProtocolIds.map(protocolId => ({
                            name: getProtocolName(protocolId),
                            values: data.map(item => ({
                              value: item[`${protocolId.replace(/\s+/g, '_')}_volume`] || 0,
                              date: item.date
                            })),
                            value: data.reduce((sum, item) => sum + (item[`${protocolId.replace(/\s+/g, '_')}_volume`] || 0), 0),
                            color: getProtocolColor(protocolId)
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
                          dataKeys={allProtocolIds.map(id => `${id.replace(/\s+/g, '_')}_volume`)}
                          labels={allProtocolIds.map(id => getProtocolName(id))}
                          colors={allProtocolIds.map(id => getProtocolColor(id))}
                          valueFormatter={(value) => `$${(value / 1e6).toFixed(2)}M`}
                          loading={loading}
                        />
                        <StackedAreaChart
                          title="Volume Dominance by Protocol"
                          data={volumeDominanceData}
                          keys={allProtocolIds.map(id => `${id.replace(/\s+/g, '_')}_dominance`)}
                          colors={allProtocolIds.map(id => getProtocolColor(id))}
                          loading={loading}
                        />
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="users" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-2 sm:gap-3 w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>

                      <span className="text-base sm:text-lg font-semibold flex-1 text-left">DAU Metrics</span>
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
                  <AccordionContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 pt-2 pb-4 sm:pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("users") && (
                      <>
                        <StackedBarChart
                          title="Daily Active Users by Protocol"
                          data={data}
                          dataKeys={generateStackedBarChartConfig('users').dataKeys}
                          labels={generateStackedBarChartConfig('users').labels}
                          colors={protocolColorsList}
                          valueFormatter={(value) => value.toFixed(0)}
                        />
                        <StackedAreaChart
                          title="DAU Dominance by Protocol"
                          data={usersDominanceData}
                          keys={generateStackedAreaChartKeys('dominance')}
                          colors={protocolColorsList}
                          loading={loading}
                        />
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="new_users" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-2 sm:gap-3 w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>

                      <span className="text-base sm:text-lg font-semibold flex-1 text-left">New Users Metrics</span>
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
                  <AccordionContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 pt-2 pb-4 sm:pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("new_users") && (
                      <>
                        <HorizontalBarChart
                          title="Total Users by Protocol"
                          data={generateHorizontalBarChartData(data, 'users')}
                          loading={loading}
                        />
                        <StackedBarChart
                          title="New Users by Protocol"
                          data={data}
                          dataKeys={generateStackedBarChartConfig('new_users').dataKeys}
                          labels={generateStackedBarChartConfig('new_users').labels}
                          colors={protocolColorsList}
                          valueFormatter={(value) => value.toFixed(0)}
                        />
                        <StackedAreaChart
                          title="New Users Dominance by Protocol"
                          data={newUsersDominanceData}
                          keys={generateStackedAreaChartKeys('dominance')}
                          colors={protocolColorsList}
                          loading={loading}
                        />
                      </>
                    )}
                  </AccordionContent>
                                </AccordionItem>

                <AccordionItem value="trades" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-2 sm:gap-3 w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>

                      <span className="text-base sm:text-lg font-semibold flex-1 text-left">Trades Metrics</span>
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
                  <AccordionContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 pt-2 pb-4 sm:pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("trades") && (
                      <>
                        <HorizontalBarChart
                          title="Total Trades by Protocol"
                          data={generateHorizontalBarChartData(data, 'trades')}
                          loading={loading}
                        />
                        <StackedBarChart
                          title="Trades by Protocol"
                          data={data}
                          dataKeys={generateStackedBarChartConfig('trades').dataKeys}
                          labels={generateStackedBarChartConfig('trades').labels}
                          colors={protocolColorsList}
                          valueFormatter={(value) => `${value.toFixed(0)}`}
                          loading={loading}
                        />
                        <StackedAreaChart
                          title="Trades Dominance by Protocol"
                          data={tradesDominanceData}
                          keys={generateStackedAreaChartKeys('dominance')}
                          colors={protocolColorsList}
                          loading={loading}
                        />
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="fees" className="border rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-b from-background to-muted/10 hover:bg-gradient-to-b hover:from-background hover:to-muted/20 data-[state=open]:bg-gradient-to-b data-[state=open]:from-background data-[state=open]:to-muted/30">
                  <AccordionTrigger className="w-full hover:no-underline data-[state=open]:rounded-b-none transition-all duration-200">
                    <div className="flex items-center gap-2 sm:gap-3 w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 hover:bg-muted/50 rounded-xl group">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>

                      <span className="text-base sm:text-lg font-semibold flex-1 text-left">Fee Metrics</span>
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
                  <AccordionContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 pt-2 pb-4 sm:pb-6 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    {openAccordionItems.includes("fees") && (
                      <>
                        <HorizontalBarChart
                          title="Total Fees by Protocol"
                          data={generateHorizontalBarChartData(data, 'fees')}
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
                          dataKeys={generateStackedBarChartConfig('fees').dataKeys}
                          labels={generateStackedBarChartConfig('fees').labels}
                          colors={protocolColorsList}
                          valueFormatter={(value) => `$${(value / 1e6).toFixed(2)}M`}
                          loading={loading}
                        />
                        <StackedAreaChart
                          title="Fee Dominance by Protocol"
                          data={feesDominanceData}
                          keys={generateStackedAreaChartKeys('dominance')}
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
                barChartLabel="Daily Users"
                lineChartLabel="New Users"
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
