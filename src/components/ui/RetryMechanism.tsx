// [[SECONDARY_MIND]]/src/components/ui/RetryMechanism.tsx
// Purpose: Retry mechanism components for failed operations with exponential backoff.
// Architecture: React components with configurable retry strategies and user feedback.
// Dependencies: React, Lucide icons, Tailwind CSS.

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock, AlertCircle, CheckCircle, X } from 'lucide-react';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBase: number;
  jitter: boolean;
}

export interface RetryMechanismProps {
  /** The operation to retry */
  operation: () => Promise<void>;
  /** Retry configuration */
  config?: Partial<RetryConfig>;
  /** Error that triggered the retry */
  error?: Error;
  /** Custom error message */
  errorMessage?: string;
  /** Show retry UI */
  show: boolean;
  /** Callback when retry succeeds */
  onSuccess?: () => void;
  /** Callback when retry fails permanently */
  onFailure?: (error: Error) => void;
  /** Callback when user cancels retry */
  onCancel?: () => void;
  /** Enable automatic retry */
  autoRetry?: boolean;
  /** Component size */
  size?: 'sm' | 'md' | 'lg';
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2,
  jitter: true,
};

export const RetryMechanism: React.FC<RetryMechanismProps> = ({
  operation,
  config = {},
  error,
  errorMessage,
  show,
  onSuccess,
  onFailure,
  onCancel,
  autoRetry = false,
  size = 'md',
}) => {
  const retryConfig = { ...defaultRetryConfig, ...config };
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [retryHistory, setRetryHistory] = useState<RetryAttempt[]>([]);

  interface RetryAttempt {
    attempt: number;
    timestamp: Date;
    success: boolean;
    error?: string;
    delay: number;
  }

  const calculateDelay = useCallback((attempt: number): number => {
    let delay = retryConfig.baseDelay * Math.pow(retryConfig.exponentialBase, attempt);
    delay = Math.min(delay, retryConfig.maxDelay);
    
    if (retryConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }, [retryConfig]);

  const executeRetry = useCallback(async (attempt: number): Promise<boolean> => {
    setIsRetrying(true);
    setCurrentAttempt(attempt);

    const delay = calculateDelay(attempt - 1);
    const startTime = Date.now();

    try {
      // Wait for delay with countdown
      if (delay > 0) {
        const countdownInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, delay - elapsed);
          setCountdown(Math.ceil(remaining / 1000));
          
          if (remaining <= 0) {
            clearInterval(countdownInterval);
          }
        }, 100);

        await new Promise(resolve => setTimeout(resolve, delay));
        clearInterval(countdownInterval);
      }

      setCountdown(0);
      await operation();

      // Success
      const attemptRecord: RetryAttempt = {
        attempt,
        timestamp: new Date(),
        success: true,
        delay,
      };
      
      setRetryHistory(prev => [...prev, attemptRecord]);
      setIsRetrying(false);
      onSuccess?.();
      return true;
    } catch (retryError) {
      const attemptRecord: RetryAttempt = {
        attempt,
        timestamp: new Date(),
        success: false,
        error: retryError instanceof Error ? retryError.message : String(retryError),
        delay,
      };
      
      setRetryHistory(prev => [...prev, attemptRecord]);
      
      if (attempt >= retryConfig.maxAttempts) {
        setIsRetrying(false);
        onFailure?.(retryError instanceof Error ? retryError : new Error(String(retryError)));
        return false;
      }
      
      // Continue with next attempt
      return executeRetry(attempt + 1);
    }
  }, [operation, calculateDelay, retryConfig.maxAttempts, onSuccess, onFailure]);

  const handleManualRetry = useCallback(() => {
    executeRetry(1);
  }, [executeRetry]);

  const handleCancel = useCallback(() => {
    setIsRetrying(false);
    setCountdown(0);
    onCancel?.();
  }, [onCancel]);

  // Auto-retry effect
  useEffect(() => {
    if (show && autoRetry && !isRetrying && currentAttempt === 0) {
      executeRetry(1);
    }
  }, [show, autoRetry, isRetrying, currentAttempt, executeRetry]);

  if (!show) return null;

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-base',
    lg: 'p-6 text-lg',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg ${sizeClasses[size]}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {isRetrying ? (
            <RefreshCw className={`${iconSizes[size]} text-blue-500 animate-spin`} />
          ) : (
            <AlertCircle className={`${iconSizes[size]} text-red-500`} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-red-900 mb-1">
            {isRetrying ? 'Retrying Operation...' : 'Operation Failed'}
          </h4>
          
          <p className="text-red-700 mb-3">
            {errorMessage || error?.message || 'An unexpected error occurred'}
          </p>

          {isRetrying && countdown > 0 && (
            <div className="flex items-center space-x-2 mb-3 text-sm text-blue-600">
              <Clock className="w-4 h-4" />
              <span>Retrying in {countdown} seconds... (Attempt {currentAttempt}/{retryConfig.maxAttempts})</span>
            </div>
          )}

          {!isRetrying && (
            <div className="flex flex-wrap gap-2 mb-3">
              {currentAttempt < retryConfig.maxAttempts && (
                <button
                  onClick={handleManualRetry}
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry {currentAttempt > 0 && `(${currentAttempt}/${retryConfig.maxAttempts})`}
                </button>
              )}
              
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </button>
            </div>
          )}

          {isRetrying && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mb-3"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel Retry
            </button>
          )}

          {retryHistory.length > 0 && (
            <div className="border-t border-red-200 pt-3">
              <h5 className="text-xs font-medium text-gray-900 mb-2">Retry History</h5>
              <div className="space-y-1">
                {retryHistory.map((attempt, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    {attempt.success ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                    <span className="text-gray-600">
                      Attempt {attempt.attempt}: {attempt.success ? 'Success' : attempt.error}
                    </span>
                    <span className="text-gray-400">
                      ({attempt.timestamp.toLocaleTimeString()})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentAttempt >= retryConfig.maxAttempts && (
            <div className="border-t border-red-200 pt-3">
              <div className="flex items-center space-x-2 text-sm text-red-800">
                <AlertCircle className="w-4 h-4" />
                <span>Maximum retry attempts reached. Manual intervention may be required.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook for using retry mechanism
export const useRetryMechanism = (config?: Partial<RetryConfig>) => {
  const [retryState, setRetryState] = useState({
    show: false,
    error: null as Error | null,
    operation: null as (() => Promise<void>) | null,
  });

  const showRetry = useCallback((operation: () => Promise<void>, error?: Error) => {
    setRetryState({
      show: true,
      error: error || null,
      operation,
    });
  }, []);

  const hideRetry = useCallback(() => {
    setRetryState({
      show: false,
      error: null,
      operation: null,
    });
  }, []);

  const RetryComponent = useCallback(() => {
    if (!retryState.show || !retryState.operation) return null;

    return (
      <RetryMechanism
        operation={retryState.operation}
        config={config}
        error={retryState.error || undefined}
        show={retryState.show}
        onSuccess={hideRetry}
        onFailure={hideRetry}
        onCancel={hideRetry}
      />
    );
  }, [retryState, config, hideRetry]);

  return {
    showRetry,
    hideRetry,
    RetryComponent,
    isRetrying: retryState.show,
  };
};

// Utility function for wrapping operations with retry
export const withRetry = async <T,>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const retryConfig = { ...defaultRetryConfig, ...config };
  let lastError: Error;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === retryConfig.maxAttempts) {
        throw lastError;
      }

      // Calculate delay for next attempt
      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.exponentialBase, attempt - 1),
        retryConfig.maxDelay
      );

      const actualDelay = retryConfig.jitter 
        ? delay * (0.5 + Math.random() * 0.5)
        : delay;

      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  }

  throw lastError!;
};