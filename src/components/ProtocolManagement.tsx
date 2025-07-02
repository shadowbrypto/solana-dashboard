import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  getMutableProtocolConfigs, 
  getMutableAllCategories, 
  getMutableProtocolsByCategory,
  updateProtocolCategory,
  saveProtocolConfigurations,
  resetProtocolConfigurations,
  hasUnsavedChanges,
  loadProtocolConfigurations
} from '../lib/protocol-config';
import { Button } from './ui/button';
import { RefreshCcw, AlertCircle, GripVertical, Save, RotateCcw, RefreshCw } from 'lucide-react';
import { dataSyncApi } from '../lib/api';
import { useToast } from '../hooks/use-toast';
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
}

interface DroppableCategoryProps {
  category: string;
  protocols: any[];
  onRefresh: (protocolId: string) => void;
  refreshingProtocols: Set<string>;
}

function DroppableCategory({ category, protocols, onRefresh, refreshingProtocols }: DroppableCategoryProps) {
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

function SortableProtocol({ protocol, isDragging, onRefresh, isRefreshing }: SortableProtocolProps) {
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
      <protocol.icon className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="font-medium text-foreground">{protocol.name}</p>
        <p className="text-sm text-muted-foreground">{protocol.id}</p>
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [refreshingProtocols, setRefreshingProtocols] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const categories = getMutableAllCategories();
  const sensors = useSensors(useSensor(PointerSensor));

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
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const result = await dataSyncApi.syncData();
      toast({
        variant: "success",
        title: "Data Refresh Complete",
        description: `Successfully refreshed data for ${result.csvFilesFetched} protocols`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh data",
      });
    } finally {
      setIsRefreshing(false);
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
      const result = await dataSyncApi.syncProtocolData(protocolId);
      toast({
        variant: "success",
        title: "Protocol Refreshed",
        description: `Successfully refreshed data for ${protocolId}`,
      });
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
                const categoryProtocols = getMutableProtocolsByCategory(category);
                return (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3">{category}</h3>
                    <DroppableCategory 
                      category={category} 
                      protocols={categoryProtocols} 
                      onRefresh={handleRefreshProtocol}
                      refreshingProtocols={refreshingProtocols}
                    />
                  </div>
                );
              })}
            </div>
            
            <DragOverlay>
              {activeProtocol ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-card border-border shadow-2xl ring-2 ring-primary/50 backdrop-blur-sm transform rotate-1">
                  <activeProtocol.icon className="h-5 w-5 text-muted-foreground" />
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
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Force refresh all protocol data from Dune Analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Hard Refresh Warning
                  </p>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    This will force a complete data refresh from Dune Analytics, bypassing all time restrictions. 
                    Use this only when necessary as it may impact API rate limits.
                  </p>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleHardRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="w-full"
            >
              {isRefreshing ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing Data...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Force Refresh All Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}