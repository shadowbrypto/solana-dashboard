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
  const [isRefreshingLaunchpads, setIsRefreshingLaunchpads] = useState(false);
  const [isRefreshingProjectedStats, setIsRefreshingProjectedStats] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
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
      // Sync only Solana protocols (filter out EVM ones) using current data type preference
      const result = await dataSyncApi.syncData(dataTypePreference);
      
      // Clear all frontend caches after successful refresh
      clearAllFrontendCaches();
      
      toast({
        variant: "success",
        title: "Solana Data Refresh Complete",
        description: `Successfully refreshed ${dataTypePreference} Solana data for ${result.csvFilesFetched} protocols`,
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
      // Use unified sync endpoint - backend will route EVM protocols automatically
      const result = await dataSyncApi.syncProtocolData(protocolId, dataTypePreference);
      
      // Clear frontend cache for this protocol
      clearProtocolFrontendCache(protocolId);
      
      // Check if this is an EVM protocol for different toast message
      const protocol = getMutableProtocolConfigs().find(p => p.id === protocolId);
      const isEVMProtocol = protocol?.chain === 'evm';
      
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
            description: "Refreshing all data sources (Solana, EVM, Launchpads, Projected Stats)...",
          });
        },
        // onSyncSuccess
        (result) => {
          toast({
            variant: "success",
            title: "All Data Synced Successfully",
            description: `Complete refresh finished! (${result.csvFilesFetched} sources synced)`,
          });
          // Reload sync statuses after successful refresh
          setForceRender(prev => prev + 1);
        },
        // onStepUpdate
        (step, progress) => {
          // Update individual loading states based on step
          if (step.includes('Solana')) {
            setIsRefreshingSolana(true);
            setIsRefreshingEVM(false);
            setIsRefreshingLaunchpads(false);
            setIsRefreshingProjectedStats(false);
          } else if (step.includes('EVM')) {
            setIsRefreshingSolana(false);
            setIsRefreshingEVM(true);
            setIsRefreshingLaunchpads(false);
            setIsRefreshingProjectedStats(false);
          } else if (step.includes('Launchpad')) {
            setIsRefreshingSolana(false);
            setIsRefreshingEVM(false);
            setIsRefreshingLaunchpads(true);
            setIsRefreshingProjectedStats(false);
          } else if (step.includes('Projected Stats')) {
            setIsRefreshingSolana(false);
            setIsRefreshingEVM(false);
            setIsRefreshingLaunchpads(false);
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
      setIsRefreshingLaunchpads(false);
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
                      {isRefreshingSolana ? (
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
                      {isRefreshingEVM ? (
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