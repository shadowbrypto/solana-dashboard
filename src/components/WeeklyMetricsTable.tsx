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
import { cn, formatCurrency, formatNumber } from "../lib/utils";
import { ProtocolLogo } from "./ui/logo-with-fallback";
import domtoimage from "dom-to-image";
import { AreaChart, Area, ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Cell } from 'recharts';

import { ProtocolMetrics, Protocol } from "../types/protocol";
import { getDailyMetrics } from "../lib/protocol";
import { getMutableAllCategories, getMutableProtocolsByCategory, getProtocolLogoFilename } from "../lib/protocol-config";
import { Settings } from "../lib/settings";
import { protocolApi } from "../lib/api";
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

const formatGrowthPercentage = (growth: number): string => {
  const percentage = growth * 100;
  return `${Math.abs(percentage).toFixed(1)}%`;
};

const getGrowthBadgeClasses = (growth: number): string => {
  if (growth >= 0) return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"; // Positive
  return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"; // Negative
};

export function WeeklyMetricsTable({ protocols, endDate, onDateChange }: WeeklyMetricsTableProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [dailyData, setDailyData] = useState<DailyData>({});
  const [volumeData, setVolumeData] = useState<VolumeData>({});
  const [previousWeekData, setPreviousWeekData] = useState<DailyData>({});
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('total_volume_usd');
  const [last7Days, setLast7Days] = useState<Date[]>([]);
  const [topProtocols, setTopProtocols] = useState<Protocol[]>([]);
  const [optimizedWeeklyData, setOptimizedWeeklyData] = useState<any>(null);
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
        return 'bg-orange-100 dark:bg-orange-900/30';
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
        return 'group-hover:bg-orange-200 dark:group-hover:bg-orange-900/40';
      case 'Mobile Apps':
        return 'group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40';
      default:
        return 'group-hover:bg-muted/30';
    }
  };

  useEffect(() => {
    const fetchWeeklyData = async () => {
      setLoading(true);
      try {
        console.log('Fetching optimized weekly data for Solana protocols...');
        
        // Generate last 7 days ending with endDate for UI consistency
        const startDate = subDays(endDate, 6);
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        setLast7Days(days);
        
        // Get data type preference
        const dataType = Settings.getDataTypePreference();
        
        // Map frontend metric keys to backend metric keys for ranking
        const rankingMetricMapping = {
          'total_volume_usd': 'volume',
          'daily_users': 'users', 
          'numberOfNewUsers': 'newUsers',
          'daily_trades': 'trades'
        };
        
        const backendMetric = rankingMetricMapping[selectedMetric] || 'volume';
        
        // Single optimized API call instead of 14+ individual calls
        const weeklyData = await protocolApi.getWeeklyMetrics(endDate, 'solana', dataType, backendMetric);
        
        console.log('Received optimized weekly data:', weeklyData);
        
        // Transform backend data to match existing frontend structure
        const organizedData: DailyData = {};
        const organizedVolumeData: VolumeData = {};
        const prevWeekData: DailyData = {};
        
        // Map of metric keys between frontend and backend
        const metricMapping = {
          'total_volume_usd': 'volume',
          'daily_users': 'users', 
          'numberOfNewUsers': 'newUsers',
          'daily_trades': 'trades'
        };
        
        protocols.forEach(protocol => {
          organizedData[protocol] = {};
          organizedVolumeData[protocol] = {};
          prevWeekData[protocol] = {};
          
          const protocolData = weeklyData.weeklyData[protocol];
          if (protocolData) {
            // Current week daily data
            days.forEach(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const backendMetricKey = metricMapping[selectedMetric] || 'volume';
              
              organizedData[protocol][dateKey] = protocolData.dailyMetrics[backendMetricKey]?.[dateKey] || 0;
              organizedVolumeData[protocol][dateKey] = protocolData.dailyMetrics.volume[dateKey] || 0;
            });
          } else {
            // No data for this protocol, initialize with zeros
            days.forEach(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              organizedData[protocol][dateKey] = 0;
              organizedVolumeData[protocol][dateKey] = 0;
            });
          }
        });
        
        setDailyData(organizedData);
        setVolumeData(organizedVolumeData);
        setPreviousWeekData(prevWeekData); // We'll calculate growth from weeklyData
        
        // Store the optimized weekly data for growth calculations
        setOptimizedWeeklyData(weeklyData);
        
        // Set top protocols from backend response
        setTopProtocols(weeklyData.topProtocols as Protocol[]);
        
        console.log('Successfully processed optimized weekly data');
        
      } catch (error) {
        console.error('Error fetching optimized weekly data:', error);
        setDailyData({});
        setVolumeData({});
        setTopProtocols([]);
        setPreviousWeekData({});
        setOptimizedWeeklyData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeeklyData();
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
    if (!optimizedWeeklyData || !optimizedWeeklyData.weeklyData[protocolId]) return 0;
    
    const protocolData = optimizedWeeklyData.weeklyData[protocolId];
    const metricMapping = {
      'total_volume_usd': 'volume',
      'daily_users': 'users', 
      'numberOfNewUsers': 'newUsers',
      'daily_trades': 'trades'
    };
    
    const backendMetricKey = metricMapping[selectedMetric] || 'volume';
    return protocolData.growth[backendMetricKey] || 0;
  };

  const calculateCategoryWeekOnWeekGrowth = (categoryName: string): number => {
    if (!optimizedWeeklyData) return 0;
    
    const categoryProtocols = getMutableProtocolsByCategory(categoryName);
    const metricMapping = {
      'total_volume_usd': 'volume',
      'daily_users': 'users', 
      'numberOfNewUsers': 'newUsers',
      'daily_trades': 'trades'
    };
    
    const backendMetricKey = metricMapping[selectedMetric] || 'volume';
    
    // Calculate category totals from optimized backend data
    let categoryCurrentTotal = 0;
    let categoryPreviousTotal = 0;
    
    categoryProtocols.forEach(protocol => {
      const protocolData = optimizedWeeklyData.weeklyData[protocol.id];
      if (protocolData) {
        categoryCurrentTotal += protocolData.weeklyTotals[backendMetricKey] || 0;
        categoryPreviousTotal += protocolData.previousWeekTotals[backendMetricKey] || 0;
      }
    });
    
    if (categoryPreviousTotal === 0) return categoryCurrentTotal > 0 ? 1 : 0;
    return (categoryCurrentTotal - categoryPreviousTotal) / categoryPreviousTotal;
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
    if (!optimizedWeeklyData) return 0;
    
    const metricMapping = {
      'total_volume_usd': 'volume',
      'daily_users': 'users', 
      'numberOfNewUsers': 'newUsers',
      'daily_trades': 'trades'
    };
    
    const backendMetricKey = metricMapping[selectedMetric] || 'volume';
    
    // Calculate totals from optimized backend data
    let totalCurrentWeek = 0;
    let totalPreviousWeek = 0;
    
    protocols.forEach(protocol => {
      const protocolData = optimizedWeeklyData.weeklyData[protocol];
      if (protocolData) {
        totalCurrentWeek += protocolData.weeklyTotals[backendMetricKey] || 0;
        totalPreviousWeek += protocolData.previousWeekTotals[backendMetricKey] || 0;
      }
    });
    
    if (totalPreviousWeek === 0) return totalCurrentWeek > 0 ? 1 : 0;
    return (totalCurrentWeek - totalPreviousWeek) / totalPreviousWeek;
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
        const scale = 2;
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: (tableElement.scrollWidth + 40) * scale,
            height: (tableElement.scrollHeight + 10) * scale,
            style: {
              transform: `scale(${scale})`,
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
        toast({
          variant: "destructive",
          title: "Download Failed",
          description: error instanceof Error ? error.message : "Failed to generate report image",
          duration: 3000,
        });
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
        const scale = 2;
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: (tableElement.scrollWidth + 40) * scale,
            height: (tableElement.scrollHeight + 10) * scale,
            style: {
              transform: `scale(${scale})`,
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
          } catch (clipboardError) {
            toast({
              variant: "destructive",
              title: "Copy Failed",
              description: "Could not write to clipboard. Try using HTTPS.",
              duration: 3000,
            });
          }
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: error instanceof Error ? error.message : "Failed to generate report image",
          duration: 3000,
        });
      }
    }
  };

  const startDate = subDays(endDate, 6);

  return (
    <div className="relative space-y-3" data-table="weekly-metrics-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Weekly Report</h2>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-md">
              SOL
            </span>
          </div>
        </div>
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
              aria-label={hiddenProtocols.size > 0 ? "Show all protocols" : "Hide all protocols"}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {hiddenProtocols.size > 0 ? (
                <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4 mr-2" aria-hidden="true" />
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
              aria-label="Go to previous 7 days"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
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
              aria-label="Go to next 7 days"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        
        <div className="rounded-xl border bg-gradient-to-b from-background to-muted/10 overflow-x-auto" data-table="weekly-metrics">
          <Table>
            <TableHeader>
              <TableRow className="h-16">
                <TableHead className="w-[100px] sticky left-0 z-20 bg-background py-2 sm:py-3 text-xs sm:text-sm rounded-tl-xl">Protocol</TableHead>
                {last7Days.map((day) => {
                  const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  
                  return (
                    <TableHead key={day.toISOString()} className="text-center min-w-[90px] px-1 py-2 sm:py-3 text-xs sm:text-sm">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-sm font-medium whitespace-nowrap">{format(day, 'MMM dd')}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-normal px-2 py-0.5 min-w-[36px] justify-center ${
                            isWeekend 
                              ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' 
                              : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                          }`}
                        >
                          {format(day, 'EEE')}
                        </Badge>
                      </div>
                    </TableHead>
                  );
                })}
                {selectedMetric !== 'daily_users' && (
                  <TableHead className="text-center min-w-[90px] px-1 py-2 sm:py-3 text-xs sm:text-sm">Weekly Total</TableHead>
                )}
                <TableHead className="text-center min-w-[130px] px-1 py-2 sm:py-3 text-xs sm:text-sm">
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
                        <TableCell className={cn("sticky left-0 z-10 py-3 sm:py-4 px-1 text-xs sm:text-sm transition-colors", getCategoryRowColor(categoryName), getCategoryHoverColor(categoryName))}>
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
                          <TableCell className={cn("text-center font-bold py-2 sm:py-3 px-1 text-xs sm:text-sm transition-colors", getCategoryRowColor(categoryName), getCategoryHoverColor(categoryName))}>
                            <Badge variant="outline" className="font-semibold bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm py-0 -my-1">
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
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className={cn("text-center py-1 sm:py-2 px-1 text-xs sm:text-sm transition-colors w-[150px]", getCategoryRowColor(categoryName), getCategoryHoverColor(categoryName))}>
                          <div className="flex items-center justify-between w-full">
                            <div className="w-[50px] h-[36px] flex-shrink-0 -my-1">
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
                            {selectedMetric !== 'daily_users' ? (
                              <div className={cn(
                                "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ",
                                calculateCategoryWeekOnWeekGrowth(categoryName) >= 0
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              )}>
                                {calculateCategoryWeekOnWeekGrowth(categoryName) >= 0 ? (
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                  </svg>
                                ) : (
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                  </svg>
                                )}
                                {formatGrowthPercentage(calculateCategoryWeekOnWeekGrowth(categoryName))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs ">—</span>
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
                            <TableCell className="sticky left-0 z-10 bg-background group-hover:bg-muted/50 py-3 sm:py-4 px-1 text-xs sm:text-sm transition-colors">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleProtocolVisibility(protocol.id);
                                  }}
                                  className="p-1 hover:bg-muted rounded transition-all opacity-0 group-hover:opacity-100"
                                  aria-label={`Hide ${protocol.name} from table`}
                                >
                                  <Eye className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                                </button>
                                <div className="flex items-center gap-2">
                                  <ProtocolLogo
                                    src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                                    alt={protocol.name}
                                  />
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
                              <TableCell className="text-center py-2 sm:py-3 px-1 transition-all relative font-bold text-xs sm:text-sm">
                                <Badge variant="outline" className="font-medium bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm py-0 -my-1">
                                  {formatValue(last7Days.reduce((sum, day) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    const value = protocolData[dateKey] || 0;
                                    return sum + value;
                                  }, 0))}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell className="text-center py-1 sm:py-2 px-1 transition-all relative font-medium text-xs sm:text-sm w-[150px]">
                              <div className="flex items-center justify-between w-full">
                                <div className="w-[50px] h-[36px] flex-shrink-0 -my-1">
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
                                {selectedMetric !== 'daily_users' ? (
                                  <div className={cn(
                                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ",
                                    calculateWeekOnWeekGrowth(protocol.id) >= 0
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  )}>
                                    {calculateWeekOnWeekGrowth(protocol.id) >= 0 ? (
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                      </svg>
                                    ) : (
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                      </svg>
                                    )}
                                    {formatGrowthPercentage(calculateWeekOnWeekGrowth(protocol.id))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs ">—</span>
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
                <TableRow className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold group transition-colors rounded-b-xl">
                  <TableCell className="sticky left-0 z-10 bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 font-bold py-3 sm:py-4 px-1 text-xs sm:text-sm transition-colors rounded-bl-xl">
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
                      <TableCell key={dateKey} className="text-center font-bold bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 py-3 sm:py-4 px-1 text-xs sm:text-sm transition-colors">
                        {formatValue(dailyTotal)}
                      </TableCell>
                    );
                  })}
                  {selectedMetric !== 'daily_users' && (
                    <TableCell className="text-center font-bold bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 py-2 sm:py-3 px-1 text-xs sm:text-sm transition-colors">
                      <Badge variant="outline" className="font-bold bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm py-0 -my-1">
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
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-center font-bold bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 py-1 sm:py-2 px-1 text-xs sm:text-sm transition-colors w-[150px] rounded-br-xl">
                    <div className="flex items-center justify-between w-full">
                      <div className="w-[50px] h-[36px] flex-shrink-0 -my-1">
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
                      {selectedMetric !== 'daily_users' ? (
                        <div className={cn(
                          "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ",
                          calculateTotalWeekOnWeekGrowth() >= 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {calculateTotalWeekOnWeekGrowth() >= 0 ? (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          ) : (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                          )}
                          {formatGrowthPercentage(calculateTotalWeekOnWeekGrowth())}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs ">—</span>
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
            aria-label="Download weekly report as image"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="shadow-sm"
            aria-label="Copy weekly report to clipboard"
          >
            <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
            Copy
          </Button>
        </div>
      </div>
  );
}