import { Button } from './ui/button';
import { RefreshCw, Download, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
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
    if (canSync) return <Download className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getButtonText = () => {
    if (isLoading) return 'Syncing...';
    if (error) return 'Sync Failed';
    if (canSync) return 'Sync Data';
    return 'Sync Unavailable';
  };

  const getButtonVariant = () => {
    if (error) return 'destructive';
    if (canSync) return 'default';
    return 'secondary';
  };

  const getHelperText = () => {
    if (error) return `Error: ${error}`;
    if (isLoading) return 'Fetching latest data...';
    if (canSync) return 'Ready to sync latest data';
    if (timeUntilNext) return `${timeUntilNext}`;
    return 'Checking availability...';
  };

  const getProgressPercentage = () => {
    if (!timeUntilNext || canSync) return 0;
    
    // Calculate progress based on time until next sync
    const now = getCETDate();
    const todayAt10AM = new Date(now);
    todayAt10AM.setHours(10, 0, 0, 0);
    
    // If it's past 10 AM today but we can't sync, next is tomorrow
    let nextSync: Date;
    if (now >= todayAt10AM) {
      nextSync = new Date(todayAt10AM);
      nextSync.setDate(nextSync.getDate() + 1);
    } else {
      nextSync = todayAt10AM;
    }
    
    const totalWait = nextSync.getTime() - (lastSyncTime?.getTime() || (now.getTime() - 24 * 60 * 60 * 1000));
    const remaining = nextSync.getTime() - now.getTime();
    const progress = Math.max(0, Math.min(100, ((totalWait - remaining) / totalWait) * 100));
    
    return progress;
  };

  const getCETDate = () => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return minutes === 0 ? 'Just now' : `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
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
              title={`${canSync ? 'Available' : 'Waiting'} - ${getHelperText()}`}
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
            
            {/* Last Sync */}
            {lastSyncTime && (
              <div className="text-xs text-muted-foreground">
                {formatLastSync()}
              </div>
            )}
          </div>
          
          {/* Mini Progress Bar */}
          {!canSync && !error && timeUntilNext && (
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000"
                style={{ width: `${getProgressPercentage()}%` }}
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
    <div className="space-y-4">
      <Button
        variant={getButtonVariant() as any}
        onClick={syncData}
        disabled={!canSync || isLoading}
        className={cn(
          "w-full h-11 flex items-center gap-3 font-medium relative overflow-hidden",
          canSync && "hover:scale-[1.02] transition-all duration-200 shadow-lg",
          !canSync && !isLoading && "cursor-not-allowed"
        )}
      >
        {getButtonIcon()}
        {getButtonText()}
        
        {/* Pulse effect when available */}
        {canSync && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        )}
      </Button>
      
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
          {lastSyncTime && (
            <span className="text-xs text-muted-foreground">
              {formatLastSync()}
            </span>
          )}
        </div>
        
        {/* Progress Bar for Countdown */}
        {!canSync && !error && timeUntilNext && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Next refresh available in</span>
              <span className="text-xs font-mono font-medium text-foreground">
                {timeUntilNext}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Status Message */}
        {canSync && (
          <p className="text-xs text-green-700 dark:text-green-400">
            ✨ Ready to fetch latest protocol data
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