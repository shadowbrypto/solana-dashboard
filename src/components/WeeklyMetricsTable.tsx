import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isAfter, isBefore, subDays, addDays } from "date-fns";
import { GripVertical, ChevronRight, Eye, EyeOff, Download, Copy, ChevronLeft, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
// @ts-ignore
import domtoimage from "dom-to-image";
import { AreaChart, Area, ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Cell } from 'recharts';

import { ProtocolMetrics, Protocol } from "../types/protocol";
import { getDailyMetrics } from "../lib/protocol";
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolLogoFilename } from "../lib/protocol-config";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "../hooks/use-toast";

interface WeeklyMetricsTableProps {
  protocols: Protocol[];
  endDate: Date;
  onDateChange: (date: Date) => void;
}

type MetricKey = 'total_volume_usd' | 'daily_users' | 'numberOfNewUsers' | 'daily_trades';

interface DailyData {
  [protocol: string]: Record<string, number>; // date -> value
}

interface VolumeData {
  [protocol: string]: Record<string, number>; // date -> volume value
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

const formatGrowthPercentage = (growth: number): string => {
  const percentage = growth * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};

const getGrowthBadgeClasses = (growth: number): string => {
  if (growth >= 0) return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"; // Positive
  return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"; // Negative
};

export function WeeklyMetricsTable({ protocols, endDate, onDateChange }: WeeklyMetricsTableProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [dailyData, setDailyData] = useState<DailyData>({});
  const [volumeData, setVolumeData] = useState<VolumeData>({});
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('total_volume_usd');
  const [last7Days, setLast7Days] = useState<Date[]>([]);
  const [topProtocols, setTopProtocols] = useState<Protocol[]>([]);
  const { toast } = useToast();

  const metricOptions = [
    { key: 'total_volume_usd' as MetricKey, label: 'Volume (USD)', format: formatCurrency },
    { key: 'daily_users' as MetricKey, label: 'Daily Active Users', format: formatNumber },
    { key: 'numberOfNewUsers' as MetricKey, label: 'New Users', format: formatNumber },
    { key: 'daily_trades' as MetricKey, label: 'Daily Trades', format: formatNumber },
  ];

  const selectedMetricOption = metricOptions.find(m => m.key === selectedMetric) || metricOptions[0];

  // Date validation constants
  const MIN_DATE = new Date('2024-01-01'); // Earliest allowed date
  const MAX_DATE = subDays(new Date(), 1); // Yesterday (exclude today due to backend filtering)
  
  // Check if navigation is allowed
  const canNavigatePrev = () => {
    const prev7Days = subDays(endDate, 7);
    return !isBefore(prev7Days, MIN_DATE);
  };
  
  const canNavigateNext = () => {
    const next7Days = addDays(endDate, 7);
    return !isAfter(next7Days, MAX_DATE);
  };


  // Category-based bright coloring using shadcn theme colors
  const getCategoryRowColor = (categoryName: string): string => {
    switch (categoryName) {
      case 'Telegram Bots':
        return 'bg-blue-100 dark:bg-blue-900/30';
      case 'Trading Terminals':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'Mobile Apps':
        return 'bg-purple-100 dark:bg-purple-900/30';
      default:
        return '';
    }
  };
  
  const getCategoryHoverColor = (categoryName: string): string => {
    switch (categoryName) {
      case 'Telegram Bots':
        return 'group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40';
      case 'Trading Terminals':
        return 'group-hover:bg-green-200 dark:group-hover:bg-green-900/40';
      case 'Mobile Apps':
        return 'group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40';
      default:
        return 'group-hover:bg-muted/30';
    }
  };

  useEffect(() => {
    const fetchLast7DaysData = async () => {
      setLoading(true);
      try {
        // Generate last 7 days ending with endDate
        const startDate = subDays(endDate, 6); // 6 days before endDate gives us 7 days total
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        setLast7Days(days);
        
        // Fetch data for each day
        const dailyPromises = days.map(day => getDailyMetrics(day));
        const dailyResults = await Promise.all(dailyPromises);
        
        // Organize data by protocol
        const organizedData: DailyData = {};
        const organizedVolumeData: VolumeData = {};
        
        protocols.forEach(protocol => {
          organizedData[protocol] = {};
          organizedVolumeData[protocol] = {};
          
          dailyResults.forEach((dayData, index) => {
            const dateKey = format(days[index], 'yyyy-MM-dd');
            if (dayData[protocol]) {
              organizedData[protocol][dateKey] = dayData[protocol][selectedMetric] || 0;
              organizedVolumeData[protocol][dateKey] = dayData[protocol]['total_volume_usd'] || 0;
            } else {
              organizedData[protocol][dateKey] = 0;
              organizedVolumeData[protocol][dateKey] = 0;
            }
          });
        });
        
        setDailyData(organizedData);
        setVolumeData(organizedVolumeData);
        
        // Calculate protocol totals for the selected metric and sort for ranking
        const protocolTotals = protocols.map(protocol => {
          const total = days.reduce((sum, day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            return sum + (organizedData[protocol]?.[dateKey] || 0);
          }, 0);
          return { protocol, total };
        });
        
        // Sort by total (highest first) and get top 3
        const sortedProtocols = protocolTotals
          .filter(p => p.total > 0)
          .sort((a, b) => b.total - a.total);
        
        const top3 = sortedProtocols.slice(0, 3).map(p => p.protocol as Protocol);
        setTopProtocols(top3);
        
      } catch (error) {
        console.error('Error fetching last 7 days data:', error);
        setDailyData({});
        setTopProtocols([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLast7DaysData();
  }, [endDate, protocols, selectedMetric]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && !canNavigatePrev()) return;
    if (direction === 'next' && !canNavigateNext()) return;
    
    const newDate = direction === 'prev' ? subDays(endDate, 7) : addDays(endDate, 7);
    onDateChange(newDate);
  };

  const formatValue = (value: number) => {
    return selectedMetricOption.format(value);
  };
  
  
  const getWeeklyVolumeData = (protocolId: string) => {
    const protocolVolumeData = volumeData[protocolId];
    if (!protocolVolumeData) return [];
    
    return last7Days.map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        day: index,
        value: protocolVolumeData[dateKey] || 0
      };
    });
  };
  
  const getVolumetrend = (protocolId: string): 'up' | 'down' | 'neutral' => {
    const data = getWeeklyVolumeData(protocolId);
    if (data.length < 2) return 'neutral';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
    
    if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
    if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
    return 'neutral';
  };

  const calculateWeekOnWeekGrowth = (protocolId: string): number => {
    // Use a simplified approach based on current week trend
    // Calculate based on the trend within the current week
    const protocolData = dailyData[protocolId];
    if (!protocolData || last7Days.length < 2) return 0;

    const data = last7Days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return protocolData[dateKey] || 0;
    });

    if (data.length < 2) return 0;

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, value) => sum + value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, value) => sum + value, 0) / secondHalf.length;

    if (firstHalfAvg === 0) return 0;
    return ((secondHalfAvg - firstHalfAvg) / firstHalfAvg);
  };

  const calculateCategoryWeekOnWeekGrowth = (categoryName: string): number => {
    const categoryProtocols = getMutableProtocolsByCategory(categoryName);
    if (last7Days.length < 2) return 0;

    const data = last7Days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return categoryProtocols.reduce((sum, protocol) => {
        const protocolData = dailyData[protocol.id];
        if (protocolData && protocolData[dateKey] !== undefined) {
          return sum + protocolData[dateKey];
        }
        return sum;
      }, 0);
    });
    
    if (data.length < 2) return 0;

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, value) => sum + value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, value) => sum + value, 0) / secondHalf.length;

    if (firstHalfAvg === 0) return 0;
    return ((secondHalfAvg - firstHalfAvg) / firstHalfAvg);
  };
  
  const getCategoryVolumeData = (categoryName: string) => {
    const categoryProtocols = getMutableProtocolsByCategory(categoryName);
    
    return last7Days.map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dailyTotal = categoryProtocols.reduce((sum, protocol) => {
        const protocolVolumeData = volumeData[protocol.id];
        if (protocolVolumeData && protocolVolumeData[dateKey] !== undefined) {
          return sum + protocolVolumeData[dateKey];
        }
        return sum;
      }, 0);
      
      return {
        day: index,
        value: dailyTotal
      };
    });
  };
  
  const getCategoryVolumeTrend = (categoryName: string): 'up' | 'down' | 'neutral' => {
    const data = getCategoryVolumeData(categoryName);
    if (data.length < 2) return 'neutral';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
    
    if (secondHalfAvg > firstHalfAvg * 1.1) return 'up';
    if (secondHalfAvg < firstHalfAvg * 0.9) return 'down';
    return 'neutral';
  };

  // New functions for weekly trend charts
  const getWeeklyAverage = (protocolId: string): number => {
    const protocolData = dailyData[protocolId];
    if (!protocolData) return 0;
    
    let totalSum = 0;
    let dayCount = 0;
    
    last7Days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const value = protocolData[dateKey] || 0;
      totalSum += value;
      dayCount++;
    });
    
    return dayCount > 0 ? totalSum / dayCount : 0;
  };

  const getWeeklyMetricData = (protocolId: string) => {
    const protocolData = dailyData[protocolId];
    if (!protocolData) return [];
    
    const weeklyAverage = getWeeklyAverage(protocolId);
    
    return last7Days.map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const value = protocolData[dateKey] || 0;
      
      // Determine bar color based on relationship to average
      let barColor = '#94a3b8'; // Light grey (slate-400) for close to average
      if (value > weeklyAverage * 1.1) {
        barColor = '#22c55e'; // Green (green-500) for above average
      } else if (value < weeklyAverage * 0.8) {
        barColor = '#ef4444'; // Red (red-500) for significantly below average
      }
      
      return {
        day: index,
        date: format(day, 'MMM d'),
        value: value,
        average: weeklyAverage,
        barColor: barColor
      };
    });
  };

  const getCategoryWeeklyAverage = (categoryName: string): number => {
    const categoryProtocols = getMutableProtocolsByCategory(categoryName);
    
    let totalSum = 0;
    let dayCount = 0;
    
    last7Days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dailyTotal = categoryProtocols.reduce((sum, protocol) => {
        const protocolData = dailyData[protocol.id];
        if (protocolData && protocolData[dateKey] !== undefined) {
          return sum + protocolData[dateKey];
        }
        return sum;
      }, 0);
      
      totalSum += dailyTotal;
      dayCount++;
    });
    
    return dayCount > 0 ? totalSum / dayCount : 0;
  };

  const getCategoryMetricData = (categoryName: string) => {
    const categoryProtocols = getMutableProtocolsByCategory(categoryName);
    const weeklyAverage = getCategoryWeeklyAverage(categoryName);
    
    return last7Days.map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dailyTotal = categoryProtocols.reduce((sum, protocol) => {
        const protocolData = dailyData[protocol.id];
        if (protocolData && protocolData[dateKey] !== undefined) {
          return sum + protocolData[dateKey];
        }
        return sum;
      }, 0);
      
      // Determine bar color based on relationship to average
      let barColor = '#94a3b8'; // Light grey (slate-400) for close to average
      if (dailyTotal > weeklyAverage * 1.1) {
        barColor = '#22c55e'; // Green (green-500) for above average
      } else if (dailyTotal < weeklyAverage * 0.8) {
        barColor = '#ef4444'; // Red (red-500) for significantly below average
      }
      
      return {
        day: index,
        date: format(day, 'MMM d'),
        value: dailyTotal,
        average: weeklyAverage,
        barColor: barColor
      };
    });
  };

  const getTotalWeeklyAverage = (): number => {
    let totalSum = 0;
    let dayCount = 0;
    
    last7Days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dailyTotal = protocols.reduce((sum, protocol) => {
        const protocolData = dailyData[protocol];
        if (protocolData && protocolData[dateKey] !== undefined) {
          return sum + protocolData[dateKey];
        }
        return sum;
      }, 0);
      
      totalSum += dailyTotal;
      dayCount++;
    });
    
    return dayCount > 0 ? totalSum / dayCount : 0;
  };

  const getTotalMetricData = () => {
    const weeklyAverage = getTotalWeeklyAverage();
    
    return last7Days.map((day, index) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dailyTotal = protocols.reduce((sum, protocol) => {
        const protocolData = dailyData[protocol];
        if (protocolData && protocolData[dateKey] !== undefined) {
          return sum + protocolData[dateKey];
        }
        return sum;
      }, 0);
      
      // Determine bar color based on relationship to average
      let barColor = '#94a3b8'; // Light grey (slate-400) for close to average
      if (dailyTotal > weeklyAverage * 1.1) {
        barColor = '#22c55e'; // Green (green-500) for above average
      } else if (dailyTotal < weeklyAverage * 0.8) {
        barColor = '#ef4444'; // Red (red-500) for significantly below average
      }
      
      return {
        day: index,
        date: format(day, 'MMM d'),
        value: dailyTotal,
        average: weeklyAverage,
        barColor: barColor
      };
    });
  };

  const calculateTotalWeekOnWeekGrowth = (): number => {
    if (last7Days.length < 2) return 0;

    const data = last7Days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return protocols.reduce((sum, protocol) => {
        const protocolData = dailyData[protocol];
        if (protocolData && protocolData[dateKey] !== undefined) {
          return sum + protocolData[dateKey];
        }
        return sum;
      }, 0);
    });

    if (data.length < 2) return 0;

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, value) => sum + value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, value) => sum + value, 0) / secondHalf.length;

    if (firstHalfAvg === 0) return 0;
    return ((secondHalfAvg - firstHalfAvg) / firstHalfAvg);
  };

  const toggleCollapse = (categoryName: string) => {
    setCollapsedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const toggleProtocolVisibility = (protocol: string) => {
    setHiddenProtocols(prev => {
      const newSet = new Set(prev);
      if (newSet.has(protocol)) {
        newSet.delete(protocol);
      } else {
        newSet.add(protocol);
      }
      return newSet;
    });
  };

  const downloadReport = async () => {
    const tableElement = document.querySelector('[data-table="weekly-metrics-full"]') as HTMLElement;
    
    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: tableElement.scrollWidth + 40,
            height: tableElement.scrollHeight + 10,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              overflow: 'visible',
              paddingTop: '20px',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingBottom: '0px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            },
            filter: (node: any) => {
              return !node.classList?.contains('no-screenshot');
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 10 seconds')), 10000)
          )
        ]) as string;
        
        const link = document.createElement('a');
        link.download = `Weekly Report - ${selectedMetricOption.label.replace(' (USD)', '')} - ${format(endDate, 'dd.MM')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const copyToClipboard = async () => {
    const tableElement = document.querySelector('[data-table="weekly-metrics-full"]') as HTMLElement;
    
    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();
      
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      try {
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: tableElement.scrollWidth + 40,
            height: tableElement.scrollHeight + 10,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              overflow: 'visible',
              paddingTop: '20px',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingBottom: '0px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            },
            filter: (node: any) => {
              return !node.classList?.contains('no-screenshot');
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('dom-to-image timeout after 10 seconds')), 10000)
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
              description: "Weekly report image copied successfully",
              duration: 2000,
            });
          } catch (error) {
            // Handle error silently
          }
        }
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const startDate = subDays(endDate, 6);

  return (
    <div className="relative space-y-3" data-table="weekly-metrics-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <Tabs value={selectedMetric} onValueChange={(value: MetricKey) => setSelectedMetric(value)} className="w-auto">
              <TabsList className="grid w-full grid-cols-4">
                {metricOptions.map((option) => (
                  <TabsTrigger key={option.key} value={option.key} className="text-sm">
                    {option.key === 'total_volume_usd' ? 'Volume' :
                     option.key === 'daily_users' ? 'DAUs' :
                     option.key === 'numberOfNewUsers' ? 'New Users' :
                     'Trades'}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (hiddenProtocols.size > 0) {
                  setHiddenProtocols(new Set());
                } else {
                  const allProtocols = new Set<string>();
                  protocols.forEach(protocol => {
                    allProtocols.add(protocol);
                  });
                  setHiddenProtocols(allProtocols);
                }
              }}
              title={hiddenProtocols.size > 0 ? "Show all protocols" : "Hide all protocols"}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {hiddenProtocols.size > 0 ? (
                <Eye className="h-4 w-4 mr-2" />
              ) : (
                <EyeOff className="h-4 w-4 mr-2" />
              )}
              {hiddenProtocols.size > 0 ? "Show All" : "Hide All"}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDateChange('prev')}
              disabled={!canNavigatePrev()}
              title={!canNavigatePrev() ? `Cannot go before ${format(MIN_DATE, 'MMM d, yyyy')}` : 'Previous 7 days'}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/30">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDateChange('next')}
              disabled={!canNavigateNext()}
              title={!canNavigateNext() ? 'Cannot go beyond yesterday (today excluded due to incomplete data)' : 'Next 7 days'}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="rounded-xl border bg-gradient-to-b from-background to-muted/10 overflow-x-auto lg:overflow-x-visible" data-table="weekly-metrics">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] sticky left-0 z-20 bg-background py-3 sm:py-4 text-xs sm:text-sm">Protocol</TableHead>
                {last7Days.map((day) => (
                  <TableHead key={day.toISOString()} className="text-center min-w-[90px] px-1 py-3 sm:py-4 text-xs sm:text-sm">
                    <span className="font-medium">
                      {format(day, 'EEE, MMM d')}
                    </span>
                  </TableHead>
                ))}
                {selectedMetric !== 'daily_users' && (
                  <TableHead className="text-center min-w-[100px] px-1 py-3 sm:py-4 text-xs sm:text-sm">Weekly Total</TableHead>
                )}
                <TableHead className="text-center min-w-[140px] px-1 py-3 sm:py-4 text-xs sm:text-sm">
                  {selectedMetric === 'daily_users' ? 'Weekly Trend' : 'Trend & Growth'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={last7Days.length + (selectedMetric === 'daily_users' ? 2 : 3)} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-muted-foreground">Loading weekly data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                getMutableAllCategories().map(categoryName => {
                  const categoryProtocols = getMutableProtocolsByCategory(categoryName);
                  const isCollapsed = collapsedCategories.includes(categoryName);
                  
                  // Filter out hidden protocols and sort by metric total
                  const visibleCategoryProtocols = categoryProtocols
                    .filter(p => !hiddenProtocols.has(p.id));
                  
                  // Sort protocols within category by their total for the selected metric
                  const sortedCategoryProtocols = categoryProtocols.sort((a, b) => {
                    const totalA = last7Days.reduce((sum, day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      return sum + (dailyData[a.id]?.[dateKey] || 0);
                    }, 0);
                    const totalB = last7Days.reduce((sum, day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      return sum + (dailyData[b.id]?.[dateKey] || 0);
                    }, 0);
                    return totalB - totalA; // Sort descending (highest first)
                  });

                  return (
                    <React.Fragment key={categoryName}>
                      <TableRow 
                        className={cn(
                          "cursor-pointer font-medium group",
                          getCategoryRowColor(categoryName),
                          getCategoryHoverColor(categoryName),
                          "transition-all duration-200"
                        )}
                        onClick={() => toggleCollapse(categoryName)}
                      >
                        <TableCell className={cn("sticky left-0 z-10 py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm transition-colors", getCategoryRowColor(categoryName), getCategoryHoverColor(categoryName))}>
                          <div className="flex items-center gap-2">
                            <ChevronRight 
                              className={cn(
                                "h-4 w-4 transition-transform",
                                !isCollapsed && "rotate-90"
                              )}
                            />
                            <span className="font-semibold whitespace-nowrap">{categoryName}</span>
                          </div>
                        </TableCell>
                        {last7Days.map(day => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const categoryTotal = visibleCategoryProtocols.reduce((sum, protocol) => {
                            const protocolData = dailyData[protocol.id];
                            if (protocolData && protocolData[dateKey] !== undefined) {
                              return sum + protocolData[dateKey];
                            }
                            return sum;
                          }, 0);
                          
                          return (
                            <TableCell key={dateKey} className={cn("text-center font-semibold py-3 sm:py-4 px-1 text-xs sm:text-sm transition-colors", getCategoryRowColor(categoryName), getCategoryHoverColor(categoryName))}>
                              {formatValue(categoryTotal)}
                            </TableCell>
                          );
                        })}
                        {selectedMetric !== 'daily_users' && (
                          <TableCell className={cn("text-center font-bold py-3 sm:py-4 px-1 text-xs sm:text-sm transition-colors", getCategoryRowColor(categoryName), getCategoryHoverColor(categoryName))}>
                            {formatValue(last7Days.reduce((sum, day) => {
                              const dateKey = format(day, 'yyyy-MM-dd');
                              const categoryTotal = visibleCategoryProtocols.reduce((sum, protocol) => {
                                const protocolData = dailyData[protocol.id];
                                if (protocolData && protocolData[dateKey] !== undefined) {
                                  return sum + protocolData[dateKey];
                                }
                                return sum;
                              }, 0);
                              return sum + categoryTotal;
                            }, 0))}
                          </TableCell>
                        )}
                        <TableCell className={cn("text-center py-1 sm:py-2 px-1 text-xs sm:text-sm transition-colors", getCategoryRowColor(categoryName), getCategoryHoverColor(categoryName))}>
                          <div className={`flex items-center justify-center ${selectedMetric === 'daily_users' ? '' : 'gap-2'}`}>
                            <div className="w-[70px] h-[40px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart 
                                  data={getCategoryMetricData(categoryName)} 
                                  margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                                >
                                  <Bar 
                                    dataKey="value" 
                                    opacity={0.9}
                                    radius={[2, 2, 0, 0]}
                                    maxBarSize={8}
                                  >
                                    {getCategoryMetricData(categoryName).map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.barColor} />
                                    ))}
                                  </Bar>
                                  <Line 
                                    type="monotone" 
                                    dataKey="average"
                                    stroke="#059669" 
                                    strokeWidth={1}
                                    dot={false}
                                    strokeDasharray="2 2"
                                  />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                            {selectedMetric !== 'daily_users' && (
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "h-5 px-2 text-xs font-medium flex-shrink-0 hover:bg-transparent",
                                  getGrowthBadgeClasses(calculateCategoryWeekOnWeekGrowth(categoryName))
                                )}
                              >
                                {formatGrowthPercentage(calculateCategoryWeekOnWeekGrowth(categoryName))}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {!isCollapsed && sortedCategoryProtocols.map(protocol => {
                        const isHidden = hiddenProtocols.has(protocol.id);
                        const protocolData = dailyData[protocol.id] || {};
                        
                        // Don't render hidden protocols at all
                        if (isHidden) return null;
                        
                        return (
                          <TableRow 
                            key={protocol.id}
                            className="hover:bg-muted/50 transition-colors group"
                          >
                            <TableCell className="sticky left-0 z-10 bg-background group-hover:bg-muted/50 py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm transition-colors">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleProtocolVisibility(protocol.id);
                                  }}
                                  className="p-1 hover:bg-muted rounded transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Eye className="h-3 w-3 text-muted-foreground" />
                                </button>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                                    <img 
                                      src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                                      alt={protocol.name} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        const container = target.parentElement;
                                        if (container) {
                                          container.innerHTML = '';
                                          container.className = 'w-4 h-4 bg-muted/20 rounded flex items-center justify-center';
                                          const iconEl = document.createElement('div');
                                          iconEl.innerHTML = '<svg class="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                          container.appendChild(iconEl);
                                        }
                                      }}
                                    />
                                  </div>
                                  <span className="truncate">
                                    {protocol.name}
                                  </span>
                                  {topProtocols.includes(protocol.id as Protocol) && (
                                    <Badge 
                                      variant="secondary"
                                      className={cn(
                                        "ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs font-medium flex-shrink-0 hover:bg-transparent",
                                        topProtocols.indexOf(protocol.id as Protocol) === 0 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                                        topProtocols.indexOf(protocol.id as Protocol) === 1 && "bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300",
                                        topProtocols.indexOf(protocol.id as Protocol) === 2 && "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                      )}
                                    >
                                      #{topProtocols.indexOf(protocol.id as Protocol) + 1}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            {last7Days.map(day => {
                              const dateKey = format(day, 'yyyy-MM-dd');
                              const value = protocolData[dateKey] || 0;
                              
                              return (
                                <TableCell 
                                  key={dateKey} 
                                  className="text-center py-3 sm:py-4 px-1 transition-all relative font-medium text-xs sm:text-sm"
                                >
                                  {formatValue(value)}
                                </TableCell>
                              );
                            })}
                            {selectedMetric !== 'daily_users' && (
                              <TableCell className="text-center py-3 sm:py-4 px-1 transition-all relative font-bold text-xs sm:text-sm">
                                {formatValue(last7Days.reduce((sum, day) => {
                                  const dateKey = format(day, 'yyyy-MM-dd');
                                  const value = protocolData[dateKey] || 0;
                                  return sum + value;
                                }, 0))}
                              </TableCell>
                            )}
                            <TableCell className="text-center py-1 sm:py-2 px-1 transition-all relative font-medium text-xs sm:text-sm">
                              <div className={`flex items-center justify-center ${selectedMetric === 'daily_users' ? '' : 'gap-2'}`}>
                                <div className="w-[70px] h-[40px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart 
                                      data={getWeeklyMetricData(protocol.id)} 
                                      margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                                    >
                                      <Bar 
                                        dataKey="value" 
                                        opacity={0.9}
                                        radius={[2, 2, 0, 0]}
                                        maxBarSize={8}
                                      >
                                        {getWeeklyMetricData(protocol.id).map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.barColor} />
                                        ))}
                                      </Bar>
                                      <Line 
                                        type="monotone" 
                                        dataKey="average"
                                        stroke="#059669" 
                                        strokeWidth={1}
                                        dot={false}
                                        strokeDasharray="2 2"
                                      />
                                    </ComposedChart>
                                  </ResponsiveContainer>
                                </div>
                                {selectedMetric !== 'daily_users' && (
                                  <Badge 
                                    variant="secondary" 
                                    className={cn(
                                      "h-5 px-2 text-xs font-medium flex-shrink-0 hover:bg-transparent",
                                      getGrowthBadgeClasses(calculateWeekOnWeekGrowth(protocol.id))
                                    )}
                                  >
                                    {formatGrowthPercentage(calculateWeekOnWeekGrowth(protocol.id))}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
              
              {/* Total Row */}
              {!loading && (
                <TableRow className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/30 hover:bg-gray-200 dark:hover:bg-gray-900/40 font-bold group transition-colors">
                  <TableCell className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-900/30 group-hover:bg-gray-200 dark:group-hover:bg-gray-900/40 font-bold py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm transition-colors">
                    <span>Total</span>
                  </TableCell>
                  {last7Days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dailyTotal = protocols.reduce((sum, protocol) => {
                      const protocolData = dailyData[protocol];
                      if (protocolData && protocolData[dateKey] !== undefined) {
                        return sum + protocolData[dateKey];
                      }
                      return sum;
                    }, 0);
                    
                    return (
                      <TableCell key={dateKey} className="text-center font-bold bg-gray-100 dark:bg-gray-900/30 group-hover:bg-gray-200 dark:group-hover:bg-gray-900/40 py-3 sm:py-4 px-1 text-xs sm:text-sm transition-colors">
                        {formatValue(dailyTotal)}
                      </TableCell>
                    );
                  })}
                  {selectedMetric !== 'daily_users' && (
                    <TableCell className="text-center font-bold bg-gray-100 dark:bg-gray-900/30 group-hover:bg-gray-200 dark:group-hover:bg-gray-900/40 py-3 sm:py-4 px-1 text-xs sm:text-sm transition-colors">
                      {formatValue(last7Days.reduce((sum, day) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dailyTotal = protocols.reduce((sum, protocol) => {
                          const protocolData = dailyData[protocol];
                          if (protocolData && protocolData[dateKey] !== undefined) {
                            return sum + protocolData[dateKey];
                          }
                          return sum;
                        }, 0);
                        return sum + dailyTotal;
                      }, 0))}
                    </TableCell>
                  )}
                  <TableCell className="text-center font-bold bg-gray-100 dark:bg-gray-900/30 group-hover:bg-gray-200 dark:group-hover:bg-gray-900/40 py-1 sm:py-2 px-1 text-xs sm:text-sm transition-colors">
                    <div className={`flex items-center justify-center ${selectedMetric === 'daily_users' ? '' : 'gap-2'}`}>
                      <div className="w-[70px] h-[40px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart 
                            data={getTotalMetricData()} 
                            margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                          >
                            <Bar 
                              dataKey="value" 
                              opacity={0.9}
                              radius={[2, 2, 0, 0]}
                              maxBarSize={8}
                            >
                              {getTotalMetricData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.barColor} />
                              ))}
                            </Bar>
                            <Line 
                              type="monotone" 
                              dataKey="average"
                              stroke="#059669" 
                              strokeWidth={1}
                              dot={false}
                              strokeDasharray="2 2"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      {selectedMetric !== 'daily_users' && (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "h-5 px-2 text-xs font-medium flex-shrink-0 hover:bg-transparent",
                            getGrowthBadgeClasses(calculateTotalWeekOnWeekGrowth())
                          )}
                        >
                          {formatGrowthPercentage(calculateTotalWeekOnWeekGrowth())}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Action buttons below the table */}
        <div className="flex justify-end gap-2 mt-4 no-screenshot">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadReport}
            className="shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="shadow-sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>
      </div>
  );
}