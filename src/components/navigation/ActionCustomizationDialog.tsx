// Action Customization Dialog Component
// Purpose: Provides interface for customizing contextual actions
// Architecture: Modal dialog with drag-and-drop reordering and toggle controls

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { ContextualAction, ActionCategory } from '../../types/navigation';
import { useActionCustomization } from './hooks/useContextualActions';

export interface ActionCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customizedActions: ContextualAction[]) => void;
  availableActions?: ContextualAction[];
}

export function ActionCustomizationDialog({
  isOpen,
  onClose,
  onSave,
  availableActions = []
}: ActionCustomizationDialogProps) {
  const {
    availableActions: registryActions,
    enabledActions,
    toggleAction,
    reorderActions,
    resetToDefaults,
    exportConfiguration,
    importConfiguration
  } = useActionCustomization({
    onActionsChange: (actions) => {
      // Update local state when actions change
      setLocalActions(actions);
    }
  });

  const [localActions, setLocalActions] = useState<ContextualAction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | 'all'>('all');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [showImportError, setShowImportError] = useState(false);

  // Initialize local actions
  useEffect(() => {
    const actionsToUse = availableActions.length > 0 ? availableActions : registryActions;
    setLocalActions(actionsToUse);
  }, [availableActions, registryActions]);

  // Get unique categories
  const categories = React.useMemo(() => {
    const categorySet = new Set<ActionCategory>();
    localActions.forEach(action => categorySet.add(action.category));
    return Array.from(categorySet).sort();
  }, [localActions]);

  // Filter actions based on search and category
  const filteredActions = React.useMemo(() => {
    return localActions.filter(action => {
      const matchesSearch = searchQuery === '' || 
        action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [localActions, searchQuery, selectedCategory]);

  // Group actions by category
  const actionsByCategory = React.useMemo(() => {
    const grouped = new Map<ActionCategory, ContextualAction[]>();
    filteredActions.forEach(action => {
      if (!grouped.has(action.category)) {
        grouped.set(action.category, []);
      }
      grouped.get(action.category)!.push(action);
    });
    return grouped;
  }, [filteredActions]);

  // Handle drag start
  const handleDragStart = useCallback((actionId: string) => {
    setDraggedItem(actionId);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Handle drop
  const handleDrop = useCallback((targetActionId: string) => {
    if (!draggedItem || draggedItem === targetActionId) return;

    const currentOrder = localActions.map(a => a.id);
    const draggedIndex = currentOrder.indexOf(draggedItem);
    const targetIndex = currentOrder.indexOf(targetActionId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder the actions
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    reorderActions(newOrder);
    setDraggedItem(null);
  }, [draggedItem, localActions, reorderActions]);

  // Handle save
  const handleSave = useCallback(() => {
    const enabledActionsList = localActions.filter(action => enabledActions.has(action.id));
    onSave(enabledActionsList);
    onClose();
  }, [localActions, enabledActions, onSave, onClose]);

  // Handle reset
  const handleReset = useCallback(() => {
    resetToDefaults();
  }, [resetToDefaults]);

  // Handle export
  const handleExport = useCallback(() => {
    const config = exportConfiguration();
    navigator.clipboard.writeText(config).then(() => {
      // Show success message
      console.log('Configuration copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy configuration:', err);
    });
  }, [exportConfiguration]);

  // Handle import
  const handleImport = useCallback(() => {
    const success = importConfiguration(importText);
    if (success) {
      setImportText('');
      setShowImportError(false);
    } else {
      setShowImportError(true);
    }
  }, [importConfiguration, importText]);

  // Render action item
  const renderActionItem = (action: ContextualAction) => {
    const isEnabled = enabledActions.has(action.id);
    const shortcutText = action.shortcut ? 
      `${action.shortcut.modifiers.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join('+')}+${action.shortcut.key}` : 
      null;

    return (
      <div
        key={action.id}
        className={`flex items-center justify-between p-3 border rounded-lg ${
          draggedItem === action.id ? 'opacity-50' : ''
        } ${isEnabled ? 'bg-background' : 'bg-muted/50'}`}
        draggable
        onDragStart={() => handleDragStart(action.id)}
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(action.id)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="cursor-grab text-muted-foreground">⋮⋮</div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{action.icon}</span>
            <div>
              <div className="font-medium">{action.label}</div>
              {action.description && (
                <div className="text-sm text-muted-foreground">{action.description}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {action.category}
            </Badge>
            {shortcutText && (
              <Badge variant="outline" className="text-xs font-mono">
                {shortcutText}
              </Badge>
            )}
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={() => toggleAction(action.id)}
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Customize Quick Actions</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="actions" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="import-export">Import/Export</TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full">
              {/* Search and filters */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search actions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as ActionCategory | 'all')}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions list */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {selectedCategory === 'all' ? (
                  // Show all actions grouped by category
                  Array.from(actionsByCategory.entries()).map(([category, actions]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        {category}
                      </h3>
                      {actions.map(renderActionItem)}
                    </div>
                  ))
                ) : (
                  // Show filtered actions
                  filteredActions.map(renderActionItem)
                )}
              </div>

              {/* Summary */}
              <div className="text-sm text-muted-foreground">
                {enabledActions.size} of {localActions.length} actions enabled
              </div>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {categories.map(category => {
                const categoryActions = localActions.filter(a => a.category === category);
                const enabledCount = categoryActions.filter(a => enabledActions.has(a.id)).length;
                
                return (
                  <div key={category} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </h3>
                      <Badge variant="secondary">
                        {enabledCount}/{categoryActions.length}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {categoryActions.length} actions available
                    </div>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          categoryActions.forEach(action => {
                            if (!enabledActions.has(action.id)) {
                              toggleAction(action.id);
                            }
                          });
                        }}
                      >
                        Enable All
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="import-export" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Export Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Export your current action configuration to share or backup.
                </p>
                <Button onClick={handleExport} className="w-full">
                  Copy to Clipboard
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Import Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Import a previously exported configuration.
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste configuration JSON here..."
                  className="w-full h-32 p-3 border rounded-md text-sm font-mono"
                />
                {showImportError && (
                  <div className="text-sm text-destructive">
                    Invalid configuration format. Please check the JSON and try again.
                  </div>
                )}
                <Button 
                  onClick={handleImport} 
                  disabled={!importText.trim()}
                  className="w-full"
                >
                  Import Configuration
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ActionCustomizationDialog;