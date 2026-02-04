import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfMonth, subMonths, isBefore, endOfMonth, eachDayOfInterval, subDays, addDays, startOfWeek, endOfWeek, addMonths } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Download, Copy, Check, ChevronLeft, ChevronRight, Plus, X, Zap, MessageSquare, Monitor, Smartphone } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '../components/ui/pagination';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, formatCurrency, formatNumber } from '../lib/utils';
import { useToast } from '../hooks/use-toast';
import { Settings } from '../lib/settings';
import { getDailyMetrics } from '../lib/protocol';
import { protocolConfigs, getProtocolById, getProtocolLogoFilename, getProtocolsByCategory } from '../lib/protocol-config';
import { DateRangeSelector } from '../components/ui/DateRangeSelector';
// Distinct colors for comparison chart (max 6 protocols)
const COMPARISON_COLORS = [
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
];

const getComparisonColor = (index: number): string => {
  return COMPARISON_COLORS[index % COMPARISON_COLORS.length];
};
import { ProtocolLogo } from '../components/ui/logo-with-fallback';
// @ts-ignore
import domtoimage from 'dom-to-image';

interface ReportData {
  period: string;
  date: Date;
  totalVolume: number;
  totalDAUs: number;
  newUsers: number;
  totalTrades: number;
}

type ReportType = 'daily' | 'weekly' | 'monthly';

const formatNumberWithSuffix = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
};

const getCategoryBadgeStyle = (category: string): string => {
  switch (category) {
    case 'Telegram Bot':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
    case 'Trading Terminal':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
    case 'Mobile App':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
    case 'EVM':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800';
    default:
      return 'bg-muted text-muted-foreground border-muted';
  }
};

export default function ProtocolComparison() {
  // Core state
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [reportData, setReportData] = useState<Map<string, ReportData[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingProtocols, setLoadingProtocols] = useState<Set<string>>(new Set());
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [dataType, setDataType] = useState<'public' | 'private'>(Settings.getDataTypePreference());
  const { toast } = useToast();

  // Control state
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 6));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(['volume', 'daus', 'users', 'trades']));
  const [activeChartMetric, setActiveChartMetric] = useState<string>('volume');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const periodsPerPage = 50;

  // Get available protocols (exclude 'all')
  const availableProtocols = useMemo(() =>
    protocolConfigs.filter(p => p.id !== 'all' && !selectedProtocols.includes(p.id)),
    [selectedProtocols]
  );

  // Category presets
  const presets = useMemo(() => [
    {
      name: 'Telegram Bots',
      protocols: getProtocolsByCategory('Telegram Bots').map(p => p.id),
      icon: <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
    },
    {
      name: 'Trading Terminals',
      protocols: getProtocolsByCategory('Trading Terminals').map(p => p.id),
      icon: <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />
    },
    {
      name: 'Mobile Apps',
      protocols: getProtocolsByCategory('Mobile Apps').map(p => p.id),
      icon: <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
    }
  ], []);

  // Update date range when report type changes
  useEffect(() => {
    const now = new Date();
    if (reportType === 'daily') {
      setStartDate(subDays(now, 30));
      setEndDate(now);
    } else if (reportType === 'weekly') {
      setStartDate(subMonths(now, 3));
      setEndDate(now);
    } else {
      setStartDate(subMonths(now, 6));
      setEndDate(now);
    }
  }, [reportType]);

  // Update active chart metric when selectedMetrics changes
  useEffect(() => {
    if (!selectedMetrics.has(activeChartMetric) && selectedMetrics.size > 0) {
      setActiveChartMetric(Array.from(selectedMetrics)[0]);
    }
  }, [selectedMetrics, activeChartMetric]);

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProtocols, reportType, startDate, endDate, selectedMetrics]);

  // Listen for data type changes
  useEffect(() => {
    const unsubscribe = Settings.addDataTypeChangeListener((newDataType) => {
      setDataType(newDataType);
    });
    return unsubscribe;
  }, []);

  // Fetch data when protocols or date range changes
  useEffect(() => {
    if (selectedProtocols.length > 0) {
      fetchMultiProtocolData();
    }
  }, [selectedProtocols, reportType, startDate, endDate]);

  const fetchProtocolData = async (protocolId: string): Promise<ReportData[]> => {
    const periods: Date[] = [];
    let current = new Date(startDate);

    if (reportType === 'daily') {
      while (isBefore(current, endDate) || current.getTime() === endDate.getTime()) {
        periods.push(new Date(current));
        current = addDays(current, 1);
      }
    } else if (reportType === 'monthly') {
      while (isBefore(current, endDate) || current.getMonth() === endDate.getMonth()) {
        periods.push(new Date(current));
        current = addMonths(current, 1);
      }
    } else {
      let weekStart = startOfWeek(current);
      while (isBefore(weekStart, endDate)) {
        periods.push(new Date(weekStart));
        weekStart = addDays(weekStart, 7);
      }
    }

    const reportDataPromises = periods.map(async (period) => {
      try {
        let periodStart: Date;
        let periodEnd: Date;
        let periodLabel: string;

        if (reportType === 'daily') {
          periodStart = period;
          periodEnd = period;
          periodLabel = format(period, 'MMM d, yyyy');
        } else if (reportType === 'monthly') {
          periodStart = startOfMonth(period);
          periodEnd = endOfMonth(period);
          periodLabel = format(period, 'MMM yyyy');
        } else {
          periodStart = startOfWeek(period);
          periodEnd = endOfWeek(period);
          const startMonth = format(periodStart, 'MMM');
          const startDay = format(periodStart, 'd');
          const endDay = format(periodEnd, 'd');
          const year = format(periodEnd, 'yyyy');
          periodLabel = `${startMonth} ${startDay}-${endDay}, ${year}`;
        }

        const periodDays = eachDayOfInterval({ start: periodStart, end: periodEnd });
        const dailyMetricsPromises = periodDays.map(day => getDailyMetrics(day));
        const periodDailyData = await Promise.all(dailyMetricsPromises);

        let totalVolume = 0;
        let totalDAUs = 0;
        let totalNewUsers = 0;
        let totalTrades = 0;

        periodDailyData.forEach((dayData: any) => {
          // Data is nested under 'protocols' key
          const protocols = dayData.protocols || dayData;
          const protocolData = protocols[protocolId];
          if (protocolData) {
            // Handle both API response formats
            totalVolume += protocolData.totalVolume || protocolData.total_volume_usd || 0;
            totalDAUs += protocolData.dailyUsers || protocolData.daily_users || 0;
            totalNewUsers += protocolData.newUsers || protocolData.numberOfNewUsers || 0;
            totalTrades += protocolData.trades || protocolData.daily_trades || 0;
          }
        });

        return {
          period: periodLabel,
          date: period,
          totalVolume,
          totalDAUs,
          newUsers: totalNewUsers,
          totalTrades,
        };
      } catch (error) {
        console.error(`Error fetching data for ${protocolId} period:`, error);
        let periodLabel: string;
        if (reportType === 'daily') {
          periodLabel = format(period, 'MMM d, yyyy');
        } else if (reportType === 'monthly') {
          periodLabel = format(period, 'MMM yyyy');
        } else {
          const weekStart = startOfWeek(period);
          const weekEnd = endOfWeek(period);
          periodLabel = `${format(weekStart, 'MMM')} ${format(weekStart, 'd')}-${format(weekEnd, 'd')}, ${format(weekEnd, 'yyyy')}`;
        }

        return {
          period: periodLabel,
          date: period,
          totalVolume: 0,
          totalDAUs: 0,
          newUsers: 0,
          totalTrades: 0,
        };
      }
    });

    const results = await Promise.all(reportDataPromises);
    results.sort((a, b) => a.date.getTime() - b.date.getTime());
    return results;
  };

  const fetchMultiProtocolData = async () => {
    setLoading(true);
    setLoadingProtocols(new Set(selectedProtocols));

    try {
      const promises = selectedProtocols.map(async (protocolId) => {
        const data = await fetchProtocolData(protocolId);
        return { protocolId, data };
      });

      const results = await Promise.all(promises);
      const dataMap = new Map(results.map(r => [r.protocolId, r.data]));
      setReportData(dataMap);
    } catch (error) {
      console.error('Error fetching multi-protocol data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load protocol comparison data",
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setLoadingProtocols(new Set());
    }
  };

  const addProtocol = useCallback((protocolId: string) => {
    if (selectedProtocols.includes(protocolId) || selectedProtocols.length >= 6) return;
    setSelectedProtocols(prev => [...prev, protocolId]);
  }, [selectedProtocols]);

  const removeProtocol = useCallback((protocolId: string) => {
    setSelectedProtocols(prev => prev.filter(p => p !== protocolId));
    setReportData(prev => {
      const next = new Map(prev);
      next.delete(protocolId);
      return next;
    });
    setHiddenProtocols(prev => {
      const next = new Set(prev);
      next.delete(protocolId);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelectedProtocols([]);
    setReportData(new Map());
    setHiddenProtocols(new Set());
    setLoadingProtocols(new Set());
  }, []);

  const loadPreset = useCallback((protocolIds: string[]) => {
    const validProtocols = protocolIds.slice(0, 6).filter(id =>
      protocolConfigs.find(p => p.id === id)
    );
    setSelectedProtocols(validProtocols);
  }, []);

  const toggleProtocolVisibility = (protocolId: string) => {
    setHiddenProtocols(prev => {
      const newSet = new Set(prev);
      if (newSet.has(protocolId)) {
        newSet.delete(protocolId);
      } else {
        newSet.add(protocolId);
      }
      return newSet;
    });
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Prepare chart data - merge by period with protocol-prefixed keys
  const chartData = useMemo(() => {
    const dataMap = new Map<string, any>();

    selectedProtocols
      .filter(p => !hiddenProtocols.has(p))
      .forEach(protocolId => {
        const protocolReportData = reportData.get(protocolId) || [];
        protocolReportData.forEach(item => {
          if (!dataMap.has(item.period)) {
            dataMap.set(item.period, {
              period: item.period,
              date: item.date,
            });
          }
          const existing = dataMap.get(item.period);
          existing[`${protocolId}_volume`] = item.totalVolume;
          existing[`${protocolId}_daus`] = item.totalDAUs;
          existing[`${protocolId}_users`] = item.newUsers;
          existing[`${protocolId}_trades`] = item.totalTrades;
        });
      });

    return Array.from(dataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reportData, selectedProtocols, hiddenProtocols]);

  // Get all unique periods for the table
  const allPeriods = useMemo(() => {
    const periodsSet = new Set<string>();
    reportData.forEach((data) => {
      data.forEach(item => periodsSet.add(item.period));
    });

    // Sort periods by date
    const periodsWithDates = Array.from(periodsSet).map(period => {
      const data = Array.from(reportData.values()).flat().find(d => d.period === period);
      return { period, date: data?.date || new Date() };
    });

    return periodsWithDates
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(p => p.period);
  }, [reportData]);

  // Paginate periods
  const paginatedPeriods = useMemo(() => {
    const startIndex = (currentPage - 1) * periodsPerPage;
    return allPeriods.slice(startIndex, startIndex + periodsPerPage);
  }, [allPeriods, currentPage]);

  const totalPages = Math.ceil(allPeriods.length / periodsPerPage);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2 text-foreground text-sm">{label}</p>
          <div className="space-y-1">
            {payload
              .sort((a: any, b: any) => b.value - a.value)
              .map((entry: any, index: number) => {
                const protocolId = entry.dataKey.split('_')[0];
                const protocol = getProtocolById(protocolId);
                const colorIndex = selectedProtocols.indexOf(protocolId);
                const color = getComparisonColor(colorIndex);

                return (
                  <div key={index} className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-muted-foreground">{protocol?.name || protocolId}:</span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {activeChartMetric === 'volume' ? formatCurrency(entry.value) : formatNumberWithSuffix(entry.value)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend with toggle
  const CustomLegend = () => {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2 px-4">
        {selectedProtocols.map((protocolId, index) => {
          const protocol = getProtocolById(protocolId);
          const isHidden = hiddenProtocols.has(protocolId);
          const color = getComparisonColor(index);

          return (
            <div
              key={protocolId}
              className={`flex items-center gap-1.5 cursor-pointer transition-all hover:opacity-80 ${
                isHidden ? 'opacity-40' : 'opacity-100'
              }`}
              onClick={() => toggleProtocolVisibility(protocolId)}
              title={isHidden ? `Show ${protocol?.name}` : `Hide ${protocol?.name}`}
            >
              <div
                className={`w-3 h-3 rounded-full ${isHidden ? 'ring-1 ring-muted-foreground/30' : ''}`}
                style={{
                  backgroundColor: isHidden ? 'transparent' : color,
                  border: isHidden ? `2px solid ${color}` : 'none'
                }}
              />
              <span className={`text-sm ${isHidden ? 'text-muted-foreground line-through' : 'text-muted-foreground'}`}>
                {protocol?.name || protocolId}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const downloadReport = async () => {
    const reportElement = document.querySelector('[data-table="protocol-comparison"]') as HTMLElement;

    if (reportElement) {
      try {
        const scale = 2;

        const dataUrl = await Promise.race([
          domtoimage.toPng(reportElement, {
            quality: 1,
            bgcolor: '#ffffff',
            cacheBust: true,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: reportElement.offsetWidth + 'px',
              height: reportElement.offsetHeight + 'px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            },
            width: reportElement.offsetWidth * scale,
            height: reportElement.offsetHeight * scale,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 20000)
          )
        ]) as string;

        const link = document.createElement('a');
        const protocolNames = selectedProtocols.map(p => getProtocolById(p)?.name || p).join(' vs ');
        link.download = `Protocol Comparison - ${protocolNames}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading report:', error);
        toast({
          title: "Download failed",
          description: "Failed to download report",
          duration: 3000,
        });
      }
    }
  };

  const copyToClipboard = async () => {
    const reportElement = document.querySelector('[data-table="protocol-comparison"]') as HTMLElement;

    if (reportElement) {
      try {
        const scale = 2;

        const dataUrl = await Promise.race([
          domtoimage.toPng(reportElement, {
            quality: 1,
            bgcolor: '#ffffff',
            cacheBust: true,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: reportElement.offsetWidth + 'px',
              height: reportElement.offsetHeight + 'px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            },
            width: reportElement.offsetWidth * scale,
            height: reportElement.offsetHeight * scale,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 20000)
          )
        ]) as string;

        const response = await fetch(dataUrl);
        const blob = await response.blob();

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);

        toast({
          title: "Copied to clipboard",
          description: "Protocol comparison copied successfully",
          duration: 2000,
        });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Copy failed",
          description: "Failed to copy report to clipboard",
          duration: 3000,
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Protocol Comparison</h1>
          <p className="text-muted-foreground mt-1">
            Compare multiple protocols side-by-side with overlaid charts and merged tables
          </p>
        </div>
      </div>

      {/* Protocol Selection Card */}
      <Card className="p-6 ">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Select value="" onValueChange={addProtocol}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-sm">Add protocol to compare</span>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {availableProtocols.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {selectedProtocols.length >= 6
                      ? "Maximum 6 protocols can be compared"
                      : "No protocols available"
                    }
                  </div>
                ) : (
                  availableProtocols.map(protocol => (
                    <SelectItem key={protocol.id} value={protocol.id} className="relative pr-28">
                      <div className="flex items-center gap-2">
                        <ProtocolLogo
                          src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                          alt={protocol.name}
                        />
                        <span>{protocol.name}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${getCategoryBadgeStyle(protocol.category)}`}
                      >
                        {protocol.category}
                      </Badge>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between sm:justify-start gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedProtocols.length}</span> / 6 selected
              </div>
              {selectedProtocols.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll} className="text-xs">
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          {selectedProtocols.length === 0 && (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Quick Comparisons</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {presets.map((preset) => (
                    <Card
                      key={preset.name}
                      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group "
                      onClick={() => loadPreset(preset.protocols)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-muted group-hover:bg-primary/10 transition-colors">
                            {preset.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-sm font-medium leading-none">{preset.name}</h4>
                          </div>
                          <div className="flex -space-x-1">
                            {preset.protocols.slice(0, 3).map((protocolId, index) => (
                              <div key={protocolId} style={{ zIndex: preset.protocols.length - index }}>
                                <ProtocolLogo
                                  src={`/assets/logos/${getProtocolLogoFilename(protocolId)}`}
                                  alt={getProtocolById(protocolId)?.name || protocolId}
                                  size="md"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Protocols */}
          {selectedProtocols.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Selected Protocols</h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  {selectedProtocols.length} selected
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {selectedProtocols.map(protocolId => {
                  const protocol = getProtocolById(protocolId);
                  const isLoading = loadingProtocols.has(protocolId);

                  return (
                    <Card key={protocolId} className="group ">
                      <CardContent className="p-2 sm:p-3">
                        <div className="flex items-center gap-2">
                          <ProtocolLogo
                            src={`/assets/logos/${getProtocolLogoFilename(protocolId)}`}
                            alt={protocol?.name || protocolId}
                          />
                          <span className="text-xs sm:text-sm font-medium flex-1 truncate">
                            {protocol?.name || protocolId}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProtocol(protocolId)}
                            className="h-5 w-5 -mr-1 flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {isLoading && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-2 w-2 border border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] text-muted-foreground">Loading...</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Controls Section */}
      {selectedProtocols.length > 0 && (
        <Card className="p-6 ">
          <div className="space-y-6">
            {/* Report Type and Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Report Type Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Report Type</label>
                <div className="flex bg-muted p-1 rounded-lg h-10">
                  <button
                    onClick={() => setReportType('daily')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      reportType === 'daily'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setReportType('weekly')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      reportType === 'weekly'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setReportType('monthly')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      reportType === 'monthly'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Metrics Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Metrics</label>
                <div className="flex flex-row gap-4 items-center h-10">
                  {['volume', 'daus', 'users', 'trades'].map((metric) => (
                    <button
                      key={metric}
                      className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                      onClick={() => {
                        setSelectedMetrics(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(metric)) {
                            newSet.delete(metric);
                          } else {
                            newSet.add(metric);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${
                        selectedMetrics.has(metric) ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {selectedMetrics.has(metric) && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span>{metric === 'volume' ? 'Volume' : metric === 'daus' ? 'DAUs' : metric === 'users' ? 'New Users' : 'Trades'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <DateRangeSelector
                startDate={startDate}
                endDate={endDate}
                onRangeChange={handleDateRangeChange}
                minDate={new Date('2024-01-01')}
                maxDate={new Date()}
                className="h-40"
                sensitivity={reportType === 'daily' ? 'day' : reportType === 'weekly' ? 'week' : 'month'}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Chart Section */}
      {selectedProtocols.length > 0 && (
        <Card className="w-full  border-border rounded-xl">
          <CardHeader className="border-b p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium text-card-foreground">
                  {reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : 'Monthly'} {
                    activeChartMetric === 'volume' ? 'Volume' : activeChartMetric === 'daus' ? 'DAUs' : activeChartMetric === 'users' ? 'New Users' : 'Trades'
                  } Comparison
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedProtocols.length} protocols compared
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-medium px-3 py-1 bg-muted/50 text-muted-foreground border-border/50">
                {chartData.length > 0 ? `${chartData[0]?.period} - ${chartData[chartData.length - 1]?.period}` : 'No data'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-6 px-6">
            {/* Chart Metric Tabs */}
            {selectedMetrics.size > 1 && !loading && chartData.length > 0 && (
              <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg w-fit">
                {['volume', 'daus', 'users', 'trades'].filter(metric => selectedMetrics.has(metric)).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setActiveChartMetric(metric)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      activeChartMetric === metric
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {metric === 'volume' ? 'Volume' : metric === 'daus' ? 'DAUs' : metric === 'users' ? 'New Users' : 'Trades'}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                  <span className="text-muted-foreground">Loading comparison data...</span>
                </div>
              </div>
            ) : chartData.length > 0 && selectedMetrics.size > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.2}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="period"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      interval={Math.max(Math.ceil(chartData.length / 10) - 1, 0)}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (activeChartMetric === 'volume') {
                          if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
                          if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
                          if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
                          return `$${value}`;
                        }
                        return formatNumberWithSuffix(value);
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    {selectedProtocols
                      .filter(p => !hiddenProtocols.has(p))
                      .map((protocolId) => {
                        const colorIndex = selectedProtocols.indexOf(protocolId);
                        const color = getComparisonColor(colorIndex);
                        return (
                          <Area
                            key={protocolId}
                            type="monotone"
                            dataKey={`${protocolId}_${activeChartMetric}`}
                            stroke={color}
                            strokeWidth={2.5}
                            fill={color}
                            fillOpacity={0.1}
                            dot={{ fill: color, strokeWidth: 0, r: 3 }}
                            activeDot={{
                              r: 6,
                              stroke: color,
                              strokeWidth: 2,
                              fill: "hsl(var(--background))"
                            }}
                          />
                        );
                      })}
                  </AreaChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>{selectedMetrics.size === 0 ? 'Please select at least one metric to display' : 'No data available'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table Section */}
      {selectedProtocols.length > 0 && (
        <Card data-table="protocol-comparison" className="mx-auto p-0 ">
          <CardHeader className="pb-4 px-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-semibold">
                  {reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : 'Monthly'} Comparison
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedProtocols.length} protocols · {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
                </p>
              </div>
              {/* Metric Tabs for Table */}
              {selectedMetrics.size > 1 && (
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  {['volume', 'daus', 'users', 'trades'].filter(metric => selectedMetrics.has(metric)).map((metric) => (
                    <button
                      key={metric}
                      onClick={() => setActiveChartMetric(metric)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeChartMetric === metric
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {metric === 'volume' ? 'Volume' : metric === 'daus' ? 'DAUs' : metric === 'users' ? 'New Users' : 'Trades'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                  <span className="text-muted-foreground">Loading comparison data...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground sticky left-0 bg-white dark:bg-zinc-950 z-10" style={{ width: `${100 / (selectedProtocols.length + 1)}%` }}>
                          {reportType === 'daily' ? 'Day' : reportType === 'weekly' ? 'Week' : 'Month'}
                        </TableHead>
                        {selectedProtocols.map((protocolId) => {
                          const protocol = getProtocolById(protocolId);
                          return (
                            <TableHead key={protocolId} className="h-12 px-3 text-center align-middle font-medium text-muted-foreground" style={{ width: `${100 / (selectedProtocols.length + 1)}%` }}>
                              <div className="flex items-center justify-center gap-1.5">
                                <ProtocolLogo
                                  src={`/assets/logos/${getProtocolLogoFilename(protocolId)}`}
                                  alt={protocol?.name || protocolId}
                                  size="sm"
                                />
                                <span className="text-xs">{protocol?.name || protocolId}</span>
                              </div>
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPeriods.length > 0 ? (
                        paginatedPeriods.map((period) => (
                          <TableRow key={period} className="hover:bg-muted/30 h-10">
                            <TableCell className="font-medium text-sm py-2 px-3 whitespace-nowrap sticky left-0 bg-white dark:bg-zinc-950 z-10">
                              {period}
                            </TableCell>
                            {selectedProtocols.map((protocolId) => {
                              const protocolReportData = reportData.get(protocolId) || [];
                              const periodData = protocolReportData.find(d => d.period === period);

                              // Get the active metric value
                              let value = 0;
                              if (activeChartMetric === 'volume') {
                                value = periodData?.totalVolume || 0;
                              } else if (activeChartMetric === 'daus') {
                                value = periodData?.totalDAUs || 0;
                              } else if (activeChartMetric === 'users') {
                                value = periodData?.newUsers || 0;
                              } else if (activeChartMetric === 'trades') {
                                value = periodData?.totalTrades || 0;
                              }

                              // Calculate heatmap intensity for this column
                              const allValuesForProtocol = (reportData.get(protocolId) || []).map(d => {
                                if (activeChartMetric === 'volume') return d.totalVolume;
                                if (activeChartMetric === 'daus') return d.totalDAUs;
                                if (activeChartMetric === 'users') return d.newUsers;
                                return d.totalTrades;
                              });
                              const minVal = Math.min(...allValuesForProtocol);
                              const maxVal = Math.max(...allValuesForProtocol);
                              const range = maxVal - minVal;
                              const intensity = range > 0 ? (value - minVal) / range : 0;

                              // Green heatmap: higher values = more green
                              const heatmapStyle = {
                                backgroundColor: `rgba(34, 197, 94, ${intensity * 0.4})`,
                              };

                              return (
                                <TableCell key={protocolId} className="text-center py-2 px-3" style={heatmapStyle}>
                                  <span className="font-semibold text-sm">
                                    {activeChartMetric === 'volume' ? formatCurrency(value) : formatNumber(value)}
                                  </span>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="h-16">
                          <TableCell colSpan={1 + selectedProtocols.length} className="text-center py-6 text-muted-foreground text-sm">
                            {selectedMetrics.size === 0
                              ? 'Please select at least one metric to display'
                              : 'No data available'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      Showing {((currentPage - 1) * periodsPerPage) + 1} to {Math.min(currentPage * periodsPerPage, allPeriods.length)} of {allPeriods.length} periods
                    </div>
                    <div className="ml-auto">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </PaginationLink>
                          </PaginationItem>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                            if (
                              pageNum === 1 ||
                              pageNum === totalPages ||
                              (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(pageNum)}
                                    isActive={currentPage === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }

                            if (
                              (pageNum === 2 && currentPage > 4) ||
                              (pageNum === totalPages - 1 && currentPage < totalPages - 3)
                            ) {
                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }

                            return null;
                          })}

                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </PaginationLink>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {selectedProtocols.length > 0 && !loading && (
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>
      )}

      {/* Empty State */}
      {selectedProtocols.length === 0 && (
        <Card className="border-dashed ">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No protocols selected</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Select protocols from the dropdown above or use a quick preset to start comparing.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
