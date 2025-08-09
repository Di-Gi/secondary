// [[SECONDARY_MIND]]/src/hooks/useAsyncOperation.ts
// Purpose: Hook for managing async operations with loading states, error handling, and cancellation.
// Architecture: Custom React hook with comprehensive state management for async operations.
// Dependencies: React, AbortController API.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '../components/ui/ToastNotification';

export interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  progress?: number;
  stage?: string;
  startTime?: Date;
  estimatedTimeRemaining?: number;
}

export interface AsyncOperationOptions {
  /** Show toast notifications for success/error */
  showToasts?: boolean;
  /** Custom success message */
  successMessage?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Enable progress tracking */
  trackProgress?: boolean;
  /** Auto-retry on failure */
  retryCount?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface ProgressCallback {
  (progress: number, stage?: string, estimatedTimeRemaining?: number): void;
}

export interface AsyncOperationResult<T> {
  state: AsyncOperationState<T>;
  execute: (operation: (signal: AbortSignal, onProgress?: ProgressCallback) => Promise<T>) => Promise<T | null>;
  cancel: () => void;
  retry: () => Promise<T | null>;
  reset: () => void;
}

export function useAsyncOperation<T = any>(
  options: AsyncOperationOptions = {}
): AsyncOperationResult<T> {
  const {
    showToasts = true,
    successMessage,
    errorMessage,
    trackProgress = false,
    retryCount = 0,
    retryDelay = 1000,
    timeout,
  } = options;

  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    progress: trackProgress ? 0 : undefined,
    stage: undefined,
    startTime: undefined,
    estimatedTimeRemaining: undefined,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentOperationRef = useRef<((signal: AbortSignal, onProgress?: ProgressCallback) => Promise<T>) | null>(null);
  const retryAttemptRef = useRef(0);
  const toast = useToast();

  const updateProgress = useCallback((progress: number, stage?: string, estimatedTimeRemaining?: number) => {
    if (trackProgress) {
      setState(prev => ({
        ...prev,
        progress,
        stage,
        estimatedTimeRemaining,
      }));
    }
  }, [trackProgress]);

  const execute = useCallback(async (
    operation: (signal: AbortSignal, onProgress?: ProgressCallback) => Promise<T>
  ): Promise<T | null> => {
    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    currentOperationRef.current = operation;
    retryAttemptRef.current = 0;

    const startTime = new Date();
    setState({
      data: null,
      loading: true,
      error: null,
      progress: trackProgress ? 0 : undefined,
      stage: undefined,
      startTime,
      estimatedTimeRemaining: undefined,
    });

    const executeWithRetry = async (attempt: number): Promise<T | null> => {
      try {
        const signal = abortControllerRef.current!.signal;
        
        // Set up timeout if specified
        let timeoutId: NodeJS.Timeout | undefined;
        if (timeout) {
          timeoutId = setTimeout(() => {
            abortControllerRef.current?.abort();
          }, timeout);
        }

        const result = await operation(signal, updateProgress);
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Check if operation was cancelled
        if (signal.aborted) {
          return null;
        }

        setState(prev => ({
          ...prev,
          data: result,
          loading: false,
          error: null,
          progress: trackProgress ? 100 : undefined,
          stage: 'Completed',
        }));

        if (showToasts && successMessage) {
          toast.success(successMessage);
        }

        return result;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const err = error as Error;
        
        // Don't handle aborted operations as errors
        if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          setState(prev => ({
            ...prev,
            loading: false,
            stage: 'Cancelled',
          }));
          return null;
        }

        // Retry logic
        if (attempt < retryCount) {
          setState(prev => ({
            ...prev,
            stage: `Retrying... (${attempt + 1}/${retryCount})`,
          }));
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return executeWithRetry(attempt + 1);
        }

        setState(prev => ({
          ...prev,
          loading: false,
          error: err,
          stage: 'Failed',
        }));

        if (showToasts) {
          const message = errorMessage || err.message;
          toast.error('Operation Failed', message, {
            actions: retryCount > 0 ? [
              {
                label: 'Retry',
                action: () => retry(),
                variant: 'primary',
              },
            ] : undefined,
          });
        }

        throw err;
      }
    };

    return executeWithRetry(0);
  }, [trackProgress, timeout, retryCount, retryDelay, showToasts, successMessage, errorMessage, toast, updateProgress]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        loading: false,
        stage: 'Cancelled',
      }));
    }
  }, []);

  const retry = useCallback(async (): Promise<T | null> => {
    if (currentOperationRef.current) {
      return execute(currentOperationRef.current);
    }
    return null;
  }, [execute]);

  const reset = useCallback(() => {
    cancel();
    setState({
      data: null,
      loading: false,
      error: null,
      progress: trackProgress ? 0 : undefined,
      stage: undefined,
      startTime: undefined,
      estimatedTimeRemaining: undefined,
    });
    currentOperationRef.current = null;
    retryAttemptRef.current = 0;
  }, [cancel, trackProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    execute,
    cancel,
    retry,
    reset,
  };
}

// Specialized hooks for common operations

export function useProjectAnalysis() {
  return useAsyncOperation<{ filesProcessed: number; symbolsFound: number }>({
    showToasts: true,
    successMessage: 'Project analysis completed',
    errorMessage: 'Failed to analyze project',
    trackProgress: true,
    retryCount: 2,
    retryDelay: 2000,
    timeout: 300000, // 5 minutes
  });
}

export function useSearch() {
  return useAsyncOperation<{ results: any[]; totalFound: number }>({
    showToasts: false, // Search results are shown in UI
    trackProgress: true,
    timeout: 30000, // 30 seconds
  });
}

export function useAIQuery() {
  return useAsyncOperation<{ response: string; confidence: number }>({
    showToasts: true,
    errorMessage: 'AI query failed',
    retryCount: 1,
    retryDelay: 1000,
    timeout: 60000, // 1 minute
  });
}

export function useFileOperation() {
  return useAsyncOperation<void>({
    showToasts: true,
    retryCount: 2,
    retryDelay: 500,
  });
}

// Utility hook for managing multiple async operations
export function useAsyncOperationManager() {
  const [operations, setOperations] = useState<Map<string, AsyncOperationState<any>>>(new Map());

  const registerOperation = useCallback(<T>(id: string, state: AsyncOperationState<T>) => {
    setOperations(prev => new Map(prev.set(id, state)));
  }, []);

  const unregisterOperation = useCallback((id: string) => {
    setOperations(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getOperation = useCallback((id: string) => {
    return operations.get(id);
  }, [operations]);

  const getAllOperations = useCallback(() => {
    return Array.from(operations.entries()).map(([id, state]) => ({ id, state }));
  }, [operations]);

  const getActiveOperations = useCallback(() => {
    return getAllOperations().filter(({ state }) => state.loading);
  }, [getAllOperations]);

  const cancelAllOperations = useCallback(() => {
    // This would need to be implemented by the components using the operations
    console.warn('cancelAllOperations not implemented - operations should handle their own cancellation');
  }, []);

  return {
    operations: getAllOperations(),
    activeOperations: getActiveOperations(),
    registerOperation,
    unregisterOperation,
    getOperation,
    cancelAllOperations,
  };
}