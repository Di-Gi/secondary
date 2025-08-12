// Quick Action Toolbar Component
// Purpose: Provides context-aware actions based on current navigation location and selected symbols
// Architecture: Uses condition evaluation system to dynamically show relevant actions

import React, { useMemo, useCallback, useState } from 'react';
import { Button } from '../ui/button';
import { ContextualAction, NavigationContext, ActionCategory, ActionResult } from '../../types/navigation';
import { Symbol } from '../../api';
import { useContextualActions } from './hooks/useContextualActions';
import ActionCustomizationDialog from './ActionCustomizationDialog';
import { toast } from 'sonner';

export interface QuickActionToolbarProps {
  availableActions?: ContextualAction[];
  currentContext?: NavigationContext;
  selectedSymbols?: Symbol[];
  onActionExecute?: (action: ContextualAction) => void;
  onActionCustomize?: (actions: ContextualAction[]) => void;
  className?: string;
  maxVisibleActions?: number;
  showCategories?: boolean;
  showProgressFeedback?: boolean;
  enableErrorHandling?: boolean;
}

export function QuickActionToolbar({
  availableActions = [],
  currentContext,
  selectedSymbols = [],
  onActionExecute,
  onActionCustomize,
  className = '',
  maxVisibleActions = 8,
  showCategories = true,
  showProgressFeedback = true,
  enableErrorHandling = true
}: QuickActionToolbarProps) {
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [actionResults, setActionResults] = useState<Map<string, ActionResult>>(new Map());
  // Use the contextual actions hook
  const {
    actions: contextualActions,
    executeAction,
    isExecuting,
    executingActions
  } = useContextualActions({
    context: currentContext,
    selectedSymbols,
    enableKeyboardShortcuts: true,
    maxActions: maxVisibleActions * 3, // Allow more actions for categorization
    customActions: availableActions
  });

  // Group actions by category
  const actionsByCategory = useMemo(() => {
    const grouped = new Map<ActionCategory, ContextualAction[]>();
    
    contextualActions.forEach(action => {
      const category = action.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(action);
    });

    // Sort actions within each category by priority
    grouped.forEach(actions => {
      actions.sort((a, b) => (b.metadata.priority || 0) - (a.metadata.priority || 0));
    });

    return grouped;
  }, [contextualActions]);

  // Handle action execution with enhanced feedback and error handling
  const handleActionExecute = useCallback(async (action: ContextualAction) => {
    try {
      // Show loading toast if progress feedback is enabled
      let loadingToastId: string | number | undefined;
      if (showProgressFeedback) {
        loadingToastId = toast.loading(`Executing ${action.label}...`, {
          description: action.description || 'Please wait while the action completes.'
        });
      }

      const result = await executeAction(action.id);
      
      // Store result for potential display
      setActionResults(prev => new Map(prev).set(action.id, result));
      
      // Call custom callback if provided
      if (onActionExecute) {
        await onActionExecute(action);
      }
      
      // Handle navigation result
      if (result.navigationTarget) {
        console.log('Navigation target:', result.navigationTarget);
        // In a real implementation, this would trigger navigation
      }
      
      // Show result feedback
      if (showProgressFeedback && loadingToastId) {
        toast.dismiss(loadingToastId);
        
        if (result.success) {
          toast.success(`${action.label} completed`, {
            description: result.message || 'Action executed successfully.',
            duration: 3000
          });
        } else {
          toast.error(`${action.label} failed`, {
            description: result.message || 'Action execution failed.',
            duration: 5000
          });
        }
      }
      
      // Handle follow-up actions
      if (result.followUpActions && result.followUpActions.length > 0) {
        toast.info('Follow-up actions available', {
          description: `${result.followUpActions.length} additional actions can be performed.`,
          action: {
            label: 'View',
            onClick: () => {
              // Show follow-up actions in a menu or dialog
              console.log('Follow-up actions:', result.followUpActions);
            }
          }
        });
      }
      
    } catch (error) {
      console.error('Action execution failed:', error);
      
      if (enableErrorHandling && showProgressFeedback) {
        toast.error(`${action.label} failed`, {
          description: error instanceof Error ? error.message : 'An unexpected error occurred.',
          duration: 5000,
          action: {
            label: 'Retry',
            onClick: () => handleActionExecute(action)
          }
        });
      }
    }
  }, [executeAction, onActionExecute, showProgressFeedback, enableErrorHandling]);

  // Render action button with enhanced feedback
  const renderActionButton = (action: ContextualAction) => {
    const actionIsExecuting = isExecuting(action.id);
    const actionResult = actionResults.get(action.id);
    const shortcutText = action.shortcut ? 
      `${action.shortcut.modifiers.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join('+')}+${action.shortcut.key}` : 
      undefined;

    const tooltipText = [
      action.description,
      shortcutText ? `Shortcut: ${shortcutText}` : null,
      actionResult && !actionResult.success ? `Last error: ${actionResult.message}` : null
    ].filter(Boolean).join(' • ');

    // Determine button variant based on result
    let variant: "ghost" | "destructive" | "secondary" = "ghost";
    if (actionResult && !actionResult.success) {
      variant = "destructive";
    } else if (actionResult && actionResult.success) {
      variant = "secondary";
    }

    return (
      <Button
        key={action.id}
        variant={variant}
        size="sm"
        onClick={() => handleActionExecute(action)}
        disabled={actionIsExecuting}
        className={`h-8 px-2 text-xs transition-all duration-200 ${
          actionIsExecuting ? 'animate-pulse' : ''
        } ${actionResult && actionResult.success ? 'border-green-500/20 bg-green-50/50' : ''}`}
        title={tooltipText}
      >
        <span className="mr-1">{action.icon}</span>
        {action.label}
        {actionIsExecuting && (
          <div className="ml-1 flex items-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
          </div>
        )}
        {actionResult && !actionResult.success && !actionIsExecuting && (
          <span className="ml-1 text-red-500">⚠</span>
        )}
        {actionResult && actionResult.success && !actionIsExecuting && (
          <span className="ml-1 text-green-500">✓</span>
        )}
      </Button>
    );
  };

  // Render category section
  const renderCategorySection = (category: ActionCategory, actions: ContextualAction[]) => {
    const visibleActions = actions.slice(0, maxVisibleActions);
    const hasMore = actions.length > maxVisibleActions;

    return (
      <div key={category} className="flex items-center gap-1">
        {visibleActions.map(renderActionButton)}
        {hasMore && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-xs"
            title={`${actions.length - maxVisibleActions} more ${category} actions available`}
          >
            +{actions.length - maxVisibleActions}
          </Button>
        )}
      </div>
    );
  };

  if (contextualActions.length === 0) {
    return (
      <div className={`quick-action-toolbar-empty ${className}`}>
        <div className="text-xs text-muted-foreground px-2 py-1">
          No actions available
        </div>
      </div>
    );
  }

  return (
    <div className={`quick-action-toolbar flex items-center gap-2 p-2 border-b bg-background ${className}`}>
      {showCategories ? (
        // Render actions grouped by category
        Array.from(actionsByCategory.entries()).map(([category, actions], index) => (
          <React.Fragment key={category}>
            {index > 0 && <div className="h-6 w-px bg-border mx-2" />}
            {renderCategorySection(category, actions)}
          </React.Fragment>
        ))
      ) : (
        // Render all actions together
        <div className="flex items-center gap-1">
          {contextualActions.slice(0, maxVisibleActions).map(renderActionButton)}
          {contextualActions.length > maxVisibleActions && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              title={`${contextualActions.length - maxVisibleActions} more actions available`}
            >
              +{contextualActions.length - maxVisibleActions}
            </Button>
          )}
        </div>
      )}
      
      <>
        <div className="h-6 w-px bg-border mx-2" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCustomizationDialog(true)}
          className="h-8 px-2 text-xs"
          title="Customize actions"
        >
          ⚙️
        </Button>
      </>
      
      {/* Action Customization Dialog */}
      <ActionCustomizationDialog
        isOpen={showCustomizationDialog}
        onClose={() => setShowCustomizationDialog(false)}
        onSave={(customizedActions) => {
          if (onActionCustomize) {
            onActionCustomize(customizedActions);
          }
          setShowCustomizationDialog(false);
        }}
        availableActions={availableActions}
      />
    </div>
  );
}



export default QuickActionToolbar;