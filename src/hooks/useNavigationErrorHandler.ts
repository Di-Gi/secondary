// Enhanced Navigation Interface - Error Handling Hook
// Purpose: Centralized error handling for navigation operations with recovery strategies
// Architecture: Provides consistent error handling across navigation components

import { useCallback, useState } from 'react';
import { NavigationError, NavigationErrorSeverity, NavigationRecoveryStrategy } from '../types/navigation';

export interface NavigationErrorState {
  error: NavigationError | null;
  isRecovering: boolean;
  retryCount: number;
}

export interface UseNavigationErrorHandlerOptions {
  onError?: (error: NavigationError) => void;
  onRecovery?: (strategy: NavigationRecoveryStrategy) => void;
  maxRetries?: number;
  enableAutoRecovery?: boolean;
}

export const useNavigationErrorHandler = (options: UseNavigationErrorHandlerOptions = {}) => {
  const {
    onError,
    onRecovery,
    maxRetries = 3,
    enableAutoRecovery = true
  } = options;

  const [errorState, setErrorState] = useState<NavigationErrorState>({
    error: null,
    isRecovering: false,
    retryCount: 0
  });

  const handleError = useCallback(async (error: any, operation: string) => {
    let navigationError: NavigationError;

    // Convert error to NavigationError if it isn't already
    if (error && typeof error === 'object' && 'code' in error) {
      navigationError = error as NavigationError;
    } else {
      // Create a basic NavigationError for unknown errors
      navigationError = {
        code: 'UNKNOWN_ERROR',
        message: error?.message || String(error),
        details: error,
        timestamp: new Date(),
        source: 'frontend',
        recoverable: true,
        severity: 'Medium' as NavigationErrorSeverity,
        recovery_strategy: { type: 'Retry', max_attempts: maxRetries, backoff_ms: 1000 },
        user_message: `Failed to ${operation}: ${error?.message || String(error)}`,
        technical_details: String(error),
        suggested_actions: ['Try again', 'Check your connection', 'Restart the application'],
        can_continue: true
      };
    }

    setErrorState(prev => ({
      error: navigationError,
      isRecovering: false,
      retryCount: prev.retryCount + 1
    }));

    onError?.(navigationError);

    // Auto-recovery logic
    if (enableAutoRecovery && navigationError.can_continue) {
      await attemptRecovery(navigationError);
    }

    return navigationError;
  }, [onError, maxRetries, enableAutoRecovery]);

  const attemptRecovery = useCallback(async (error: NavigationError) => {
    if (!error.recovery_strategy || errorState.retryCount >= maxRetries) {
      return false;
    }

    setErrorState(prev => ({ ...prev, isRecovering: true }));

    try {
      const strategy = error.recovery_strategy;
      onRecovery?.(strategy);

      switch (strategy.type) {
        case 'Retry':
          if (strategy.backoff_ms) {
            await new Promise(resolve => setTimeout(resolve, strategy.backoff_ms));
          }
          break;

        case 'Fallback':
          console.log(`Using fallback strategy: ${strategy.fallback_type}`);
          break;

        case 'Degrade':
          console.log(`Degrading functionality: ${strategy.limited_functionality}`);
          break;

        case 'Reset':
          console.log(`Resetting component, preserve cache: ${strategy.preserve_cache}`);
          break;

        case 'Skip':
          console.log(`Skipping operation, continue: ${strategy.continue_operation}`);
          break;

        case 'Manual':
          console.log(`Manual intervention required: ${strategy.instructions}`);
          break;

        default:
          console.log('No recovery strategy available');
          break;
      }

      setErrorState(prev => ({ ...prev, isRecovering: false }));
      return true;
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      setErrorState(prev => ({ ...prev, isRecovering: false }));
      return false;
    }
  }, [errorState.retryCount, maxRetries, onRecovery]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRecovering: false,
      retryCount: 0
    });
  }, []);

  const retry = useCallback(async (operation: () => Promise<any>) => {
    if (errorState.retryCount >= maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    clearError();
    
    try {
      return await operation();
    } catch (error) {
      return handleError(error, 'retry operation');
    }
  }, [errorState.retryCount, maxRetries, clearError, handleError]);

  const canRetry = useCallback(() => {
    return errorState.error?.recovery_strategy?.type === 'Retry' && 
           errorState.retryCount < maxRetries;
  }, [errorState.error, errorState.retryCount, maxRetries]);

  const getSeverityColor = useCallback((severity: NavigationErrorSeverity) => {
    switch (severity) {
      case 'Low': return 'text-yellow-600';
      case 'Medium': return 'text-orange-600';
      case 'High': return 'text-red-600';
      case 'Critical': return 'text-red-800';
      default: return 'text-gray-600';
    }
  }, []);

  return {
    errorState,
    handleError,
    clearError,
    retry,
    canRetry,
    attemptRecovery,
    getSeverityColor,
    isError: !!errorState.error,
    isRecovering: errorState.isRecovering,
    canContinue: errorState.error?.can_continue || false
  };
};

export default useNavigationErrorHandler;