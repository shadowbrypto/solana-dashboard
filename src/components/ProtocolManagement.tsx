import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  getMutableProtocolConfigs, 
  getMutableAllCategories, 
  getMutableProtocolsByCategory,
  getMutableAllCategoriesIncludingEVM,
  getMutableProtocolsByCategoryIncludingEVM,
  updateProtocolCategory,
  saveProtocolConfigurations,
  resetProtocolConfigurations,
  hasUnsavedChanges,
  loadProtocolConfigurations,
  getProtocolLogoFilename
} from '../lib/protocol-config';
import { Button } from './ui/button';
import { RefreshCcw, AlertCircle, GripVertical, Save, RotateCcw, RefreshCw, Clock, Shield, Globe, CheckCircle2 } from 'lucide-react';
import { dataSyncApi, protocolApi, ProtocolSyncStatus, ProtocolLatestDate } from '../lib/api';
import { getAllLaunchpads, getLaunchpadLogoFilename } from '../lib/launchpad-config';
import { LaunchpadApi, LaunchpadLatestDate } from '../lib/launchpad-api';
import { useToast } from '../hooks/use-toast';
import { clearAllFrontendCaches, clearProtocolFrontendCache, clearEVMProtocolsCaches } from '../lib/protocol';
import { useDataSync } from '../hooks/useDataSync';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Settings } from '../lib/settings';
import { ProjectedStatsApi } from '../lib/projected-stats-api';
import { API_BASE_URL } from '../lib/api';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableProtocolProps {
  protocol: any;
  isDragging?: boolean;
  onRefresh: (protocolId: string) => void;
  isRefreshing: boolean;
  syncStatus?: ProtocolSyncStatus;
  latestDate?: ProtocolLatestDate;
}

interface DroppableCategoryProps {
  category: string;
  protocols: any[];
  onRefresh: (protocolId: string) => void;
  refreshingProtocols: Set<string>;
  syncStatuses: Map<string, ProtocolSyncStatus>;
  latestDates: Map<string, ProtocolLatestDate>;
}

function DroppableCategory({ category, protocols, onRefresh, refreshingProtocols, syncStatuses, latestDates }: DroppableCategoryProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `category-${category}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] p-2 sm:p-4 border-2 border-dashed rounded-lg transition-all duration-200 ${
        isOver 
          ? 'border-primary bg-primary/10 shadow-md' 
          : 'border-muted-foreground/25 bg-muted/40 hover:bg-muted/60 hover:border-muted-foreground/40'
      }`}
    >
      <SortableContext items={protocols.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {protocols.map(protocol => (
            <SortableProtocol 
              key={protocol.id} 
              protocol={protocol} 
              onRefresh={onRefresh}
              isRefreshing={refreshingProtocols.has(protocol.id)}
              syncStatus={syncStatuses.get(protocol.id)}
              latestDate={latestDates.get(protocol.id) || latestDates.get(protocol.id.replace('_evm', ''))}
            />
          ))}
        </div>
      </SortableContext>
      {protocols.length === 0 && (
        <div className="text-center py-6 sm:py-12">
          <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">
            Drop trading apps here
          </p>
          <p className="text-muted-foreground/70 text-[10px] sm:text-xs">
            Drag and drop trading apps to organize them
          </p>
        </div>
      )}
    </div>
  );
}

function SortableProtocol({ protocol, isDragging, onRefresh, isRefreshing, syncStatus, latestDate }: SortableProtocolProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: protocol.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableIsDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg transition-all duration-200 ${
        sortableIsDragging 
          ? 'shadow-lg z-50 ring-2 ring-primary/50 bg-card scale-105' 
          : 'bg-card border-border hover:bg-accent hover:shadow-sm hover:border-border/80'
      }`}
      {...attributes}
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing hover:bg-accent p-1.5 rounded transition-colors">
        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </div>
      <div className="bg-muted/20 rounded-sm w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
        <protocol.icon size={40} className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" style={{ width: '40px', height: '40px' }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{protocol.name}</p>
          {protocol.chain === 'evm' && (
            <Badge variant="secondary" className="h-5 px-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              EVM
            </Badge>
          )}
          {protocol.chain === 'solana' && (
            <Badge variant="secondary" className="h-5 px-2 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
              SOL
            </Badge>
          )}
        </div>
        {latestDate && (
          <div className={`inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${
            latestDate.is_current 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`} title={latestDate.is_current ? 'Data is current' : `${latestDate.days_behind} days behind`}>
            <div className={`w-1 h-1 rounded-full ${
              latestDate.is_current ? 'bg-green-600' : 'bg-red-600'
            }`} />
            <span className="font-medium text-[10px] sm:text-xs">
              Latest: {new Date(latestDate.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
        {syncStatus && !syncStatus.sync_success && !latestDate?.is_current && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="h-2 w-2 sm:h-3 sm:w-3 text-red-500" />
            <span className="text-[10px] sm:text-xs text-red-500">Sync Failed</span>
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onRefresh(protocol.id);
        }}
        disabled={isRefreshing}
        className="h-6 w-6 sm:h-8 sm:w-8 p-0"
        title={`Refresh ${protocol.name} data`}
      >
        <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}

export function ProtocolManagement() {
  const [isRefreshingSolana, setIsRefreshingSolana] = useState(false);
  const [isRefreshingEVM, setIsRefreshingEVM] = useState(false);
  const [isRefreshingMonad, setIsRefreshingMonad] = useState(false);
  const [isRefreshingPublicRolling, setIsRefreshingPublicRolling] = useState(false);
  const [isRefreshingLaunchpads, setIsRefreshingLaunchpads] = useState(false);
  const [isRefreshingProjectedStats, setIsRefreshingProjectedStats] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isRefreshingTraderStatsPhoton, setIsRefreshingTraderStatsPhoton] = useState(false);
  const [isRefreshingTraderStatsAxiom, setIsRefreshingTraderStatsAxiom] = useState(false);
  const [isRefreshingTraderStatsAll, setIsRefreshingTraderStatsAll] = useState(false);
  const [refreshingProjectedStatsProtocols, setRefreshingProjectedStatsProtocols] = useState<Set<string>>(new Set());
  const [refreshingTraderStatsProtocols, setRefreshingTraderStatsProtocols] = useState<Set<string>>(new Set());
  const [projectedStatsLatestDates, setProjectedStatsLatestDates] = useState<Map<string, { latest_date: string; is_current: boolean; days_behind: number }>>(new Map());
  const [refreshingLaunchpads, setRefreshingLaunchpads] = useState<Set<string>>(new Set());
  const { syncData } = useDataSync();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [refreshingProtocols, setRefreshingProtocols] = useState<Set<string>>(new Set());
  const [syncStatuses, setSyncStatuses] = useState<Map<string, ProtocolSyncStatus>>(new Map());
  const [loadingSyncStatus, setLoadingSyncStatus] = useState(true);
  const [latestDates, setLatestDates] = useState<Map<string, ProtocolLatestDate>>(new Map());
  const [launchpadLatestDates, setLaunchpadLatestDates] = useState<Map<string, LaunchpadLatestDate>>(new Map());
  const [dataTypePreference, setDataTypePreference] = useState<'private' | 'public'>('private');
  const [traderStatsRowCounts, setTraderStatsRowCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();
  
  const categories = getMutableAllCategoriesIncludingEVM(); // Show all protocols including EVM in management
  const sensors = useSensors(useSensor(PointerSensor));
  
  // Load data type preference on component mount
  useEffect(() => {
    const preference = Settings.getDataTypePreference();
    setDataTypePreference(preference);
  }, []);

  // Load configurations from database on component mount
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        await loadProtocolConfigurations();
        setForceRender(prev => prev + 1); // Trigger re-render after loading
      } catch (error) {
        console.error('Failed to load protocol configurations:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load saved configurations",
        });
      }
    };
    
    loadConfigs();
  }, []);

  // Fetch trader stats row counts - ONLY on page load, no polling
  useEffect(() => {
    const fetchTraderStatsRowCounts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/trader-stats/row-counts`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTraderStatsRowCounts(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trader stats row counts:', error);
      }
    };

    // Only fetch on initial page load - no continuous polling
    fetchTraderStatsRowCounts();
  }, []);
  
  // Handle data type preference change
  const handleDataTypeChange = async (isPublic: boolean) => {
    const newDataType = isPublic ? 'public' : 'private';
    setDataTypePreference(newDataType);
    Settings.setDataTypePreference(newDataType);
    
    // Clear all caches when switching data types
    clearAllFrontendCaches();
    
    // Show initial toast
    toast({
      variant: "success",
      title: "Data Type Updated",
      description: `Switched to ${newDataType} data. Starting auto-sync for all Solana protocols...`,
    });
    
    // Trigger auto-sync for all Solana protocols
    try {
      setIsRefreshingSolana(true);
      const result = await dataSyncApi.syncData(newDataType);
      
      toast({
        variant: "success",
        title: "Auto-Sync Complete",
        description: `Successfully synced ${result.csvFilesFetched} Solana protocols with ${newDataType} data`,
      });
      
      // Reload sync statuses after successful sync
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Auto-Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync Solana protocols",
      });
    } finally {
      setIsRefreshingSolana(false);
    }
  };

  // Load sync statuses and latest dates
  useEffect(() => {
    const loadSyncData = async () => {
      try {
        setLoadingSyncStatus(true);
        
        // Load sync statuses
        const statuses = await protocolApi.getAllSyncStatus();
        const statusMap = new Map(statuses.map(s => [s.protocol_name, s]));
        setSyncStatuses(statusMap);
        
        // Load latest dates
        const latestDatesData = await protocolApi.getLatestDataDates();
        const latestDatesMap = new Map(latestDatesData.map(d => [d.protocol_name, d]));
        setLatestDates(latestDatesMap);
        
        // Load launchpad latest dates
        const launchpadLatestDatesData = await LaunchpadApi.getLatestDataDates();
        const launchpadLatestDatesMap = new Map(launchpadLatestDatesData.map(d => [d.launchpad_name, d]));
        setLaunchpadLatestDates(launchpadLatestDatesMap);
        
        
      } catch (error) {
        console.error('Failed to load sync data:', error);
      } finally {
        setLoadingSyncStatus(false);
      }
    };

    loadSyncData();
    // Reload sync data after any refresh
  }, [forceRender]);

  // Separate effect for projected stats latest dates
  useEffect(() => {
    const loadProjectedStatsLatestDates = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/projected-stats/latest-dates`);
        
        if (response.ok) {
          const data = await response.json();
          const projectedStatsLatestDatesMap = new Map(Object.entries(data));
          setProjectedStatsLatestDates(projectedStatsLatestDatesMap);
        }
      } catch (error) {
        console.error('Error loading projected stats latest dates:', error);
      }
    };

    loadProjectedStatsLatestDates();
  }, [forceRender]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (overId.startsWith('category-')) {
      const newCategory = overId.replace('category-', '');
      updateProtocolCategory(activeId, newCategory);
      setForceRender(prev => prev + 1);
      toast({
        variant: "success",
        title: "Success",
        description: `Protocol moved to ${newCategory}`,
      });
    }
  };


  const handleHardRefresh = async () => {
    if (isRefreshingSolana) return;

    setIsRefreshingSolana(true);
    try {
      // Sync ONLY Solana protocols from rolling-refresh-config.ts (7-day rolling data)
      const result = await dataSyncApi.syncRollingRefreshData('solana');

      // Clear all frontend caches after successful refresh
      clearAllFrontendCaches();

      toast({
        variant: "success",
        title: "Solana Data Refresh Complete",
        description: `Successfully refreshed ${result.protocolsSynced} Solana protocols`,
      });

      // Reload sync statuses after successful refresh
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Solana Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh Solana data",
      });
    } finally {
      setIsRefreshingSolana(false);
    }
  };

  const handleSaveConfigurations = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await saveProtocolConfigurations();
      toast({
        variant: "success",
        title: "Configurations Saved",
        description: "Trading app configurations saved to database successfully!",
      });
      setForceRender(prev => prev + 1); // Trigger re-render to update unsaved changes indicator
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save configurations",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshProtocol = async (protocolId: string) => {
    if (refreshingProtocols.has(protocolId)) return;
    
    setRefreshingProtocols(prev => new Set([...prev, protocolId]));
    
    try {
      // Check if this is an EVM protocol to determine data type
      const protocol = getMutableProtocolConfigs().find(p => p.id === protocolId);
      const isEVMProtocol = protocol?.chain === 'evm';
      
      // For EVM protocols, always use 'public', otherwise use user preference
      const dataType = isEVMProtocol ? 'public' : dataTypePreference;
      
      // Use unified sync endpoint - backend will route EVM protocols automatically
      const result = await dataSyncApi.syncProtocolData(protocolId, dataType);
      
      // Clear frontend cache for this protocol
      clearProtocolFrontendCache(protocolId);
      
      toast({
        variant: "success",
        title: isEVMProtocol ? "EVM Protocol Refreshed" : "Protocol Refreshed",
        description: `Successfully refreshed data for ${protocolId}`,
      });
      
      // Reload sync statuses after successful refresh
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : `Failed to refresh ${protocolId}`,
      });
    } finally {
      setRefreshingProtocols(prev => {
        const newSet = new Set(prev);
        newSet.delete(protocolId);
        return newSet;
      });
    }
  };

  const handleRefreshAllEVM = async () => {
    if (isRefreshingEVM) return;
    
    setIsRefreshingEVM(true);
    try {
      const result = await dataSyncApi.syncEVMData();
      
      // Clear EVM protocol caches specifically after successful refresh
      clearEVMProtocolsCaches();
      
      toast({
        variant: "success",
        title: "EVM Data Refresh Complete",
        description: `Successfully refreshed ${result.csvFilesFetched} protocols`,
      });
      
      // Reload sync statuses after successful refresh
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "EVM Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh EVM data",
      });
    } finally {
      setIsRefreshingEVM(false);
    }
  };

  const handleRefreshMonad = async () => {
    if (isRefreshingMonad) return;

    setIsRefreshingMonad(true);
    try {
      const result = await dataSyncApi.syncMonadData();

      toast({
        variant: "success",
        title: "Monad Data Refresh Complete",
        description: `Successfully refreshed ${result.protocolsSynced} Monad protocols`,
      });

      // Reload sync statuses after successful refresh
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Monad Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh Monad data",
      });
    } finally {
      setIsRefreshingMonad(false);
    }
  };

  const handleRefreshPublicRolling = async () => {
    if (isRefreshingPublicRolling) return;

    setIsRefreshingPublicRolling(true);
    try {
      const result = await dataSyncApi.syncPublicRollingData();

      toast({
        variant: "success",
        title: "Public Rolling Stats Refresh Complete",
        description: `Successfully refreshed ${result.protocolsSynced} protocols`,
      });

      // Reload sync statuses after successful refresh
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Public Rolling Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh public rolling stats",
      });
    } finally {
      setIsRefreshingPublicRolling(false);
    }
  };

  const handleResetConfigurations = async () => {
    if (isResetting) return;
    
    setIsResetting(true);
    try {
      await resetProtocolConfigurations();
      toast({
        variant: "success",
        title: "Configurations Reset",
        description: "Trading app configurations reset to defaults!",
      });
      setForceRender(prev => prev + 1); // Trigger re-render to show reset changes
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Failed to reset configurations",
      });
    } finally {
      setIsResetting(false);
    }
  };


  const handleRefreshAllLaunchpads = async () => {
    if (isRefreshingLaunchpads) return;
    
    setIsRefreshingLaunchpads(true);
    try {
      const result = await dataSyncApi.syncAllLaunchpadData();
      
      toast({
        variant: "success",
        title: "Launchpad Data Refresh Complete",
        description: `Successfully refreshed ${result.csvFilesFetched} launchpads`,
      });
      
      // Reload sync statuses after successful refresh
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Launchpad Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh launchpad data",
      });
    } finally {
      setIsRefreshingLaunchpads(false);
    }
  };

  const handleRefreshProjectedStats = async () => {
    if (isRefreshingProjectedStats) return;
    
    setIsRefreshingProjectedStats(true);
    try {
      const result = await ProjectedStatsApi.updateProjectedData();
      
      toast({
        variant: "success",
        title: "Projected Stats Refresh Complete",
        description: `Successfully updated projected volume data for ${result.successCount} out of ${result.totalCount} protocols`,
      });
      
      // Reload sync statuses after successful refresh
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Projected Stats Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh projected stats data",
      });
    } finally {
      setIsRefreshingProjectedStats(false);
    }
  };

  const handleRefreshAll = async () => {
    if (isRefreshingAll) return;
    
    setIsRefreshingAll(true);
    
    try {
      await syncData(
        // onSyncStart
        () => {
          toast({
            title: "Starting Data Refresh",
            description: "Refreshing Solana protocols, Public Rolling Stats, and Projected Stats...",
          });
        },
        // onSyncSuccess
        (result) => {
          toast({
            variant: "success",
            title: "All Data Synced Successfully",
            description: `Complete refresh finished! (${result.csvFilesFetched} protocols synced)`,
          });
          // Reload sync statuses after successful refresh
          setForceRender(prev => prev + 1);
        },
        // onStepUpdate
        (step, progress) => {
          // Update individual loading states based on step
          if (step.includes('Solana')) {
            setIsRefreshingSolana(true);
            setIsRefreshingPublicRolling(false);
            setIsRefreshingProjectedStats(false);
          } else if (step.includes('Public Rolling')) {
            setIsRefreshingSolana(false);
            setIsRefreshingPublicRolling(true);
            setIsRefreshingProjectedStats(false);
          } else if (step.includes('Projected Stats')) {
            setIsRefreshingSolana(false);
            setIsRefreshingPublicRolling(false);
            setIsRefreshingProjectedStats(true);
          }
        },
        // onStepComplete
        (stepName, result) => {
          toast({
            variant: "success",
            title: `${stepName} Data Synced`,
            description: `${stepName} refresh completed! (${result.csvFilesFetched} protocols)`,
          });
        },
        // forceSync - bypass time restrictions for manual refresh
        true
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh All Failed",
        description: error instanceof Error ? error.message : "Failed to refresh all data sources",
      });
    } finally {
      setIsRefreshingAll(false);
      setIsRefreshingSolana(false);
      setIsRefreshingEVM(false);
      setIsRefreshingMonad(false);
      setIsRefreshingPublicRolling(false);
      setIsRefreshingProjectedStats(false);
    }
  };

  const handleRefreshLaunchpad = async (launchpadId: string) => {
    if (refreshingLaunchpads.has(launchpadId)) return;
    
    setRefreshingLaunchpads(prev => new Set([...prev, launchpadId]));
    
    try {
      const result = await dataSyncApi.syncLaunchpadData(launchpadId);
      
      toast({
        variant: "success",
        title: "Launchpad Refreshed",
        description: `Successfully refreshed data for ${launchpadId}`,
      });
      
      // Reload sync statuses after successful refresh
      setForceRender(prev => prev + 1);
    } catch (error) {
      console.error('Launchpad refresh error:', error);
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : `Failed to refresh ${launchpadId}`,
      });
    } finally {
      setRefreshingLaunchpads(prev => {
        const newSet = new Set(prev);
        newSet.delete(launchpadId);
        return newSet;
      });
    }
  };

  const handleRefreshTraderStats = async (protocol: 'photon' | 'axiom') => {
    const setRefreshing = protocol === 'photon' ? setIsRefreshingTraderStatsPhoton : setIsRefreshingTraderStatsAxiom;
    const isRefreshing = protocol === 'photon' ? isRefreshingTraderStatsPhoton : isRefreshingTraderStatsAxiom;
    
    if (isRefreshing) return;
    
    setRefreshing(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/trader-stats/refresh/${protocol}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: "Trader Stats Refreshed",
          description: `Successfully refreshed ${protocol} with ${result.data?.tradersImported || 0} traders`,
        });
        
        // Refresh row counts after successful import
        const countsResponse = await fetch(`${API_BASE_URL}/trader-stats/row-counts`);
        if (countsResponse.ok) {
          const countsData = await countsResponse.json();
          if (countsData.success) {
            setTraderStatsRowCounts(countsData.data);
          }
        }
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Trader Stats Refresh Failed",
        description: `Failed to refresh ${protocol}: ${error.message}`,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshAllTraderStats = async () => {
    if (isRefreshingTraderStatsAll) return;
    
    setIsRefreshingTraderStatsAll(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/trader-stats/refresh-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const summary = result.data?.summary || {};
        toast({
          variant: "success",
          title: "All Trader Stats Refreshed",
          description: `Successfully refreshed ${summary.successful} out of ${summary.total} protocols`,
        });
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Trader Stats Refresh Failed",
        description: `Failed to refresh trader stats: ${error.message}`,
      });
    } finally {
      setIsRefreshingTraderStatsAll(false);
    }
  };

  const handleRefreshIndividualProjectedStats = async (protocolId: string) => {
    if (refreshingProjectedStatsProtocols.has(protocolId)) return;
    
    setRefreshingProjectedStatsProtocols(prev => new Set([...prev, protocolId]));
    
    try {
      // Call the projected stats API for individual protocol
      const response = await fetch(`${API_BASE_URL}/projected-stats/refresh/${protocolId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: "Projected Stats Refreshed",
          description: `Successfully refreshed projected stats for ${protocolId}`,
        });
        
        // Reload data after successful refresh
        setForceRender(prev => prev + 1);
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Projected Stats Refresh Failed",
        description: `Failed to refresh ${protocolId}: ${error.message}`,
      });
    } finally {
      setRefreshingProjectedStatsProtocols(prev => {
        const newSet = new Set(prev);
        newSet.delete(protocolId);
        return newSet;
      });
    }
  };

  const handleRefreshIndividualTraderStats = async (protocol: 'photon' | 'axiom' | 'bloom' | 'trojan') => {
    if (refreshingTraderStatsProtocols.has(protocol)) return;
    
    setRefreshingTraderStatsProtocols(prev => new Set([...prev, protocol]));
    
    // Show starting toast notification
    toast({
      title: "Trader Stats Refresh Started",
      description: `Starting refresh for ${protocol.charAt(0).toUpperCase() + protocol.slice(1)}...`,
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/trader-stats/refresh/${protocol}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: "Trader Stats Refresh Complete",
          description: `Successfully refreshed ${protocol.charAt(0).toUpperCase() + protocol.slice(1)} with ${result.data?.tradersImported?.toLocaleString() || '0'} trader records imported`,
        });
        
        // Reload data after successful refresh
        setForceRender(prev => prev + 1);
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Trader Stats Refresh Failed",
        description: `Failed to refresh ${protocol}: ${error.message}`,
      });
    } finally {
      setRefreshingTraderStatsProtocols(prev => {
        const newSet = new Set(prev);
        newSet.delete(protocol);
        return newSet;
      });
    }
  };

  const activeProtocol = activeId ? getMutableProtocolConfigs().find(p => p.id === activeId) : null;

  return (
    <div className="space-y-2 sm:space-y-6">
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 sm:space-y-1.5">
              <CardTitle className="text-base sm:text-lg">Trading App Configuration</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Current trading apps organized by category. Drag trading apps between categories to reorganize them.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                onClick={handleResetConfigurations}
                disabled={isResetting || isSaving}
                variant="outline"
                size="sm"
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <span className="hidden sm:inline">Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Reset</span>
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveConfigurations}
                disabled={isSaving || isResetting || !hasUnsavedChanges()}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {hasUnsavedChanges() && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                You have unsaved changes. Click "Save Changes" to make them permanent.
              </p>
            </div>
          )}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-3 sm:space-y-6">
              {categories.map(category => {
                const categoryProtocols = getMutableProtocolsByCategoryIncludingEVM(category); // Show all protocols including EVM
                return (
                  <div key={category}>
                    <h3 className="text-sm sm:text-lg font-semibold mb-2 sm:mb-3">{category}</h3>
                    <DroppableCategory 
                      category={category} 
                      protocols={categoryProtocols} 
                      onRefresh={handleRefreshProtocol}
                      refreshingProtocols={refreshingProtocols}
                      syncStatuses={syncStatuses}
                      latestDates={latestDates}
                    />
                  </div>
                );
              })}
            </div>
            
            <DragOverlay>
              {activeProtocol ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-card border-border shadow-2xl ring-2 ring-primary/50 backdrop-blur-sm transform rotate-1">
                  <div className="p-1 bg-muted/20 rounded-sm w-10 h-10 flex items-center justify-center">
                    <activeProtocol.icon size={32} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{activeProtocol.name}</p>
                    <p className="text-sm text-muted-foreground">{activeProtocol.id}</p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 sm:space-y-1.5">
              <CardTitle className="text-base sm:text-lg">Launchpad Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View and manage individual launchpad configurations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Individual Launchpad Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {getAllLaunchpads().map(launchpad => (
                <div
                  key={launchpad.id}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border rounded-lg bg-card border-border hover:bg-accent hover:shadow-sm transition-all duration-200"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted/20 rounded-full overflow-hidden ring-1 ring-border/20 flex items-center justify-center">
                    <img 
                      src={`/assets/logos/${getLaunchpadLogoFilename(launchpad.id)}`}
                      alt={launchpad.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if logo not found
                        const target = e.target as HTMLImageElement;
                        const container = target.parentElement;
                        if (container) {
                          container.innerHTML = '';
                          container.className = 'w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center';
                          const iconElement = document.createElement('div');
                          iconElement.innerHTML = '<svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.25-2 5.2-2 5.2s4-0.5 5.2-2c1.6-2 2.8-7 2.8-7s-5 1.2-7 2.8Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>';
                          container.appendChild(iconElement);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground text-xs sm:text-base">{launchpad.name}</p>
                      <Badge variant="secondary" className="h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                        {launchpad.chain.toUpperCase()}
                      </Badge>
                    </div>
                    {launchpadLatestDates.get(launchpad.id) && (
                      <div className={`inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${
                        launchpadLatestDates.get(launchpad.id)!.is_current 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`} title={launchpadLatestDates.get(launchpad.id)!.is_current ? 'Data is current' : `${launchpadLatestDates.get(launchpad.id)!.days_behind} days behind`}>
                        <div className={`w-1 h-1 rounded-full ${
                          launchpadLatestDates.get(launchpad.id)!.is_current ? 'bg-green-600' : 'bg-red-600'
                        }`} />
                        <span className="font-medium text-[10px] sm:text-xs">
                          Latest: {new Date(launchpadLatestDates.get(launchpad.id)!.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRefreshLaunchpad(launchpad.id);
                    }}
                    disabled={refreshingLaunchpads.has(launchpad.id)}
                    className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                    title={`Refresh ${launchpad.name} data`}
                  >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingLaunchpads.has(launchpad.id) ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 sm:space-y-1.5">
              <CardTitle className="text-base sm:text-lg">Projected Stats Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View and manage individual protocol projected statistics refresh
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Organize by Categories */}
            <div className="space-y-4 sm:space-y-6">
              {/* Telegram Bots */}
              <div className="space-y-2 sm:space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Telegram Bots</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {['trojan', 'bonkbot', 'bloom', 'soltradingbot', 'banana', 'maestro', 'basedbot'].map(protocolId => {
                    const protocol = getMutableProtocolConfigs().find(p => p.id === protocolId);
                    if (!protocol) return null;
                    
                    const latestDateInfo = projectedStatsLatestDates.get(protocolId);
                    
                    return (
                      <div
                        key={protocol.id}
                        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border rounded-lg bg-card border-border hover:bg-accent hover:shadow-sm transition-all duration-200"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted/20 rounded-full overflow-hidden ring-1 ring-border/20 flex items-center justify-center">
                          <img 
                            src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                            alt={protocol.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const container = target.parentElement;
                              if (container) {
                                container.innerHTML = '';
                                container.className = 'w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center';
                                const iconElement = document.createElement('div');
                                iconElement.innerHTML = '<svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v5h5"/><path d="m3 8 4-4 4 4"/><path d="M14 3v5h5"/><path d="m14 8 4-4 4 4"/><path d="M3 16v5h5"/><path d="m3 21 4-4 4 4"/><path d="M14 16v5h5"/><path d="m14 21 4-4 4 4"/></svg>';
                                container.appendChild(iconElement);
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground text-xs sm:text-base">{protocol.name}</p>
                            <Badge variant="secondary" className="h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              TG BOT
                            </Badge>
                          </div>
                          {latestDateInfo ? (
                            <div className={`inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${
                              latestDateInfo.is_current 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`} title={latestDateInfo.is_current ? 'Data is current' : `${latestDateInfo.days_behind} days behind`}>
                              <div className={`w-1 h-1 rounded-full ${
                                latestDateInfo.is_current ? 'bg-green-600' : 'bg-red-600'
                              }`} />
                              <span className="font-medium text-[10px] sm:text-xs">
                                Latest: {new Date(latestDateInfo.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                              <div className="w-1 h-1 rounded-full bg-gray-600" />
                              <span className="font-medium text-[10px] sm:text-xs">
                                Loading...
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefreshIndividualProjectedStats(protocol.id);
                          }}
                          disabled={refreshingProjectedStatsProtocols.has(protocol.id)}
                          className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                          title={`Refresh ${protocol.name} projected stats`}
                        >
                          <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingProjectedStatsProtocols.has(protocol.id) ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>

              {/* Trading Terminals */}
              <div className="space-y-2 sm:space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Trading Terminals</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {['photon', 'bullx', 'axiom', 'gmgnai', 'terminal', 'nova terminal', 'telemetry', 'mevx', 'rhythm', 'vyper', 'phantom', 'opensea', 'okx'].map(protocolId => {
                    const protocol = getMutableProtocolConfigs().find(p => p.id === protocolId);
                    if (!protocol) return null;
                    
                    const latestDateInfo = projectedStatsLatestDates.get(protocolId);
                    
                    return (
                      <div
                        key={protocol.id}
                        className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border rounded-lg bg-card border-border hover:bg-accent hover:shadow-sm transition-all duration-200"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted/20 rounded-full overflow-hidden ring-1 ring-border/20 flex items-center justify-center">
                          <img 
                            src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                            alt={protocol.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const container = target.parentElement;
                              if (container) {
                                container.innerHTML = '';
                                container.className = 'w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center';
                                const iconElement = document.createElement('div');
                                iconElement.innerHTML = '<svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v5h5"/><path d="m3 8 4-4 4 4"/><path d="M14 3v5h5"/><path d="m14 8 4-4 4 4"/><path d="M3 16v5h5"/><path d="m3 21 4-4 4 4"/><path d="M14 16v5h5"/><path d="m14 21 4-4 4 4"/></svg>';
                                container.appendChild(iconElement);
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground text-xs sm:text-base">{protocol.name}</p>
                            <Badge variant="secondary" className="h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              TERMINAL
                            </Badge>
                          </div>
                          {latestDateInfo ? (
                            <div className={`inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs ${
                              latestDateInfo.is_current 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`} title={latestDateInfo.is_current ? 'Data is current' : `${latestDateInfo.days_behind} days behind`}>
                              <div className={`w-1 h-1 rounded-full ${
                                latestDateInfo.is_current ? 'bg-green-600' : 'bg-red-600'
                              }`} />
                              <span className="font-medium text-[10px] sm:text-xs">
                                Latest: {new Date(latestDateInfo.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                              <div className="w-1 h-1 rounded-full bg-gray-600" />
                              <span className="font-medium text-[10px] sm:text-xs">
                                Loading...
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefreshIndividualProjectedStats(protocol.id);
                          }}
                          disabled={refreshingProjectedStatsProtocols.has(protocol.id)}
                          className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                          title={`Refresh ${protocol.name} projected stats`}
                        >
                          <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingProjectedStatsProtocols.has(protocol.id) ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 sm:space-y-1.5">
              <CardTitle className="text-base sm:text-lg">Trader Stats Management</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View and manage individual protocol trader statistics refresh
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Trader Stats Info Cards with Individual Refresh Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              {/* Photon Trader Stats */}
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border rounded-lg bg-card border-border hover:bg-accent hover:shadow-sm transition-all duration-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted/20 rounded-full overflow-hidden ring-1 ring-border/20 flex items-center justify-center">
                  <img 
                    src="/assets/logos/photon.jpg"
                    alt="Photon" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const container = target.parentElement;
                      if (container) {
                        container.innerHTML = '';
                        container.className = 'w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center';
                        const iconElement = document.createElement('div');
                        iconElement.innerHTML = '<svg class="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-3-3m0 0-3-3m3 3 3-3m-3 3-3 3"/></svg>';
                        container.appendChild(iconElement);
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-xs sm:text-base">Photon</p>
                    <Badge variant="secondary" className="h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                      TRADERS
                    </Badge>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-medium"
                  >
                    {(traderStatsRowCounts['photon'] || 0).toLocaleString()} rows
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshIndividualTraderStats('photon');
                  }}
                  disabled={refreshingTraderStatsProtocols.has('photon')}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                  title="Refresh Photon trader stats"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingTraderStatsProtocols.has('photon') ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Axiom Trader Stats */}
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border rounded-lg bg-card border-border hover:bg-accent hover:shadow-sm transition-all duration-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted/20 rounded-full overflow-hidden ring-1 ring-border/20 flex items-center justify-center">
                  <img 
                    src="/assets/logos/axiom.jpg"
                    alt="Axiom" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const container = target.parentElement;
                      if (container) {
                        container.innerHTML = '';
                        container.className = 'w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center';
                        const iconElement = document.createElement('div');
                        iconElement.innerHTML = '<svg class="w-5 h-5 text-cyan-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-3-3m0 0-3-3m3 3 3-3m-3 3-3 3"/></svg>';
                        container.appendChild(iconElement);
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-xs sm:text-base">Axiom</p>
                    <Badge variant="secondary" className="h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400">
                      TRADERS
                    </Badge>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-medium"
                  >
                    {(traderStatsRowCounts['axiom'] || 0).toLocaleString()} rows
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshIndividualTraderStats('axiom');
                  }}
                  disabled={refreshingTraderStatsProtocols.has('axiom')}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                  title="Refresh Axiom trader stats"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingTraderStatsProtocols.has('axiom') ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Bloom Trader Stats */}
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border rounded-lg bg-card border-border hover:bg-accent hover:shadow-sm transition-all duration-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted/20 rounded-full overflow-hidden ring-1 ring-border/20 flex items-center justify-center">
                  <img 
                    src="/assets/logos/bloom.jpg"
                    alt="Bloom" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const container = target.parentElement;
                      if (container) {
                        container.innerHTML = '';
                        container.className = 'w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center';
                        const iconElement = document.createElement('div');
                        iconElement.innerHTML = '<svg class="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-3-3m0 0-3-3m3 3 3-3m-3 3-3 3"/></svg>';
                        container.appendChild(iconElement);
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-xs sm:text-base">Bloom</p>
                    <Badge variant="secondary" className="h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                      TRADERS
                    </Badge>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-medium"
                  >
                    {(traderStatsRowCounts['bloom'] || 0).toLocaleString()} rows
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshIndividualTraderStats('bloom');
                  }}
                  disabled={refreshingTraderStatsProtocols.has('bloom')}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                  title="Refresh Bloom trader stats"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingTraderStatsProtocols.has('bloom') ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Trojan Trader Stats */}
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border rounded-lg bg-card border-border hover:bg-accent hover:shadow-sm transition-all duration-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted/20 rounded-full overflow-hidden ring-1 ring-border/20 flex items-center justify-center">
                  <img 
                    src="/assets/logos/trojan.jpg"
                    alt="Trojan" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const container = target.parentElement;
                      if (container) {
                        container.innerHTML = '';
                        container.className = 'w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center';
                        const iconElement = document.createElement('div');
                        iconElement.innerHTML = '<svg class="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-3-3m0 0-3-3m3 3 3-3m-3 3-3 3"/></svg>';
                        container.appendChild(iconElement);
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-xs sm:text-base">Trojan</p>
                    <Badge variant="secondary" className="h-4 sm:h-5 px-1 sm:px-2 text-[10px] sm:text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      TRADERS
                    </Badge>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-medium"
                  >
                    {(traderStatsRowCounts['trojan'] || 0).toLocaleString()} rows
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshIndividualTraderStats('trojan');
                  }}
                  disabled={refreshingTraderStatsProtocols.has('trojan')}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                  title="Refresh Trojan trader stats"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshingTraderStatsProtocols.has('trojan') ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 sm:space-y-1.5">
              <CardTitle className="text-base sm:text-lg">Data Refresh Operations</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Force refresh data for trading apps and launchpads
              </CardDescription>
            </div>
            <Button
              onClick={handleRefreshAll}
              disabled={isRefreshingAll || isRefreshingSolana || isRefreshingEVM || isRefreshingLaunchpads || isRefreshingProjectedStats}
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
            >
              {isRefreshingAll ? (
                <>
                  <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  <span className="hidden sm:inline">Refreshing All...</span>
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Refresh All</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-6">
            {/* Trading Apps Section */}
            <div className="space-y-2 sm:space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground font-medium">Trading Apps</span>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
                <div className="group relative bg-gradient-to-br from-card via-card/95 to-purple-50/30 dark:to-purple-950/10 border border-border/50 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:border-purple-500/20 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-xs sm:text-sm font-medium text-foreground">Solana Protocols</span>
                        <div className="flex -space-x-1">
                          {getMutableProtocolConfigs()
                            .filter(p => p.chain === 'solana')
                            .slice(0, 4)
                            .map((protocol, index) => (
                            <div 
                              key={protocol.id}
                              className="w-5 h-5 rounded-full border border-background bg-muted overflow-hidden" 
                              style={{ zIndex: 4 - index }}
                              title={protocol.name}
                            >
                              <img 
                                src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                                alt={protocol.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const container = target.parentElement;
                                  if (container) {
                                    container.innerHTML = '';
                                    container.className = 'w-5 h-5 rounded-full border border-background bg-muted/50 flex items-center justify-center';
                                    const iconEl = document.createElement('div');
                                    iconEl.innerHTML = '<svg class="h-2.5 w-2.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                    container.appendChild(iconEl);
                                  }
                                }}
                              />
                            </div>
                          ))}
                          {getMutableProtocolConfigs().filter(p => p.chain === 'solana').length > 4 && (
                            <div className="w-5 h-5 rounded-full border border-background bg-muted/80 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              +{getMutableProtocolConfigs().filter(p => p.chain === 'solana').length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                        Refresh all Solana trading apps data
                      </p>
                    </div>
                    <Button
                      onClick={handleHardRefresh}
                      disabled={isRefreshingSolana || isRefreshingAll}
                      variant="outline"
                      size="sm"
                      className="ml-4 shrink-0"
                    >
                      {(isRefreshingSolana || isRefreshingAll) ? (
                        <>
                          <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          <span className="hidden sm:inline">Refreshing...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Refresh Solana</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="group relative bg-gradient-to-br from-card via-card/95 to-blue-50/30 dark:to-blue-950/10 border border-border/50 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 hover:border-blue-500/20 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-xs sm:text-sm font-medium text-foreground">EVM</span>
                        <div className="flex -space-x-1">
                          {getMutableProtocolConfigs()
                            .filter(p => p.chain === 'evm')
                            .slice(0, 4)
                            .map((protocol, index) => (
                            <div 
                              key={protocol.id}
                              className="w-5 h-5 rounded-full border border-background bg-muted overflow-hidden" 
                              style={{ zIndex: 4 - index }}
                              title={protocol.name}
                            >
                              <img 
                                src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                                alt={protocol.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const container = target.parentElement;
                                  if (container) {
                                    container.innerHTML = '';
                                    container.className = 'w-5 h-5 rounded-full border border-background bg-muted/50 flex items-center justify-center';
                                    const iconEl = document.createElement('div');
                                    iconEl.innerHTML = '<svg class="h-2.5 w-2.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                    container.appendChild(iconEl);
                                  }
                                }}
                              />
                            </div>
                          ))}
                          {getMutableProtocolConfigs().filter(p => p.chain === 'evm').length > 4 && (
                            <div className="w-5 h-5 rounded-full border border-background bg-muted/80 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              +{getMutableProtocolConfigs().filter(p => p.chain === 'evm').length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                        Refresh all EVM trading apps data
                      </p>
                    </div>
                    <Button
                      onClick={handleRefreshAllEVM}
                      disabled={isRefreshingEVM || isRefreshingAll}
                      variant="outline"
                      size="sm"
                      className="ml-4 shrink-0"
                    >
                      {(isRefreshingEVM || isRefreshingAll) ? (
                        <>
                          <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          <span className="hidden sm:inline">Refreshing...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Refresh EVM</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Monad & Public Rolling Stats Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
                {/* Monad */}
                <div className="group relative bg-gradient-to-br from-card via-card/95 to-violet-50/30 dark:to-violet-950/10 border border-border/50 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 hover:border-violet-500/20 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                        <span className="text-xs sm:text-sm font-medium text-foreground">Monad</span>
                        <div className="flex -space-x-1">
                          {getMutableProtocolConfigs()
                            .filter(p => p.chain === 'monad')
                            .slice(0, 4)
                            .map((protocol, index) => (
                            <div
                              key={protocol.id}
                              className="w-5 h-5 rounded-full border border-background bg-muted overflow-hidden"
                              style={{ zIndex: 4 - index }}
                              title={protocol.name}
                            >
                              <img
                                src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                                alt={protocol.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const container = target.parentElement;
                                  if (container) {
                                    container.innerHTML = '';
                                    container.className = 'w-5 h-5 rounded-full border border-background bg-muted/50 flex items-center justify-center';
                                    const iconEl = document.createElement('div');
                                    iconEl.innerHTML = '<svg class="h-2.5 w-2.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                    container.appendChild(iconEl);
                                  }
                                }}
                              />
                            </div>
                          ))}
                          {getMutableProtocolConfigs().filter(p => p.chain === 'monad').length > 4 && (
                            <div className="w-5 h-5 rounded-full border border-background bg-muted/80 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              +{getMutableProtocolConfigs().filter(p => p.chain === 'monad').length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                        Refresh all Monad trading apps data
                      </p>
                    </div>
                    <Button
                      onClick={handleRefreshMonad}
                      disabled={isRefreshingMonad || isRefreshingAll}
                      variant="outline"
                      size="sm"
                      className="ml-4 shrink-0"
                    >
                      {(isRefreshingMonad || isRefreshingAll) ? (
                        <>
                          <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          <span className="hidden sm:inline">Refreshing...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Refresh Monad</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Public Rolling Stats */}
                <div className="group relative bg-gradient-to-br from-card via-card/95 to-emerald-50/30 dark:to-emerald-950/10 border border-border/50 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:border-emerald-500/20 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs sm:text-sm font-medium text-foreground">Public Rolling Stats</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                        Refresh public rolling stats for all protocols
                      </p>
                    </div>
                    <Button
                      onClick={handleRefreshPublicRolling}
                      disabled={isRefreshingPublicRolling || isRefreshingAll}
                      variant="outline"
                      size="sm"
                      className="ml-4 shrink-0"
                    >
                      {(isRefreshingPublicRolling || isRefreshingAll) ? (
                        <>
                          <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          <span className="hidden sm:inline">Refreshing...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Refresh Public</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-medium">Launchpads</span>
              </div>
            </div>

            {/* Launchpads Section */}
            <div className="space-y-2 sm:space-y-3">
              <div className="group relative bg-gradient-to-br from-card via-card/95 to-emerald-50/30 dark:to-emerald-950/10 border border-border/50 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:border-emerald-500/20 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs sm:text-sm font-medium text-foreground">All Launchpads</span>
                      <div className="flex -space-x-1">
                        {getAllLaunchpads().slice(0, 4).map((launchpad, index) => (
                          <div 
                            key={launchpad.id}
                            className="w-5 h-5 rounded-full border border-background bg-muted overflow-hidden" 
                            style={{ zIndex: 4 - index }}
                            title={launchpad.name}
                          >
                            <img 
                              src={`/assets/logos/${getLaunchpadLogoFilename(launchpad.id)}`}
                              alt={launchpad.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const container = target.parentElement;
                                if (container) {
                                  container.innerHTML = '';
                                  container.className = 'w-5 h-5 rounded-full border border-background bg-muted/50 flex items-center justify-center';
                                  const iconEl = document.createElement('div');
                                  iconEl.innerHTML = '<svg class="h-2.5 w-2.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.25-2 5.2-2 5.2s4-0.5 5.2-2c1.6-2 2.8-7 2.8-7s-5 1.2-7 2.8Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>';
                                  container.appendChild(iconEl);
                                }
                              }}
                            />
                          </div>
                        ))}
                        {getAllLaunchpads().length > 4 && (
                          <div className="w-5 h-5 rounded-full border border-background bg-muted/80 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                            +{getAllLaunchpads().length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                      Refresh data for PumpFun, Moonshot, and other launchpad metrics
                    </p>
                  </div>
                  <Button
                    onClick={handleRefreshAllLaunchpads}
                    disabled={isRefreshingLaunchpads || isRefreshingAll}
                    variant="outline"
                    size="sm"
                    className="ml-4 shrink-0"
                  >
                    {isRefreshingLaunchpads ? (
                      <>
                        <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        <span className="hidden sm:inline">Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Refresh Launchpads</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-medium">Projected Stats</span>
              </div>
            </div>

            {/* Projected Stats Section */}
            <div className="space-y-2 sm:space-y-3">
              <div className="group relative bg-gradient-to-br from-card via-card/95 to-purple-50/30 dark:to-purple-950/10 border border-border/50 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:border-purple-500/20 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-xs sm:text-sm font-medium text-foreground">Projected Volume Data</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                      Refresh projected trading volume data from analytics queries
                    </p>
                  </div>
                  <Button
                    onClick={handleRefreshProjectedStats}
                    disabled={isRefreshingProjectedStats || isRefreshingAll}
                    variant="outline"
                    size="sm"
                    className="ml-4 shrink-0"
                  >
                    {isRefreshingProjectedStats ? (
                      <>
                        <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        <span className="hidden sm:inline">Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Refresh Projected</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-medium">Trader Stats</span>
              </div>
            </div>

            {/* Trader Stats Section */}
            <div className="space-y-2 sm:space-y-3">
              {/* All Trader Stats Refresh - Only button, no individual ones */}
              <div className="group relative bg-gradient-to-br from-card via-card/95 to-indigo-50/30 dark:to-indigo-950/10 border border-border/50 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 hover:border-indigo-500/20 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="text-xs sm:text-sm font-medium text-foreground">All Trader Stats</span>
                      <div className="flex -space-x-1">
                        {/* Photon logo */}
                        <div className="w-5 h-5 rounded-full border border-background bg-muted overflow-hidden" style={{ zIndex: 2 }}>
                          <img 
                            src="/assets/logos/photon.jpg"
                            alt="Photon"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const container = target.parentElement;
                              if (container) {
                                container.innerHTML = '';
                                container.className = 'w-5 h-5 rounded-full border border-background bg-orange-500/20 flex items-center justify-center';
                                const iconEl = document.createElement('div');
                                iconEl.innerHTML = '<svg class="h-2.5 w-2.5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>';
                                container.appendChild(iconEl);
                              }
                            }}
                          />
                        </div>
                        {/* Axiom logo */}
                        <div className="w-5 h-5 rounded-full border border-background bg-muted overflow-hidden" style={{ zIndex: 1 }}>
                          <img 
                            src="/assets/logos/axiom.jpg"
                            alt="Axiom"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const container = target.parentElement;
                              if (container) {
                                container.innerHTML = '';
                                container.className = 'w-5 h-5 rounded-full border border-background bg-cyan-500/20 flex items-center justify-center';
                                const iconEl = document.createElement('div');
                                iconEl.innerHTML = '<svg class="h-2.5 w-2.5 text-cyan-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>';
                                container.appendChild(iconEl);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                      Refresh trader statistics for both Photon and Axiom protocols
                    </p>
                  </div>
                  <Button
                    onClick={handleRefreshAllTraderStats}
                    disabled={isRefreshingTraderStatsAll || isRefreshingTraderStatsPhoton || isRefreshingTraderStatsAxiom}
                    variant="outline"
                    size="sm"
                    className="ml-4 shrink-0 bg-white dark:bg-white/10 border-border/50 hover:bg-gray-50 dark:hover:bg-white/20"
                  >
                    {isRefreshingTraderStatsAll ? (
                      <>
                        <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        <span className="hidden sm:inline">Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Refresh All</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Data Source Settings */}
      <Card>
        <CardHeader className="pb-2 p-3 sm:px-6 sm:pt-6 sm:pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 sm:space-y-1.5">
              <CardTitle className="text-base sm:text-lg">
                Active Data Source
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Switch between in-house analytics and publicly verified sources
              </CardDescription>
            </div>
            <Badge variant="outline" className={`text-sm px-3 py-1.5 gap-1.5 ${
              dataTypePreference === 'private' 
                ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                : 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
            }`}>
              {dataTypePreference === 'private' ? (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  Private
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  Public
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2 p-3 sm:px-6 sm:pt-3 sm:pb-6">
          <div>
            {/* Data Source Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${
                    dataTypePreference === 'private' 
                      ? 'bg-blue-100 dark:bg-blue-900/20' 
                      : 'bg-green-100 dark:bg-green-900/20'
                  }`}>
                    {dataTypePreference === 'private' ? (
                      <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {dataTypePreference === 'private' ? "In-house Analytics" : "Publicly Verified Sources"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dataTypePreference === 'private' 
                        ? "Premium data with advanced metrics and real-time updates" 
                        : "Community verified, open source data from public APIs"
                      }
                    </div>
                  </div>
                </div>
                
                <Switch
                  id="data-type-toggle"
                  checked={dataTypePreference === 'public'}
                  onCheckedChange={handleDataTypeChange}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-blue-500"
                />
              </div>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}