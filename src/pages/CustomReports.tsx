import React, { useState, useEffect } from 'react';
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
import { Progress } from '../components/ui/progress';
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
import * as SelectPrimitive from "@radix-ui/react-select";
import { Download, Copy, Eye, EyeOff, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from '../lib/utils';
import { protocolApi } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { Settings } from '../lib/settings';
import { getDailyMetrics } from '../lib/protocol';
import { protocolConfigs, getProtocolById, getProtocolLogoFilename, getAllCategories } from '../lib/protocol-config';
import { DateRangeSelector } from '../components/ui/DateRangeSelector';
import { getProtocolColor } from '../lib/colors';
import { MetricCard } from '../components/MetricCard';
import { MetricCardSkeleton } from '../components/MetricCardSkeleton';
// @ts-ignore
import domtoimage from 'dom-to-image';

interface ReportData {
  period: string; // e.g., "Jan 2024" for monthly, "Week of Jan 1, 2024" for weekly
  date: Date; // The actual date for sorting/filtering
  totalVolume: number;
  totalDAUs: number;
  newUsers: number;
  totalTrades: number;
  cumulativeVolume: number;
}

type ReportType = 'daily' | 'weekly' | 'monthly';
type TabType = 'protocol-reports' | 'trader-stats';

// Extend Window interface for protocol stats
declare global {
  interface Window {
    protocolStats?: {
      top1PercentShare: number;
      top5PercentShare: number;
      top1PercentVolume: number;
      top5PercentVolume: number;
      percentile99Volume: number;
      percentile95Volume: number;
    };
  }
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number): string => {
  if (value >= 10000) {
    return value.toLocaleString();
  }
  return value.toString();
};

const formatGrowthPercentage = (growth: number): string => {
  const percentage = growth * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};

const getGrowthBadgeClasses = (growth: number): string => {
  if (growth >= 0) return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
};

const formatNumberWithSuffix = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
};

// Custom SelectItem without checkmark
const CustomSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
CustomSelectItem.displayName = "CustomSelectItem";

const getCategoryBadgeStyle = (category: string): string => {
  switch (category) {
    case 'Telegram Bots':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
    case 'Trading Terminals':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
    case 'Mobile Apps':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
    case 'EVM':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800';
    default:
      return 'bg-muted text-muted-foreground border-muted';
  }
};

export default function CustomReports() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('protocol-reports');
  
  // Core state
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataType, setDataType] = useState<'public' | 'private'>(Settings.getDataTypePreference());
  const [hiddenPeriods, setHiddenPeriods] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Control state
  const [selectedProtocol, setSelectedProtocol] = useState<string>('trojan');
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 6)); // Default to 6 months ago
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(['volume', 'daus', 'users', 'trades']));
  const [activeChartMetric, setActiveChartMetric] = useState<string>('volume');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 10;

  // Update date range when report type changes
  useEffect(() => {
    const now = new Date();
    if (reportType === 'daily') {
      // For daily reports, default to last 30 days
      setStartDate(subDays(now, 30));
      setEndDate(now);
    } else if (reportType === 'weekly') {
      // For weekly reports, default to last 12 weeks (3 months)
      setStartDate(subMonths(now, 3));
      setEndDate(now);
    } else {
      // For monthly reports, default to last 6 months
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
  }, [selectedProtocol, reportType, startDate, endDate, selectedMetrics]);


  // Get available protocols
  const availableProtocols = protocolConfigs
    .map(config => config.id)
    .filter(protocol => protocol !== 'all'); // Exclude 'all' option for detailed reports

  // Prepare chart data from report data
  const chartData = reportData
    .filter(data => !hiddenPeriods.has(data.period))
    .map(data => ({
      period: data.period,
      volume: data.totalVolume,
      daus: data.totalDAUs,
      users: data.newUsers,
      trades: data.totalTrades,
      formattedVolume: formatCurrency(data.totalVolume)
    }));

  useEffect(() => {
    fetchReportData();
  }, [selectedProtocol, reportType, startDate, endDate, selectedMetrics]);

  useEffect(() => {
    const unsubscribe = Settings.addDataTypeChangeListener((newDataType) => {
      setDataType(newDataType);
      fetchReportData(); // Refetch data when data type changes
    });
    return unsubscribe;
  }, [selectedProtocol, reportType, startDate, endDate, selectedMetrics]);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching ${reportType} data for ${selectedProtocol} from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
      
      // Generate periods based on report type
      const periods: Date[] = [];
      let current = new Date(startDate);
      
      if (reportType === 'daily') {
        // Generate days
        while (isBefore(current, endDate) || current.getTime() === endDate.getTime()) {
          periods.push(new Date(current));
          current = addDays(current, 1);
        }
      } else if (reportType === 'monthly') {
        // Generate months
        while (isBefore(current, endDate) || current.getMonth() === endDate.getMonth()) {
          periods.push(new Date(current));
          current = addMonths(current, 1);
        }
      } else {
        // Generate weeks
        let weekStart = startOfWeek(current);
        while (isBefore(weekStart, endDate)) {
          periods.push(new Date(weekStart));
          weekStart = addDays(weekStart, 7);
        }
      }
      
      console.log(`Generated ${periods.length} periods`);
      
      // Fetch data for each period
      const reportDataPromises = periods.map(async (period, index) => {
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
            // Format as "May 1-8, 2025"
            const startMonth = format(periodStart, 'MMM');
            const startDay = format(periodStart, 'd');
            const endDay = format(periodEnd, 'd');
            const year = format(periodEnd, 'yyyy');
            periodLabel = `${startMonth} ${startDay}-${endDay}, ${year}`;
          }
          
          console.log(`Fetching ${selectedProtocol} data for ${periodLabel}: ${format(periodStart, 'yyyy-MM-dd')} to ${format(periodEnd, 'yyyy-MM-dd')}`);
          
          // Use the same approach as existing tables - get daily metrics for each day
          const periodDays = eachDayOfInterval({ start: periodStart, end: periodEnd });
          const dailyMetricsPromises = periodDays.map(day => getDailyMetrics(day));
          const periodDailyData = await Promise.all(dailyMetricsPromises);
          
          // Aggregate data for the selected protocol
          let totalVolume = 0;
          let totalDAUs = 0;
          let totalNewUsers = 0;
          let totalTrades = 0;
          
          periodDailyData.forEach(dayData => {
            const protocolData = dayData[selectedProtocol];
            if (protocolData) {
              totalVolume += protocolData.total_volume_usd || 0;
              totalDAUs += protocolData.daily_users || 0;
              totalNewUsers += protocolData.numberOfNewUsers || 0;
              totalTrades += protocolData.daily_trades || 0;
            }
          });
          
          console.log(`${periodLabel} - Volume: $${totalVolume}, DAUs: ${totalDAUs}, New Users: ${totalNewUsers}, Trades: ${totalTrades}`);
          
          return {
            period: periodLabel,
            date: period,
            totalVolume,
            totalDAUs,
            newUsers: totalNewUsers,
            totalTrades,
            cumulativeVolume: 0 // Will be calculated after all data is fetched
          };
        } catch (error) {
          console.error(`Error fetching data for period:`, error);
          let periodLabel: string;
          if (reportType === 'daily') {
            periodLabel = format(period, 'MMM d, yyyy');
          } else if (reportType === 'monthly') {
            periodLabel = format(period, 'MMM yyyy');
          } else {
            const weekStart = startOfWeek(period);
            const weekEnd = endOfWeek(period);
            const startMonth = format(weekStart, 'MMM');
            const startDay = format(weekStart, 'd');
            const endDay = format(weekEnd, 'd');
            const year = format(weekEnd, 'yyyy');
            periodLabel = `${startMonth} ${startDay}-${endDay}, ${year}`;
          }
          
          return {
            period: periodLabel,
            date: period,
            totalVolume: 0,
            totalDAUs: 0,
            newUsers: 0,
            totalTrades: 0,
            cumulativeVolume: 0
          };
        }
      });
      
      const results = await Promise.all(reportDataPromises);
      
      // Calculate actual lifetime cumulative volumes for each period
      const resultsWithCumulative = await Promise.all(results.map(async (data) => {
        try {
          // For weekly/monthly reports, use the end date of the period for cumulative calculation
          let cumulativeEndDate = data.date;
          if (reportType === 'weekly') {
            cumulativeEndDate = endOfWeek(data.date);
          } else if (reportType === 'monthly') {
            cumulativeEndDate = endOfMonth(data.date);
          }
          
          // Use API to get cumulative volume from inception to this date
          const cumulativeResponse = await protocolApi.getCumulativeVolume(selectedProtocol, cumulativeEndDate, dataType);
          
          return {
            ...data,
            cumulativeVolume: cumulativeResponse || 0
          };
        } catch (error) {
          console.error(`Error calculating cumulative volume for ${data.period}:`, error);
          // Fallback to simple cumulative calculation within visible range
          return {
            ...data,
            cumulativeVolume: data.totalVolume
          };
        }
      }));
      
      // Sort by date (chronological order)
      resultsWithCumulative.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      setReportData(resultsWithCumulative);
      console.log(`Loaded ${reportType} data:`, resultsWithCumulative);
    } catch (error) {
      console.error(`Error fetching ${reportType} data:`, error);
      setError(`Failed to load ${reportType} data for ${selectedProtocol}`);
    } finally {
      setLoading(false);
    }
  };

  const togglePeriodVisibility = (period: string) => {
    setHiddenPeriods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(period)) {
        newSet.delete(period);
      } else {
        newSet.add(period);
      }
      return newSet;
    });
  };

  const showAllPeriods = () => {
    setHiddenPeriods(new Set());
  };

  const hideAllPeriods = () => {
    const allPeriods = new Set(reportData.map(data => data.period));
    setHiddenPeriods(allPeriods);
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };


  const downloadReport = async () => {
    const reportElement = document.querySelector('[data-table="custom-report"]') as HTMLElement;
    
    if (reportElement) {
      const rect = reportElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
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
              padding: '0px',
              margin: '0px',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              overflow: 'visible'
            },
            width: reportElement.offsetWidth * scale,
            height: reportElement.offsetHeight * scale,
            filter: (node: any) => {
              // Exclude any elements with no-screenshot class
              if (node.classList?.contains('no-screenshot')) {
                return false;
              }
              return true;
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 20 seconds')), 20000)
          )
        ]) as string;
        
        const link = document.createElement('a');
        link.download = `${getProtocolById(selectedProtocol)?.name || selectedProtocol} ${reportType === 'weekly' ? 'Weekly' : 'Monthly'} Report.png`;
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
    const reportElement = document.querySelector('[data-table="custom-report"]') as HTMLElement;
    
    if (reportElement) {
      const rect = reportElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
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
              padding: '0px',
              margin: '0px',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              overflow: 'visible'
            },
            width: reportElement.offsetWidth * scale,
            height: reportElement.offsetHeight * scale,
            filter: (node: any) => {
              // Exclude any elements with no-screenshot class
              if (node.classList?.contains('no-screenshot')) {
                return false;
              }
              return true;
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 20 seconds')), 20000)
          )
        ]) as string;
        
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            toast({
              title: "Copied to clipboard",
              description: "Trojan monthly report copied successfully",
              duration: 2000,
            });
          } catch (clipboardError) {
            console.error('Clipboard API failed:', clipboardError);
            // Fallback: try to create a temporary link for manual download
            const link = document.createElement('a');
            link.download = `Trojan Monthly Report - Copy - ${format(new Date(), 'dd.MM.yyyy')}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast({
              title: "Downloaded instead",
              description: "Clipboard failed, report downloaded instead",
              duration: 3000,
            });
          }
        }
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
          <h1 className="text-3xl font-bold tracking-tight">Custom Reports</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive analytics for trading protocols with flexible reporting options
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('protocol-reports')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === 'protocol-reports'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            )}
          >
            Protocol Reports
          </button>
          <button
            onClick={() => setActiveTab('trader-stats')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === 'trader-stats'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            )}
          >
            Trader Stats
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'protocol-reports' ? (
        <>
          {/* Controls Section */}
          <Card className="p-6 overflow-hidden">
        <div className="space-y-6">
          {/* Top Row - Protocol, Report Type, and Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Protocol Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Protocol</label>
              <div className="relative">
                <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select a protocol">
                      {selectedProtocol && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                            <img 
                              src={`/assets/logos/${getProtocolLogoFilename(selectedProtocol)}`}
                              alt={getProtocolById(selectedProtocol)?.name || selectedProtocol} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                          <span>{getProtocolById(selectedProtocol)?.name || selectedProtocol}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto overflow-x-hidden">
                  {getAllCategories().map((category) => {
                    const protocolsInCategory = availableProtocols.filter(protocol => {
                      const config = getProtocolById(protocol);
                      return config?.category === category;
                    });

                    if (protocolsInCategory.length === 0) return null;

                    return (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                          {category}
                        </SelectLabel>
                        {protocolsInCategory.map((protocol) => {
                          const config = getProtocolById(protocol);
                          
                          return (
                            <CustomSelectItem 
                              key={protocol} 
                              value={protocol} 
                              className="px-6 py-2 relative"
                            >
                              <div className="flex items-center gap-2 pr-20">
                                <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                                  <img 
                                    src={`/assets/logos/${getProtocolLogoFilename(protocol)}`}
                                    alt={config?.name || protocol} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </div>
                                <span className="truncate">{config?.name || protocol}</span>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0 ${getCategoryBadgeStyle(config?.category || '')}`}
                              >
                                {config?.category}
                              </Badge>
                            </CustomSelectItem>
                          );
                        })}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
                </Select>
              </div>
            </div>

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
                <button
                  className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                  onClick={() => {
                    setSelectedMetrics(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('volume')) {
                        newSet.delete('volume');
                      } else {
                        newSet.add('volume');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${
                    selectedMetrics.has('volume') ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {selectedMetrics.has('volume') && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span>Volume</span>
                </button>
                <button
                  className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                  onClick={() => {
                    setSelectedMetrics(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('daus')) {
                        newSet.delete('daus');
                      } else {
                        newSet.add('daus');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${
                    selectedMetrics.has('daus') ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {selectedMetrics.has('daus') && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span>DAUs</span>
                </button>
                <button
                  className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                  onClick={() => {
                    setSelectedMetrics(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('users')) {
                        newSet.delete('users');
                      } else {
                        newSet.add('users');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${
                    selectedMetrics.has('users') ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {selectedMetrics.has('users') && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span>New Users</span>
                </button>
                <button
                  className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                  onClick={() => {
                    setSelectedMetrics(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('trades')) {
                        newSet.delete('trades');
                      } else {
                        newSet.add('trades');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${
                    selectedMetrics.has('trades') ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {selectedMetrics.has('trades') && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span>Trades</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row - Date Range */}
          <div>
            <DateRangeSelector
              startDate={startDate}
              endDate={endDate}
              onRangeChange={handleDateRangeChange}
              minDate={new Date('2024-01-01')} // Set minimum to when data is available
              maxDate={new Date()}
              className="h-40"
              sensitivity={reportType === 'daily' ? 'day' : reportType === 'weekly' ? 'week' : 'month'}
            />
          </div>
        </div>
      </Card>

      {/* Chart Section */}
      <Card className="w-full mb-6 bg-card border-border rounded-xl">
        <CardHeader className="border-b p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">
                {reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : 'Monthly'} {
                  selectedMetrics.size === 0 ? 'Chart' :
                  `${activeChartMetric === 'volume' ? 'Volume' : activeChartMetric === 'daus' ? 'DAUs' : activeChartMetric === 'users' ? 'New Users' : 'Trades'} Chart`
                }
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-muted/10 rounded-md overflow-hidden ring-1 ring-border/20">
                  <img 
                    src={`/assets/logos/${getProtocolLogoFilename(selectedProtocol)}`}
                    alt={getProtocolById(selectedProtocol)?.name || selectedProtocol} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {getProtocolById(selectedProtocol)?.name || selectedProtocol}
                </span>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-xs font-medium px-3 py-1 bg-muted/50 text-muted-foreground border-border/50">
                {(() => {
                  const visiblePeriods = reportData.filter(data => !hiddenPeriods.has(data.period));
                  if (visiblePeriods.length === 0) return "No data";
                  if (visiblePeriods.length === 1) return visiblePeriods[0].period;
                  
                  // Sort visible periods chronologically to get proper range
                  const sortedPeriods = visiblePeriods.sort((a, b) => a.date.getTime() - b.date.getTime());
                  
                  if (reportType === 'daily' || reportType === 'weekly') {
                    // For daily and weekly reports, show start and end dates
                    const firstDate = sortedPeriods[0].date;
                    const lastDate = sortedPeriods[sortedPeriods.length - 1].date;
                    
                    if (reportType === 'daily') {
                      return `${format(firstDate, 'MMM d, yyyy')} - ${format(lastDate, 'MMM d, yyyy')}`;
                    } else {
                      const startOfFirstWeek = startOfWeek(firstDate);
                      const endOfLastWeek = endOfWeek(lastDate);
                      return `${format(startOfFirstWeek, 'MMM d, yyyy')} - ${format(endOfLastWeek, 'MMM d, yyyy')}`;
                    }
                  } else {
                    // For monthly reports, show period ranges
                    const firstPeriod = sortedPeriods[0].period;
                    const lastPeriod = sortedPeriods[sortedPeriods.length - 1].period;
                    return `${firstPeriod} - ${lastPeriod}`;
                  }
                })()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-1 px-2 sm:pt-6 sm:pb-6 sm:px-6">
          {/* Chart Metric Tabs */}
          {selectedMetrics.size > 1 && !loading && !error && chartData.length > 0 && (
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
                <span className="text-muted-foreground">
                  Loading {reportType} chart for {getProtocolById(selectedProtocol)?.name || selectedProtocol}...
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : chartData.length > 0 && selectedMetrics.size > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickFormatter={formatNumberWithSuffix}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                  formatter={(value: any) => [
                    activeChartMetric === 'volume' 
                      ? formatCurrency(value) 
                      : formatNumberWithSuffix(value), 
                    activeChartMetric === 'volume' ? 'Volume' : activeChartMetric === 'daus' ? 'DAUs' : activeChartMetric === 'users' ? 'New Users' : 'Trades'
                  ]}
                  labelFormatter={(label: any) => label}
                />
                <Bar
                  dataKey={activeChartMetric}
                  fill={getProtocolColor(selectedProtocol)}
                  fillOpacity={0.8}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                >
                  {chartData.length <= 10 && (
                    <LabelList
                      dataKey={activeChartMetric}
                      position="top"
                      formatter={(value: number) => activeChartMetric === 'volume' ? formatCurrency(value) : formatNumberWithSuffix(value)}
                      style={{
                        fill: 'hsl(var(--foreground))',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    />
                  )}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>{selectedMetrics.size === 0 ? 'Please select at least one metric to display' : 'No data available for chart'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-table="custom-report" className={`${
        selectedMetrics.size === 1 && selectedMetrics.has('volume') ? 'max-w-2xl' : 
        selectedMetrics.size === 1 ? 'max-w-md' : 
        selectedMetrics.size === 2 ? 'max-w-4xl' : 
        'max-w-5xl'
      } mx-auto p-0`}>
        <CardHeader className="pb-4 px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-semibold">
                  {reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : 'Monthly'} Report
                </CardTitle>
                <div className="flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={hiddenPeriods.size > 0 ? showAllPeriods : hideAllPeriods}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    title={hiddenPeriods.size > 0 ? "Show all periods" : "Hide all periods"}
                  >
                    {hiddenPeriods.size > 0 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {hiddenPeriods.size > 0 ? "Show All" : "Hide All"}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-muted/10 rounded-md overflow-hidden ring-1 ring-border/20">
                  <img 
                    src={`/assets/logos/${getProtocolLogoFilename(selectedProtocol)}`}
                    alt={getProtocolById(selectedProtocol)?.name || selectedProtocol} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {getProtocolById(selectedProtocol)?.name || selectedProtocol}
                </span>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-xs font-medium px-3 py-1 bg-muted/50 text-muted-foreground border-border/50">
                {(() => {
                  const visiblePeriods = reportData.filter(data => !hiddenPeriods.has(data.period));
                  if (visiblePeriods.length === 0) return "No data";
                  if (visiblePeriods.length === 1) return visiblePeriods[0].period;
                  
                  // Sort visible periods chronologically to get proper range
                  const sortedPeriods = visiblePeriods.sort((a, b) => a.date.getTime() - b.date.getTime());
                  
                  if (reportType === 'daily' || reportType === 'weekly') {
                    // For daily and weekly reports, show start and end dates
                    const firstDate = sortedPeriods[0].date;
                    const lastDate = sortedPeriods[sortedPeriods.length - 1].date;
                    
                    if (reportType === 'daily') {
                      return `${format(firstDate, 'MMM d, yyyy')} - ${format(lastDate, 'MMM d, yyyy')}`;
                    } else {
                      const startOfFirstWeek = startOfWeek(firstDate);
                      const endOfLastWeek = endOfWeek(lastDate);
                      return `${format(startOfFirstWeek, 'MMM d, yyyy')} - ${format(endOfLastWeek, 'MMM d, yyyy')}`;
                    }
                  } else {
                    // For monthly reports, show period ranges
                    const firstPeriod = sortedPeriods[0].period;
                    const lastPeriod = sortedPeriods[sortedPeriods.length - 1].period;
                    return `${firstPeriod} - ${lastPeriod}`;
                  }
                })()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                <span className="text-muted-foreground">
                  Loading {reportType} data for {getProtocolById(selectedProtocol)?.name || selectedProtocol}...
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchReportData}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="w-8 h-12 px-2 text-left align-middle font-medium text-muted-foreground"></TableHead>
                      <TableHead className="w-32 h-12 px-2 text-left align-middle font-medium text-muted-foreground">
                        {reportType === 'daily' ? 'Day' : reportType === 'weekly' ? 'Week' : 'Month'}
                      </TableHead>
                      {selectedMetrics.has('volume') && (
                        <TableHead className="h-12 px-2 text-right align-middle font-medium text-muted-foreground">Volume</TableHead>
                      )}
                      {selectedMetrics.has('daus') && (
                        <TableHead className="h-12 px-2 text-right align-middle font-medium text-muted-foreground">DAUs</TableHead>
                      )}
                      {selectedMetrics.has('users') && (
                        <TableHead className="h-12 px-2 text-right align-middle font-medium text-muted-foreground">New Users</TableHead>
                      )}
                      {selectedMetrics.has('trades') && (
                        <TableHead className="h-12 px-2 text-right align-middle font-medium text-muted-foreground">Trades</TableHead>
                      )}
                      {selectedMetrics.has('volume') && (
                        <TableHead className="h-12 px-2 text-right align-middle font-medium text-muted-foreground">Cum. Volume</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.length > 0 ? (
                      (() => {
                        const filteredData = reportData.filter(data => !hiddenPeriods.has(data.period));
                        const startIndex = (currentPage - 1) * rowsPerPage;
                        const endIndex = startIndex + rowsPerPage;
                        const paginatedData = filteredData.slice(startIndex, endIndex);
                        
                        return paginatedData.map((data) => {
                          const isHidden = hiddenPeriods.has(data.period);
                          return (
                            <TableRow key={data.period} className="hover:bg-muted/30 h-10">
                              <TableCell className="py-2 px-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePeriodVisibility(data.period);
                                  }}
                                  className="opacity-0 hover:opacity-100 transition-opacity duration-200"
                                  title={isHidden ? "Show period" : "Hide period"}
                                >
                                  {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </TableCell>
                              <TableCell className="font-medium text-sm py-2 px-2 whitespace-nowrap">
                                {data.period}
                              </TableCell>
                              {selectedMetrics.has('volume') && (
                                <TableCell className="text-right py-2 px-2">
                                  <Badge variant="outline" className="font-semibold text-sm px-2 py-0.5">
                                    {formatCurrency(data.totalVolume)}
                                  </Badge>
                                </TableCell>
                              )}
                              {selectedMetrics.has('daus') && (
                                <TableCell className="text-right py-2 px-2">
                                  <Badge variant="outline" className="font-semibold text-sm px-2 py-0.5 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300">
                                    {formatNumber(data.totalDAUs)}
                                  </Badge>
                                </TableCell>
                              )}
                              {selectedMetrics.has('users') && (
                                <TableCell className="text-right py-2 px-2">
                                  <Badge variant="outline" className="font-semibold text-sm px-2 py-0.5 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                                    {formatNumber(data.newUsers)}
                                  </Badge>
                                </TableCell>
                              )}
                              {selectedMetrics.has('trades') && (
                                <TableCell className="text-right py-2 px-2">
                                  <Badge variant="outline" className="font-semibold text-sm px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">
                                    {formatNumber(data.totalTrades)}
                                  </Badge>
                                </TableCell>
                              )}
                              {selectedMetrics.has('volume') && (
                                <TableCell className="text-right py-2 px-2">
                                  <Badge variant="outline" className="font-semibold text-sm px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                                    {formatCurrency(data.cumulativeVolume)}
                                  </Badge>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        });
                      })()
                    ) : (
                      <TableRow className="h-16">
                        <TableCell colSpan={2 + selectedMetrics.size + (selectedMetrics.has('volume') ? 1 : 0)} className="text-center py-6 text-muted-foreground text-sm px-2">
                          {selectedMetrics.size === 0 
                            ? 'Please select at least one metric to display' 
                            : `No data available for ${getProtocolById(selectedProtocol)?.name || selectedProtocol}`}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              {(() => {
                if (reportData.length === 0) return null;
                const filteredData = reportData.filter(data => !hiddenPeriods.has(data.period));
                const totalPages = Math.ceil(filteredData.length / rowsPerPage);
                
                if (totalPages <= 1) return null;
                
                return (
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
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
                        
                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                          // Show first page, last page, current page, and pages around current
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
                          
                          // Show ellipsis
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
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

          {/* Action buttons below the report */}
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={downloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
        </>
      ) : (
        <TraderStatsSection />
      )}
    </div>
  );
}

// Trader Stats Section Component
function TraderStatsSection() {
  const [selectedProtocol, setSelectedProtocol] = useState('axiom');
  const [traderData, setTraderData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [percentileLoading, setPercentileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalTraders, setTotalTraders] = useState(0);
  const [allTraders, setAllTraders] = useState<any[]>([]);
  const [percentileBrackets, setPercentileBrackets] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'rank' | 'percentile'>('rank');
  const { toast } = useToast();
  
  const itemsPerPage = 10;

  // Available protocols
  const protocols = [
    { id: 'photon', name: 'Photon', logo: 'photon.jpg' },
    { id: 'axiom', name: 'Axiom', logo: 'axiom.jpg' }
  ];

  // Percentile data is now included in comprehensive endpoint

  // Fetch all trader data from comprehensive backend API
  const fetchTraderData = async (page: number = 1) => {
    console.log('=== FETCH COMPREHENSIVE TRADER DATA ===');
    console.log('selectedProtocol:', selectedProtocol);
    console.log('page:', page);
    console.log('viewType:', viewType);
    
    setLoading(true);
    setError(null);
    
    try {
      const backendUrl = 'http://localhost:3001/api/trader-stats';
      const comprehensiveUrl = `${backendUrl}/comprehensive/${selectedProtocol}?page=${page}&limit=${itemsPerPage}`;
      
      console.log('🚀 Fetching comprehensive data:', comprehensiveUrl);

      const response = await fetch(comprehensiveUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch comprehensive data');
      }

      const { data } = result;
      console.log(`✅ Comprehensive data loaded (cached: ${result.cached}, age: ${result.cacheAge || 0}min)`);
      
      // Set all data from comprehensive response
      setTotalTraders(data.metrics.totalTraders);
      setTotalVolume(data.metrics.totalVolume);
      setTraderData(data.rankData); // This is already paginated
      setAllTraders(data.rankData); // Store current page data
      setPercentileBrackets(data.percentileBrackets);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.currentPage);
      
      // Store metrics for cards (no window object needed)
      window.protocolStats = {
        top1PercentShare: data.metrics.top1PercentShare,
        top5PercentShare: data.metrics.top5PercentShare,
        top1PercentVolume: data.metrics.top1PercentVolume,
        top5PercentVolume: data.metrics.top5PercentVolume,
        percentile99Volume: data.metrics.percentile99Volume,
        percentile95Volume: data.metrics.percentile95Volume
      };
      
      console.log(`📊 Data Summary:`);
      console.log(`  Total Traders: ${data.metrics.totalTraders.toLocaleString()}`);
      console.log(`  Total Volume: $${data.metrics.totalVolume.toLocaleString()}`);
      console.log(`  Rank Data: ${data.rankData.length} records (page ${data.pagination.currentPage}/${data.pagination.totalPages})`);
      console.log(`  Percentile Brackets: ${data.percentileBrackets.length} brackets`);
      console.log(`  Cache Status: ${result.cached ? `✅ Cached (${result.cacheAge}min old)` : '🆕 Fresh'}`);
      
    } catch (error: any) {
      console.error('❌ Comprehensive API failed:', error);
      setError(`Failed to load trader data: ${error.message}`);
      setTraderData([]);
      setTotalTraders(0);
      setTotalVolume(0);
      setTotalPages(1);
      setAllTraders([]);
      setPercentileBrackets([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when protocol, page, or view type changes
  // Fetch comprehensive data when protocol or page changes
  useEffect(() => {
    fetchTraderData(currentPage);
  }, [selectedProtocol, currentPage]);

  // Reset to first page when protocol changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProtocol]);

  const handleProtocolChange = (protocolId: string) => {
    setSelectedProtocol(protocolId);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  // startIndex calculation moved to backend


  const downloadReport = async () => {
    const reportElement = document.querySelector('[data-table="trader-stats-complete"]') as HTMLElement;
    
    if (reportElement) {
      const rect = reportElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const scale = 2;
        const padding = 24;
        const totalWidth = reportElement.offsetWidth + (padding * 2);
        const totalHeight = reportElement.offsetHeight + (padding * 2);
        
        const dataUrl = await Promise.race([
          domtoimage.toPng(reportElement, {
            quality: 1,
            bgcolor: '#ffffff',
            cacheBust: true,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: totalWidth + 'px',
              height: totalHeight + 'px',
              padding: padding + 'px',
              margin: '0px',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              overflow: 'visible'
            },
            width: totalWidth * scale,
            height: totalHeight * scale,
            filter: (node: any) => {
              // Exclude any elements with no-screenshot class
              if (node.classList?.contains('no-screenshot')) {
                return false;
              }
              return true;
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 20 seconds')), 20000)
          )
        ]) as string;
        
        const link = document.createElement('a');
        link.download = `${selectedProtocol}_Trader_Stats_${format(new Date(), 'yyyy_MM_dd')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading report:', error);
        toast({
          title: "Download failed",
          description: "Failed to download trader stats report",
          duration: 3000,
        });
      }
    }
  };

  const copyToClipboard = async () => {
    const reportElement = document.querySelector('[data-table="trader-stats-complete"]') as HTMLElement;
    
    if (reportElement) {
      const rect = reportElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const scale = 2;
        const padding = 24;
        const totalWidth = reportElement.offsetWidth + (padding * 2);
        const totalHeight = reportElement.offsetHeight + (padding * 2);
        
        const dataUrl = await Promise.race([
          domtoimage.toPng(reportElement, {
            quality: 1,
            bgcolor: '#ffffff',
            cacheBust: true,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: totalWidth + 'px',
              height: totalHeight + 'px',
              padding: padding + 'px',
              margin: '0px',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              overflow: 'visible'
            },
            width: totalWidth * scale,
            height: totalHeight * scale,
            filter: (node: any) => {
              // Exclude any elements with no-screenshot class
              if (node.classList?.contains('no-screenshot')) {
                return false;
              }
              return true;
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 20 seconds')), 20000)
          )
        ]) as string;
        
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            toast({
              title: "Copied to clipboard",
              description: "Trader stats report copied successfully",
              duration: 2000,
            });
          } catch (clipboardError) {
            console.error('Clipboard write failed:', clipboardError);
            toast({
              title: "Copy failed",
              description: "Failed to copy to clipboard. Please try downloading instead.",
              duration: 3000,
            });
          }
        }
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
      {/* Protocol Tabs */}
      <div className="flex gap-2 mb-6">
        {protocols.map((protocol) => (
          <button
            key={protocol.id}
            onClick={() => handleProtocolChange(protocol.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors duration-150",
              "bg-white focus:outline-none border",
              selectedProtocol === protocol.id
                ? "border-black text-foreground shadow-md"
                : "border-gray-300 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="w-5 h-5 rounded overflow-hidden bg-muted/20 flex-shrink-0">
              <img 
                src={`/assets/logos/${protocol.logo}`}
                alt={protocol.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <span className="text-sm font-medium">{protocol.name}</span>
          </button>
        ))}
      </div>

      {/* Complete Trader Stats Report - Metrics + Table */}
      <div data-table="trader-stats-complete" className="space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <MetricCardSkeleton
                title="Total Volume"
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
              />
              <MetricCardSkeleton
                title="Total Traders"
                type="users"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
              />
              <MetricCardSkeleton
                title="Top 1% Percentile Volume"
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
              />
              <MetricCardSkeleton
                title="Top 5% Percentile Volume"
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
              />
            </>
          ) : (
            <>
              <MetricCard
                title="Total Volume"
                value={totalVolume}
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                protocolLogo={protocols.find(p => p.id === selectedProtocol)?.logo}
              />
              
              <MetricCard
                title="Total Traders"
                value={formatNumber(totalTraders)}
                type="users"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                protocolLogo={protocols.find(p => p.id === selectedProtocol)?.logo}
              />
              
              <MetricCard
                title="Top 1% Percentile Volume"
                value={window.protocolStats?.top1PercentVolume 
                  ? formatCurrency(window.protocolStats.top1PercentVolume)
                  : '--'
                }
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                protocolLogo={protocols.find(p => p.id === selectedProtocol)?.logo}
              />
              
              <MetricCard
                title="Top 5% Percentile Volume"
                value={window.protocolStats?.top5PercentVolume 
                  ? formatCurrency(window.protocolStats.top5PercentVolume)
                  : '--'
                }
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                protocolLogo={protocols.find(p => p.id === selectedProtocol)?.logo}
              />
            </>
          )}
        </div>

        {/* Trader Stats Table */}
        <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">
                Trader Statistics
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                  <img 
                    src={`/assets/logos/${protocols.find(p => p.id === selectedProtocol)?.logo}`}
                    alt={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
                <span>{protocols.find(p => p.id === selectedProtocol)?.name}</span>
              </div>
            </div>
            
            {/* View Type Tabs */}
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => setViewType('rank')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'rank'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Rank
              </button>
              <button
                onClick={() => setViewType('percentile')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'percentile'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Percentile
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading || (viewType === 'percentile' && percentileLoading) ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                <span className="text-muted-foreground">
                  {viewType === 'percentile' && percentileLoading 
                    ? `Loading percentile calculations...`
                    : `Loading trader statistics for ${protocols.find(p => p.id === selectedProtocol)?.name}...`
                  }
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                <p className="mb-4">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchTraderData(currentPage)}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (viewType === 'rank' ? traderData.length > 0 : percentileBrackets.length > 0) ? (
            <div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20 text-center">
                        {viewType === 'rank' ? 'Rank' : 'Top %'}
                      </TableHead>
                      <TableHead className={viewType === 'rank' ? 'text-left' : 'text-center'}>
                        {viewType === 'rank' ? 'Trader' : 'Rank Range'}
                      </TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">Volume Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewType === 'rank' ? (
                      traderData.map((trader, index) => {
                        const rank = trader.rank || index + 1;
                        
                        return (
                          <TableRow key={`${trader.user_address}-${index}`} className="hover:bg-muted/30 h-12">
                            <TableCell className="text-center font-medium py-2">
                              <Badge 
                                variant={rank <= 3 ? "default" : "outline"}
                                className={cn(
                                  "w-8 h-6 rounded-lg flex items-center justify-center text-xs font-medium px-0.5",
                                  rank === 1 && "bg-yellow-500 text-yellow-50 hover:bg-yellow-600",
                                  rank === 2 && "bg-gray-400 text-gray-50 hover:bg-gray-500",
                                  rank === 3 && "bg-amber-600 text-amber-50 hover:bg-amber-700"
                                )}
                              >
                                #{rank}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono py-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(trader.user_address);
                                  toast({
                                    title: "Address copied",
                                    description: `${trader.user_address} copied to clipboard`,
                                    duration: 2000,
                                  });
                                }}
                                className="text-sm hover:bg-muted/50 px-2 py-1 rounded transition-colors cursor-pointer"
                                title="Click to copy full address"
                              >
                                {trader.user_address}
                              </button>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <span className="font-semibold">
                                {formatCurrency(trader.volume_usd)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "font-medium text-xs",
                                  rank <= 10 && "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                )}
                              >
                                {trader.volumeShare ? trader.volumeShare.toFixed(3) : '0.000'}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      percentileBrackets.map((bracket) => (
                        <TableRow key={`percentile-${bracket.percentile}`} className="hover:bg-muted/30 h-12">
                          <TableCell className="text-center font-medium py-2">
                            <Badge 
                              variant={bracket.percentile <= 10 ? "default" : "outline"}
                              className={cn(
                                "w-12 h-6 rounded-lg flex items-center justify-center text-xs font-medium px-0",
                                bracket.percentile <= 3 && "bg-yellow-500 text-yellow-50 hover:bg-yellow-600",
                                bracket.percentile > 3 && bracket.percentile <= 5 && "bg-gray-400 text-gray-50 hover:bg-gray-500",
                                bracket.percentile > 5 && bracket.percentile <= 10 && "bg-amber-600 text-amber-50 hover:bg-amber-700"
                              )}
                            >
                              {bracket.percentile}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-2 font-medium font-mono">
                            {bracket.rankRange}
                          </TableCell>
                          <TableCell className="py-2 max-w-24">
                            <div className="flex items-center justify-between w-full">
                              <div className="w-32">
                                <Progress 
                                  value={bracket.volumeShare} 
                                  className="h-4 bg-muted/60 border border-foreground/60 rounded-sm [&>div]:bg-foreground/80"
                                />
                              </div>
                              <span className="font-semibold whitespace-nowrap">
                                {formatCurrency(bracket.volume)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "font-medium text-xs whitespace-nowrap",
                                bracket.percentile <= 10 && "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              )}
                            >
                              {bracket.volumeShare.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {viewType === 'rank' && totalPages > 1 && (
                <div className="w-full flex justify-end pt-3 pb-1">
                  <Pagination className="ml-auto">
                    <PaginationContent className="ml-auto justify-end">
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </PaginationPrevious>
                      </PaginationItem>
                      
                      {/* First page */}
                      {currentPage > 3 && (
                        <>
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => handlePageChange(1)}
                              isActive={currentPage === 1}
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                          {currentPage > 4 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                        </>
                      )}
                      
                      {/* Current page range */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        // Don't render if we already rendered this page number
                        if ((currentPage > 3 && pageNum === 1) || (currentPage < totalPages - 2 && pageNum === totalPages)) {
                          return null;
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNum)}
                              isActive={currentPage === pageNum}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      {/* Last page */}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => handlePageChange(totalPages)}
                              isActive={currentPage === totalPages}
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      )}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </PaginationNext>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trader data available for {protocols.find(p => p.id === selectedProtocol)?.name}</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={downloadReport}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
      </div>
    </div>
  );
}