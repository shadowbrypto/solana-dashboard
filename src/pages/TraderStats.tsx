import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Download, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import { cn } from '../lib/utils';
import { useToast } from '../hooks/use-toast';
import { MetricCard } from '../components/MetricCard';
import { MetricCardSkeleton } from '../components/MetricCardSkeleton';
import { traderStatsApi } from '../lib/trader-stats-api';
// @ts-ignore
import domtoimage from 'dom-to-image';

// Extend Window interface for protocol stats
declare global {
  interface Window {
    protocolStats?: {
      top1PercentShare: number;
      top5PercentShare: number;
      top1PercentVolume: number;
      top5PercentVolume: number;
      percentile99Volume: number;
      percentile95Volume: number;
    };
    lastLoadedProtocol?: string;
  }
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number): string => {
  if (value >= 10000) {
    return value.toLocaleString();
  }
  return value.toString();
};

// Helper to render volume range label with bold numbers
const renderVolumeRangeLabel = (label: string) => {
  // Split by dollar amounts (e.g., "$1,000", "$50,000")
  const parts = label.split(/(\$\d{1,3}(?:,\d{3})*)/g);
  return (
    <>
      {parts.map((part, idx) => {
        // If part matches dollar amount pattern, make it bold
        if (/^\$\d{1,3}(?:,\d{3})*$/.test(part)) {
          return <span key={idx} className="font-bold">{part}</span>;
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
};

// UI Cache for trader stats (separate from hook cache)
interface UITraderStatsCache {
  metrics: any;
  rankData: any[];
  percentileBrackets: any[];
  pagination: any;
  timestamp: number;
}

const uiTraderStatsCache = new Map<string, UITraderStatsCache>();
const UI_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clear UI cache only on actual page refresh (F5/Ctrl+R)
const clearUICacheOnRefresh = () => {
  // Check if this is a page navigation or refresh
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  if (navigation && navigation.type === 'reload') {
    // This is an actual page refresh (F5/Ctrl+R)
    uiTraderStatsCache.clear();
    console.log('🔄 Page refresh detected, clearing UI trader stats cache');
  }
};

// Initialize UI cache clearing only on page refresh
clearUICacheOnRefresh();

export default function TraderStats() {
  const [selectedProtocol, setSelectedProtocol] = useState('photon');
  const [traderData, setTraderData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [percentileLoading, setPercentileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalTraders, setTotalTraders] = useState(0);
  const [allTraders, setAllTraders] = useState<any[]>([]);
  const [percentileBrackets, setPercentileBrackets] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'rank' | 'percentile' | 'volume-range'>('rank');
  const [volumeRanges, setVolumeRanges] = useState<any[]>([]);
  const [volumeRangeLoading, setVolumeRangeLoading] = useState(false);
  const { toast } = useToast();

  // Progress tracking state
  const [loadingProgress, setLoadingProgress] = useState({
    isLoading: false,
    step: '',
    percentage: 0,
    processedCount: 0,
    totalCount: 0,
    fetchingCount: 0
  });

  const itemsPerPage = 10;

  // Available protocols
  const protocols = [
    { id: 'photon', name: 'Photon', logo: 'photon.jpg' },
    { id: 'axiom', name: 'Axiom', logo: 'axiom.jpg' },
    { id: 'bloom', name: 'Bloom', logo: 'bloom.jpg' },
    { id: 'trojan', name: 'Trojan', logo: 'trojan.jpg' }
  ];

  // Percentile data is now included in comprehensive endpoint

  // Poll progress endpoint
  const pollProgress = async (protocol: string) => {
    try {
      const backendUrl = 'http://localhost:3001/api/trader-stats';
      const progressUrl = `${backendUrl}/progress/${protocol}`;

      const response = await fetch(progressUrl);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.isLoading) {
          setLoadingProgress({
            isLoading: true,
            step: result.data.step,
            percentage: result.data.percentage,
            processedCount: result.data.processedCount || 0,
            totalCount: result.data.totalCount || 0,
            fetchingCount: result.data.fetchingCount || 0
          });
          return true; // Still loading
        }
      }
    } catch (error) {
      console.error('Error polling progress:', error);
    }
    return false; // Not loading or error
  };

  // Fetch all trader data from comprehensive backend API with caching
  const fetchTraderData = async (page: number = 1, forceRefresh: boolean = false) => {
    console.log('=== FETCH COMPREHENSIVE TRADER DATA ===');
    console.log('selectedProtocol:', selectedProtocol);
    console.log('page:', page);
    console.log('viewType:', viewType);
    console.log('forceRefresh:', forceRefresh);

    // Check cache first unless forcing refresh
    const cacheKey = `ui_${selectedProtocol}_${page}`;
    const cached = uiTraderStatsCache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp < UI_CACHE_DURATION)) {
      const cacheAge = Math.round((now - cached.timestamp) / 1000);
      console.log(`⚡ INSTANT LOAD from cache for ${selectedProtocol} page ${page} (${cacheAge}s old)`);

      // Only use instant cache loading if we're already on this protocol
      // This prevents showing wrong data when switching protocols
      const isAlreadyShowingThisProtocol = traderData.length > 0 &&
        window.lastLoadedProtocol === selectedProtocol;

      if (isAlreadyShowingThisProtocol) {
        // Same protocol, instant load
        setLoading(true);
        setTimeout(() => {
          // Update UI with cached data
          setTotalTraders(cached.metrics.totalTraders);
          setTotalVolume(cached.metrics.totalVolume);
          setTraderData(cached.rankData);
          setAllTraders(cached.rankData);
          setPercentileBrackets(cached.percentileBrackets);
          setTotalPages(cached.pagination.totalPages);
          setCurrentPage(cached.pagination.currentPage);

          setLoading(false); // Hide loading after data is set
          window.lastLoadedProtocol = selectedProtocol;
        }, 100); // Brief 100ms delay to show skeleton
      } else {
        // Different protocol, show loading for at least 500ms to prevent confusion
        setLoading(true);
        setTimeout(() => {
          // Update UI with cached data
          setTotalTraders(cached.metrics.totalTraders);
          setTotalVolume(cached.metrics.totalVolume);
          setTraderData(cached.rankData);
          setAllTraders(cached.rankData);
          setPercentileBrackets(cached.percentileBrackets);
          setTotalPages(cached.pagination.totalPages);
          setCurrentPage(cached.pagination.currentPage);

          setLoading(false); // Hide loading after data is set
          setPercentileLoading(false);
          window.lastLoadedProtocol = selectedProtocol;
        }, 500); // Longer delay when switching protocols
      }

      // Update window stats for metric cards
      window.protocolStats = {
        top1PercentShare: cached.metrics.top1PercentShare,
        top5PercentShare: cached.metrics.top5PercentShare,
        top1PercentVolume: cached.metrics.top1PercentVolume,
        top5PercentVolume: cached.metrics.top5PercentVolume,
        percentile99Volume: cached.metrics.percentile99Volume,
        percentile95Volume: cached.metrics.percentile95Volume
      };

      return; // Exit early - no loading needed
    }

    setLoading(true);
    setError(null);

    // Start progress tracking
    setLoadingProgress({
      isLoading: true,
      step: 'Initializing...',
      percentage: 0,
      processedCount: 0,
      totalCount: 0,
      fetchingCount: 0
    });

    // Start polling progress every 1 second for real-time feedback
    const progressInterval = setInterval(async () => {
      const isStillLoading = await pollProgress(selectedProtocol);
      if (!isStillLoading) {
        clearInterval(progressInterval);
      }
    }, 1000);

    try {
      const backendUrl = 'http://localhost:3001/api/trader-stats';
      const comprehensiveUrl = `${backendUrl}/comprehensive/${selectedProtocol}?page=${page}&limit=${itemsPerPage}`;

      console.log('🚀 Fetching comprehensive data:', comprehensiveUrl);

      const response = await fetch(comprehensiveUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch comprehensive data');
      }

      // Update progress
      setLoadingProgress(prev => ({
        ...prev,
        step: 'Finalizing data...',
        percentage: 90
      }));

      const { data } = result;
      console.log(`✅ Comprehensive data loaded (cached: ${result.cached}, age: ${result.cacheAge || 0}min)`);

      // Set all data from comprehensive response
      setTotalTraders(data.metrics.totalTraders);
      setTotalVolume(data.metrics.totalVolume);
      setTraderData(data.rankData); // This is already paginated
      setAllTraders(data.rankData); // Store current page data
      setPercentileBrackets(data.percentileBrackets);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.currentPage);

      // Track the last loaded protocol
      window.lastLoadedProtocol = selectedProtocol;

      // Store metrics for cards (no window object needed)
      window.protocolStats = {
        top1PercentShare: data.metrics.top1PercentShare,
        top5PercentShare: data.metrics.top5PercentShare,
        top1PercentVolume: data.metrics.top1PercentVolume,
        top5PercentVolume: data.metrics.top5PercentVolume,
        percentile99Volume: data.metrics.percentile99Volume,
        percentile95Volume: data.metrics.percentile95Volume
      };

      // Cache the fresh data for instant future loads
      const cacheKey = `ui_${selectedProtocol}_${page}`;
      uiTraderStatsCache.set(cacheKey, {
        metrics: data.metrics,
        rankData: data.rankData,
        percentileBrackets: data.percentileBrackets,
        pagination: data.pagination,
        timestamp: now
      });

      console.log(`📊 Data Summary:`);
      console.log(`  Total Traders: ${data.metrics.totalTraders.toLocaleString()}`);
      console.log(`  Total Volume: $${data.metrics.totalVolume.toLocaleString()}`);
      console.log(`  Rank Data: ${data.rankData.length} records (page ${data.pagination.currentPage}/${data.pagination.totalPages})`);
      console.log(`  Percentile Brackets: ${data.percentileBrackets.length} brackets`);
      console.log(`  Cache Status: ${result.cached ? `✅ Cached (${result.cacheAge}min old)` : '🆕 Fresh'}`);
      console.log(`💾 UI data cached for ${selectedProtocol} page ${page}`);

      // Complete progress
      setLoadingProgress({
        isLoading: false,
        step: 'Complete!',
        percentage: 100,
        processedCount: 0,
        totalCount: 0,
        fetchingCount: 0
      });

      // Clear progress interval and state after a short delay
      clearInterval(progressInterval);
      setTimeout(() => {
        setLoadingProgress({
          isLoading: false,
          step: '',
          percentage: 0,
          processedCount: 0,
          totalCount: 0,
          fetchingCount: 0
        });
      }, 1000);

    } catch (error: any) {
      console.error('❌ Comprehensive API failed:', error);
      setError(`Failed to load trader data: ${error.message}`);
      setTraderData([]);
      setTotalTraders(0);
      setTotalVolume(0);
      setTotalPages(1);
      setAllTraders([]);
      setPercentileBrackets([]);

      // Clear progress interval and set error state
      clearInterval(progressInterval);
      setLoadingProgress({
        isLoading: false,
        step: 'Error occurred',
        percentage: 0,
        processedCount: 0,
        totalCount: 0,
        fetchingCount: 0
      });
    } finally {
      setLoading(false);
      setPercentileLoading(false);
    }
  };

  // Fetch data when protocol, page, or view type changes
  // Fetch comprehensive data when protocol or page changes (uses cache if available)
  useEffect(() => {
    fetchTraderData(currentPage, false); // Don't force refresh to allow caching
  }, [selectedProtocol, currentPage]);

  // Reset to first page when protocol changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProtocol]);

  // Fetch volume ranges when view switches to volume-range
  useEffect(() => {
    if (viewType === 'volume-range' && selectedProtocol) {
      const fetchVolumeRanges = async () => {
        setVolumeRangeLoading(true);
        try {
          const ranges = await traderStatsApi.getVolumeRanges(selectedProtocol);
          setVolumeRanges(ranges);
        } catch (error: any) {
          console.error('Error fetching volume ranges:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch volume ranges",
            variant: "destructive"
          });
        } finally {
          setVolumeRangeLoading(false);
        }
      };
      fetchVolumeRanges();
    }
  }, [viewType, selectedProtocol]);

  const handleProtocolChange = (protocolId: string) => {
    // Set loading state FIRST before clearing data
    setLoading(true);
    setPercentileLoading(true);

    // Clear old data immediately to prevent showing wrong numbers during loading
    setTotalTraders(0);
    setTotalVolume(0);
    setTraderData([]);
    setAllTraders([]);
    setPercentileBrackets([]);
    setTotalPages(1);
    setCurrentPage(1);

    // Clear window stats for metric cards
    window.protocolStats = {
      top1PercentShare: 0,
      top5PercentShare: 0,
      top1PercentVolume: 0,
      top5PercentVolume: 0,
      percentile99Volume: 0,
      percentile95Volume: 0
    };

    setSelectedProtocol(protocolId);
    // Note: useEffect will trigger fetchTraderData automatically
  };

  // Force refresh function for manual refresh
  const forceRefreshData = () => {
    fetchTraderData(currentPage, true); // Force refresh bypasses cache
  };

  // Clear cache function
  const clearProtocolCache = () => {
    const keysToDelete = Array.from(uiTraderStatsCache.keys()).filter(key =>
      key.includes(`ui_${selectedProtocol}_`)
    );
    keysToDelete.forEach(key => uiTraderStatsCache.delete(key));
    console.log(`🗑️ Cleared UI cache for ${selectedProtocol} (${keysToDelete.length} entries)`);
  };

  // Download CSV for a specific volume range
  const handleDownloadVolumeRangeCsv = async (shortLabel: string, descriptiveLabel: string) => {
    try {
      await traderStatsApi.downloadVolumeRangeCsv(selectedProtocol, shortLabel);
      toast({
        title: "Success",
        description: `CSV download started for "${descriptiveLabel}"`,
      });
    } catch (error: any) {
      console.error('Error downloading CSV:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download CSV",
        variant: "destructive"
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // startIndex calculation moved to backend


  const downloadReport = async () => {
    const reportElement = document.querySelector('[data-table="trader-stats-complete"]') as HTMLElement;

    if (reportElement) {
      const rect = reportElement.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      try {
        const scale = 2;
        const padding = 24;
        const totalWidth = reportElement.offsetWidth + (padding * 2);
        const totalHeight = reportElement.offsetHeight + (padding * 2);

        const dataUrl = await Promise.race([
          domtoimage.toPng(reportElement, {
            quality: 1,
            bgcolor: '#ffffff',
            cacheBust: true,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: totalWidth + 'px',
              height: totalHeight + 'px',
              padding: padding + 'px',
              margin: '0px',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              overflow: 'visible'
            },
            width: totalWidth * scale,
            height: totalHeight * scale,
            filter: (node: any) => {
              // Exclude any elements with no-screenshot class
              if (node.classList?.contains('no-screenshot')) {
                return false;
              }
              return true;
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('dom-to-image timeout after 20 seconds')), 20000)
          )
        ]) as string;

        const link = document.createElement('a');
        link.download = `${selectedProtocol}_Trader_Stats_${format(new Date(), 'yyyy_MM_dd')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading report:', error);
        toast({
          title: "Download failed",
          description: "Failed to download trader stats report",
          duration: 3000,
        });
      }
    }
  };

  const copyToClipboard = async () => {
    const reportElement = document.querySelector('[data-table="trader-stats-complete"]') as HTMLElement;

    if (reportElement) {
      const rect = reportElement.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      try {
        const scale = 2;
        const padding = 24;
        const totalWidth = reportElement.offsetWidth + (padding * 2);
        const totalHeight = reportElement.offsetHeight + (padding * 2);

        const dataUrl = await Promise.race([
          domtoimage.toPng(reportElement, {
            quality: 1,
            bgcolor: '#ffffff',
            cacheBust: true,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: totalWidth + 'px',
              height: totalHeight + 'px',
              padding: padding + 'px',
              margin: '0px',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              overflow: 'visible'
            },
            width: totalWidth * scale,
            height: totalHeight * scale,
            filter: (node: any) => {
              // Exclude any elements with no-screenshot class
              if (node.classList?.contains('no-screenshot')) {
                return false;
              }
              return true;
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('dom-to-image timeout after 20 seconds')), 20000)
          )
        ]) as string;

        const response = await fetch(dataUrl);
        const blob = await response.blob();

        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            toast({
              title: "Copied to clipboard",
              description: "Trader stats report copied successfully",
              duration: 2000,
            });
          } catch (clipboardError) {
            console.error('Clipboard write failed:', clipboardError);
            toast({
              title: "Copy failed",
              description: "Failed to copy to clipboard. Please try downloading instead.",
              duration: 3000,
            });
          }
        }
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Copy failed",
          description: "Failed to copy report to clipboard",
          duration: 3000,
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trader Statistics</h1>
          <p className="text-muted-foreground mt-1">
            Analyze trader rankings, percentiles, and volume distribution across protocols
          </p>
        </div>
      </div>

      {/* Protocol Tabs */}
      <div className="flex gap-2 mb-6">
        {protocols.map((protocol) => (
          <button
            key={protocol.id}
            onClick={() => handleProtocolChange(protocol.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors duration-150",
              "bg-background focus:outline-none border",
              selectedProtocol === protocol.id
                ? "border-foreground text-foreground shadow-md dark:border-white dark:shadow-white/10"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/50"
            )}
          >
            <div className="w-5 h-5 rounded overflow-hidden bg-muted/20 flex-shrink-0">
              <img
                src={`/assets/logos/${protocol.logo}`}
                alt={protocol.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <span className="text-sm font-medium">{protocol.name}</span>
          </button>
        ))}
      </div>


      {/* Complete Trader Stats Report - Metrics + Table */}
      <div data-table="trader-stats-complete" className="space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <MetricCardSkeleton
                title="Total Volume"
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
              />
              <MetricCardSkeleton
                title="Total Traders"
                type="users"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
              />
              <MetricCardSkeleton
                title="Top 1% Percentile Volume"
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
              />
              <MetricCardSkeleton
                title="Top 5% Percentile Volume"
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
              />
            </>
          ) : (
            <>
              <MetricCard
                title="Total Volume"
                value={totalVolume}
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                protocolLogo={protocols.find(p => p.id === selectedProtocol)?.logo}
              />

              <MetricCard
                title="Total Traders"
                value={formatNumber(totalTraders)}
                type="users"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                protocolLogo={protocols.find(p => p.id === selectedProtocol)?.logo}
              />

              <MetricCard
                title="Top 1% Percentile Volume"
                value={window.protocolStats?.top1PercentVolume
                  ? formatCurrency(window.protocolStats.top1PercentVolume)
                  : '--'
                }
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                protocolLogo={protocols.find(p => p.id === selectedProtocol)?.logo}
              />

              <MetricCard
                title="Top 5% Percentile Volume"
                value={window.protocolStats?.top5PercentVolume
                  ? formatCurrency(window.protocolStats.top5PercentVolume)
                  : '--'
                }
                type="volume"
                protocolName={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                protocolLogo={protocols.find(p => p.id === selectedProtocol)?.logo}
              />
            </>
          )}
        </div>

        {/* Trader Stats Table */}
        <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">
                Trader Statistics
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                  <img
                    src={`/assets/logos/${protocols.find(p => p.id === selectedProtocol)?.logo}`}
                    alt={protocols.find(p => p.id === selectedProtocol)?.name || selectedProtocol}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
                <span>{protocols.find(p => p.id === selectedProtocol)?.name}</span>
              </div>
            </div>

            {/* View Type Tabs */}
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                onClick={() => setViewType('rank')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'rank'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Rank
              </button>
              <button
                onClick={() => setViewType('percentile')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'percentile'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Percentile
              </button>
              <button
                onClick={() => setViewType('volume-range')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'volume-range'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Volume Range
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading || (viewType === 'percentile' && percentileLoading) || (viewType === 'volume-range' && volumeRangeLoading) ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                <span className="text-muted-foreground">
                  {viewType === 'percentile' && percentileLoading
                    ? `Loading percentile calculations...`
                    : viewType === 'volume-range' && volumeRangeLoading
                    ? `Loading volume ranges...`
                    : `Loading trader statistics for ${protocols.find(p => p.id === selectedProtocol)?.name}...`
                  }
                </span>
              </div>
              {loadingProgress.isLoading && (
                <div className="w-full max-w-lg space-y-3">
                  {/* Progress bar with gradient like metric cards */}
                  <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
                      style={{ width: `${loadingProgress.percentage}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-pulse" />
                    </div>
                  </div>

                  {/* Real-time trader counts */}
                  <div className="flex justify-end text-xs">
                    {loadingProgress.totalCount > 0 && (
                      <span className="font-mono text-foreground font-medium">
                        {loadingProgress.processedCount.toLocaleString()}/{loadingProgress.totalCount.toLocaleString()} processed
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                <p className="mb-4">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTraderData(currentPage)}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (viewType === 'rank' ? traderData.length > 0 : viewType === 'percentile' ? percentileBrackets.length > 0 : volumeRanges.length > 0) ? (
            <div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={viewType === 'volume-range' ? 'text-left' : 'w-20 text-center'}>
                        {viewType === 'rank' ? 'Rank' : viewType === 'percentile' ? 'Top %' : 'Volume Range'}
                      </TableHead>
                      <TableHead className={viewType === 'rank' ? 'text-left' : 'text-center'}>
                        {viewType === 'rank' ? 'Trader' : viewType === 'percentile' ? 'Rank Range' : 'Number of Traders'}
                      </TableHead>
                      {viewType !== 'volume-range' && <TableHead className="text-right">Volume</TableHead>}
                      {viewType === 'percentile' && <TableHead className="text-right">Delta</TableHead>}
                      {viewType !== 'volume-range' && <TableHead className="text-right">Volume Share</TableHead>}
                      {viewType === 'volume-range' && <TableHead className="text-center">Download</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewType === 'rank' ? (
                      traderData.map((trader, index) => {
                        const rank = trader.rank || index + 1;

                        return (
                          <TableRow key={`${trader.user_address}-${index}`} className="hover:bg-muted/30 h-12">
                            <TableCell className="text-center font-medium py-2">
                              <Badge
                                variant={rank <= 3 ? "default" : "outline"}
                                className={cn(
                                  "w-8 h-6 rounded-lg flex items-center justify-center text-xs font-medium px-0.5",
                                  rank === 1 && "bg-yellow-500 text-yellow-50 hover:bg-yellow-600",
                                  rank === 2 && "bg-gray-400 text-gray-50 hover:bg-gray-500",
                                  rank === 3 && "bg-amber-600 text-amber-50 hover:bg-amber-700"
                                )}
                              >
                                #{rank}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono py-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(trader.user_address);
                                  toast({
                                    title: "Address copied",
                                    description: `${trader.user_address} copied to clipboard`,
                                    duration: 2000,
                                  });
                                }}
                                className="text-sm hover:bg-muted/50 px-2 py-1 rounded transition-colors cursor-pointer"
                                title="Click to copy full address"
                              >
                                {trader.user_address}
                              </button>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <span className="font-medium">
                                {formatCurrency(trader.volume_usd)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-medium text-xs",
                                  rank <= 10 && "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                )}
                              >
                                {trader.volumeShare ? trader.volumeShare.toFixed(3) : '0.000'}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : viewType === 'percentile' ? (
                      percentileBrackets.map((bracket, index) => {
                        // Calculate delta for rows after the first one
                        const previousBracket = index > 0 ? percentileBrackets[index - 1] : null;
                        const deltaVolume = previousBracket ? bracket.volume - previousBracket.volume : 0;
                        // Calculate percentage based on total volume
                        const deltaPercentageOfTotal = totalVolume > 0
                          ? ((deltaVolume / totalVolume) * 100)
                          : 0;

                        return (
                        <TableRow key={`percentile-${bracket.percentile}`} className="hover:bg-muted/30 h-12">
                          <TableCell className="text-center font-medium py-2">
                            <Badge
                              variant={bracket.percentile <= 10 ? "default" : "outline"}
                              className={cn(
                                "w-12 h-6 rounded-lg flex items-center justify-center text-xs font-medium px-0",
                                bracket.percentile <= 3 && "bg-yellow-500 text-yellow-50 hover:bg-yellow-600",
                                bracket.percentile > 3 && bracket.percentile <= 5 && "bg-gray-400 text-gray-50 hover:bg-gray-500",
                                bracket.percentile > 5 && bracket.percentile <= 10 && "bg-amber-600 text-amber-50 hover:bg-amber-700"
                              )}
                            >
                              {bracket.percentile}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-2 font-medium font-mono">
                            {bracket.rankRange}
                          </TableCell>
                          <TableCell className="py-2 max-w-32">
                            <div className="flex items-center justify-between w-full">
                              <div className="w-32">
                                <Progress
                                  value={bracket.volumeShare}
                                  className="h-4 bg-muted/60 border border-blue-200 dark:border-blue-800 rounded-sm [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-purple-500"
                                />
                              </div>
                              <span className="font-medium whitespace-nowrap">
                                {formatCurrency(bracket.volume)}
                              </span>
                            </div>
                          </TableCell>
                          {/* Delta Column - only for percentile view */}
                          <TableCell className="text-right py-2">
                            {index === 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="text-muted-foreground text-xs">-</span>
                                <span className="text-xs text-muted-foreground">-</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-medium text-sm text-foreground">
                                  {deltaVolume >= 0 ? '+' : ''}{formatCurrency(deltaVolume)}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs font-medium px-1.5 py-0.5 h-auto",
                                    deltaVolume >= 0
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
                                  )}
                                >
                                  {deltaPercentageOfTotal >= 0 ? '+' : ''}{deltaPercentageOfTotal.toFixed(2)}%
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-medium text-xs whitespace-nowrap",
                                bracket.percentile <= 10 && "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              )}
                            >
                              {bracket.volumeShare.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    ) : (
                      volumeRanges.map((range, index) => (
                        <TableRow key={`volume-range-${range.rangeLabel}`} className="hover:bg-muted/30 h-12">
                          <TableCell className="text-left py-2 px-4">
                            {renderVolumeRangeLabel(range.rangeLabel)}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <span className="text-base font-mono">
                              {range.traderCount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadVolumeRangeCsv(range.shortLabel, range.rangeLabel)}
                              className="h-9 px-4"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download CSV
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {viewType === 'rank' && totalPages > 1 && (
                <div className="w-full flex justify-end pt-3 pb-1">
                  <Pagination className="ml-auto">
                    <PaginationContent className="ml-auto justify-end">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </PaginationPrevious>
                      </PaginationItem>

                      {/* First page */}
                      {currentPage > 3 && (
                        <>
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => handlePageChange(1)}
                              isActive={currentPage === 1}
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                          {currentPage > 4 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                        </>
                      )}

                      {/* Current page range */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        // Don't render if we already rendered this page number
                        if ((currentPage > 3 && pageNum === 1) || (currentPage < totalPages - 2 && pageNum === totalPages)) {
                          return null;
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNum)}
                              isActive={currentPage === pageNum}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      {/* Last page */}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => handlePageChange(totalPages)}
                              isActive={currentPage === totalPages}
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </PaginationNext>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trader data available for {protocols.find(p => p.id === selectedProtocol)?.name}</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={downloadReport}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
      </div>
    </div>
  );
}
