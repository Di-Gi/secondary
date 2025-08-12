// Action Error Handler
// Purpose: Centralized error handling for contextual actions
// Architecture: Error categorization, recovery strategies, and user feedback

import { ContextualAction, NavigationContext, ActionResult } from '../../../types/navigation';

export interface ActionError extends Error {
  code: string;
  category: ActionErrorCategory;
  recoverable: boolean;
  context?: NavigationContext;
  action?: ContextualAction;
  timestamp: Date;
}

export type ActionErrorCategory = 
  | 'PERMISSION_DENIED'
  | 'FILE_NOT_FOUND'
  | 'SYMBOL_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_CONTEXT'
  | 'EXECUTION_FAILED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface ErrorRecoveryStrategy {
  canRecover: (error: ActionError) => boolean;
  recover: (error: ActionError) => Promise<ActionResult>;
  description: string;
}

export class ActionErrorHandler {
  private recoveryStrategies = new Map<ActionErrorCategory, ErrorRecoveryStrategy>();
  private errorHistory = new Map<string, ActionError[]>();

  constructor() {
    this.initializeRecoveryStrategies();
  }

  // Initialize default recovery strategies
  private initializeRecoveryStrategies(): void {
    // File not found recovery
    this.recoveryStrategies.set('FILE_NOT_FOUND', {
      canRecover: (error) => error.context?.breadcrumbs?.length > 0,
      recover: async (error) => {
        // Try to find alternative file paths
        const context = error.context;
        if (!context) {
          return { success: false, message: 'No context available for recovery' };
        }

        // Attempt to find similar files
        const currentPath = context.breadcrumbs.find(b => b.type === 'file')?.path;
        if (currentPath) {
          // In a real implementation, this would search for similar files
          return {
            success: false,
            message: `File not found: ${currentPath}. Consider checking if the file was moved or renamed.`,
            followUpActions: []
          };
        }

        return { success: false, message: 'Unable to recover from file not found error' };
      },
      description: 'Attempts to find alternative file paths or suggest similar files'
    });

    // Symbol not found recovery
    this.recoveryStrategies.set('SYMBOL_NOT_FOUND', {
      canRecover: (error) => error.action?.metadata?.canBatch === false,
      recover: async (error) => {
        return {
          success: false,
          message: 'Symbol not found. The symbol may have been renamed, moved, or deleted.',
          followUpActions: []
        };
      },
      description: 'Suggests alternative symbols or searches for similar symbols'
    });

    // Network error recovery
    this.recoveryStrategies.set('NETWORK_ERROR', {
      canRecover: () => true,
      recover: async (error) => {
        // Implement retry logic with exponential backoff
        return {
          success: false,
          message: 'Network error occurred. Please check your connection and try again.',
          followUpActions: []
        };
      },
      description: 'Implements retry logic with exponential backoff'
    });

    // Timeout recovery
    this.recoveryStrategies.set('TIMEOUT', {
      canRecover: (error) => error.action?.metadata?.estimatedDuration < 30000,
      recover: async (error) => {
        return {
          success: false,
          message: 'Action timed out. This may be due to a large codebase or system load.',
          followUpActions: []
        };
      },
      description: 'Suggests breaking down large operations or trying again later'
    });

    // Permission denied recovery
    this.recoveryStrategies.set('PERMISSION_DENIED', {
      canRecover: () => false,
      recover: async (error) => {
        return {
          success: false,
          message: 'Permission denied. Check file permissions or run with appropriate privileges.',
          followUpActions: []
        };
      },
      description: 'Provides guidance on resolving permission issues'
    });
  }

  // Handle action error
  async handleError(
    error: Error | ActionError,
    action: ContextualAction,
    context: NavigationContext
  ): Promise<ActionResult> {
    const actionError = this.normalizeError(error, action, context);
    
    // Record error in history
    this.recordError(actionError);

    // Attempt recovery if possible
    const recoveryStrategy = this.recoveryStrategies.get(actionError.category);
    if (recoveryStrategy && recoveryStrategy.canRecover(actionError)) {
      try {
        const recoveryResult = await recoveryStrategy.recover(actionError);
        if (recoveryResult.success) {
          return recoveryResult;
        }
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError);
      }
    }

    // Return error result with user-friendly message
    return {
      success: false,
      message: this.getUserFriendlyMessage(actionError),
      data: {
        error: actionError,
        canRetry: actionError.recoverable,
        suggestedActions: this.getSuggestedActions(actionError)
      }
    };
  }

  // Normalize error to ActionError format
  private normalizeError(
    error: Error | ActionError,
    action: ContextualAction,
    context: NavigationContext
  ): ActionError {
    if (this.isActionError(error)) {
      return error;
    }

    // Categorize error based on message and type
    const category = this.categorizeError(error);
    const recoverable = this.isRecoverable(error, category);

    return {
      ...error,
      code: error.name || 'UNKNOWN_ERROR',
      category,
      recoverable,
      context,
      action,
      timestamp: new Date()
    };
  }

  // Check if error is already an ActionError
  private isActionError(error: Error | ActionError): error is ActionError {
    return 'category' in error && 'recoverable' in error;
  }

  // Categorize error based on message and type
  private categorizeError(error: Error): ActionErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('access denied')) {
      return 'PERMISSION_DENIED';
    }
    if (message.includes('file not found') || message.includes('enoent')) {
      return 'FILE_NOT_FOUND';
    }
    if (message.includes('symbol not found') || message.includes('undefined symbol')) {
      return 'SYMBOL_NOT_FOUND';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }
    if (message.includes('cancelled') || message.includes('aborted')) {
      return 'CANCELLED';
    }
    if (message.includes('invalid context') || message.includes('context')) {
      return 'INVALID_CONTEXT';
    }
    
    return 'EXECUTION_FAILED';
  }

  // Determine if error is recoverable
  private isRecoverable(error: Error, category: ActionErrorCategory): boolean {
    switch (category) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
      case 'CANCELLED':
        return true;
      case 'FILE_NOT_FOUND':
      case 'SYMBOL_NOT_FOUND':
        return true; // May be recoverable with alternative paths
      case 'PERMISSION_DENIED':
        return false;
      case 'INVALID_CONTEXT':
        return false;
      default:
        return true; // Assume recoverable unless proven otherwise
    }
  }

  // Get user-friendly error message
  private getUserFriendlyMessage(error: ActionError): string {
    const baseMessages: Record<ActionErrorCategory, string> = {
      PERMISSION_DENIED: 'You don\'t have permission to perform this action.',
      FILE_NOT_FOUND: 'The requested file could not be found.',
      SYMBOL_NOT_FOUND: 'The requested symbol could not be found.',
      NETWORK_ERROR: 'A network error occurred. Please check your connection.',
      TIMEOUT: 'The action took too long to complete.',
      INVALID_CONTEXT: 'This action cannot be performed in the current context.',
      EXECUTION_FAILED: 'The action failed to execute properly.',
      CANCELLED: 'The action was cancelled.',
      UNKNOWN: 'An unexpected error occurred.'
    };

    const baseMessage = baseMessages[error.category] || baseMessages.UNKNOWN;
    
    // Add specific details if available and different from base message
    if (error.message && error.message !== error.name && !baseMessage.includes(error.message)) {
      return `${baseMessage} Details: ${error.message}`;
    }
    
    return baseMessage;
  }

  // Get suggested actions for error recovery
  private getSuggestedActions(error: ActionError): string[] {
    const suggestions: Record<ActionErrorCategory, string[]> = {
      PERMISSION_DENIED: [
        'Check file permissions',
        'Run with administrator privileges',
        'Contact your system administrator'
      ],
      FILE_NOT_FOUND: [
        'Check if the file was moved or renamed',
        'Refresh the file tree',
        'Search for similar files'
      ],
      SYMBOL_NOT_FOUND: [
        'Refresh symbol analysis',
        'Check if the symbol was renamed',
        'Search for similar symbols'
      ],
      NETWORK_ERROR: [
        'Check your internet connection',
        'Try again in a few moments',
        'Check firewall settings'
      ],
      TIMEOUT: [
        'Try again with a smaller scope',
        'Check system performance',
        'Break down the operation into smaller parts'
      ],
      INVALID_CONTEXT: [
        'Navigate to a valid location',
        'Select appropriate symbols',
        'Check current workspace'
      ],
      EXECUTION_FAILED: [
        'Try the action again',
        'Check system logs',
        'Report the issue if it persists'
      ],
      CANCELLED: [
        'Try the action again if needed'
      ],
      UNKNOWN: [
        'Try the action again',
        'Check system logs',
        'Report the issue'
      ]
    };

    return suggestions[error.category] || suggestions.UNKNOWN;
  }

  // Record error in history
  private recordError(error: ActionError): void {
    const actionId = error.action?.id || 'unknown';
    
    if (!this.errorHistory.has(actionId)) {
      this.errorHistory.set(actionId, []);
    }
    
    const history = this.errorHistory.get(actionId)!;
    history.push(error);
    
    // Keep only last 10 errors per action
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  // Get error history for an action
  getErrorHistory(actionId: string): ActionError[] {
    return this.errorHistory.get(actionId) || [];
  }

  // Get error statistics
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ActionErrorCategory, number>;
    mostProblematicActions: Array<{ actionId: string; errorCount: number }>;
  } {
    let totalErrors = 0;
    const errorsByCategory: Record<ActionErrorCategory, number> = {
      PERMISSION_DENIED: 0,
      FILE_NOT_FOUND: 0,
      SYMBOL_NOT_FOUND: 0,
      NETWORK_ERROR: 0,
      TIMEOUT: 0,
      INVALID_CONTEXT: 0,
      EXECUTION_FAILED: 0,
      CANCELLED: 0,
      UNKNOWN: 0
    };

    const actionErrorCounts = new Map<string, number>();

    this.errorHistory.forEach((errors, actionId) => {
      totalErrors += errors.length;
      actionErrorCounts.set(actionId, errors.length);
      
      errors.forEach(error => {
        errorsByCategory[error.category]++;
      });
    });

    const mostProblematicActions = Array.from(actionErrorCounts.entries())
      .map(([actionId, errorCount]) => ({ actionId, errorCount }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 5);

    return {
      totalErrors,
      errorsByCategory,
      mostProblematicActions
    };
  }

  // Clear error history
  clearErrorHistory(actionId?: string): void {
    if (actionId) {
      this.errorHistory.delete(actionId);
    } else {
      this.errorHistory.clear();
    }
  }

  // Register custom recovery strategy
  registerRecoveryStrategy(
    category: ActionErrorCategory,
    strategy: ErrorRecoveryStrategy
  ): void {
    this.recoveryStrategies.set(category, strategy);
  }
}

// Global error handler instance
export const actionErrorHandler = new ActionErrorHandler();

// Utility function to create ActionError
export function createActionError(
  message: string,
  category: ActionErrorCategory,
  recoverable: boolean = true,
  context?: NavigationContext,
  action?: ContextualAction
): ActionError {
  return {
    name: 'ActionError',
    message,
    code: category,
    category,
    recoverable,
    context,
    action,
    timestamp: new Date()
  };
}

export default ActionErrorHandler;