import { Button } from './ui/button';
import { RefreshCw, Clock, AlertCircle, X } from 'lucide-react';
import { useDataSync } from '../hooks/useDataSync';
import { useToast } from '../hooks/useToast';
import { Toast } from './ui/toast';
import { cn } from '../lib/utils';
import { useEffect } from 'react';

interface DataSyncButtonProps {
  isCollapsed?: boolean;
}

export function DataSyncButton({ isCollapsed = false }: DataSyncButtonProps) {
  const { 
    isLoading, 
    canSync, 
    lastSyncTime, 
    timeUntilNext, 
    error,
    hasCurrentData = false,
    missingProtocols = [],
    syncData 
  } = useDataSync();
  
  const { toasts, removeToast, success, error: showError } = useToast();
  
  // Show toast notifications when sync completes
  useEffect(() => {
    if (!isLoading) {
      if (error) {
        showError(`Sync failed: ${error}`);
      } else if (lastSyncTime) {
        const now = new Date();
        const timeDiff = now.getTime() - lastSyncTime.getTime();
        // Only show success if sync happened in the last 10 seconds
        if (timeDiff < 10000) {
          success('Data synced successfully!');
        }
      }
    }
  }, [isLoading, error, lastSyncTime, success, showError]);

  const getButtonIcon = () => {
    if (isLoading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (error) return <AlertCircle className="h-4 w-4" />;
    if (canSync) return <RefreshCw className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };


  const getButtonVariant = () => {
    if (error) return 'destructive';
    if (canSync) return 'default';
    return 'secondary';
  };

  const getProgressPercentage = () => {
    if (!timeUntilNext || canSync) return 0;
    
    // Calculate progress based on a 24-hour cycle
    const now = getCETDate();
    
    // If we have lastSyncTime, calculate from that point
    if (lastSyncTime) {
      const timeSinceLastSync = now.getTime() - lastSyncTime.getTime();
      const totalCycle = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const progress = Math.max(0, Math.min(100, (timeSinceLastSync / totalCycle) * 100));
      
      // Debug logging
      console.log('Progress calculation:', {
        lastSyncTime: lastSyncTime.toISOString(),
        now: now.toISOString(),
        timeSinceLastSync: timeSinceLastSync / (1000 * 60 * 60), // hours
        progress: progress
      });
      
      return progress;
    }
    
    // Fallback: calculate based on current time position in 24-hour cycle
    const todayAt10AM = new Date(now);
    todayAt10AM.setHours(10, 0, 0, 0);
    
    let cyclePeriod: { start: Date; end: Date };
    
    if (now >= todayAt10AM) {
      // We're past 10 AM today, so cycle is from today 10 AM to tomorrow 10 AM
      const tomorrowAt10AM = new Date(todayAt10AM);
      tomorrowAt10AM.setDate(tomorrowAt10AM.getDate() + 1);
      cyclePeriod = { start: todayAt10AM, end: tomorrowAt10AM };
    } else {
      // We're before 10 AM today, so cycle is from yesterday 10 AM to today 10 AM
      const yesterdayAt10AM = new Date(todayAt10AM);
      yesterdayAt10AM.setDate(yesterdayAt10AM.getDate() - 1);
      cyclePeriod = { start: yesterdayAt10AM, end: todayAt10AM };
    }
    
    const totalCycleDuration = cyclePeriod.end.getTime() - cyclePeriod.start.getTime();
    const elapsedTime = now.getTime() - cyclePeriod.start.getTime();
    const progress = Math.max(0, Math.min(100, (elapsedTime / totalCycleDuration) * 100));
    
    // Debug logging for fallback calculation
    console.log('Fallback progress calculation:', {
      cyclePeriod: {
        start: cyclePeriod.start.toISOString(),
        end: cyclePeriod.end.toISOString()
      },
      now: now.toISOString(),
      elapsedHours: elapsedTime / (1000 * 60 * 60),
      totalHours: totalCycleDuration / (1000 * 60 * 60),
      progress: progress
    });
    
    return progress;
  };

  const getCETDate = () => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  };


  if (isCollapsed) {
    return (
      <>
        <div className="flex flex-col items-center space-y-3">
          {/* Icon Button */}
          <div className="relative">
            <Button
              variant={getButtonVariant() as any}
              size="icon"
              onClick={syncData}
              disabled={!canSync || isLoading}
              className={cn(
                "h-12 w-12 relative overflow-hidden",
                canSync && "hover:scale-110 transition-all duration-200 shadow-lg"
              )}
              title={`${canSync ? 'Available' : 'Waiting'}`}
            >
              {getButtonIcon()}
              
              {/* Status indicator ring */}
              <div className={cn(
                "absolute inset-0 rounded-full border-2 transition-all duration-300",
                canSync ? "border-green-400 shadow-lg shadow-green-400/30" :
                error ? "border-red-400" :
                "border-orange-400"
              )} />
              
              {/* Pulse effect when available */}
              {canSync && (
                <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
              )}
            </Button>
          </div>
          
          {/* Compact Status */}
          <div className="text-center space-y-1">
            {/* Status Dot */}
            <div className="flex justify-center">
              {canSync ? (
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              ) : error ? (
                <div className="h-2 w-2 rounded-full bg-red-500" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-orange-500" />
              )}
            </div>
            
            {/* Countdown or Status */}
            {timeUntilNext && !canSync && !error && (
              <div className="text-xs font-mono text-foreground font-medium">
                {timeUntilNext}
              </div>
            )}
            
          </div>
          
          {/* Mini Progress Bar */}
          {!canSync && !error && timeUntilNext && (
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000"
                style={{ width: `${Math.max(2, getProgressPercentage())}%` }}
              />
            </div>
          )}
        </div>

        {/* Toast notifications */}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={toast.variant}
            className="flex items-center justify-between gap-2"
          >
            <span>{toast.message}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={() => removeToast(toast.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Toast>
        ))}
      </>
    );
  }

  return (
    <div>
      {/* Status Card */}
      <div className={cn(
        "rounded-lg p-3 border transition-all duration-300",
        canSync ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30" :
        error ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30" :
        "border-border bg-muted/50"
      )}>
        {/* Status Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {canSync ? (
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            ) : error ? (
              <div className="h-2 w-2 rounded-full bg-red-500" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-orange-500" />
            )}
            <span className="text-xs font-medium text-foreground">
              {canSync ? 'Available' : error ? 'Error' : 'Waiting'}
            </span>
          </div>
          
          {/* Refresh Button */}
          <Button
            variant={getButtonVariant() as any}
            size="sm"
            onClick={syncData}
            disabled={!canSync || isLoading}
            className={cn(
              "h-8 px-3 text-xs font-medium transition-all duration-200",
              canSync && "hover:scale-105 shadow-sm"
            )}
          >
            Refresh
          </Button>
        </div>
        
        {/* Progress Bar for Countdown */}
        {!canSync && !error && timeUntilNext && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Next refresh in</span>
              <span className="text-xs font-mono font-medium text-foreground">
                {timeUntilNext}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(2, getProgressPercentage())}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Status Message */}
        {canSync && (
          <p className="text-xs text-green-700 dark:text-green-400">
            ✨ Ready to fetch latest data
          </p>
        )}
        
        {error && (
          <p className="text-xs text-red-700 dark:text-red-400">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          className="flex items-center justify-between gap-2"
        >
          <span>{toast.message}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={() => removeToast(toast.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Toast>
      ))}
    </div>
  );
}