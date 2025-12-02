import { Button } from './ui/button';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { useDataSync } from '../hooks/useDataSync';
import { useToast } from '../hooks/use-toast';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

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
  const [syncStep, setSyncStep] = useState<string>('');
  const [syncProgress, setSyncProgress] = useState<number>(0);
  
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
    const getTooltipContent = () => {
      if (isLoading && syncStep) {
        return `${syncStep} (${syncProgress}%)`;
      }
      if (error) {
        return `Error: ${error}`;
      }
      if (canSync) {
        return 'Click to refresh data';
      }
      if (timeUntilNext) {
        return `Next refresh in ${timeUntilNext}`;
      }
      return 'Data Sync';
    };

    return (
      <div className="flex flex-col items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => syncData(
                () => {
                  setSyncStep('Starting data refresh...');
                  setSyncProgress(0);
                  toast({
                    title: "Starting Data Refresh",
                    description: "Refreshing rolling-refresh protocols (21 protocols) and projected stats...",
                  });
                },
                (result) => {
                  setSyncStep('');
                  setSyncProgress(0);
                  toast({
                    variant: "success",
                    title: "Refresh Completed Successfully",
                    description: `Synced ${result.csvFilesFetched} protocols + projected stats`,
                  });
                },
                (step, progress) => {
                  setSyncStep(step);
                  setSyncProgress(progress);
                },
                (stepName, result) => {
                  const description = stepName === 'Rolling Refresh'
                    ? `${result.csvFilesFetched} protocols synced with latest 7-day data`
                    : `${stepName} updated successfully`;
                  toast({
                    variant: "success",
                    title: `${stepName} Completed`,
                    description,
                  });
                }
              )}
              disabled={!canSync || isLoading}
              className={cn(
                "h-10 w-10 rounded-lg relative transition-all duration-200",
                canSync
                  ? "text-primary hover:bg-primary/10 hover:text-primary"
                  : error
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {getButtonIcon()}

              {/* Subtle status indicator dot */}
              <span className={cn(
                "absolute top-1 right-1 h-2 w-2 rounded-full transition-all duration-300",
                canSync && "bg-green-500",
                error && "bg-destructive",
                !canSync && !error && "bg-amber-500/70",
                isLoading && "animate-pulse"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="z-[100]">
            <p className="font-medium">{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>

        {/* Subtle mini progress indicator */}
        {(isLoading || (!canSync && !error && timeUntilNext)) && (
          <div className="w-8 h-1 mt-2 rounded-full overflow-hidden bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isLoading
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              )}
              style={{
                width: `${isLoading ? Math.max(5, syncProgress) : Math.max(5, getProgressPercentage())}%`
              }}
            />
          </div>
        )}
      </div>
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
              () => {
                setSyncStep('Starting data refresh...');
                setSyncProgress(0);
                toast({
                  title: "Starting Data Refresh",
                  description: "Refreshing rolling-refresh protocols (21 protocols) and projected stats...",
                });
              },
              (result) => {
                setSyncStep('');
                setSyncProgress(0);
                toast({
                  variant: "success",
                  title: "Refresh Completed Successfully",
                  description: `Synced ${result.csvFilesFetched} protocols + projected stats`,
                });
              },
              (step, progress) => {
                setSyncStep(step);
                setSyncProgress(progress);
              },
              (stepName, result) => {
                const description = stepName === 'Rolling Refresh'
                  ? `${result.csvFilesFetched} protocols synced with latest 7-day data`
                  : `${stepName} updated successfully`;
                toast({
                  variant: "success",
                  title: `${stepName} Completed`,
                  description,
                });
              }
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
        {/* Progress Display During Sync */}
        {isLoading && syncStep && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{syncStep}</span>
              <span className="text-xs font-mono font-medium text-foreground">
                {syncProgress}%
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden shadow-sm border border-border/50">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 ease-out shadow-sm"
                style={{ width: `${Math.max(2, syncProgress)}%` }}
              />
            </div>
          </div>
        )}
        
        {canSync && !isLoading && (
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">
            ✨ Ready to refresh
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