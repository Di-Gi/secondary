// [[SECONDARY_MIND]]/src/hooks/useOfflineMode.ts
// Purpose: Hook for detecting offline mode and providing fallback behavior.
// Architecture: React hook with network status detection and offline capabilities.
// Dependencies: React, browser APIs.

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/ToastNotification';

export interface OfflineCapabilities {
  /** Can perform basic file operations */
  fileOperations: boolean;
  /** Can access cached analysis results */
  cachedAnalysis: boolean;
  /** Can perform local search */
  localSearch: boolean;
  /** Can use AI features (cached responses only) */
  aiFeatures: boolean;
  /** Can sync when back online */
  syncCapable: boolean;
}

export interface OfflineState {
  /** Current online status */
  isOnline: boolean;
  /** Was previously online (for detecting transitions) */
  wasOnline: boolean;
  /** Time when went offline */
  offlineSince?: Date;
  /** Time when came back online */
  onlineSince?: Date;
  /** Available offline capabilities */
  capabilities: OfflineCapabilities;
  /** Pending operations to sync when online */
  pendingOperations: PendingOperation[];
}

export interface PendingOperation {
  id: string;
  type: 'ai_query' | 'file_save' | 'config_update' | 'error_report';
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface OfflineOptions {
  /** Show toast notifications for status changes */
  showNotifications?: boolean;
  /** Enable automatic sync when back online */
  autoSync?: boolean;
  /** Maximum pending operations to store */
  maxPendingOperations?: number;
  /** Ping interval for connectivity check (ms) */
  pingInterval?: number;
  /** Ping URL for connectivity check */
  pingUrl?: string;
}

const defaultCapabilities: OfflineCapabilities = {
  fileOperations: true,
  cachedAnalysis: true,
  localSearch: true,
  aiFeatures: false,
  syncCapable: true,
};

export const useOfflineMode = (options: OfflineOptions = {}) => {
  const {
    showNotifications = true,
    autoSync = true,
    maxPendingOperations = 100,
    pingInterval = 30000,
    pingUrl = '/api/ping',
  } = options;

  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    wasOnline: navigator.onLine,
    capabilities: defaultCapabilities,
    pendingOperations: [],
  });

  const toast = useToast();

  // Enhanced connectivity check
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      return false;
    }

    try {
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [pingUrl]);

  // Update online status
  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    setOfflineState(prev => {
      const now = new Date();
      const wasOnline = prev.isOnline;
      
      // Detect transitions
      const wentOffline = wasOnline && !isOnline;
      const cameOnline = !wasOnline && isOnline;

      if (wentOffline && showNotifications) {
        toast.warning('Connection Lost', 'You are now offline. Some features may be limited.', {
          duration: 0, // Persistent until back online
          actions: [
            {
              label: 'View Offline Features',
              action: () => {
                // Would show offline capabilities dialog
                console.log('Show offline features');
              },
            },
          ],
        });
      }

      if (cameOnline && showNotifications) {
        toast.success('Connection Restored', 'You are back online. Syncing pending changes...', {
          duration: 5000,
        });
      }

      return {
        ...prev,
        isOnline,
        wasOnline,
        offlineSince: wentOffline ? now : prev.offlineSince,
        onlineSince: cameOnline ? now : prev.onlineSince,
        capabilities: {
          ...defaultCapabilities,
          aiFeatures: isOnline, // AI features only available online
        },
      };
    });
  }, [showNotifications, toast]);

  // Add pending operation
  const addPendingOperation = useCallback((operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) => {
    setOfflineState(prev => {
      const newOperation: PendingOperation = {
        ...operation,
        id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        retryCount: 0,
      };

      const updatedOperations = [...prev.pendingOperations, newOperation];
      
      // Limit pending operations
      if (updatedOperations.length > maxPendingOperations) {
        updatedOperations.splice(0, updatedOperations.length - maxPendingOperations);
      }

      return {
        ...prev,
        pendingOperations: updatedOperations,
      };
    });
  }, [maxPendingOperations]);

  // Remove pending operation
  const removePendingOperation = useCallback((operationId: string) => {
    setOfflineState(prev => ({
      ...prev,
      pendingOperations: prev.pendingOperations.filter(op => op.id !== operationId),
    }));
  }, []);

  // Sync pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!offlineState.isOnline || offlineState.pendingOperations.length === 0) {
      return;
    }

    const operations = [...offlineState.pendingOperations];
    let syncedCount = 0;
    let failedCount = 0;

    for (const operation of operations) {
      try {
        await syncOperation(operation);
        removePendingOperation(operation.id);
        syncedCount++;
      } catch (error) {
        console.error('Failed to sync operation:', operation.id, error);
        failedCount++;
        
        // Update retry count
        setOfflineState(prev => ({
          ...prev,
          pendingOperations: prev.pendingOperations.map(op =>
            op.id === operation.id ? { ...op, retryCount: op.retryCount + 1 } : op
          ),
        }));
      }
    }

    if (showNotifications && syncedCount > 0) {
      toast.success('Sync Complete', `${syncedCount} operations synced successfully.`);
    }

    if (showNotifications && failedCount > 0) {
      toast.warning('Sync Issues', `${failedCount} operations failed to sync. Will retry later.`);
    }
  }, [offlineState.isOnline, offlineState.pendingOperations, removePendingOperation, showNotifications, toast]);

  // Sync individual operation
  const syncOperation = async (operation: PendingOperation): Promise<void> => {
    switch (operation.type) {
      case 'ai_query':
        // Sync AI query
        await fetch('/api/ai/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data),
        });
        break;
      
      case 'file_save':
        // Sync file save
        await fetch('/api/files/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data),
        });
        break;
      
      case 'config_update':
        // Sync config update
        await fetch('/api/config/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data),
        });
        break;
      
      case 'error_report':
        // Sync error report
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data),
        });
        break;
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  };

  // Check if feature is available offline
  const isFeatureAvailable = useCallback((feature: keyof OfflineCapabilities): boolean => {
    if (offlineState.isOnline) return true;
    return offlineState.capabilities[feature];
  }, [offlineState.isOnline, offlineState.capabilities]);

  // Execute operation with offline handling
  const executeWithOfflineHandling = useCallback(async <T,>(
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>,
    operationType?: PendingOperation['type'],
    operationData?: any
  ): Promise<T> => {
    if (offlineState.isOnline) {
      try {
        return await operation();
      } catch (error) {
        // If operation fails and we have a fallback, use it
        if (fallback) {
          return await fallback();
        }
        throw error;
      }
    } else {
      // We're offline
      if (fallback) {
        return await fallback();
      }
      
      // Queue operation for later sync if specified
      if (operationType && operationData) {
        addPendingOperation({
          type: operationType,
          data: operationData,
        });
        
        if (showNotifications) {
          toast.info('Operation Queued', 'Operation will be synced when connection is restored.');
        }
      }
      
      throw new Error('Operation not available offline');
    }
  }, [offlineState.isOnline, addPendingOperation, showNotifications, toast]);

  // Setup event listeners and periodic checks
  useEffect(() => {
    const handleOnline = () => updateOnlineStatus(true);
    const handleOffline = () => updateOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check
    const intervalId = setInterval(async () => {
      const isConnected = await checkConnectivity();
      if (isConnected !== offlineState.isOnline) {
        updateOnlineStatus(isConnected);
      }
    }, pingInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [updateOnlineStatus, checkConnectivity, pingInterval, offlineState.isOnline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (offlineState.isOnline && !offlineState.wasOnline && autoSync) {
      syncPendingOperations();
    }
  }, [offlineState.isOnline, offlineState.wasOnline, autoSync, syncPendingOperations]);

  return {
    ...offlineState,
    isFeatureAvailable,
    executeWithOfflineHandling,
    addPendingOperation,
    removePendingOperation,
    syncPendingOperations,
    checkConnectivity,
  };
};

// Utility functions for common offline scenarios

export const useOfflineAI = () => {
  const offline = useOfflineMode();
  
  const queryAI = useCallback(async (query: string, context?: any) => {
    return offline.executeWithOfflineHandling(
      // Online operation
      async () => {
        const response = await fetch('/api/ai/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, context }),
        });
        return response.json();
      },
      // Offline fallback
      async () => {
        // Try to find cached response
        const cached = localStorage.getItem(`ai_cache_${btoa(query)}`);
        if (cached) {
          return JSON.parse(cached);
        }
        throw new Error('AI features not available offline');
      },
      // Queue for sync
      'ai_query',
      { query, context }
    );
  }, [offline]);

  return {
    queryAI,
    isAvailable: offline.isFeatureAvailable('aiFeatures'),
    isOnline: offline.isOnline,
  };
};

export const useOfflineFileOperations = () => {
  const offline = useOfflineMode();
  
  const saveFile = useCallback(async (path: string, content: string) => {
    return offline.executeWithOfflineHandling(
      // Online operation
      async () => {
        const response = await fetch('/api/files/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, content }),
        });
        return response.json();
      },
      // Offline fallback
      async () => {
        // Save to local storage temporarily
        localStorage.setItem(`offline_file_${path}`, content);
        return { success: true, offline: true };
      },
      // Queue for sync
      'file_save',
      { path, content }
    );
  }, [offline]);

  return {
    saveFile,
    isAvailable: offline.isFeatureAvailable('fileOperations'),
    pendingFiles: offline.pendingOperations.filter(op => op.type === 'file_save'),
  };
};