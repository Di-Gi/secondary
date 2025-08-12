// useContextualActions Hook
// Purpose: React hook for managing contextual actions in navigation components
// Architecture: Provides action registry integration with React lifecycle

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ContextualAction, NavigationContext, ActionResult } from '../../../types/navigation';
import { Symbol } from '../../../api';
import { actionRegistry, keyboardShortcutManager } from '../actions/ActionRegistry';
import { defaultActions } from '../actions/DefaultActions';
import { actionErrorHandler } from '../actions/ActionErrorHandler';

export interface UseContextualActionsOptions {
  context?: NavigationContext;
  selectedSymbols?: Symbol[];
  enableKeyboardShortcuts?: boolean;
  maxActions?: number;
  categories?: string[];
  customActions?: ContextualAction[];
}

export interface UseContextualActionsReturn {
  actions: ContextualAction[];
  executeAction: (actionId: string, params?: any) => Promise<ActionResult>;
  registerAction: (action: ContextualAction) => void;
  unregisterAction: (actionId: string) => void;
  isExecuting: (actionId: string) => boolean;
  executingActions: Set<string>;
  refreshActions: () => void;
}

export function useContextualActions({
  context,
  selectedSymbols = [],
  enableKeyboardShortcuts = true,
  maxActions,
  categories,
  customActions = []
}: UseContextualActionsOptions = {}): UseContextualActionsReturn {
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());
  const [registeredActions, setRegisteredActions] = useState<ContextualAction[]>([]);

  // Initialize default actions on mount
  useEffect(() => {
    // Register default actions if not already registered
    const currentActions = actionRegistry.getAllActions();
    if (currentActions.length === 0) {
      actionRegistry.registerActions(defaultActions);
    }

    // Register custom actions
    if (customActions.length > 0) {
      actionRegistry.registerActions(customActions);
    }

    // Update local state
    setRegisteredActions(actionRegistry.getAllActions());

    // Setup keyboard shortcuts
    if (enableKeyboardShortcuts) {
      keyboardShortcutManager.registerShortcuts(actionRegistry.getAllActions());
    }

    return () => {
      // Cleanup custom actions on unmount
      customActions.forEach(action => {
        actionRegistry.unregisterAction(action.id);
      });
    };
  }, [customActions, enableKeyboardShortcuts]);

  // Get contextual actions based on current context
  const actions = useMemo(() => {
    if (!context) return [];

    let contextualActions = actionRegistry.getContextualActions(context, selectedSymbols);

    // Filter by categories if specified
    if (categories && categories.length > 0) {
      contextualActions = contextualActions.filter(action => 
        categories.includes(action.category)
      );
    }

    // Limit number of actions if specified
    if (maxActions && maxActions > 0) {
      contextualActions = contextualActions
        .sort((a, b) => (b.metadata.priority || 0) - (a.metadata.priority || 0))
        .slice(0, maxActions);
    }

    return contextualActions;
  }, [context, selectedSymbols, categories, maxActions, registeredActions]);

  // Execute action with enhanced error handling and loading state management
  const executeAction = useCallback(async (actionId: string, params?: any): Promise<ActionResult> => {
    if (!context) {
      return { success: false, message: 'No navigation context available' };
    }

    const action = actionRegistry.getAction(actionId);
    if (!action) {
      return { success: false, message: `Action ${actionId} not found` };
    }

    // Add to executing set
    setExecutingActions(prev => new Set(prev).add(actionId));

    try {
      const result = await actionRegistry.executeAction(actionId, context, params);
      return result;
    } catch (error) {
      console.error(`Action execution failed for ${actionId}:`, error);
      
      // Use error handler for enhanced error processing
      const errorResult = await actionErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        action,
        context
      );
      
      return errorResult;
    } finally {
      // Remove from executing set
      setExecutingActions(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  }, [context]);

  // Register new action
  const registerAction = useCallback((action: ContextualAction) => {
    actionRegistry.registerAction(action);
    setRegisteredActions(actionRegistry.getAllActions());
    
    if (enableKeyboardShortcuts && action.shortcut) {
      keyboardShortcutManager.registerShortcuts([action]);
    }
  }, [enableKeyboardShortcuts]);

  // Unregister action
  const unregisterAction = useCallback((actionId: string) => {
    actionRegistry.unregisterAction(actionId);
    setRegisteredActions(actionRegistry.getAllActions());
  }, []);

  // Check if action is executing
  const isExecuting = useCallback((actionId: string): boolean => {
    return executingActions.has(actionId);
  }, [executingActions]);

  // Refresh actions (useful after context changes)
  const refreshActions = useCallback(() => {
    setRegisteredActions(actionRegistry.getAllActions());
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts || !context) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const action = keyboardShortcutManager.findActionByKeyboardEvent(event);
      if (action && actions.some(a => a.id === action.id)) {
        event.preventDefault();
        executeAction(action.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, context, actions, executeAction]);

  return {
    actions,
    executeAction,
    registerAction,
    unregisterAction,
    isExecuting,
    executingActions,
    refreshActions
  };
}

// Hook for managing action customization
export interface UseActionCustomizationOptions {
  onActionsChange?: (actions: ContextualAction[]) => void;
}

export interface UseActionCustomizationReturn {
  availableActions: ContextualAction[];
  enabledActions: Set<string>;
  toggleAction: (actionId: string) => void;
  reorderActions: (actionIds: string[]) => void;
  resetToDefaults: () => void;
  exportConfiguration: () => string;
  importConfiguration: (config: string) => boolean;
}

export function useActionCustomization({
  onActionsChange
}: UseActionCustomizationOptions = {}): UseActionCustomizationReturn {
  const [enabledActions, setEnabledActions] = useState<Set<string>>(new Set());
  const [actionOrder, setActionOrder] = useState<string[]>([]);

  const availableActions = useMemo(() => {
    return actionRegistry.getAllActions();
  }, []);

  // Initialize enabled actions
  useEffect(() => {
    const allActionIds = availableActions.map(a => a.id);
    setEnabledActions(new Set(allActionIds));
    setActionOrder(allActionIds);
  }, [availableActions]);

  // Toggle action enabled/disabled
  const toggleAction = useCallback((actionId: string) => {
    setEnabledActions(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  }, []);

  // Reorder actions
  const reorderActions = useCallback((actionIds: string[]) => {
    setActionOrder(actionIds);
    onActionsChange?.(actionIds.map(id => actionRegistry.getAction(id)!).filter(Boolean));
  }, [onActionsChange]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const allActionIds = availableActions.map(a => a.id);
    setEnabledActions(new Set(allActionIds));
    setActionOrder(allActionIds);
    onActionsChange?.(availableActions);
  }, [availableActions, onActionsChange]);

  // Export configuration
  const exportConfiguration = useCallback((): string => {
    return JSON.stringify({
      enabledActions: Array.from(enabledActions),
      actionOrder
    }, null, 2);
  }, [enabledActions, actionOrder]);

  // Import configuration
  const importConfiguration = useCallback((config: string): boolean => {
    try {
      const parsed = JSON.parse(config);
      if (parsed.enabledActions && Array.isArray(parsed.enabledActions)) {
        setEnabledActions(new Set(parsed.enabledActions));
      }
      if (parsed.actionOrder && Array.isArray(parsed.actionOrder)) {
        setActionOrder(parsed.actionOrder);
      }
      return true;
    } catch (error) {
      console.error('Failed to import action configuration:', error);
      return false;
    }
  }, []);

  return {
    availableActions,
    enabledActions,
    toggleAction,
    reorderActions,
    resetToDefaults,
    exportConfiguration,
    importConfiguration
  };
}