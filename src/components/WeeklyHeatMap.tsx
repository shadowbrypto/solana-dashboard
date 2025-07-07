import React, { useState, useEffect, useMemo } from "react";
import { format, subDays, eachDayOfInterval, isBefore, isAfter, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Download, Copy, Eye, EyeOff } from "lucide-react";
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
// @ts-ignore
import domtoimage from "dom-to-image";

import { Protocol } from "../types/protocol";
import { getDailyMetrics } from "../lib/protocol";
import { getMutableAllCategories, getMutableProtocolsByCategory } from "../lib/protocol-config";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Settings } from "../lib/settings";
import { useToast } from "../hooks/use-toast";

interface WeeklyHeatMapProps {
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

// Color scale function - returns a color based on the value and max value
const getHeatMapColor = (value: number, maxValue: number, minValue: number = 0): string => {
  if (value === 0 || maxValue === 0) {
    return 'bg-muted'; // Gray for zero values
  }
  
  // Normalize value between 0 and 1
  const normalizedValue = (value - minValue) / (maxValue - minValue);
  
  // Use a gradient from light to dark based on the theme
  // For light mode: light blue to dark blue
  // For dark mode: dark blue to bright blue
  const intensity = Math.round(normalizedValue * 9); // 0-9 scale
  
  const colorClasses = [
    'bg-blue-50 dark:bg-blue-950/20',
    'bg-blue-100 dark:bg-blue-900/30',
    'bg-blue-200 dark:bg-blue-900/40',
    'bg-blue-300 dark:bg-blue-800/50',
    'bg-blue-400 dark:bg-blue-700/60',
    'bg-blue-500 dark:bg-blue-600/70',
    'bg-blue-600 dark:bg-blue-500/80',
    'bg-blue-700 dark:bg-blue-400/90',
    'bg-blue-800 dark:bg-blue-300',
    'bg-blue-900 dark:bg-blue-200',
  ];
  
  return colorClasses[Math.min(intensity, 9)];
};

export function WeeklyHeatMap({ protocols, endDate, onDateChange }: WeeklyHeatMapProps) {
  const [dailyData, setDailyData] = useState<DailyData>({});
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(() => new Set(Settings.getWeeklyHeatmapHiddenProtocols()));
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>(() => Settings.getWeeklyHeatmapMetric() as MetricKey);
  const [last7Days, setLast7Days] = useState<Date[]>([]);
  const [topProtocols, setTopProtocols] = useState<Protocol[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{ protocol: string; date: string } | null>(null);
  const { toast } = useToast();

  const metricOptions = [
    { key: 'total_volume_usd' as MetricKey, label: 'Volume (USD)', format: formatCurrency },
    { key: 'daily_users' as MetricKey, label: 'Daily Active Users', format: formatNumber },
    { key: 'numberOfNewUsers' as MetricKey, label: 'New Users', format: formatNumber },
    { key: 'daily_trades' as MetricKey, label: 'Daily Trades', format: formatNumber },
  ];

  const selectedMetricOption = metricOptions.find(m => m.key === selectedMetric) || metricOptions[0];

  // Date validation constants
  const MIN_DATE = new Date('2024-01-01');
  const MAX_DATE = subDays(new Date(), 1);
  
  const canNavigatePrev = () => {
    const prev7Days = subDays(endDate, 7);
    return !isBefore(prev7Days, MIN_DATE);
  };
  
  const canNavigateNext = () => {
    const next7Days = addDays(endDate, 7);
    return !isAfter(next7Days, MAX_DATE);
  };

  // Calculate min and max values for the heat map scale
  const { minValue, maxValue } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    
    Object.values(dailyData).forEach(protocolData => {
      Object.values(protocolData).forEach(value => {
        if (value > 0) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });
    
    return {
      minValue: min === Infinity ? 0 : min,
      maxValue: max === -Infinity ? 0 : max
    };
  }, [dailyData]);

  useEffect(() => {
    const fetchLast7DaysData = async () => {
      setLoading(true);
      try {
        const startDate = subDays(endDate, 6);
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        setLast7Days(days);
        
        const dailyPromises = days.map(day => getDailyMetrics(day));
        const dailyResults = await Promise.all(dailyPromises);
        
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
        
        // Calculate protocol totals for ranking
        const protocolTotals = protocols.map(protocol => {
          const total = days.reduce((sum, day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            return sum + (organizedData[protocol]?.[dateKey] || 0);
          }, 0);
          return { protocol, total };
        });
        
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

  // Persist hidden protocols changes
  useEffect(() => {
    Settings.setWeeklyHeatmapHiddenProtocols(Array.from(hiddenProtocols));
  }, [hiddenProtocols]);

  // Persist selected metric changes
  useEffect(() => {
    Settings.setWeeklyHeatmapMetric(selectedMetric);
  }, [selectedMetric]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && !canNavigatePrev()) return;
    if (direction === 'next' && !canNavigateNext()) return;
    
    const newDate = direction === 'prev' ? subDays(endDate, 7) : addDays(endDate, 7);
    onDateChange(newDate);
  };

  const formatValue = (value: number) => {
    return selectedMetricOption.format(value);
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
    const heatMapElement = document.querySelector('[data-heatmap="weekly-heatmap"]') as HTMLElement;
    
    if (heatMapElement) {
      try {
        const dataUrl = await domtoimage.toPng(heatMapElement, {
          quality: 1,
          bgcolor: '#ffffff',
          width: heatMapElement.scrollWidth,
          height: heatMapElement.scrollHeight,
          filter: (node: any) => {
            return !node.classList?.contains('no-screenshot');
          }
        });
        
        const link = document.createElement('a');
        link.download = `weekly-heatmap-${format(startDate, 'yyyy-MM-dd')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading heat map:', error);
      }
    }
  };

  const copyToClipboard = async () => {
    const heatMapElement = document.querySelector('[data-heatmap="weekly-heatmap"]') as HTMLElement;
    
    if (heatMapElement) {
      try {
        const dataUrl = await domtoimage.toPng(heatMapElement, {
          quality: 1,
          bgcolor: '#ffffff',
          width: heatMapElement.scrollWidth,
          height: heatMapElement.scrollHeight,
          filter: (node: any) => {
            return !node.classList?.contains('no-screenshot');
          }
        });
        
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          toast({
            title: "Copied to clipboard",
            description: "Weekly heatmap copied successfully",
            duration: 2000,
          });
        }
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const startDate = subDays(endDate, 6);

  // Sort protocols by total value for better visualization
  const sortedProtocols = useMemo(() => {
    const protocolsWithTotals = protocols.map(protocol => {
      const total = last7Days.reduce((sum, day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return sum + (dailyData[protocol]?.[dateKey] || 0);
      }, 0);
      return { protocol, total };
    });
    
    return protocolsWithTotals
      .sort((a, b) => b.total - a.total)
      .map(p => p.protocol);
  }, [protocols, last7Days, dailyData]);

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
            title={!canNavigateNext() ? 'Cannot go beyond yesterday' : 'Next 7 days'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border bg-card overflow-x-auto" data-heatmap="weekly-heatmap">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-muted-foreground">Loading heat map data...</span>
            </div>
          </div>
        ) : (
          <div className="min-w-[800px]">
            {/* Header row with dates */}
            <div className="flex border-b">
              <div className="w-[200px] p-4 font-medium border-r bg-muted/30">
                Protocol
              </div>
              {last7Days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="flex-1 p-4 text-center font-medium bg-muted/30 border-r last:border-r-0"
                >
                  <div className="text-sm">{format(day, 'EEE')}</div>
                  <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                </div>
              ))}
            </div>
            
            {/* Heat map rows */}
            {getMutableAllCategories().map(categoryName => {
              const categoryProtocols = getMutableProtocolsByCategory(categoryName);
              const sortedCategoryProtocols = categoryProtocols.sort((a, b) => {
                const indexA = sortedProtocols.indexOf(a.id as Protocol);
                const indexB = sortedProtocols.indexOf(b.id as Protocol);
                return indexA - indexB;
              });
              
              return (
                <React.Fragment key={categoryName}>
                  {/* Category header */}
                  <div className="flex border-b bg-muted/10">
                    <div className="w-[200px] p-3 font-semibold border-r">
                      {categoryName}
                    </div>
                    <div className="flex-1" />
                  </div>
                  
                  {/* Protocol rows */}
                  {sortedCategoryProtocols.map(protocol => {
                    if (hiddenProtocols.has(protocol.id)) return null;
                    
                    const protocolData = dailyData[protocol.id] || {};
                    const ranking = topProtocols.indexOf(protocol.id as Protocol) + 1;
                    
                    return (
                      <div key={protocol.id} className="flex border-b hover:bg-muted/5 group">
                        <div className="w-[200px] p-3 border-r flex items-center gap-2">
                          <button
                            onClick={() => toggleProtocolVisibility(protocol.id)}
                            className="p-1 hover:bg-muted rounded transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <span className="flex-1">{protocol.name}</span>
                          {ranking > 0 && ranking <= 3 && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "h-5 px-2 text-xs font-medium",
                                ranking === 1 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                                ranking === 2 && "bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300",
                                ranking === 3 && "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                              )}
                            >
                              #{ranking}
                            </Badge>
                          )}
                        </div>
                        {last7Days.map(day => {
                          const dateKey = format(day, 'yyyy-MM-dd');
                          const value = protocolData[dateKey] || 0;
                          const isHovered = hoveredCell?.protocol === protocol.id && hoveredCell?.date === dateKey;
                          
                          return (
                            <div
                              key={dateKey}
                              className={cn(
                                "flex-1 p-3 border-r last:border-r-0 relative transition-all duration-200",
                                getHeatMapColor(value, maxValue, minValue),
                                isHovered && "ring-2 ring-primary ring-inset z-10"
                              )}
                              onMouseEnter={() => setHoveredCell({ protocol: protocol.id, date: dateKey })}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {/* Tooltip on hover */}
                              {isHovered && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded shadow-lg z-20 whitespace-nowrap">
                                  <div className="font-medium">{protocol.name}</div>
                                  <div className="text-xs text-muted-foreground">{format(day, 'MMM d, yyyy')}</div>
                                  <div className="font-semibold">{formatValue(value)}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
            
            {/* Legend */}
            <div className="p-4 border-t bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Color intensity represents {selectedMetricOption.label.toLowerCase()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Low</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                      <div
                        key={i}
                        className={cn(
                          "w-6 h-6 rounded",
                          getHeatMapColor(i, 9, 0)
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">High</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Download and Copy buttons */}
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