import { Button } from './ui/button';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { useDataSync } from '../hooks/useDataSync';
import { useToast } from '../hooks/use-toast';
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
  
  const { toast } = useToast();
  
  // Show toast notifications when sync completes
  useEffect(() => {
    if (!isLoading) {
      if (error) {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: error,
        });
      } else if (lastSyncTime) {
        const now = new Date();
        const timeDiff = now.getTime() - lastSyncTime.getTime();
        // Only show success if sync happened in the last 10 seconds
        if (timeDiff < 10000) {
          toast({
            variant: "success",
            title: "Success",
            description: "Data synced successfully!",
          });
        }
      }
    }
  }, [isLoading, error, lastSyncTime, toast]);

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
    if (!timeUntilNext || canSync) return 100; // Show full when ready to sync
    
    // Parse the timeUntilNext string to get remaining milliseconds
    const timeMatch = timeUntilNext.match(/(\d+)h\s*(\d+)m\s*(\d+)s/);
    if (!timeMatch) return 0;
    
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseInt(timeMatch[3], 10);
    
    const remainingMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
    const totalCycleMs = 24 * 60 * 60 * 1000; // 24 hours
    
    // Progress = elapsed time / total time = (total - remaining) / total
    const elapsedMs = totalCycleMs - remainingMs;
    const progress = Math.max(0, Math.min(100, (elapsedMs / totalCycleMs) * 100));
    
    return progress;
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
              onClick={() => syncData(
                () => toast({
                  title: "Refreshing Data",
                  description: "Fetching latest data...",
                }),
                (result) => toast({
                  variant: "success",
                  title: "Data Sync Complete",
                  description: `Successfully refreshed data for ${result.csvFilesFetched} protocols`,
                })
              )}
              disabled={!canSync || isLoading}
              className={cn(
                "h-12 w-12 relative overflow-hidden shadow-md",
                canSync && "hover:scale-110 transition-all duration-200 hover:shadow-lg"
              )}
              title={`${canSync ? 'Available' : 'Waiting'}`}
            >
              {getButtonIcon()}
              
              {/* Status indicator ring */}
              <div className={cn(
                "absolute inset-0 rounded-full border-2 transition-all duration-300",
                canSync ? "border-green-400 shadow-lg shadow-green-400/50" :
                error ? "border-destructive shadow-sm shadow-destructive/30" :
                "border-amber-400 shadow-sm shadow-amber-400/30"
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
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/50" />
              ) : error ? (
                <div className="h-2 w-2 rounded-full bg-destructive shadow-sm shadow-destructive/50" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
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
            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden shadow-sm border border-border/50">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-1000 shadow-sm"
                style={{ width: `${Math.max(2, getProgressPercentage())}%` }}
              />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div>
      {/* Status Card */}
      <div className={cn(
        "rounded-lg p-3 border transition-all duration-300 shadow-sm",
        canSync ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 shadow-green-100/50 dark:shadow-green-900/20" :
        error ? "border-destructive/50 bg-destructive/5 dark:border-destructive dark:bg-destructive/10 shadow-red-100/50 dark:shadow-red-900/20" :
        "border-border bg-card shadow-sm"
      )}>
        {/* Status Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {canSync ? (
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/50" />
            ) : error ? (
              <div className="h-2 w-2 rounded-full bg-destructive shadow-sm shadow-destructive/50" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            )}
            <span className="text-xs font-medium text-foreground">
              {canSync ? 'Available' : error ? 'Error' : 'Waiting'}
            </span>
          </div>
          
          {/* Refresh Button */}
          <Button
            variant={getButtonVariant() as any}
            size="sm"
            onClick={() => syncData(
              () => toast({
                title: "Refreshing Data", 
                description: "Fetching latest data...",
              }),
              (result) => toast({
                variant: "success",
                title: "Data Sync Complete",
                description: `Successfully refreshed data for ${result.csvFilesFetched} protocols`,
              })
            )}
            disabled={!canSync || isLoading}
            className={cn(
              "h-8 px-3 text-xs font-medium transition-all duration-200 shadow-sm",
              canSync && "hover:scale-105 hover:shadow-md"
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
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden shadow-sm border border-border/50">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${Math.max(2, getProgressPercentage())}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Status Message */}
        {canSync && (
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">
            ✨ Ready to fetch latest data
          </p>
        )}
        
        {error && (
          <p className="text-xs text-destructive font-medium">
            ⚠️ {error}
          </p>
        )}
      </div>
    </div>
  );
}