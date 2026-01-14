import { useState, useEffect } from 'react';
import {
  getMutableProtocolConfigs,
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
import { RefreshCw, GripVertical, ChevronRight, Check } from 'lucide-react';
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
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================================================
// Apple-style Components
// ============================================================================

// Section group container - mimics iOS Settings grouped style
function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {children}
    </div>
  );
}

// Section header - uppercase, small, gray text
function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-4 pt-6 pb-2 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">
        {children}
      </span>
    </div>
  );
}

// Section footer - explanatory text below groups
function SectionFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-2 pb-1">
      <span className="text-xs text-muted-foreground/60 leading-relaxed">
        {children}
      </span>
    </div>
  );
}

// Individual settings row
interface SettingsRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  logo?: string;
  title: string;
  subtitle?: string;
  value?: string | React.ReactNode;
  showChevron?: boolean;
  showSwitch?: boolean;
  switchChecked?: boolean;
  onSwitchChange?: (checked: boolean) => void;
  onClick?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

function SettingsRow({
  icon,
  iconBg = 'bg-gray-500',
  logo,
  title,
  subtitle,
  value,
  showChevron,
  showSwitch,
  switchChecked,
  onSwitchChange,
  onClick,
  isFirst = false,
  isLast = false,
  destructive = false,
  loading = false,
  disabled = false,
}: SettingsRowProps) {
  const hasAction = onClick || showSwitch;

  return (
    <div
      className={`
        relative flex items-center min-h-[44px] px-4
        ${hasAction && !disabled ? 'active:bg-muted/50 cursor-pointer' : ''}
        ${disabled ? 'opacity-50' : ''}
      `}
      onClick={disabled ? undefined : onClick}
    >
      {/* Separator line - inset from left, only if not first */}
      {!isFirst && (
        <div className="absolute top-0 right-0 left-[60px] h-[0.5px] bg-border/40" />
      )}

      {/* Icon or Logo */}
      {(icon || logo) && (
        <div className="mr-3 flex-shrink-0">
          {logo ? (
            <div className="w-[29px] h-[29px] rounded-[6px] overflow-hidden bg-muted">
              <img
                src={logo}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className={`w-[29px] h-[29px] rounded-[6px] ${iconBg} flex items-center justify-center`}>
              {icon}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 py-3 min-w-0">
        <div className={`text-[15px] leading-tight ${destructive ? 'text-red-500' : 'text-foreground'}`}>
          {title}
        </div>
        {subtitle && (
          <div className="text-[13px] text-muted-foreground/70 mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        {loading && (
          <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
        )}
        {value && !loading && (
          <span className="text-[15px] text-muted-foreground">{value}</span>
        )}
        {showSwitch && (
          <Switch
            checked={switchChecked}
            onCheckedChange={onSwitchChange}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {showChevron && !loading && (
          <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/40" />
        )}
      </div>
    </div>
  );
}

// Refresh button for inline use
function RefreshAction({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={loading}
      className="w-8 h-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-[18px] h-[18px] ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
}

// Sortable Protocol Card for drag-and-drop
interface SortableProtocolCardProps {
  protocol: any;
  onRefresh: (id: string) => void;
  isRefreshing: boolean;
  latestDate?: ProtocolLatestDate;
}

function SortableProtocolCard({ protocol, onRefresh, isRefreshing, latestDate }: SortableProtocolCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: protocol.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 bg-card rounded-[10px] border border-border/30
        ${isDragging ? 'opacity-50 shadow-lg scale-[1.02]' : 'hover:bg-muted/30'}
        transition-all duration-150
      `}
      {...attributes}
    >
      <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
      </div>

      <div className="w-8 h-8 rounded-[6px] overflow-hidden bg-muted flex-shrink-0">
        <img
          src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-foreground truncate">{protocol.name}</div>
        {latestDate && (
          <div className={`text-[11px] ${latestDate.is_current ? 'text-green-500' : 'text-amber-500'}`}>
            {new Date(latestDate.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>

      <RefreshAction onClick={() => onRefresh(protocol.id)} loading={isRefreshing} />
    </div>
  );
}

// Droppable Category Zone
interface DroppableCategoryZoneProps {
  category: string;
  protocols: any[];
  onRefresh: (id: string) => void;
  refreshingProtocols: Set<string>;
  latestDates: Map<string, ProtocolLatestDate>;
}

function DroppableCategoryZone({ category, protocols, onRefresh, refreshingProtocols, latestDates }: DroppableCategoryZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `category-${category}` });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[60px] p-2 rounded-[10px] border-2 border-dashed transition-all duration-200
        ${isOver ? 'border-blue-500/50 bg-blue-500/5' : 'border-border/30 bg-muted/20'}
      `}
    >
      <SortableContext items={protocols.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
          {protocols.map(protocol => (
            <SortableProtocolCard
              key={protocol.id}
              protocol={protocol}
              onRefresh={onRefresh}
              isRefreshing={refreshingProtocols.has(protocol.id)}
              latestDate={latestDates.get(protocol.id)}
            />
          ))}
        </div>
      </SortableContext>
      {protocols.length === 0 && (
        <div className="text-center py-6 text-[13px] text-muted-foreground/50">
          Drop protocols here
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================
export function ProtocolManagement() {
  // State
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['protocols']));
  const { toast } = useToast();

  const categories = getMutableAllCategoriesIncludingEVM();
  const sensors = useSensors(useSensor(PointerSensor));

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Effects
  useEffect(() => {
    setDataTypePreference(Settings.getDataTypePreference());
  }, []);

  useEffect(() => {
    loadProtocolConfigurations().then(() => setForceRender(p => p + 1)).catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/trader-stats/row-counts`)
      .then(r => r.json())
      .then(d => d.success && setTraderStatsRowCounts(d.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingSyncStatus(true);
        const [statuses, dates, launchpadDates] = await Promise.all([
          protocolApi.getAllSyncStatus(),
          protocolApi.getLatestDataDates(),
          LaunchpadApi.getLatestDataDates(),
        ]);
        setSyncStatuses(new Map(statuses.map(s => [s.protocol_name, s])));
        setLatestDates(new Map(dates.map(d => [d.protocol_name, d])));
        setLaunchpadLatestDates(new Map(launchpadDates.map(d => [d.launchpad_name, d])));
      } finally {
        setLoadingSyncStatus(false);
      }
    };
    load();
  }, [forceRender]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/projected-stats/latest-dates`)
      .then(r => r.json())
      .then(d => setProjectedStatsLatestDates(new Map(Object.entries(d))))
      .catch(console.error);
  }, [forceRender]);

  // Handlers
  const handleDataTypeChange = async (isPublic: boolean) => {
    const newType = isPublic ? 'public' : 'private';
    setDataTypePreference(newType);
    Settings.setDataTypePreference(newType);
    clearAllFrontendCaches();
    toast({ variant: "success", title: "Data Source Updated", description: `Switched to ${newType} data` });

    try {
      setIsRefreshingSolana(true);
      await dataSyncApi.syncData(newType);
      setForceRender(p => p + 1);
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRefreshingSolana(false);
    }
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const overId = e.over.id as string;
    if (overId.startsWith('category-')) {
      updateProtocolCategory(e.active.id as string, overId.replace('category-', ''));
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Moved", description: "Protocol category updated" });
    }
  };

  const refreshSolana = async () => {
    if (isRefreshingSolana) return;
    setIsRefreshingSolana(true);
    try {
      await dataSyncApi.syncRollingRefreshData('solana');
      clearAllFrontendCaches();
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Done", description: "Solana data refreshed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRefreshingSolana(false);
    }
  };

  const refreshEVM = async () => {
    if (isRefreshingEVM) return;
    setIsRefreshingEVM(true);
    try {
      await dataSyncApi.syncEVMData();
      clearEVMProtocolsCaches();
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Done", description: "EVM data refreshed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRefreshingEVM(false);
    }
  };

  const refreshMonad = async () => {
    if (isRefreshingMonad) return;
    setIsRefreshingMonad(true);
    try {
      await dataSyncApi.syncRollingRefreshData('monad');
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Done", description: "Monad data refreshed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRefreshingMonad(false);
    }
  };

  const refreshPublicRolling = async () => {
    if (isRefreshingPublicRolling) return;
    setIsRefreshingPublicRolling(true);
    try {
      await dataSyncApi.syncRollingRefreshData('solana', 'public');
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Done", description: "Public stats refreshed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRefreshingPublicRolling(false);
    }
  };

  const refreshLaunchpads = async () => {
    if (isRefreshingLaunchpads) return;
    setIsRefreshingLaunchpads(true);
    try {
      await dataSyncApi.syncAllLaunchpadData();
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Done", description: "Launchpads refreshed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRefreshingLaunchpads(false);
    }
  };

  const refreshProjectedStats = async () => {
    if (isRefreshingProjectedStats) return;
    setIsRefreshingProjectedStats(true);
    try {
      await fetch(`${API_BASE_URL}/projected-stats/update`, { method: 'POST' });
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Done", description: "Projected stats refreshed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRefreshingProjectedStats(false);
    }
  };

  const refreshTraderStats = async () => {
    if (isRefreshingTraderStatsAll) return;
    setIsRefreshingTraderStatsAll(true);
    try {
      await fetch(`${API_BASE_URL}/trader-stats/refresh-all`, { method: 'POST' });
      toast({ variant: "success", title: "Done", description: "Trader stats refreshed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRefreshingTraderStatsAll(false);
    }
  };

  const refreshAll = async () => {
    if (isRefreshingAll) return;
    setIsRefreshingAll(true);
    try {
      await Promise.all([
        dataSyncApi.syncRollingRefreshData('solana'),
        dataSyncApi.syncEVMData(),
        dataSyncApi.syncRollingRefreshData('monad'),
        dataSyncApi.syncAllLaunchpadData(),
        fetch(`${API_BASE_URL}/projected-stats/update`, { method: 'POST' }),
      ]);
      clearAllFrontendCaches();
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Done", description: "All data refreshed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const refreshProtocol = async (id: string) => {
    if (refreshingProtocols.has(id)) return;
    setRefreshingProtocols(p => new Set([...p, id]));
    try {
      const protocol = getMutableProtocolConfigs().find(p => p.id === id);
      await dataSyncApi.syncProtocolData(id, protocol?.chain === 'evm' ? 'public' : dataTypePreference);
      clearProtocolFrontendCache(id);
      setForceRender(p => p + 1);
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setRefreshingProtocols(p => { const n = new Set(p); n.delete(id); return n; });
    }
  };

  const refreshLaunchpad = async (id: string) => {
    if (refreshingLaunchpads.has(id)) return;
    setRefreshingLaunchpads(p => new Set([...p, id]));
    try {
      await dataSyncApi.syncLaunchpadData(id);
      setForceRender(p => p + 1);
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setRefreshingLaunchpads(p => { const n = new Set(p); n.delete(id); return n; });
    }
  };

  const refreshIndividualProjectedStats = async (id: string) => {
    if (refreshingProjectedStatsProtocols.has(id)) return;
    setRefreshingProjectedStatsProtocols(p => new Set([...p, id]));
    try {
      await fetch(`${API_BASE_URL}/projected-stats/refresh/${id}`, { method: 'POST' });
      setForceRender(p => p + 1);
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setRefreshingProjectedStatsProtocols(p => { const n = new Set(p); n.delete(id); return n; });
    }
  };

  const refreshIndividualTraderStats = async (id: string) => {
    if (refreshingTraderStatsProtocols.has(id)) return;
    setRefreshingTraderStatsProtocols(p => new Set([...p, id]));
    try {
      const r = await fetch(`${API_BASE_URL}/trader-stats/refresh/${id}`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        const counts = await fetch(`${API_BASE_URL}/trader-stats/row-counts`).then(r => r.json());
        if (counts.success) setTraderStatsRowCounts(counts.data);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setRefreshingTraderStatsProtocols(p => { const n = new Set(p); n.delete(id); return n; });
    }
  };

  const saveConfig = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveProtocolConfigurations();
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Saved", description: "Configuration saved" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetConfig = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await resetProtocolConfigurations();
      setForceRender(p => p + 1);
      toast({ variant: "success", title: "Reset", description: "Configuration reset" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsResetting(false);
    }
  };

  const activeProtocol = activeId ? getMutableProtocolConfigs().find(p => p.id === activeId) : null;
  const solanaCount = getMutableProtocolConfigs().filter(p => p.chain === 'solana').length;
  const evmCount = getMutableProtocolConfigs().filter(p => p.chain === 'evm').length;
  const monadCount = getMutableProtocolConfigs().filter(p => p.chain === 'monad').length;
  const telegramBots = ['trojanonsolana', 'bonkbot', 'bloom', 'soltradingbot', 'banana', 'maestro', 'basedbot'];
  const terminals = ['photon', 'bullx', 'axiom', 'gmgnai', 'terminal', 'nova terminal', 'telemetry', 'mevx', 'rhythm', 'vyper', 'phantom', 'opensea', 'okx', 'trojan', 'trojanterminal'];
  const traderStatsItems = [
    { id: 'photon', name: 'Photon' },
    { id: 'axiom', name: 'Axiom' },
    { id: 'bloom', name: 'Bloom' },
    { id: 'trojanonsolana', name: 'Trojan' },
  ];

  return (
    <div className="w-full space-y-1">
      {/* Data Source */}
      <SectionLabel>Data Source</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={<span className="text-white text-[14px]">🔒</span>}
          iconBg="bg-blue-500"
          title={dataTypePreference === 'private' ? 'Private Analytics' : 'Public Data'}
          subtitle={dataTypePreference === 'private' ? 'In-house metrics' : 'Community verified'}
          showSwitch
          switchChecked={dataTypePreference === 'public'}
          onSwitchChange={handleDataTypeChange}
          isFirst
          isLast
        />
      </SettingsGroup>
      <SectionFooter>
        Private data includes proprietary analytics. Public data uses community-verified sources.
      </SectionFooter>

      {/* Sync All */}
      <SectionLabel>Quick Actions</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={<RefreshCw className="w-[15px] h-[15px] text-white" />}
          iconBg="bg-gradient-to-br from-orange-500 to-red-500"
          title="Refresh All Data"
          subtitle="Sync all protocols and launchpads"
          value={<RefreshAction onClick={refreshAll} loading={isRefreshingAll} />}
          isFirst
          isLast
        />
      </SettingsGroup>

      {/* Data Refresh */}
      <SectionLabel>Data Refresh</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          logo="/assets/logos/solana.jpg"
          title="Solana"
          subtitle={`${solanaCount} protocols`}
          value={<RefreshAction onClick={refreshSolana} loading={isRefreshingSolana} />}
          isFirst
        />
        <SettingsRow
          logo="/assets/logos/ethereum.jpg"
          title="EVM"
          subtitle={`${evmCount} protocols`}
          value={<RefreshAction onClick={refreshEVM} loading={isRefreshingEVM} />}
        />
        <SettingsRow
          logo="/assets/logos/monad.jpg"
          title="Monad"
          subtitle={`${monadCount} protocols`}
          value={<RefreshAction onClick={refreshMonad} loading={isRefreshingMonad} />}
        />
        <SettingsRow
          icon={<span className="text-white text-[13px]">📊</span>}
          iconBg="bg-emerald-500"
          title="Public Rolling Stats"
          value={<RefreshAction onClick={refreshPublicRolling} loading={isRefreshingPublicRolling} />}
        />
        <SettingsRow
          icon={<span className="text-white text-[13px]">🚀</span>}
          iconBg="bg-purple-500"
          title="Launchpads"
          subtitle={`${getAllLaunchpads().length} launchpads`}
          value={<RefreshAction onClick={refreshLaunchpads} loading={isRefreshingLaunchpads} />}
        />
        <SettingsRow
          icon={<span className="text-white text-[13px]">📈</span>}
          iconBg="bg-indigo-500"
          title="Projected Stats"
          value={<RefreshAction onClick={refreshProjectedStats} loading={isRefreshingProjectedStats} />}
        />
        <SettingsRow
          icon={<span className="text-white text-[13px]">👥</span>}
          iconBg="bg-pink-500"
          title="Trader Stats"
          value={<RefreshAction onClick={refreshTraderStats} loading={isRefreshingTraderStatsAll} />}
          isLast
        />
      </SettingsGroup>

      {/* Protocol Organization */}
      <SectionLabel>Protocol Organization</SectionLabel>
      {hasUnsavedChanges() && (
        <div className="mx-4 mb-2 p-3 bg-amber-500/10 rounded-[8px] border border-amber-500/20">
          <span className="text-[13px] text-amber-600 dark:text-amber-400">You have unsaved changes</span>
        </div>
      )}
      <SettingsGroup>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <span className="text-[15px] text-foreground">Categories</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={resetConfig} disabled={isResetting}>
              {isResetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Reset'}
            </Button>
            <Button size="sm" onClick={saveConfig} disabled={isSaving || !hasUnsavedChanges()}>
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
        <div className="p-4">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              {categories.map(category => (
                <div key={category}>
                  <div className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2 px-1">
                    {category}
                  </div>
                  <DroppableCategoryZone
                    category={category}
                    protocols={getMutableProtocolsByCategoryIncludingEVM(category)}
                    onRefresh={refreshProtocol}
                    refreshingProtocols={refreshingProtocols}
                    latestDates={latestDates}
                  />
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeProtocol && (
                <div className="flex items-center gap-2 p-2 bg-card rounded-[8px] shadow-xl border border-border/50">
                  <div className="w-6 h-6 rounded-[4px] overflow-hidden bg-muted">
                    <img src={`/assets/logos/${getProtocolLogoFilename(activeProtocol.id)}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[13px] font-medium">{activeProtocol.name}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </SettingsGroup>

      {/* Launchpads */}
      <SectionLabel>Launchpads</SectionLabel>
      <SettingsGroup>
        {getAllLaunchpads().map((lp, i, arr) => {
          const date = launchpadLatestDates.get(lp.id);
          return (
            <SettingsRow
              key={lp.id}
              logo={`/assets/logos/${getLaunchpadLogoFilename(lp.id)}`}
              title={lp.name}
              subtitle={date ? new Date(date.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Loading...'}
              value={<RefreshAction onClick={() => refreshLaunchpad(lp.id)} loading={refreshingLaunchpads.has(lp.id)} />}
              isFirst={i === 0}
              isLast={i === arr.length - 1}
            />
          );
        })}
      </SettingsGroup>

      {/* Projected Stats - Telegram Bots */}
      <SectionLabel>Projected Stats — Telegram Bots</SectionLabel>
      <SettingsGroup>
        {telegramBots.map((id, i, arr) => {
          const protocol = getMutableProtocolConfigs().find(p => p.id === id);
          if (!protocol) return null;
          const date = projectedStatsLatestDates.get(id);
          return (
            <SettingsRow
              key={id}
              logo={`/assets/logos/${getProtocolLogoFilename(id)}`}
              title={protocol.name}
              subtitle={date ? new Date(date.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Loading...'}
              value={<RefreshAction onClick={() => refreshIndividualProjectedStats(id)} loading={refreshingProjectedStatsProtocols.has(id)} />}
              isFirst={i === 0}
              isLast={i === arr.filter(x => getMutableProtocolConfigs().find(p => p.id === x)).length - 1}
            />
          );
        }).filter(Boolean)}
      </SettingsGroup>

      {/* Projected Stats - Terminals */}
      <SectionLabel>Projected Stats — Terminals</SectionLabel>
      <SettingsGroup>
        {terminals.map((id, i, arr) => {
          const protocol = getMutableProtocolConfigs().find(p => p.id === id);
          if (!protocol) return null;
          const date = projectedStatsLatestDates.get(id);
          return (
            <SettingsRow
              key={id}
              logo={`/assets/logos/${getProtocolLogoFilename(id)}`}
              title={protocol.name}
              subtitle={date ? new Date(date.latest_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Loading...'}
              value={<RefreshAction onClick={() => refreshIndividualProjectedStats(id)} loading={refreshingProjectedStatsProtocols.has(id)} />}
              isFirst={i === 0}
              isLast={i === arr.filter(x => getMutableProtocolConfigs().find(p => p.id === x)).length - 1}
            />
          );
        }).filter(Boolean)}
      </SettingsGroup>

      {/* Trader Stats */}
      <SectionLabel>Trader Stats</SectionLabel>
      <SettingsGroup>
        {traderStatsItems.map((item, i, arr) => (
          <SettingsRow
            key={item.id}
            logo={`/assets/logos/${item.id}.jpg`}
            title={item.name}
            subtitle={`${(traderStatsRowCounts[item.id] || 0).toLocaleString()} traders`}
            value={<RefreshAction onClick={() => refreshIndividualTraderStats(item.id)} loading={refreshingTraderStatsProtocols.has(item.id)} />}
            isFirst={i === 0}
            isLast={i === arr.length - 1}
          />
        ))}
      </SettingsGroup>

      {/* Bottom padding */}
      <div className="h-8" />
    </div>
  );
}
