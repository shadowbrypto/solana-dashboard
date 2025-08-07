import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ComponentActions } from './ComponentActions';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Zap, 
  Calendar,
  Trophy,
  Target,
  Flame,
  Star,
  Award,
  Activity
} from 'lucide-react';
import { getProtocolLogoFilename } from '../lib/protocol-config';

interface ProtocolHighlightsProps {
  title: string;
  subtitle?: string;
  protocolId?: string;
  data: {
    date: string;
    volume_usd: number;
    daily_users: number;
    new_users: number;
    trades: number;
    fees_usd: number;
    [key: string]: any;
  }[];
  protocolColor?: string;
  loading?: boolean;
}

interface Highlight {
  icon: React.ElementType;
  label: string;
  value: string;
  date?: string;
  type: 'achievement' | 'milestone' | 'record';
  color: string;
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

const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number): string => {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString();
};

const calculateWeeklyData = (data: any[]) => {
  const weeklyData: { [key: string]: { volume: number, users: number, trades: number, fees: number, dates: string[] } } = {};
  
  data.forEach(day => {
    if (!day.date) return;
    const date = new Date(day.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { volume: 0, users: 0, trades: 0, fees: 0, dates: [] };
    }
    
    weeklyData[weekKey].volume += day.volume_usd || 0;
    weeklyData[weekKey].users = Math.max(weeklyData[weekKey].users, day.daily_users || 0);
    weeklyData[weekKey].trades += day.trades || 0;
    weeklyData[weekKey].fees += day.fees_usd || 0;
    weeklyData[weekKey].dates.push(day.date);
  });
  
  return Object.entries(weeklyData).map(([week, data]) => ({
    week,
    ...data,
    weekRange: `${formatDate(week)} - ${formatDate(new Date(new Date(week).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}`
  }));
};

const calculateMonthlyData = (data: any[]) => {
  const monthlyData: { [key: string]: { volume: number, users: number, trades: number, fees: number } } = {};
  
  data.forEach(day => {
    if (!day.date) return;
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { volume: 0, users: 0, trades: 0, fees: 0 };
    }
    
    monthlyData[monthKey].volume += day.volume_usd || 0;
    monthlyData[monthKey].users = Math.max(monthlyData[monthKey].users, day.daily_users || 0);
    monthlyData[monthKey].trades += day.trades || 0;
    monthlyData[monthKey].fees += day.fees_usd || 0;
  });
  
  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    monthName: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    ...data
  }));
};

export function ProtocolHighlights({ 
  title, 
  subtitle,
  data,
  protocolColor = "hsl(var(--primary))",
  loading
}: ProtocolHighlightsProps) {
  const highlights = useMemo((): Highlight[] => {
    if (!data || data.length === 0) return [];

    try {
      const validData = data.filter(d => d && d.date);
      if (validData.length === 0) return [];

      const sortedData = [...validData].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const weeklyData = calculateWeeklyData(sortedData);
      const monthlyData = calculateMonthlyData(sortedData);

      // Peak daily metrics
      const peakVolumeDay = sortedData.reduce((max, day) => 
        (day.volume_usd || 0) > (max.volume_usd || 0) ? day : max
      );
      const peakUsersDay = sortedData.reduce((max, day) => 
        (day.daily_users || 0) > (max.daily_users || 0) ? day : max
      );
      const peakTradesDay = sortedData.reduce((max, day) => 
        (day.trades || 0) > (max.trades || 0) ? day : max
      );
      const peakFeesDay = sortedData.reduce((max, day) => 
        (day.fees_usd || 0) > (max.fees_usd || 0) ? day : max
      );
      const peakNewUsersDay = sortedData.reduce((max, day) => 
        (day.new_users || 0) > (max.new_users || 0) ? day : max
      );

      // Peak weekly/monthly metrics
      const peakVolumeWeek = weeklyData.reduce((max, week) => 
        week.volume > max.volume ? week : max, { volume: 0, weekRange: '' }
      );
      const peakVolumeMonth = monthlyData.reduce((max, month) => 
        month.volume > max.volume ? month : max, { volume: 0, monthName: '' }
      );

      // Calculate totals and streaks
      const totalVolume = sortedData.reduce((sum, day) => sum + (day.volume_usd || 0), 0);
      const totalTrades = sortedData.reduce((sum, day) => sum + (day.trades || 0), 0);
      const activeDays = sortedData.filter(day => (day.volume_usd || 0) > 0).length;

      // Growth milestones
      const first1B = sortedData.find(day => {
        const cumulativeVolume = sortedData
          .filter(d => new Date(d.date) <= new Date(day.date))
          .reduce((sum, d) => sum + (d.volume_usd || 0), 0);
        return cumulativeVolume >= 1_000_000_000;
      });

      // Calculate days to milestones
      const firstDate = new Date(sortedData[0].date);
      const daysTo1B = first1B ? Math.ceil((new Date(first1B.date).getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

      const highlightsList: Highlight[] = [
        // Volume Records
        {
          icon: TrendingUp,
          label: 'Peak Daily Volume',
          value: formatCurrency(peakVolumeDay.volume_usd || 0),
          date: formatDate(peakVolumeDay.date),
          type: 'record',
          color: 'text-green-500'
        },
        {
          icon: Calendar,
          label: 'Best Weekly Volume',
          value: formatCurrency(peakVolumeWeek.volume),
          date: peakVolumeWeek.weekRange,
          type: 'record',
          color: 'text-blue-500'
        },
        {
          icon: Target,
          label: 'Best Monthly Volume',
          value: formatCurrency(peakVolumeMonth.volume),
          date: peakVolumeMonth.monthName,
          type: 'record',
          color: 'text-purple-500'
        },

        // User Records
        {
          icon: Users,
          label: 'Peak Daily Users',
          value: formatNumber(peakUsersDay.daily_users || 0),
          date: formatDate(peakUsersDay.date),
          type: 'record',
          color: 'text-orange-500'
        },
        {
          icon: Star,
          label: 'Best New User Day',
          value: formatNumber(peakNewUsersDay.new_users || 0),
          date: formatDate(peakNewUsersDay.date),
          type: 'record',
          color: 'text-yellow-500'
        },

        // Trading Records
        {
          icon: Zap,
          label: 'Peak Daily Trades',
          value: formatNumber(peakTradesDay.trades || 0),
          date: formatDate(peakTradesDay.date),
          type: 'record',
          color: 'text-red-500'
        },


        // User Efficiency
        {
          icon: Users,
          label: 'User Efficiency',
          value: formatCurrency((totalVolume / (sortedData.reduce((sum, day) => sum + (day.daily_users || 0), 0))) || 0),
          date: 'Volume per User',
          type: 'achievement',
          color: 'text-blue-500'
        },

        // First 1B Volume
        {
          icon: Target,
          label: 'First $1B Volume',
          value: daysTo1B ? `${daysTo1B} days` : 'Not reached',
          date: daysTo1B ? formatDate(first1B!.date) : 'Milestone pending',
          type: 'milestone',
          color: 'text-amber-500'
        },

        // Milestones
        {
          icon: Trophy,
          label: 'Active Days',
          value: `${activeDays} days`,
          date: `Since ${formatDate(sortedData[0].date)}`,
          type: 'achievement',
          color: 'text-cyan-500'
        }
      ];


      return highlightsList.slice(0, 9); // Show top 9 highlights
    } catch (error) {
      return [];
    }
  }, [data]);

  if (loading) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="w-20 h-4 bg-muted animate-pulse rounded" />
                <div className="w-16 h-6 bg-muted animate-pulse rounded" />
                <div className="w-24 h-3 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (highlights.length === 0) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No highlights available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ComponentActions 
      componentName={`${title} Protocol Highlights`}
      filename={`${title.replace(/\s+/g, '_')}_Protocol_Highlights.png`}
    >
      <Card className="overflow-hidden">
      <CardHeader className="pt-3 pb-2 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {subtitle ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                  <img 
                    src={`/assets/logos/${getProtocolLogoFilename(subtitle.toLowerCase().replace(' ', ''))}`}
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
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Key metrics and achievements
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-5 text-xs">
              <Activity className="w-2.5 h-2.5 mr-1" />
              9 highlights
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 border-t sm:border-t-0">
          {highlights.map((highlight, index) => {
            const IconComponent = highlight.icon;
            const isLast = index === highlights.length - 1;
            const isRightColumnDesktop = (index + 1) % 3 === 0;
            const isRightColumnMobile = (index + 1) % 2 === 0;
            const isBottomRowDesktop = index >= highlights.length - (highlights.length % 3 || 3);
            const isBottomRowMobile = index >= highlights.length - (highlights.length % 2 || 2);
            
            return (
              <div 
                key={index}
                className={`relative group p-2 sm:p-4 transition-all duration-200 hover:bg-muted/30 border-r border-b ${
                  isRightColumnMobile ? 'border-r-0' : ''
                } ${
                  isRightColumnDesktop ? 'lg:border-r-0' : 'lg:border-r'
                } ${
                  isBottomRowMobile ? 'border-b-0' : ''
                } ${
                  isBottomRowDesktop ? 'lg:border-b-0' : 'lg:border-b'
                }`}
              >
                <div className="flex flex-col space-y-0.5 sm:space-y-4 h-full min-h-[50px] sm:min-h-[90px]">
                  {/* Top row: Icon and Title side by side */}
                  <div className="flex items-start gap-2.5">
                    <div className={`flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-xl shadow-sm ${
                      highlight.type === 'milestone' ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200/50 dark:border-amber-700/30' :
                      highlight.type === 'record' ? 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-700/30' :
                      'bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-200/50 dark:border-emerald-700/30'
                    }`}>
                      <IconComponent className={`h-3.5 w-3.5 ${
                        highlight.type === 'milestone' ? 'text-amber-600 dark:text-amber-400' :
                        highlight.type === 'record' ? 'text-blue-600 dark:text-blue-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground leading-tight">
                          {highlight.label}
                        </h4>
                        {highlight.type === 'milestone' && (
                          <Badge variant="outline" className="h-4 text-[10px] font-medium bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-800 dark:from-amber-950/40 dark:to-orange-950/40 dark:border-amber-700 dark:text-amber-300 shadow-sm ml-2 flex-shrink-0">
                            <Star className="w-2 h-2 sm:mr-0.5 fill-current" />
                            <span className="hidden sm:inline">Milestone</span>
                          </Badge>
                        )}
                      </div>
                      {highlight.date && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground/70 font-medium">
                          {highlight.date}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Value on new line */}
                  <div className="text-center pb-0 sm:pb-2 pt-1 sm:pt-0">
                    <p className="text-lg sm:text-3xl font-medium tracking-tight text-foreground leading-tight">
                      {highlight.value}
                    </p>
                  </div>
                </div>
                
                {/* Subtle hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
    </ComponentActions>
  );
}