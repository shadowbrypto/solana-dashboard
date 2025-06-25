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

import { ProtocolMetrics, Protocol } from "../types/protocol";
import { getDailyMetrics } from "../lib/protocol";
import { getMutableAllCategories, getMutableProtocolsByCategory } from "../lib/protocol-config";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface WeeklyMetricsTableProps {
  protocols: Protocol[];
  endDate: Date;
  onDateChange: (date: Date) => void;
}

type MetricKey = 'total_volume_usd' | 'daily_users' | 'numberOfNewUsers' | 'daily_trades';

interface DailyData {
  [protocol: string]: Record<string, number>; // date -> value
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

export function WeeklyMetricsTable({ protocols, endDate, onDateChange }: WeeklyMetricsTableProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [dailyData, setDailyData] = useState<DailyData>({});
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('total_volume_usd');
  const [last7Days, setLast7Days] = useState<Date[]>([]);
  const [topProtocols, setTopProtocols] = useState<Protocol[]>([]);

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
        
        protocols.forEach(protocol => {
          organizedData[protocol] = {};
          
          dailyResults.forEach((dayData, index) => {
            const dateKey = format(days[index], 'yyyy-MM-dd');
            if (dayData[protocol]) {
              organizedData[protocol][dateKey] = dayData[protocol][selectedMetric] || 0;
            } else {
              organizedData[protocol][dateKey] = 0;
            }
          });
        });
        
        setDailyData(organizedData);
        
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
  
  const getHeatMapColor = (value: number, maxValue: number): { bg: string; text: string } => {
    if (value === 0) return { bg: 'bg-gray-50 dark:bg-gray-900', text: 'text-gray-400 dark:text-gray-600' };
    
    const intensity = Math.min(value / maxValue, 1);
    const level = Math.floor(intensity * 8);
    
    // Green-Yellow-Orange heat map with subtle extremes
    const colors = [
      { bg: 'bg-green-100 dark:bg-green-950/30', text: 'text-green-800 dark:text-green-200' },
      { bg: 'bg-green-200 dark:bg-green-900/50', text: 'text-green-900 dark:text-green-100' },
      { bg: 'bg-green-300 dark:bg-green-800/60', text: 'text-green-900 dark:text-green-100' },
      { bg: 'bg-green-500 dark:bg-green-700/70', text: 'text-white' },
      { bg: 'bg-yellow-400 dark:bg-yellow-600/70', text: 'text-yellow-950 dark:text-yellow-50' },
      { bg: 'bg-orange-400 dark:bg-orange-600/70', text: 'text-orange-950 dark:text-orange-50' },
      { bg: 'bg-orange-500 dark:bg-orange-500/80', text: 'text-white' },
      { bg: 'bg-red-400 dark:bg-red-600/70', text: 'text-red-950 dark:text-red-50' },
      { bg: 'bg-red-500 dark:bg-red-500/80', text: 'text-white' }
    ];
    
    return colors[level] || colors[0];
  };
  
  const getMaxValue = (): number => {
    let max = 0;
    Object.values(dailyData).forEach(protocolData => {
      Object.values(protocolData).forEach(value => {
        if (value > max) max = value;
      });
    });
    return max;
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
    const tableElement = document.querySelector('[data-table="weekly-metrics"]') as HTMLElement;
    
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
            width: tableElement.scrollWidth,
            height: tableElement.scrollHeight,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              width: tableElement.scrollWidth + 'px',
              height: tableElement.scrollHeight + 'px'
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
        link.download = `weekly-metrics-${format(startDate, 'yyyy-MM-dd')}.png`;
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
    const tableElement = document.querySelector('[data-table="weekly-metrics"]') as HTMLElement;
    
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
            width: tableElement.scrollWidth,
            height: tableElement.scrollHeight,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              width: tableElement.scrollWidth + 'px',
              height: tableElement.scrollHeight + 'px'
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
    <div className="space-y-3">
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
      
      <div className="rounded-md border bg-card" data-table="weekly-metrics">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px] sticky left-0 z-20 bg-background py-3">Protocol</TableHead>
              {last7Days.map((day) => (
                <TableHead key={day.toISOString()} className="text-center min-w-[120px] px-3 py-3">
                  <span className="font-medium">
                    {format(day, 'EEE, MMM d')}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={last7Days.length + 1} className="text-center py-8">
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
                      <TableCell className={cn("sticky left-0 z-10 py-3 px-4 transition-colors", getCategoryRowColor(categoryName), getCategoryHoverColor(categoryName))}>
                        <div className="flex items-center gap-2">
                          <ChevronRight 
                            className={cn(
                              "h-4 w-4 transition-transform",
                              !isCollapsed && "rotate-90"
                            )}
                          />
                          <span className="font-semibold">{categoryName}</span>
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
                          <TableCell key={dateKey} className={cn("text-center font-semibold py-3 px-3 transition-colors", getCategoryRowColor(categoryName), getCategoryHoverColor(categoryName))}>
                            {formatValue(categoryTotal)}
                          </TableCell>
                        );
                      })}
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
                          <TableCell className="sticky left-0 z-10 bg-background group-hover:bg-muted/50 py-2 px-4 transition-colors">
                            <div className="flex items-center gap-2 pl-5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProtocolVisibility(protocol.id);
                                }}
                                className="p-1 hover:bg-muted rounded transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Eye className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <span>
                                {protocol.name}
                              </span>
                              {topProtocols.includes(protocol.id as Protocol) && (
                                <Badge 
                                  variant="secondary"
                                  className={cn(
                                    "ml-2 h-5 px-2 text-xs font-medium flex-shrink-0",
                                    topProtocols.indexOf(protocol.id as Protocol) === 0 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                                    topProtocols.indexOf(protocol.id as Protocol) === 1 && "bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300",
                                    topProtocols.indexOf(protocol.id as Protocol) === 2 && "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                  )}
                                >
                                  #{topProtocols.indexOf(protocol.id as Protocol) + 1}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {last7Days.map(day => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const value = protocolData[dateKey] || 0;
                            const maxValue = getMaxValue();
                            
                            const heatMapColor = getHeatMapColor(value, maxValue);
                            
                            return (
                              <TableCell 
                                key={dateKey} 
                                className={cn(
                                  "text-center py-2 px-3 transition-all relative font-medium",
                                  heatMapColor.bg,
                                  heatMapColor.text
                                )}
                              >
                                {formatValue(value)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
            
            {/* Total Row */}
            {!loading && (
              <TableRow className="border-t-2 border-primary/20 bg-primary/10 hover:bg-primary/20 font-bold group transition-colors">
                <TableCell className="sticky left-0 z-10 bg-primary/10 group-hover:bg-primary/20 font-bold py-3 px-4 transition-colors">
                  Total
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
                    <TableCell key={dateKey} className="text-center font-bold bg-primary/10 group-hover:bg-primary/20 py-3 px-3 transition-colors">
                      {formatValue(dailyTotal)}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Download and Copy buttons at bottom right */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadReport}
          className="no-screenshot"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="no-screenshot"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
      </div>
    </div>
  );
}