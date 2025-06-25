import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isAfter, isBefore } from "date-fns";
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

interface WeeklyMetricsTableProps {
  protocols: Protocol[];
  weekStart: Date;
  onWeekChange: (date: Date) => void;
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

export function WeeklyMetricsTable({ protocols, weekStart, onWeekChange }: WeeklyMetricsTableProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [dailyData, setDailyData] = useState<DailyData>({});
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('total_volume_usd');
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  const metricOptions = [
    { key: 'total_volume_usd' as MetricKey, label: 'Volume (USD)', format: formatCurrency },
    { key: 'daily_users' as MetricKey, label: 'Daily Active Users', format: formatNumber },
    { key: 'numberOfNewUsers' as MetricKey, label: 'New Users', format: formatNumber },
    { key: 'daily_trades' as MetricKey, label: 'Daily Trades', format: formatNumber },
  ];

  const selectedMetricOption = metricOptions.find(m => m.key === selectedMetric) || metricOptions[0];

  // Date validation constants
  const MIN_DATE = new Date('2024-01-01'); // Earliest allowed date
  const MAX_DATE = new Date(); // Current date (no future dates allowed)
  
  // Check if navigation is allowed
  const canNavigatePrev = () => {
    const prevWeek = subWeeks(weekStart, 1);
    return !isBefore(prevWeek, MIN_DATE);
  };
  
  const canNavigateNext = () => {
    const nextWeek = addWeeks(weekStart, 1);
    return !isAfter(nextWeek, MAX_DATE);
  };


  // Category-based bright coloring using shadcn theme colors
  const getCategoryRowColor = (categoryName: string): string => {
    switch (categoryName) {
      case 'Telegram Bots':
        return 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/40';
      case 'Trading Terminals':
        return 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/40';
      case 'Mobile Apps':
        return 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/40';
      default:
        return 'hover:bg-muted/30';
    }
  };

  useEffect(() => {
    const fetchWeeklyData = async () => {
      setLoading(true);
      try {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        setWeekDays(days);
        
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
        
      } catch (error) {
        console.error('Error fetching weekly data:', error);
        setDailyData({});
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeeklyData();
  }, [weekStart, protocols, selectedMetric]);

  const handleWeekChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && !canNavigatePrev()) return;
    if (direction === 'next' && !canNavigateNext()) return;
    
    const newWeek = direction === 'prev' ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1);
    onWeekChange(newWeek);
  };

  const formatValue = (value: number) => {
    return selectedMetricOption.format(value);
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
        link.download = `weekly-metrics-${format(weekStart, 'yyyy-MM-dd')}.png`;
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

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleWeekChange('prev')}
            disabled={!canNavigatePrev()}
            title={!canNavigatePrev() ? `Cannot go before ${format(MIN_DATE, 'MMM d, yyyy')}` : 'Previous week'}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/30">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleWeekChange('next')}
            disabled={!canNavigateNext()}
            title={!canNavigateNext() ? 'Cannot go beyond current week' : 'Next week'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedMetric} onValueChange={(value: MetricKey) => setSelectedMetric(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
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
      
      <div className="rounded-md border bg-card" data-table="weekly-metrics">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px] sticky left-0 z-20 bg-background py-3">Protocol</TableHead>
              {weekDays.map((day) => (
                <TableHead key={day.toISOString()} className="text-center min-w-[110px] px-3 py-3">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">{format(day, 'EEE')}</span>
                    <span className="font-medium">{format(day, 'MMM d')}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={weekDays.length + 1} className="text-center py-8">
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
                
                // Filter out hidden protocols
                const visibleCategoryProtocols = categoryProtocols
                  .filter(p => !hiddenProtocols.has(p.id));

                return (
                  <React.Fragment key={categoryName}>
                    <TableRow 
                      className={cn(
                        "cursor-pointer font-medium group",
                        getCategoryRowColor(categoryName),
                        "transition-all duration-200"
                      )}
                      onClick={() => toggleCollapse(categoryName)}
                    >
                      <TableCell className={cn("sticky left-0 z-10 py-3 px-4", getCategoryRowColor(categoryName))}>
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
                      {weekDays.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const categoryTotal = visibleCategoryProtocols.reduce((sum, protocol) => {
                          const protocolData = dailyData[protocol.id];
                          if (protocolData && protocolData[dateKey] !== undefined) {
                            return sum + protocolData[dateKey];
                          }
                          return sum;
                        }, 0);
                        
                        return (
                          <TableCell key={dateKey} className={cn("text-center font-semibold py-3 px-3", getCategoryRowColor(categoryName))}>
                            {formatValue(categoryTotal)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    
                    {!isCollapsed && categoryProtocols.map(protocol => {
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
                                className="p-1 hover:bg-muted rounded transition-colors"
                              >
                                {isHidden ? (
                                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-3 w-3 text-muted-foreground" />
                                )}
                              </button>
                              <span>
                                {protocol.name}
                              </span>
                            </div>
                          </TableCell>
                          {weekDays.map(day => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const value = protocolData[dateKey] || 0;
                            
                            return (
                              <TableCell key={dateKey} className="text-center py-2 px-3">
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
                {weekDays.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dailyTotal = protocols.reduce((sum, protocol) => {
                    const protocolData = dailyData[protocol];
                    if (protocolData && protocolData[dateKey] !== undefined) {
                      return sum + protocolData[dateKey];
                    }
                    return sum;
                  }, 0);
                  
                  return (
                    <TableCell key={dateKey} className="text-center font-bold bg-primary/10 py-3 px-3">
                      {formatValue(dailyTotal)}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}