import { useState, useEffect, useCallback } from 'react';
import { dataSyncApi, ApiError } from '../lib/api';

interface DataSyncState {
  isLoading: boolean;
  canSync: boolean;
  lastSyncTime: Date | null;
  nextAvailableTime: Date | null;
  timeUntilNext: string;
  error: string | null;
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
    error: null
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

  const updateSyncState = useCallback(() => {
    const lastSyncStr = localStorage.getItem(STORAGE_KEY);
    const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;
    const nextAvailable = getNextAvailableTime(lastSync);
    const canSync = nextAvailable === null;
    const timeUntilNext = formatTimeUntilNext(nextAvailable);

    setState(prev => ({
      ...prev,
      lastSyncTime: lastSync,
      nextAvailableTime: nextAvailable,
      canSync: canSync && !prev.isLoading,
      timeUntilNext
    }));
  }, [getNextAvailableTime, formatTimeUntilNext]);

  const syncData = useCallback(async () => {
    if (state.isLoading || !state.canSync) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await dataSyncApi.syncData();
      
      // Store the sync time
      const now = getCETDate();
      localStorage.setItem(STORAGE_KEY, now.toISOString());
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastSyncTime: now,
        error: null
      }));

      // Update state after successful sync
      setTimeout(updateSyncState, 100);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof ApiError ? error.message : 'Network error'
      }));
    }
  }, [state.isLoading, state.canSync, getCETDate, updateSyncState]);

  const checkSyncStatus = useCallback(async () => {
    try {
      const data = await dataSyncApi.getSyncStatus();
      
      if (data.lastSync) {
        const serverLastSync = new Date(data.lastSync);
        const localLastSync = state.lastSyncTime;
        
        // If server has more recent sync, update local storage
        if (!localLastSync || serverLastSync > localLastSync) {
          localStorage.setItem(STORAGE_KEY, serverLastSync.toISOString());
          updateSyncState();
        }
      }
    } catch (error) {
      console.warn('Failed to check sync status:', error);
    }
  }, [state.lastSyncTime, updateSyncState]);

  // Update sync state every second for live countdown
  useEffect(() => {
    updateSyncState();
    const interval = setInterval(updateSyncState, 1000); // Update every second
    return () => clearInterval(interval);
  }, [updateSyncState]);

  // Check server sync status on mount
  useEffect(() => {
    checkSyncStatus();
  }, [checkSyncStatus]);

  return {
    ...state,
    syncData,
    refreshStatus: checkSyncStatus
  };
}