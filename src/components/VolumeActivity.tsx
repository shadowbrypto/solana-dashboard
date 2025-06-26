import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { getProtocolLogoFilename, protocolConfigs } from '../lib/protocol-config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Activity, TrendingUp } from 'lucide-react';

interface VolumeActivityProps {
  title: string;
  subtitle?: string;
  data: {
    date: string;
    volume_usd: number;
    [key: string]: any;
  }[];
  protocolColor?: string;
  loading?: boolean;
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
};

const formatTooltipDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const day = date.getDate();
    const ordinalSuffix = (n: number) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return date.toLocaleDateString('en-US', { 
      month: 'long',
      year: 'numeric'
    }).replace(date.getFullYear().toString(), `${day}${ordinalSuffix(day)}, ${date.getFullYear()}`);
  } catch {
    return dateStr;
  }
};

const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)} Billion`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)} Million`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)} Thousand`;
  return `$${value.toFixed(2)}`;
};

const getIntensityLevel = (value: number, max: number): number => {
  if (max === 0 || value === 0) return 0;
  const ratio = value / max;
  
  // Create 9 levels for better granular visualization
  if (ratio <= 0.11) return 1;
  if (ratio <= 0.22) return 2;
  if (ratio <= 0.33) return 3;
  if (ratio <= 0.44) return 4;
  if (ratio <= 0.55) return 5;
  if (ratio <= 0.66) return 6;
  if (ratio <= 0.77) return 7;
  if (ratio <= 0.88) return 8;
  return 9;
};

const getGreenColorClass = (intensity: number): string => {
  if (intensity === 0) return 'bg-transparent';
  
  // 9 color shades for optimal visualization
  const colorMap: Record<number, string> = {
    1: 'bg-green-100 dark:bg-green-950/20',
    2: 'bg-green-200 dark:bg-green-900/30',
    3: 'bg-green-300 dark:bg-green-800/40',
    4: 'bg-green-400 dark:bg-green-700/50',
    5: 'bg-green-500 dark:bg-green-600/60',
    6: 'bg-green-600 dark:bg-green-500/70',
    7: 'bg-green-700 dark:bg-green-400/80',
    8: 'bg-green-800 dark:bg-green-300/90',
    9: 'bg-green-900 dark:bg-green-200'
  };
  
  return colorMap[intensity] || 'bg-green-900 dark:bg-green-200';
};

export function VolumeActivity({ 
  title, 
  subtitle,
  data,
  protocolColor = "hsl(var(--primary))",
  loading
}: VolumeActivityProps) {
  // Get current year as default
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const activityData = useMemo(() => {
    if (!data || data.length === 0) return { weeks: [], months: [], maxVolume: 0 };

    try {
      const validData = data.filter(d => d && d.date && typeof d.volume_usd === 'number');
      if (validData.length === 0) return { weeks: [], months: [], maxVolume: 0 };

      // Sort by date and filter by selected year
      const sortedData = [...validData].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const yearData = sortedData.filter(d => {
        const year = new Date(d.date).getFullYear().toString();
        return year === selectedYear;
      });

      if (yearData.length === 0) return { weeks: [], months: [], maxVolume: 0 };

      const maxVolume = Math.max(...yearData.map(d => d.volume_usd));

      // Create a full year calendar grid (53 weeks x 7 days)
      const startOfYear = new Date(parseInt(selectedYear), 0, 1);
      const startOfWeek = new Date(startOfYear);
      startOfWeek.setDate(startOfYear.getDate() - startOfYear.getDay()); // Go to Sunday of first week

      const weeks: Array<Array<{ date: string; volume: number; intensity: number; isCurrentYear: boolean }>> = [];
      const months: string[] = [];
      
      for (let week = 0; week < 53; week++) {
        const weekData: Array<{ date: string; volume: number; intensity: number; isCurrentYear: boolean }> = [];
        
        for (let day = 0; day < 7; day++) {
          const currentDate = new Date(startOfWeek);
          currentDate.setDate(startOfWeek.getDate() + (week * 7) + day);
          
          const dateString = currentDate.toISOString().split('T')[0];
          const isCurrentYear = currentDate.getFullYear().toString() === selectedYear;
          
          // Find data for this date
          const dayData = yearData.find(d => d.date === dateString);
          
          weekData.push({
            date: dateString,
            volume: dayData ? dayData.volume_usd : 0,
            intensity: dayData ? getIntensityLevel(dayData.volume_usd, maxVolume) : 0,
            isCurrentYear
          });
        }
        weeks.push(weekData);
        
        // Track month labels
        const firstDayOfWeek = new Date(startOfWeek);
        firstDayOfWeek.setDate(startOfWeek.getDate() + (week * 7));
        if (firstDayOfWeek.getFullYear().toString() === selectedYear) {
          const monthName = firstDayOfWeek.toLocaleDateString('en-US', { month: 'short' });
          if (!months.includes(monthName)) {
            months.push(monthName);
          }
        }
      }

      return { weeks, months, maxVolume };
    } catch (error) {
      return { weeks: [], months: [], maxVolume: 0 };
    }
  }, [data, selectedYear]);

  // Get available years from data
  const availableYears = useMemo(() => {
    if (!data || data.length === 0) return [currentYear];
    
    const years = [...new Set(data
      .filter(d => d && d.date)
      .map(d => new Date(d.date).getFullYear().toString())
    )].sort((a, b) => parseInt(b) - parseInt(a));
    
    return years.length > 0 ? years : [currentYear];
  }, [data, currentYear]);

  if (loading) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
              {subtitle && (
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-muted animate-pulse rounded" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </div>
              <div className="w-24 h-8 bg-muted animate-pulse rounded-xl" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Month headers skeleton */}
          <div className="relative w-full mb-4">
            <div className="grid grid-cols-12 gap-1 w-full">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-3 w-6 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
          
          {/* GitHub-style contribution graph skeleton - horizontal layout */}
          <div className="relative">
            <div className="w-full overflow-x-auto">
              <div className="flex gap-1 min-w-full">
                {[...Array(53)].map((_, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {[...Array(7)].map((_, dayIndex) => (
                      <div key={dayIndex} className="w-4 h-4 bg-muted animate-pulse rounded-sm" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Legend skeleton */}
            <div className="flex items-center justify-end text-xs mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-8 bg-muted animate-pulse rounded" />
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-muted animate-pulse rounded-sm" />
                  ))}
                </div>
                <div className="h-3 w-8 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activityData.weeks.length === 0) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No volume activity data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalVolume = data.reduce((sum, day) => sum + (day.volume_usd || 0), 0);
  const activeDays = data.filter(day => (day.volume_usd || 0) > 0).length;

  if (!title) {
    // Embedded mode - no card wrapper
    return (
      <div className="space-y-4">
        {/* Year selector and month headers */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Learn how we count contributions</span>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year} className="text-sm">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month headers - full width */}
        <div className="relative w-full mb-4">
          <div className="grid grid-cols-12 gap-1 w-full">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
              <div
                key={month}
                className="text-xs text-muted-foreground text-center"
              >
                {month}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar grid - full width horizontal */}
        <div className="relative">
          <div className="w-full overflow-x-auto">
            <div className="flex gap-1 min-w-full">
              {activityData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-4 h-4 rounded-sm transition-all duration-200 hover:opacity-80 hover:scale-110 hover:z-50 group relative cursor-pointer ${
                        !day.isCurrentYear ? 'bg-transparent' : getGreenColorClass(day.intensity)
                      }`}
                    >
                      {day.isCurrentYear && day.volume > 0 && (
                        <div className={`absolute rounded-lg bg-black text-white p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap ${
                          dayIndex < 3 ? 'top-full mt-2' : 'bottom-full mb-2'
                        } ${
                          weekIndex < 5 ? 'left-0' : weekIndex > 47 ? 'right-0' : 'left-1/2 transform -translate-x-1/2'
                        }`}>
                          <div className="space-y-1">
                            <div className="text-xs font-medium">
                              {day.volume > 0 ? formatCurrency(day.volume) : 'No trading activity'}
                            </div>
                            <div className="text-xs text-gray-300">
                              {formatTooltipDate(day.date)}
                            </div>
                          </div>
                          {/* Tooltip arrow */}
                          <div className={`absolute w-0 h-0 border-l-4 border-r-4 border-transparent ${
                            dayIndex < 3 
                              ? 'bottom-full border-b-4 border-b-black' 
                              : 'top-full border-t-4 border-t-black'
                          } ${
                            weekIndex < 5 ? 'left-4' : weekIndex > 47 ? 'right-4' : 'left-1/2 transform -translate-x-1/2'
                          }`}></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend - bottom right */}
          <div className="flex items-center justify-end text-xs mt-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Less</span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-muted rounded-sm" />
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                  <div key={level} className={`w-4 h-4 rounded-sm ${getGreenColorClass(level)}`} />
                ))}
              </div>
              <span className="text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {(() => {
                  // Check if subtitle is a protocol name
                  const protocolMatch = protocolConfigs.find(p => p.name === subtitle);
                  if (protocolMatch) {
                    return (
                      <>
                        <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                          <img 
                            src={`/assets/logos/${getProtocolLogoFilename(protocolMatch.id)}`}
                            alt={subtitle} 
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
                        {subtitle}
                      </>
                    );
                  }
                  return subtitle;
                })()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3" />
              <span className="text-muted-foreground">{activeDays} active days</span>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year} className="text-sm">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Month headers for card mode */}
        <div className="relative w-full mb-4">
          <div className="grid grid-cols-12 gap-1 w-full">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
              <div
                key={month}
                className="text-xs text-muted-foreground text-center"
              >
                {month}
              </div>
            ))}
          </div>
        </div>
        
        {/* Calendar grid - full width horizontal */}
        <div className="relative">
          <div className="w-full overflow-x-auto">
            <div className="flex gap-1 min-w-full">
              {activityData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-4 h-4 rounded-sm transition-all duration-200 hover:opacity-80 hover:scale-110 hover:z-50 group relative cursor-pointer ${
                        !day.isCurrentYear ? 'bg-transparent' : getGreenColorClass(day.intensity)
                      }`}
                    >
                      {day.isCurrentYear && day.volume > 0 && (
                        <div className={`absolute rounded-lg bg-black text-white p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap ${
                          dayIndex < 3 ? 'top-full mt-2' : 'bottom-full mb-2'
                        } ${
                          weekIndex < 5 ? 'left-0' : weekIndex > 47 ? 'right-0' : 'left-1/2 transform -translate-x-1/2'
                        }`}>
                          <div className="space-y-1">
                            <div className="text-xs font-medium">
                              {day.volume > 0 ? formatCurrency(day.volume) : 'No trading activity'}
                            </div>
                            <div className="text-xs text-gray-300">
                              {formatTooltipDate(day.date)}
                            </div>
                          </div>
                          {/* Tooltip arrow */}
                          <div className={`absolute w-0 h-0 border-l-4 border-r-4 border-transparent ${
                            dayIndex < 3 
                              ? 'bottom-full border-b-4 border-b-black' 
                              : 'top-full border-t-4 border-t-black'
                          } ${
                            weekIndex < 5 ? 'left-4' : weekIndex > 47 ? 'right-4' : 'left-1/2 transform -translate-x-1/2'
                          }`}></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend - bottom right */}
          <div className="flex items-center justify-end text-xs mt-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Less</span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-muted rounded-sm" />
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                  <div key={level} className={`w-4 h-4 rounded-sm ${getGreenColorClass(level)}`} />
                ))}
              </div>
              <span className="text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}