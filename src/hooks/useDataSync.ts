import { useState, useEffect, useCallback } from 'react';
import { dataSyncApi, ApiError } from '../lib/api';

interface DataSyncState {
  isLoading: boolean;
  canSync: boolean;
  lastSyncTime: Date | null;
  nextAvailableTime: Date | null;
  timeUntilNext: string;
  error: string | null;
  hasCurrentData: boolean;
  missingProtocols: string[];
}

const STORAGE_KEY = 'sol-analytics-last-sync';
const SYNC_HOUR_CET = 10; // 10 AM CET

export function useDataSync() {
  const [state, setState] = useState<DataSyncState>({
    isLoading: false,
    canSync: false,
    lastSyncTime: null,
    nextAvailableTime: null,
    timeUntilNext: '',
    error: null,
    hasCurrentData: false,
    missingProtocols: []
  });

  const getCETTime = useCallback(() => {
    return new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" });
  }, []);

  const getCETDate = useCallback(() => {
    return new Date(getCETTime());
  }, [getCETTime]);

  const getNextAvailableTime = useCallback((lastSync: Date | null) => {
    const nowCET = getCETDate();
    const todayAt10AM = new Date(nowCET);
    todayAt10AM.setHours(SYNC_HOUR_CET, 0, 0, 0);

    // If we haven't synced today and it's past 10 AM, we can sync now
    if (!lastSync || !isSameDay(lastSync, nowCET)) {
      if (nowCET >= todayAt10AM) {
        return null; // Can sync now
      } else {
        return todayAt10AM; // Can sync at 10 AM today
      }
    }

    // If we've already synced today, next available is tomorrow at 10 AM
    const tomorrowAt10AM = new Date(todayAt10AM);
    tomorrowAt10AM.setDate(tomorrowAt10AM.getDate() + 1);
    return tomorrowAt10AM;
  }, [getCETDate]);

  const isSameDay = useCallback((date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }, []);

  const formatTimeUntilNext = useCallback((nextTime: Date | null) => {
    if (!nextTime) return '';

    const now = getCETDate();
    const diff = nextTime.getTime() - now.getTime();

    if (diff <= 0) return '';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }, [getCETDate]);

  const updateTimeDisplay = useCallback(() => {
    setState(prev => {
      if (prev.nextAvailableTime) {
        const timeUntilNext = formatTimeUntilNext(prev.nextAvailableTime);
        return { ...prev, timeUntilNext };
      }
      return prev;
    });
  }, [formatTimeUntilNext]);

  const updateSyncState = useCallback(() => {
    const lastSyncStr = localStorage.getItem(STORAGE_KEY);
    const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;
    const nextAvailable = getNextAvailableTime(lastSync);
    const timeBasedCanSync = nextAvailable === null;
    const timeUntilNext = formatTimeUntilNext(nextAvailable);

    setState(prev => ({
      ...prev,
      lastSyncTime: lastSync,
      nextAvailableTime: nextAvailable,
      // Allow sync if time conditions are met AND we don't have current data
      canSync: timeBasedCanSync && !(prev.hasCurrentData === true) && !prev.isLoading,
      timeUntilNext
    }));
  }, [getNextAvailableTime, formatTimeUntilNext]);

  const syncData = useCallback(async (
    onSyncStart?: () => void, 
    onSyncSuccess?: (result: { csvFilesFetched: number; rowsImported: number; timestamp: string }) => void,
    onStepUpdate?: (step: string, progress: number) => void,
    onStepComplete?: (step: string, result: { csvFilesFetched: number; rowsImported: number }) => void
  ) => {
    if (state.isLoading || !state.canSync) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Call the optional callback when sync starts
    if (onSyncStart) {
      onSyncStart();
    }

    let currentStep = 'initialization';
    try {
      let totalSynced = 0;
      let totalRowsImported = 0;
      
      // Step 1: Sync Solana data
      currentStep = 'Solana sync';
      if (onStepUpdate) onStepUpdate('Refreshing Solana data...', 20);
      const solanaResult = await dataSyncApi.syncData();
      console.log('Solana sync raw result:', solanaResult);
      
      if (!solanaResult || typeof solanaResult.csvFilesFetched === 'undefined') {
        throw new Error('Invalid Solana sync response - missing csvFilesFetched');
      }
      
      totalSynced += solanaResult.csvFilesFetched || 0;
      totalRowsImported += solanaResult.rowsImported || 0;
      console.log('Solana sync completed:', solanaResult);
      if (onStepComplete) onStepComplete('Solana', { csvFilesFetched: solanaResult.csvFilesFetched || 0, rowsImported: solanaResult.rowsImported || 0 });
      
      // Wait 3 seconds before EVM sync
      currentStep = 'EVM preparation';
      if (onStepUpdate) onStepUpdate('Preparing EVM sync...', 35);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 2: Sync EVM data (this can take longer)
      currentStep = 'EVM sync';
      if (onStepUpdate) onStepUpdate('Refreshing EVM data...', 50);
      const evmResult = await dataSyncApi.syncEVMData();
      console.log('EVM sync raw result:', evmResult);
      
      if (!evmResult || typeof evmResult.csvFilesFetched === 'undefined') {
        throw new Error(`Invalid EVM sync response - missing csvFilesFetched. Got: ${JSON.stringify(evmResult)}`);
      }
      
      totalSynced += evmResult.csvFilesFetched || 0;
      totalRowsImported += evmResult.rowsImported || 0;
      console.log('EVM sync completed:', evmResult);
      if (onStepComplete) onStepComplete('EVM', { csvFilesFetched: evmResult.csvFilesFetched || 0, rowsImported: evmResult.rowsImported || 0 });
      
      // Wait 5 seconds after EVM sync (it's more intensive)
      currentStep = 'Launchpad preparation';
      if (onStepUpdate) onStepUpdate('Preparing Launchpad sync...', 75);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 3: Sync Launchpad data
      currentStep = 'Launchpad sync';
      if (onStepUpdate) onStepUpdate('Refreshing Launchpad data...', 85);
      const launchpadResult = await dataSyncApi.syncAllLaunchpadData();
      console.log('Launchpad sync raw result:', launchpadResult);
      
      if (!launchpadResult || typeof launchpadResult.csvFilesFetched === 'undefined') {
        throw new Error('Invalid Launchpad sync response - missing csvFilesFetched');
      }
      
      totalSynced += launchpadResult.csvFilesFetched || 0;
      totalRowsImported += launchpadResult.rowsImported || 0;
      console.log('Launchpad sync completed:', launchpadResult);
      if (onStepComplete) onStepComplete('Launchpad', { csvFilesFetched: launchpadResult.csvFilesFetched || 0, rowsImported: launchpadResult.rowsImported || 0 });
      
      // Complete
      currentStep = 'completion';
      if (onStepUpdate) onStepUpdate('Sync completed successfully!', 100);
      
      // Store the sync time
      const now = getCETDate();
      localStorage.setItem(STORAGE_KEY, now.toISOString());
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastSyncTime: now,
        error: null
      }));

      // Call the optional success callback with combined results
      if (onSyncSuccess) {
        onSyncSuccess({ 
          csvFilesFetched: totalSynced,
          rowsImported: totalRowsImported,
          timestamp: now.toISOString()
        });
      }

      // Update state after successful sync
      setTimeout(updateSyncState, 100);
    } catch (error) {
      console.error('Sync error details:', error);
      
      let errorMessage = 'Network error';
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Log which step failed for debugging
      console.error('Sync failed during step:', currentStep || 'unknown step', 'Error:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [state.isLoading, state.canSync, getCETDate, updateSyncState]);

  const checkSyncStatus = useCallback(async () => {
    try {
      const data = await dataSyncApi.getSyncStatus();
      
      // Update state with current data status
      setState(prev => ({
        ...prev,
        hasCurrentData: data?.hasCurrentData ?? false,
        missingProtocols: data?.missingProtocols || []
      }));
      
      if (data?.lastSync) {
        const serverLastSync = new Date(data.lastSync);
        const localLastSync = state.lastSyncTime;
        
        // If server has more recent sync, update local storage
        if (!localLastSync || serverLastSync > localLastSync) {
          localStorage.setItem(STORAGE_KEY, serverLastSync.toISOString());
        }
      }
      
      // Update sync state after getting fresh data status
      setTimeout(updateSyncState, 100);
    } catch (error) {
      console.warn('Failed to check sync status:', error);
      setState(prev => ({
        ...prev,
        hasCurrentData: false,
        missingProtocols: []
      }));
    }
  }, [state.lastSyncTime, updateSyncState]);

  // Update countdown display every second (local only, no API calls)
  useEffect(() => {
    const interval = setInterval(updateTimeDisplay, 1000);
    return () => clearInterval(interval);
  }, [updateTimeDisplay]);

  // Update sync state every 10 minutes
  useEffect(() => {
    updateSyncState();
    const interval = setInterval(updateSyncState, 600000); // Update every 10 minutes
    return () => clearInterval(interval);
  }, [updateSyncState]);

  // Check server sync status every 10 minutes
  useEffect(() => {
    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 600000); // Check status every 10 minutes
    return () => clearInterval(interval);
  }, []);

  return {
    ...state,
    syncData,
    refreshStatus: checkSyncStatus
  };
}