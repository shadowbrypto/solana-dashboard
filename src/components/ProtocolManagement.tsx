import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  getMutableProtocolConfigs, 
  getMutableAllCategories, 
  getMutableProtocolsByCategory,
  updateProtocolCategory,
  saveProtocolConfigurations,
  resetProtocolConfigurations,
  hasUnsavedChanges
} from '../lib/protocol-config';
import { Button } from './ui/button';
import { Code2, Copy, Check, RefreshCcw, AlertCircle, X, GripVertical, Save, RotateCcw } from 'lucide-react';
import { dataSyncApi } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Toast } from './ui/toast';
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
}

interface DroppableCategoryProps {
  category: string;
  protocols: any[];
}

function DroppableCategory({ category, protocols }: DroppableCategoryProps) {
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
            <SortableProtocol key={protocol.id} protocol={protocol} />
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

function SortableProtocol({ protocol, isDragging }: SortableProtocolProps) {
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
    </div>
  );
}

export function ProtocolManagement() {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toasts, removeToast, success, error: showError } = useToast();
  
  const categories = getMutableAllCategories();
  const sensors = useSensors(useSensor(PointerSensor));

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
      success(`Protocol moved to ${newCategory}`);
    }
  };

  const generateNewProtocolTemplate = () => {
    return `{ 
  id: 'protocol-id', 
  name: 'Protocol Name', 
  icon: IconName, // Import from lucide-react
  category: 'Telegram Bots' // or 'Trading Terminals' or 'Mobile Apps'
}`;
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(generateNewProtocolTemplate());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHardRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const result = await dataSyncApi.syncData();
      success(`Data refresh completed! Fetched ${result.csvFilesFetched} files.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveConfigurations = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      saveProtocolConfigurations();
      success('Protocol configurations saved successfully!');
      setForceRender(prev => prev + 1); // Trigger re-render to update unsaved changes indicator
    } catch (error) {
      showError('Failed to save configurations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetConfigurations = async () => {
    if (isResetting) return;
    
    setIsResetting(true);
    try {
      resetProtocolConfigurations();
      success('Protocol configurations reset to defaults!');
      setForceRender(prev => prev + 1); // Trigger re-render to show reset changes
    } catch (error) {
      showError('Failed to reset configurations');
    } finally {
      setIsResetting(false);
    }
  };

  const activeProtocol = activeId ? getMutableProtocolConfigs().find(p => p.id === activeId) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Protocol Configuration</CardTitle>
          <CardDescription>
            Current protocols organized by category. Drag protocols between categories to reorganize them.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    <DroppableCategory category={category} protocols={categoryProtocols} />
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

      {/* Save/Reset Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Management</CardTitle>
          <CardDescription>
            Save your protocol category changes permanently or reset to defaults
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/40">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {hasUnsavedChanges() ? 'You have unsaved changes' : 'All changes are saved'}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasUnsavedChanges() 
                  ? 'Save your protocol category changes to make them permanent across page reloads.'
                  : 'Your protocol configurations are up to date.'
                }
              </p>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adding New Protocols</CardTitle>
          <CardDescription>
            Follow these steps to add a new protocol to the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Update Backend</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Add the protocol to PROTOCOL_SOURCES in server/src/services/dataManagementService.ts
            </p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm">
              "protocol-name": QUERY_ID
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Update Frontend Config</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Add the protocol to src/lib/protocol-config.ts
            </p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm relative">
              <pre>{generateNewProtocolTemplate()}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyTemplate}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Choose an Icon</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Browse available icons at{' '}
              <a 
                href="https://lucide.dev/icons" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                lucide.dev/icons
              </a>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Sync Data</h3>
            <p className="text-sm text-muted-foreground">
              Run the data sync to fetch CSV files and update the database
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Categories</CardTitle>
          <CardDescription>
            Protocols are organized into these categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge key={category} variant="outline">
                {category}
              </Badge>
            ))}
          </div>
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

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          className="flex items-center justify-between gap-2"
        >
          <span>{toast.message}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={() => removeToast(toast.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Toast>
      ))}
    </div>
  );
}