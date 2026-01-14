import { useState, useEffect } from 'react';
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
import { RefreshCcw, GripVertical, Save, RotateCcw, RefreshCw, Shield, Globe, ChevronRight, Check } from 'lucide-react';
import { dataSyncApi, protocolApi, ProtocolSyncStatus, ProtocolLatestDate } from '../lib/api';
import { getAllLaunchpads, getLaunchpadLogoFilename } from '../lib/launchpad-config';
import { LaunchpadApi, LaunchpadLatestDate } from '../lib/launchpad-api';
import { useToast } from '../hooks/use-toast';
import { clearAllFrontendCaches, clearProtocolFrontendCache, clearEVMProtocolsCaches } from '../lib/protocol';
import { useDataSync } from '../hooks/useDataSync';
import { Switch } from './ui/switch';
import { Settings } from '../lib/settings';
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

// ============================================================================
// Section Header Component
// ============================================================================
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-1 mb-4">
      <h2 className="text-xl font-semibold text-foreground tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}

// ============================================================================
// Section Container Component
// ============================================================================
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border/40 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// List Item Component - Apple style row
// ============================================================================
interface ListItemProps {
  icon?: React.ReactNode;
  logo?: string;
  logoAlt?: string;
  title: string;
  subtitle?: string;
  badge?: { text: string; variant: 'success' | 'warning' | 'info' | 'default' };
  rightElement?: React.ReactNode;
  onClick?: () => void;
  isLast?: boolean;
  disabled?: boolean;
}

function ListItem({ icon, logo, logoAlt, title, subtitle, badge, rightElement, onClick, isLast = false, disabled = false }: ListItemProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-border/30' : ''} ${onClick && !disabled ? 'hover:bg-muted/30 cursor-pointer active:bg-muted/50 transition-colors' : ''} ${disabled ? 'opacity-50' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      {logo && (
        <div className="w-10 h-10 rounded-xl bg-muted/30 overflow-hidden flex-shrink-0 ring-1 ring-border/10">
          <img
            src={logo}
            alt={logoAlt || title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
      {icon && !logo && (
        <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{title}</span>
          {badge && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
              badge.variant === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              badge.variant === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
              badge.variant === 'info' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-muted text-muted-foreground'
            }`}>
              {badge.text}
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-xs text-muted-foreground truncate block">{subtitle}</span>
        )}
      </div>
      {rightElement}
    </div>
  );
}

// ============================================================================
// Refresh Button Component
// ============================================================================
function RefreshButton({ onClick, isRefreshing, size = 'sm' }: { onClick: () => void; isRefreshing: boolean; size?: 'sm' | 'md' }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={isRefreshing}
      className={`${size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'} rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50`}
    >
      <RefreshCw className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} ${isRefreshing ? 'animate-spin' : ''}`} />
    </button>
  );
}

// ============================================================================
// Status Indicator Component
// ============================================================================
function StatusIndicator({ isCurrent, latestDate }: { isCurrent: boolean; latestDate: string }) {
  const formattedDate = new Date(latestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div className={`flex items-center gap-1.5 text-xs ${isCurrent ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-green-500' : 'bg-amber-500'}`} />
      <span>{formattedDate}</span>
    </div>
  );
}

// ============================================================================
// Sortable Protocol Component (for drag and drop)
// ============================================================================
interface SortableProtocolProps {
  protocol: any;
  isDragging?: boolean;
  onRefresh: (protocolId: string) => void;
  isRefreshing: boolean;
  latestDate?: ProtocolLatestDate;
}

function SortableProtocol({ protocol, isDragging, onRefresh, isRefreshing, latestDate }: SortableProtocolProps) {
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
      className={`flex items-center gap-3 p-3 bg-card rounded-xl border border-border/40 transition-all ${
        sortableIsDragging ? 'shadow-lg ring-2 ring-primary/20 scale-[1.02]' : 'hover:border-border/60 hover:shadow-sm'
      }`}
      {...attributes}
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted/50 rounded-lg transition-colors">
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <div className="w-9 h-9 rounded-lg bg-muted/20 overflow-hidden ring-1 ring-border/10 flex-shrink-0">
        <img
          src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
          alt={protocol.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground truncate">{protocol.name}</span>
          {protocol.chain === 'evm' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">EVM</span>
          )}
          {protocol.chain === 'solana' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">SOL</span>
          )}
        </div>
        {latestDate && (
          <StatusIndicator isCurrent={latestDate.is_current} latestDate={latestDate.latest_date} />
        )}
      </div>
      <RefreshButton onClick={() => onRefresh(protocol.id)} isRefreshing={isRefreshing} />
    </div>
  );
}

// ============================================================================
// Droppable Category Component
// ============================================================================
interface DroppableCategoryProps {
  category: string;
  protocols: any[];
  onRefresh: (protocolId: string) => void;
  refreshingProtocols: Set<string>;
  latestDates: Map<string, ProtocolLatestDate>;
}

function DroppableCategory({ category, protocols, onRefresh, refreshingProtocols, latestDates }: DroppableCategoryProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `category-${category}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-3 border-2 border-dashed rounded-xl transition-all ${
        isOver
          ? 'border-primary/50 bg-primary/5'
          : 'border-border/30 bg-muted/10 hover:border-border/50'
      }`}
    >
      <SortableContext items={protocols.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {protocols.map(protocol => (
            <SortableProtocol
              key={protocol.id}
              protocol={protocol}
              onRefresh={onRefresh}
              isRefreshing={refreshingProtocols.has(protocol.id)}
              latestDate={latestDates.get(protocol.id) || latestDates.get(protocol.id.replace('_evm', ''))}
            />
          ))}
        </div>
      </SortableContext>
      {protocols.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Drop protocols here</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================
export function ProtocolManagement() {
  const [isRefreshingSolana, setIsRefreshingSolana] = useState(false);
  const [isRefreshingEVM, setIsRefreshingEVM] = useState(false);
  const [isRefreshingMonad, setIsRefreshingMonad] = useState(false);
  const [isRefreshingPublicRolling, setIsRefreshingPublicRolling] = useState(false);
  const [isRefreshingLaunchpads, setIsRefreshingLaunchpads] = useState(false);
  const [isRefreshingProjectedStats, setIsRefreshingProjectedStats] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
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

  const categories = getMutableAllCategoriesIncludingEVM();
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
        setForceRender(prev => prev + 1);
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

  // Fetch trader stats row counts
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
    fetchTraderStatsRowCounts();
  }, []);

  // Handle data type preference change
  const handleDataTypeChange = async (isPublic: boolean) => {
    const newDataType = isPublic ? 'public' : 'private';
    setDataTypePreference(newDataType);
    Settings.setDataTypePreference(newDataType);
    clearAllFrontendCaches();

    toast({
      variant: "success",
      title: "Data Source Updated",
      description: `Switched to ${newDataType} data`,
    });

    try {
      setIsRefreshingSolana(true);
      const result = await dataSyncApi.syncData(newDataType);

      toast({
        variant: "success",
        title: "Sync Complete",
        description: `Synced ${result.csvFilesFetched} protocols`,
      });

      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync",
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
        const statuses = await protocolApi.getAllSyncStatus();
        const statusMap = new Map(statuses.map(s => [s.protocol_name, s]));
        setSyncStatuses(statusMap);

        const latestDatesData = await protocolApi.getLatestDataDates();
        const latestDatesMap = new Map(latestDatesData.map(d => [d.protocol_name, d]));
        setLatestDates(latestDatesMap);

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
  }, [forceRender]);

  // Load projected stats latest dates
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
        title: "Protocol Moved",
        description: `Moved to ${newCategory}`,
      });
    }
  };

  const handleHardRefresh = async () => {
    if (isRefreshingSolana) return;
    setIsRefreshingSolana(true);
    try {
      const result = await dataSyncApi.syncRollingRefreshData('solana');
      clearAllFrontendCaches();
      toast({
        variant: "success",
        title: "Solana Refresh Complete",
        description: `Refreshed ${result.protocolsSynced} protocols`,
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh",
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
        title: "Saved",
        description: "Configurations saved successfully",
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetConfigurations = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await resetProtocolConfigurations();
      toast({
        variant: "success",
        title: "Reset",
        description: "Configurations reset to defaults",
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Failed to reset",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleRefreshProtocol = async (protocolId: string) => {
    if (refreshingProtocols.has(protocolId)) return;
    setRefreshingProtocols(prev => new Set([...prev, protocolId]));

    try {
      const protocol = getMutableProtocolConfigs().find(p => p.id === protocolId);
      const isEVMProtocol = protocol?.chain === 'evm';
      const dataType = isEVMProtocol ? 'public' : dataTypePreference;

      await dataSyncApi.syncProtocolData(protocolId, dataType);
      clearProtocolFrontendCache(protocolId);

      toast({
        variant: "success",
        title: "Refreshed",
        description: `${protocolId} data updated`,
      });
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
      clearEVMProtocolsCaches();
      toast({
        variant: "success",
        title: "EVM Refresh Complete",
        description: `Refreshed ${result.csvFilesFetched} protocols`,
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh EVM",
      });
    } finally {
      setIsRefreshingEVM(false);
    }
  };

  const handleRefreshMonad = async () => {
    if (isRefreshingMonad) return;
    setIsRefreshingMonad(true);
    try {
      const result = await dataSyncApi.syncRollingRefreshData('monad');
      toast({
        variant: "success",
        title: "Monad Refresh Complete",
        description: `Refreshed ${result.protocolsSynced} protocols`,
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh Monad",
      });
    } finally {
      setIsRefreshingMonad(false);
    }
  };

  const handleRefreshPublicRolling = async () => {
    if (isRefreshingPublicRolling) return;
    setIsRefreshingPublicRolling(true);
    try {
      const result = await dataSyncApi.syncRollingRefreshData('solana', 'public');
      toast({
        variant: "success",
        title: "Public Stats Refresh Complete",
        description: `Refreshed ${result.protocolsSynced} protocols`,
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh",
      });
    } finally {
      setIsRefreshingPublicRolling(false);
    }
  };

  const handleRefreshAllLaunchpads = async () => {
    if (isRefreshingLaunchpads) return;
    setIsRefreshingLaunchpads(true);
    try {
      const result = await dataSyncApi.syncAllLaunchpadData();
      toast({
        variant: "success",
        title: "Launchpads Refresh Complete",
        description: `Refreshed ${result.launchpadsSynced} launchpads`,
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh launchpads",
      });
    } finally {
      setIsRefreshingLaunchpads(false);
    }
  };

  const handleRefreshProjectedStats = async () => {
    if (isRefreshingProjectedStats) return;
    setIsRefreshingProjectedStats(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projected-stats/update`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to refresh');
      toast({
        variant: "success",
        title: "Projected Stats Refreshed",
        description: "All projected stats updated",
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh projected stats",
      });
    } finally {
      setIsRefreshingProjectedStats(false);
    }
  };

  const handleRefreshAll = async () => {
    if (isRefreshingAll) return;
    setIsRefreshingAll(true);
    setIsRefreshingSolana(true);
    setIsRefreshingEVM(true);
    setIsRefreshingMonad(true);
    setIsRefreshingPublicRolling(true);
    setIsRefreshingLaunchpads(true);
    setIsRefreshingProjectedStats(true);

    try {
      await Promise.all([
        dataSyncApi.syncRollingRefreshData('solana'),
        dataSyncApi.syncEVMData(),
        dataSyncApi.syncRollingRefreshData('monad'),
        dataSyncApi.syncRollingRefreshData('solana', 'public'),
        dataSyncApi.syncAllLaunchpadData(),
        fetch(`${API_BASE_URL}/projected-stats/update`, { method: 'POST' }),
      ]);

      clearAllFrontendCaches();
      toast({
        variant: "success",
        title: "All Data Refreshed",
        description: "Successfully refreshed all data sources",
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Some refreshes failed",
      });
    } finally {
      setIsRefreshingAll(false);
      setIsRefreshingSolana(false);
      setIsRefreshingEVM(false);
      setIsRefreshingMonad(false);
      setIsRefreshingPublicRolling(false);
      setIsRefreshingLaunchpads(false);
      setIsRefreshingProjectedStats(false);
    }
  };

  const handleRefreshLaunchpad = async (launchpadId: string) => {
    if (refreshingLaunchpads.has(launchpadId)) return;
    setRefreshingLaunchpads(prev => new Set([...prev, launchpadId]));

    try {
      await dataSyncApi.syncLaunchpadData(launchpadId);
      toast({
        variant: "success",
        title: "Refreshed",
        description: `${launchpadId} data updated`,
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
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

  const handleRefreshIndividualProjectedStats = async (protocolId: string) => {
    if (refreshingProjectedStatsProtocols.has(protocolId)) return;
    setRefreshingProjectedStatsProtocols(prev => new Set([...prev, protocolId]));

    try {
      const response = await fetch(`${API_BASE_URL}/projected-stats/refresh/${protocolId}`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to refresh');

      toast({
        variant: "success",
        title: "Refreshed",
        description: `${protocolId} projected stats updated`,
      });
      setForceRender(prev => prev + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : `Failed to refresh ${protocolId}`,
      });
    } finally {
      setRefreshingProjectedStatsProtocols(prev => {
        const newSet = new Set(prev);
        newSet.delete(protocolId);
        return newSet;
      });
    }
  };

  const handleRefreshIndividualTraderStats = async (protocol: 'photon' | 'axiom' | 'bloom' | 'trojanonsolana') => {
    if (refreshingTraderStatsProtocols.has(protocol)) return;
    setRefreshingTraderStatsProtocols(prev => new Set([...prev, protocol]));

    try {
      const response = await fetch(`${API_BASE_URL}/trader-stats/refresh/${protocol}`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to refresh');
      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: "Trader Stats Refreshed",
          description: `${protocol}: ${result.data?.tradersImported || 0} traders`,
        });

        const countsResponse = await fetch(`${API_BASE_URL}/trader-stats/row-counts`);
        if (countsResponse.ok) {
          const countsData = await countsResponse.json();
          if (countsData.success) {
            setTraderStatsRowCounts(countsData.data);
          }
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : `Failed to refresh ${protocol}`,
      });
    } finally {
      setRefreshingTraderStatsProtocols(prev => {
        const newSet = new Set(prev);
        newSet.delete(protocol);
        return newSet;
      });
    }
  };

  const handleRefreshAllTraderStats = async () => {
    if (isRefreshingTraderStatsAll) return;
    setIsRefreshingTraderStatsAll(true);

    try {
      const response = await fetch(`${API_BASE_URL}/trader-stats/refresh-all`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to refresh');
      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: "All Trader Stats Refreshed",
          description: `${result.data?.summary?.successful || 0} protocols updated`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh trader stats",
      });
    } finally {
      setIsRefreshingTraderStatsAll(false);
    }
  };

  const activeProtocol = activeId ? getMutableProtocolConfigs().find(p => p.id === activeId) : null;

  // Get protocols for projected stats sections
  const telegramBotProtocols = ['trojanonsolana', 'bonkbot', 'bloom', 'soltradingbot', 'banana', 'maestro', 'basedbot'];
  const terminalProtocols = ['photon', 'bullx', 'axiom', 'gmgnai', 'terminal', 'nova terminal', 'telemetry', 'mevx', 'rhythm', 'vyper', 'phantom', 'opensea', 'okx', 'trojan', 'trojanterminal'];
  const traderStatsProtocols = [
    { id: 'photon', name: 'Photon' },
    { id: 'axiom', name: 'Axiom' },
    { id: 'bloom', name: 'Bloom' },
    { id: 'trojanonsolana', name: 'Trojan' },
  ];

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      {/* Data Source Section */}
      <div>
        <SectionHeader title="Data Source" description="Choose between private analytics or public data" />
        <Section>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  dataTypePreference === 'private'
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                  {dataTypePreference === 'private' ? (
                    <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Globe className="w-6 h-6 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {dataTypePreference === 'private' ? 'Private Analytics' : 'Public Data'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {dataTypePreference === 'private'
                      ? 'In-house metrics with real-time updates'
                      : 'Community verified, open source data'
                    }
                  </div>
                </div>
              </div>
              <Switch
                checked={dataTypePreference === 'public'}
                onCheckedChange={handleDataTypeChange}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>
        </Section>
      </div>

      {/* Quick Actions Section */}
      <div>
        <SectionHeader title="Data Refresh" description="Sync data from external sources" />
        <Section>
          <div className="divide-y divide-border/30">
            {/* Refresh All */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <RefreshCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Refresh All Data</div>
                  <div className="text-xs text-muted-foreground">Sync all protocols, launchpads, and stats</div>
                </div>
              </div>
              <Button
                onClick={handleRefreshAll}
                disabled={isRefreshingAll}
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
              >
                {isRefreshingAll ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                  'Refresh All'
                )}
              </Button>
            </div>

            {/* Solana */}
            <ListItem
              logo="/assets/logos/solana.jpg"
              logoAlt="Solana"
              title="Solana Protocols"
              subtitle={`${getMutableProtocolConfigs().filter(p => p.chain === 'solana').length} protocols`}
              rightElement={<RefreshButton onClick={handleHardRefresh} isRefreshing={isRefreshingSolana || isRefreshingAll} />}
            />

            {/* EVM */}
            <ListItem
              logo="/assets/logos/ethereum.jpg"
              logoAlt="Ethereum"
              title="EVM Protocols"
              subtitle={`${getMutableProtocolConfigs().filter(p => p.chain === 'evm').length} protocols`}
              rightElement={<RefreshButton onClick={handleRefreshAllEVM} isRefreshing={isRefreshingEVM || isRefreshingAll} />}
            />

            {/* Monad */}
            <ListItem
              logo="/assets/logos/monad.jpg"
              logoAlt="Monad"
              title="Monad Protocols"
              subtitle={`${getMutableProtocolConfigs().filter(p => p.chain === 'monad').length} protocols`}
              rightElement={<RefreshButton onClick={handleRefreshMonad} isRefreshing={isRefreshingMonad || isRefreshingAll} />}
            />

            {/* Public Rolling */}
            <ListItem
              icon={<Globe className="w-5 h-5 text-emerald-600" />}
              title="Public Rolling Stats"
              subtitle="Refresh public rolling stats"
              rightElement={<RefreshButton onClick={handleRefreshPublicRolling} isRefreshing={isRefreshingPublicRolling || isRefreshingAll} />}
            />

            {/* Launchpads */}
            <ListItem
              icon={<span className="text-lg">🚀</span>}
              title="All Launchpads"
              subtitle={`${getAllLaunchpads().length} launchpads`}
              rightElement={<RefreshButton onClick={handleRefreshAllLaunchpads} isRefreshing={isRefreshingLaunchpads || isRefreshingAll} />}
            />

            {/* Projected Stats */}
            <ListItem
              icon={<span className="text-lg">📊</span>}
              title="Projected Volume Data"
              subtitle="Analytics from Dune queries"
              rightElement={<RefreshButton onClick={handleRefreshProjectedStats} isRefreshing={isRefreshingProjectedStats || isRefreshingAll} />}
            />

            {/* Trader Stats */}
            <ListItem
              icon={<span className="text-lg">👥</span>}
              title="All Trader Stats"
              subtitle="Photon, Axiom, Bloom, Trojan"
              rightElement={<RefreshButton onClick={handleRefreshAllTraderStats} isRefreshing={isRefreshingTraderStatsAll} />}
              isLast
            />
          </div>
        </Section>
      </div>

      {/* Protocol Configuration Section */}
      <div>
        <div className="flex items-center justify-between px-1 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">Protocol Configuration</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Drag protocols between categories to organize</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleResetConfigurations}
              disabled={isResetting || isSaving}
              variant="ghost"
              size="sm"
            >
              {isResetting ? <RotateCcw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Reset</span>
            </Button>
            <Button
              onClick={handleSaveConfigurations}
              disabled={isSaving || isResetting || !hasUnsavedChanges()}
              size="sm"
            >
              {isSaving ? <Save className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>

        {hasUnsavedChanges() && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You have unsaved changes. Click Save to keep them.
            </p>
          </div>
        )}

        <Section className="p-4">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              {categories.map(category => {
                const categoryProtocols = getMutableProtocolsByCategoryIncludingEVM(category);
                return (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">{category}</h3>
                    <DroppableCategory
                      category={category}
                      protocols={categoryProtocols}
                      onRefresh={handleRefreshProtocol}
                      refreshingProtocols={refreshingProtocols}
                      latestDates={latestDates}
                    />
                  </div>
                );
              })}
            </div>

            <DragOverlay>
              {activeProtocol ? (
                <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-primary/30 shadow-2xl">
                  <div className="w-9 h-9 rounded-lg bg-muted/20 overflow-hidden">
                    <img
                      src={`/assets/logos/${getProtocolLogoFilename(activeProtocol.id)}`}
                      alt={activeProtocol.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-medium">{activeProtocol.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </Section>
      </div>

      {/* Launchpads Section */}
      <div>
        <SectionHeader title="Launchpads" description="Individual launchpad data management" />
        <Section>
          <div className="divide-y divide-border/30">
            {getAllLaunchpads().map((launchpad, index) => (
              <ListItem
                key={launchpad.id}
                logo={`/assets/logos/${getLaunchpadLogoFilename(launchpad.id)}`}
                logoAlt={launchpad.name}
                title={launchpad.name}
                badge={{ text: launchpad.chain.toUpperCase(), variant: 'info' }}
                subtitle={launchpadLatestDates.get(launchpad.id) ?
                  `Latest: ${new Date(launchpadLatestDates.get(launchpad.id)!.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
                  'Loading...'
                }
                rightElement={<RefreshButton onClick={() => handleRefreshLaunchpad(launchpad.id)} isRefreshing={refreshingLaunchpads.has(launchpad.id)} />}
                isLast={index === getAllLaunchpads().length - 1}
              />
            ))}
          </div>
        </Section>
      </div>

      {/* Projected Stats Section */}
      <div>
        <SectionHeader title="Projected Stats" description="Individual protocol projected volume management" />

        {/* Telegram Bots */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Telegram Bots</h3>
          <Section>
            <div className="divide-y divide-border/30">
              {telegramBotProtocols.map((protocolId, index) => {
                const protocol = getMutableProtocolConfigs().find(p => p.id === protocolId);
                if (!protocol) return null;
                const latestDateInfo = projectedStatsLatestDates.get(protocolId);

                return (
                  <ListItem
                    key={protocolId}
                    logo={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                    logoAlt={protocol.name}
                    title={protocol.name}
                    subtitle={latestDateInfo ?
                      `Latest: ${new Date(latestDateInfo.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
                      'Loading...'
                    }
                    rightElement={<RefreshButton onClick={() => handleRefreshIndividualProjectedStats(protocol.id)} isRefreshing={refreshingProjectedStatsProtocols.has(protocol.id)} />}
                    isLast={index === telegramBotProtocols.filter(id => getMutableProtocolConfigs().find(p => p.id === id)).length - 1}
                  />
                );
              }).filter(Boolean)}
            </div>
          </Section>
        </div>

        {/* Trading Terminals */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Trading Terminals</h3>
          <Section>
            <div className="divide-y divide-border/30">
              {terminalProtocols.map((protocolId, index) => {
                const protocol = getMutableProtocolConfigs().find(p => p.id === protocolId);
                if (!protocol) return null;
                const latestDateInfo = projectedStatsLatestDates.get(protocolId);

                return (
                  <ListItem
                    key={protocolId}
                    logo={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                    logoAlt={protocol.name}
                    title={protocol.name}
                    subtitle={latestDateInfo ?
                      `Latest: ${new Date(latestDateInfo.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
                      'Loading...'
                    }
                    rightElement={<RefreshButton onClick={() => handleRefreshIndividualProjectedStats(protocol.id)} isRefreshing={refreshingProjectedStatsProtocols.has(protocol.id)} />}
                    isLast={index === terminalProtocols.filter(id => getMutableProtocolConfigs().find(p => p.id === id)).length - 1}
                  />
                );
              }).filter(Boolean)}
            </div>
          </Section>
        </div>
      </div>

      {/* Trader Stats Section */}
      <div>
        <SectionHeader title="Trader Stats" description="Individual protocol trader statistics" />
        <Section>
          <div className="divide-y divide-border/30">
            {traderStatsProtocols.map((item, index) => (
              <ListItem
                key={item.id}
                logo={`/assets/logos/${item.id === 'trojanonsolana' ? 'trojanonsolana' : item.id}.jpg`}
                logoAlt={item.name}
                title={item.name}
                subtitle={`${(traderStatsRowCounts[item.id] || 0).toLocaleString()} traders`}
                rightElement={<RefreshButton onClick={() => handleRefreshIndividualTraderStats(item.id as any)} isRefreshing={refreshingTraderStatsProtocols.has(item.id)} />}
                isLast={index === traderStatsProtocols.length - 1}
              />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
