// Action Progress Indicator Component
// Purpose: Provides visual feedback for action execution progress
// Architecture: Standalone component for showing action execution state

import React from 'react';
import { ContextualAction, ActionResult } from '../../types/navigation';
import { cn } from '../../lib/utils';

export interface ActionProgressIndicatorProps {
  action: ContextualAction;
  isExecuting: boolean;
  result?: ActionResult;
  showDetails?: boolean;
  className?: string;
}

export function ActionProgressIndicator({
  action,
  isExecuting,
  result,
  showDetails = false,
  className
}: ActionProgressIndicatorProps) {
  // Determine the current state
  const getState = () => {
    if (isExecuting) return 'executing';
    if (result?.success === true) return 'success';
    if (result?.success === false) return 'error';
    return 'idle';
  };

  const state = getState();

  // State-specific styling
  const getStateStyles = () => {
    switch (state) {
      case 'executing':
        return {
          container: 'border-blue-200 bg-blue-50/50',
          icon: 'text-blue-600',
          text: 'text-blue-800'
        };
      case 'success':
        return {
          container: 'border-green-200 bg-green-50/50',
          icon: 'text-green-600',
          text: 'text-green-800'
        };
      case 'error':
        return {
          container: 'border-red-200 bg-red-50/50',
          icon: 'text-red-600',
          text: 'text-red-800'
        };
      default:
        return {
          container: 'border-gray-200 bg-gray-50/50',
          icon: 'text-gray-600',
          text: 'text-gray-800'
        };
    }
  };

  const styles = getStateStyles();

  // Render progress indicator
  const renderProgressIndicator = () => {
    switch (state) {
      case 'executing':
        return (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className={`text-sm font-medium ${styles.text}`}>
              Executing...
            </span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded-full bg-green-600 flex items-center justify-center`}>
              <span className="text-white text-xs">✓</span>
            </div>
            <span className={`text-sm font-medium ${styles.text}`}>
              Completed
            </span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded-full bg-red-600 flex items-center justify-center`}>
              <span className="text-white text-xs">✕</span>
            </div>
            <span className={`text-sm font-medium ${styles.text}`}>
              Failed
            </span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded-full border-2 border-gray-300`}></div>
            <span className={`text-sm ${styles.text}`}>
              Ready
            </span>
          </div>
        );
    }
  };

  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg border transition-all duration-200',
      styles.container,
      className
    )}>
      <div className="flex items-center gap-3">
        <span className={`text-lg ${styles.icon}`}>{action.icon}</span>
        <div>
          <div className="font-medium text-sm">{action.label}</div>
          {showDetails && action.description && (
            <div className="text-xs text-muted-foreground mt-1">
              {action.description}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {renderProgressIndicator()}
        
        {showDetails && result?.message && (
          <div className={`text-xs max-w-xs truncate ${styles.text}`}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}

// Batch Progress Indicator for multiple actions
export interface BatchActionProgressProps {
  actions: Array<{
    action: ContextualAction;
    isExecuting: boolean;
    result?: ActionResult;
  }>;
  className?: string;
}

export function BatchActionProgress({
  actions,
  className
}: BatchActionProgressProps) {
  const totalActions = actions.length;
  const executingActions = actions.filter(a => a.isExecuting).length;
  const completedActions = actions.filter(a => a.result?.success === true).length;
  const failedActions = actions.filter(a => a.result?.success === false).length;
  const pendingActions = totalActions - executingActions - completedActions - failedActions;

  const progressPercentage = totalActions > 0 ? 
    ((completedActions + failedActions) / totalActions) * 100 : 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Batch Action Progress</span>
          <span className="text-muted-foreground">
            {completedActions + failedActions} of {totalActions} completed
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {executingActions > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                {executingActions} executing
              </span>
            )}
            {completedActions > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                {completedActions} completed
              </span>
            )}
            {failedActions > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                {failedActions} failed
              </span>
            )}
            {pendingActions > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                {pendingActions} pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Individual action progress */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {actions.map(({ action, isExecuting, result }, index) => (
          <ActionProgressIndicator
            key={`${action.id}-${index}`}
            action={action}
            isExecuting={isExecuting}
            result={result}
            showDetails={false}
            className="text-xs"
          />
        ))}
      </div>
    </div>
  );
}

export default ActionProgressIndicator;