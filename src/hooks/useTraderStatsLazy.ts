import { useState, useEffect, useCallback } from 'react';
import { traderStatsApi, TraderRankData, ComprehensiveTraderStats, PaginatedTraderResponse } from '../lib/trader-stats-api';

// Global cache for trader stats data
interface CachedTraderData {
  comprehensiveStats: ComprehensiveTraderStats;
  totalPages: number;
  totalItems: number;
  timestamp: number;
}

const traderStatsCache = new Map<string, CachedTraderData>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const PAGE_LOAD_TIME = Date.now(); // Track when page was loaded

// Clear cache only on actual page refresh (F5/Ctrl+R)
const clearCacheOnPageRefresh = () => {
  // Check if this is a page navigation or refresh
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (navigation && navigation.type === 'reload') {
    // This is an actual page refresh (F5/Ctrl+R)
    traderStatsCache.clear();
    console.log('🔄 Page refresh detected, clearing trader stats cache');
  }
};

// Initialize cache clearing only on page refresh
clearCacheOnPageRefresh();

interface UseTraderStatsLazyReturn {
  // Summary stats for Custom Reports (lightweight)
  comprehensiveStats: ComprehensiveTraderStats | null;
  comprehensiveStatsLoading: boolean;
  comprehensiveStatsError: string | null;
  
  // Paginated trader data for Rank tab (lazy loaded)
  traderData: TraderRankData[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  isLoadingPage: boolean;
  hasNextPage: boolean;
  loadingPages: Set<number>;
  
  // Progress tracking for initial load
  loadingProgress: {
    isLoading: boolean;
    currentStep: string;
    percentage: number;
    loadedPages: number;
    totalPagesToLoad: number;
  };
  
  // Actions
  loadPage: (page: number) => Promise<void>;
  loadNextPage: () => Promise<void>;
  refreshData: (forceRefresh?: boolean) => Promise<void>;
  setPageSize: (size: number) => void;
  clearCache: () => void;
  forceRefresh: () => Promise<void>;
}

export function useTraderStatsLazy(
  protocol: string,
  initialPageSize: number = 100,
  preloadPages: number = 5 // Load only 500 rows initially (5 pages x 100 rows)
): UseTraderStatsLazyReturn {
  // Summary stats state
  const [comprehensiveStats, setComprehensiveStats] = useState<ComprehensiveTraderStats | null>(null);
  const [comprehensiveStatsLoading, setComprehensiveStatsLoading] = useState(false);
  const [comprehensiveStatsError, setComprehensiveStatsError] = useState<string | null>(null);
  
  // Paginated trader data state
  const [traderData, setTraderData] = useState<TraderRankData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set());
  
  // Keep track of loaded pages to avoid duplicate requests
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [pageCache, setPageCache] = useState<Map<number, TraderRankData[]>>(new Map());
  
  // Progress tracking state
  const [loadingProgress, setLoadingProgress] = useState({
    isLoading: false,
    currentStep: '',
    percentage: 0,
    loadedPages: 0,
    totalPagesToLoad: preloadPages
  });

  // Load comprehensive stats with caching
  const loadComprehensiveStats = useCallback(async (forceRefresh: boolean = false) => {
    if (!protocol) return;
    
    // Check cache first unless forcing refresh
    const cacheKey = `comprehensive_${protocol}`;
    const cached = traderStatsCache.get(cacheKey);
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_DURATION)) {
      console.log(`✅ Using cached comprehensive stats for ${protocol} (${Math.round((now - cached.timestamp) / 1000)}s old)`);
      setComprehensiveStats(cached.comprehensiveStats);
      setTotalPages(cached.totalPages);
      setTotalItems(cached.totalItems);
      return;
    }
    
    setComprehensiveStatsLoading(true);
    setComprehensiveStatsError(null);
    
    try {
      console.log(`🔄 Fetching fresh comprehensive stats for ${protocol}...`);
      const response = await fetch(`http://localhost:3001/api/trader-stats/comprehensive/${protocol}?page=1&limit=100`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch comprehensive data');
      }

      const { data } = result;
      
      // Cache the comprehensive stats
      traderStatsCache.set(cacheKey, {
        comprehensiveStats: data.metrics,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.totalItems,
        timestamp: now
      });
      
      setComprehensiveStats(data.metrics);
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.totalItems);
      
      console.log(`💾 Cached comprehensive stats for ${protocol}`);
    } catch (error) {
      console.error('Error loading comprehensive stats:', error);
      setComprehensiveStatsError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setComprehensiveStatsLoading(false);
    }
  }, [protocol]);

  // Load a specific page of trader data
  const loadPage = useCallback(async (page: number) => {
    if (!protocol || loadedPages.has(page)) return;
    
    setLoadingPages(prev => new Set([...prev, page]));
    
    try {
      const response = await traderStatsApi.getTraderRankData(protocol, page, pageSize);
      
      // Update pagination info
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.totalItems);
      
      // Cache the page data
      setPageCache(prev => new Map([...prev, [page, response.data]]));
      setLoadedPages(prev => new Set([...prev, page]));
      
      // If it's the first page or we're replacing data, update the main array
      if (page === 1 || traderData.length === 0) {
        setTraderData(response.data);
        setCurrentPage(1);
      }
      
    } catch (error) {
      console.error(`Error loading page ${page}:`, error);
    } finally {
      setLoadingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(page);
        return newSet;
      });
    }
  }, [protocol, pageSize, loadedPages, traderData.length]);

  // Load next page and append to current data
  const loadNextPage = useCallback(async () => {
    const nextPage = Math.floor(traderData.length / pageSize) + 1;
    
    if (nextPage > totalPages || loadingPages.has(nextPage)) return;
    
    setIsLoadingPage(true);
    
    try {
      if (pageCache.has(nextPage)) {
        // Use cached data
        const cachedData = pageCache.get(nextPage)!;
        setTraderData(prev => [...prev, ...cachedData]);
        setCurrentPage(nextPage);
      } else {
        // Load fresh data
        await loadPage(nextPage);
        const newData = pageCache.get(nextPage);
        if (newData) {
          setTraderData(prev => [...prev, ...newData]);
          setCurrentPage(nextPage);
        }
      }
    } finally {
      setIsLoadingPage(false);
    }
  }, [traderData.length, pageSize, totalPages, loadingPages, pageCache, loadPage]);

  // Refresh all data
  const refreshData = useCallback(async (forceRefresh: boolean = false) => {
    // Check cache first for instant loading if not forcing refresh
    const cacheKey = `comprehensive_${protocol}`;
    const cached = traderStatsCache.get(cacheKey);
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_DURATION)) {
      console.log(`⚡ Instant load from cache for ${protocol}`);
      setComprehensiveStats(cached.comprehensiveStats);
      setTotalPages(cached.totalPages);
      setTotalItems(cached.totalItems);
      
      // Load first page from cache or fetch if needed
      await loadPage(1);
      return;
    }
    
    // Start loading progress for fresh data
    setLoadingProgress({
      isLoading: true,
      currentStep: 'Initializing...',
      percentage: 0,
      loadedPages: 0,
      totalPagesToLoad: preloadPages
    });
    
    try {
      // Clear frontend cache when refreshing
      if (forceRefresh) {
        traderStatsCache.delete(cacheKey);
        traderStatsApi.clearProtocolCache(protocol);
      }
      
      setLoadedPages(new Set());
      setPageCache(new Map());
      setTraderData([]);
      setCurrentPage(1);
      
      // Load comprehensive stats first (with force refresh flag)
      setLoadingProgress(prev => ({
        ...prev,
        currentStep: 'Loading trader statistics...',
        percentage: 10
      }));
      
      await loadComprehensiveStats(forceRefresh);
      
      // Load initial 500 rows (5 pages x 100 rows) for immediate availability  
      console.log(`Loading first ${preloadPages * pageSize} trader records for ${protocol}...`);
      const allInitialData: TraderRankData[] = [];
      
      setLoadingProgress(prev => ({
        ...prev,
        currentStep: 'Loading trader rankings...',
        percentage: 20
      }));
      
      for (let i = 1; i <= preloadPages; i++) {
        await loadPage(i);
        const pageData = pageCache.get(i);
        if (pageData) {
          allInitialData.push(...pageData);
        }
        
        // Update progress
        const progressPercentage = 20 + ((i / preloadPages) * 70); // 20% base + 70% for loading pages
        setLoadingProgress(prev => ({
          ...prev,
          currentStep: `Loading page ${i} of ${preloadPages}...`,
          percentage: Math.round(progressPercentage),
          loadedPages: i
        }));
        
        console.log(`Loaded page ${i}/${preloadPages} (${i * pageSize} records)...`);
      }
      
      if (allInitialData.length > 0) {
        setTraderData(allInitialData);
        console.log(`✅ Initial load complete: ${allInitialData.length} trader records available`);
      }
      
      // Complete loading
      setLoadingProgress(prev => ({
        ...prev,
        currentStep: 'Complete!',
        percentage: 100,
        isLoading: false
      }));
      
      // Clear loading state after a short delay
      setTimeout(() => {
        setLoadingProgress(prev => ({
          ...prev,
          isLoading: false,
          currentStep: '',
          percentage: 0
        }));
      }, 1000);
      
    } catch (error) {
      console.error('Error during refresh:', error);
      setLoadingProgress(prev => ({
        ...prev,
        isLoading: false,
        currentStep: 'Error occurred',
        percentage: 0
      }));
    }
  }, [loadComprehensiveStats, loadPage, preloadPages, pageSize, protocol, pageCache]);

  // Set page size and reload
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setLoadedPages(new Set());
    setPageCache(new Map());
    setTraderData([]);
    setCurrentPage(1);
  }, []);

  // Clear cache for this protocol
  const clearCache = useCallback(() => {
    const cacheKey = `comprehensive_${protocol}`;
    traderStatsCache.delete(cacheKey);
    console.log(`🗑️ Cleared cache for ${protocol}`);
  }, [protocol]);

  // Force refresh data (bypass cache)
  const forceRefresh = useCallback(() => {
    return refreshData(true);
  }, [refreshData]);

  // Initial load
  useEffect(() => {
    if (protocol) {
      refreshData(false); // Don't force refresh on initial load to use cache
    }
  }, [protocol, refreshData]);

  // Computed values
  const hasNextPage = currentPage < totalPages && !isLoadingPage;

  return {
    // Summary stats
    comprehensiveStats,
    comprehensiveStatsLoading,
    comprehensiveStatsError,
    
    // Paginated data
    traderData,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    isLoadingPage,
    hasNextPage,
    loadingPages,
    
    // Progress tracking
    loadingProgress,
    
    // Actions
    loadPage,
    loadNextPage,
    refreshData,
    setPageSize,
    clearCache,
    forceRefresh
  };
}