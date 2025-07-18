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
  loadProtocolConfigurations
} from '../lib/protocol-config';
import { Button } from './ui/button';
import { RefreshCcw, AlertCircle, GripVertical, Save, RotateCcw, RefreshCw, Calendar, Clock, Database, Eye } from 'lucide-react';
import { dataSyncApi, protocolApi, ProtocolSyncStatus, ProtocolLatestDate } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { clearAllFrontendCaches, clearProtocolFrontendCache, clearEVMProtocolsCaches } from '../lib/protocol';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Settings } from '../lib/settings';
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
      className={`min-h-[100px] p-4 border-2 border-dashed rounded-lg transition-all duration-200 ${
        isOver 
          ? 'border-primary bg-primary/10 shadow-md' 
          : 'border-muted-foreground/25 bg-muted/40 hover:bg-muted/60 hover:border-muted-foreground/40'
      }`}
    >
      <SortableContext items={protocols.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {protocols.map(protocol => (
            <SortableProtocol 
              key={protocol.id} 
              protocol={protocol} 
              onRefresh={onRefresh}
              isRefreshing={refreshingProtocols.has(protocol.id)}
              syncStatus={syncStatuses.get(protocol.id)}
              latestDate={latestDates.get(protocol.id)}
            />
          ))}
        </div>
      </SortableContext>
      {protocols.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm font-medium mb-1">
            Drop protocols here
          </p>
          <p className="text-muted-foreground/70 text-xs">
            Drag and drop protocols to organize them
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
      className={`flex items-center gap-3 p-3 border rounded-lg transition-all duration-200 ${
        sortableIsDragging 
          ? 'shadow-lg z-50 ring-2 ring-primary/50 bg-card scale-105' 
          : 'bg-card border-border hover:bg-accent hover:shadow-sm hover:border-border/80'
      }`}
      {...attributes}
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing hover:bg-accent p-1.5 rounded transition-colors">
        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </div>
      <div className="p-1 bg-muted/20 rounded-sm w-10 h-10 flex items-center justify-center">
        <protocol.icon size={32} className="text-muted-foreground" />
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
        <p className="text-sm text-muted-foreground">{protocol.id}</p>
        {syncStatus && !syncStatus.sync_success && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 text-red-500" />
            <span className="text-xs text-red-500">Sync Failed</span>
          </div>
        )}
        {syncStatus && syncStatus.sync_success && !syncStatus.has_recent_data && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            <span className="text-xs text-amber-500">
              {syncStatus.latest_data_date 
                ? `Latest: ${new Date(syncStatus.latest_data_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'No recent data'}
            </span>
          </div>
        )}
        {latestDate && !latestDate.is_current && (
          <div className="flex items-center gap-1 mt-1" title={`${latestDate.days_behind} days behind current date`}>
            <Clock className="h-3 w-3 text-red-500" />
            <span className="text-xs text-red-500">
              Latest: {new Date(latestDate.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
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
        className="h-8 w-8 p-0"
        title={`Refresh ${protocol.name} data`}
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}

export function ProtocolManagement() {
  const [isRefreshingSolana, setIsRefreshingSolana] = useState(false);
  const [isRefreshingEVM, setIsRefreshingEVM] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [refreshingProtocols, setRefreshingProtocols] = useState<Set<string>>(new Set());
  const [syncStatuses, setSyncStatuses] = useState<Map<string, ProtocolSyncStatus>>(new Map());
  const [loadingSyncStatus, setLoadingSyncStatus] = useState(true);
  const [latestDates, setLatestDates] = useState<Map<string, ProtocolLatestDate>>(new Map());
  const [isCheckingLatestDates, setIsCheckingLatestDates] = useState(false);
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

  // Load sync statuses
  useEffect(() => {
    const loadSyncStatuses = async () => {
      try {
        setLoadingSyncStatus(true);
        const statuses = await protocolApi.getAllSyncStatus();
        const statusMap = new Map(statuses.map(s => [s.protocol_name, s]));
        setSyncStatuses(statusMap);
      } catch (error) {
        console.error('Failed to load sync statuses:', error);
      } finally {
        setLoadingSyncStatus(false);
      }
    };

    loadSyncStatuses();
    // Reload sync statuses after any refresh
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
        description: "Protocol configurations saved to database successfully!",
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
        description: "Protocol configurations reset to defaults!",
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

  const handleCheckLatestDates = async () => {
    if (isCheckingLatestDates) return;
    
    setIsCheckingLatestDates(true);
    try {
      const dates = await protocolApi.getLatestDataDates();
      const datesMap = new Map(dates.map(d => [d.protocol_name, d]));
      setLatestDates(datesMap);
      
      const outdatedSolProtocols = dates.filter(d => !d.is_current && d.chain === 'solana').length;
      const outdatedEvmProtocols = dates.filter(d => !d.is_current && d.chain === 'evm').length;
      const totalOutdated = outdatedSolProtocols + outdatedEvmProtocols;
      
      let description = '';
      if (totalOutdated === 0) {
        description = "All protocols have current data";
      } else {
        const parts = [];
        if (outdatedSolProtocols > 0) parts.push(`${outdatedSolProtocols} SOL`);
        if (outdatedEvmProtocols > 0) parts.push(`${outdatedEvmProtocols} EVM`);
        description = `Found ${parts.join(' and ')} protocol(s) with outdated data`;
      }
      
      toast({
        variant: totalOutdated > 0 ? "destructive" : "success",
        title: "Latest Dates Checked",
        description,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Check Failed",
        description: error instanceof Error ? error.message : "Failed to check latest dates",
      });
    } finally {
      setIsCheckingLatestDates(false);
    }
  };

  const activeProtocol = activeId ? getMutableProtocolConfigs().find(p => p.id === activeId) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <CardTitle>Protocol Configuration</CardTitle>
              <CardDescription>
                Current protocols organized by category. Drag protocols between categories to reorganize them.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleResetConfigurations}
                disabled={isResetting || isSaving}
                variant="outline"
                size="sm"
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
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
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasUnsavedChanges() && (
            <div className="mb-4 p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You have unsaved changes. Click "Save Changes" to make them permanent.
              </p>
            </div>
          )}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              {categories.map(category => {
                const categoryProtocols = getMutableProtocolsByCategoryIncludingEVM(category); // Show all protocols including EVM
                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3">{category}</h3>
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
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Manage data sources and force refresh protocol data
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="data-type-toggle" className="text-sm font-medium">
                Private Data
              </Label>
              <Switch
                id="data-type-toggle"
                checked={dataTypePreference === 'public'}
                onCheckedChange={handleDataTypeChange}
              />
              <Label htmlFor="data-type-toggle" className="text-sm font-medium">
                Public Data
              </Label>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Database className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200 flex-1">
                Currently showing <strong>{dataTypePreference}</strong> data. Toggle above to switch between private (paid) and public (free) data sources.
              </p>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <p className="text-sm text-orange-800 dark:text-orange-200 flex-1">
                This will force a complete data refresh from Dune Analytics, bypassing all time restrictions.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleHardRefresh}
                  disabled={isRefreshingSolana}
                  variant="outline"
                  size="sm"
                >
                  {isRefreshingSolana ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Refresh Solana Data
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRefreshAllEVM}
                  disabled={isRefreshingEVM}
                  variant="outline"
                  size="sm"
                >
                  {isRefreshingEVM ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Refresh EVM Data
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200 flex-1">
                Check if all protocols have current data and highlight any outdated ones.
              </p>
              <Button
                onClick={handleCheckLatestDates}
                disabled={isCheckingLatestDates}
                variant="outline"
                size="sm"
              >
                {isCheckingLatestDates ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Check Latest Dates
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}