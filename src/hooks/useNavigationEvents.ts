// Enhanced Navigation Interface - React Hook for Event System
// Purpose: React hook for easy navigation event subscription and management
// Architecture: Provides a clean interface for React components to interact with the navigation event system

import { useEffect, useRef, useCallback } from 'react';
import { 
  NavigationEventType, 
  EventCallback, 
  NavigationEvent 
} from '../types/navigation';
import { 
  navigationEventBus, 
  navigationEventHelpers,
  EventSubscriptionManager 
} from '../lib/navigationEventBus';

export interface UseNavigationEventsOptions {
  /**
   * Whether to automatically clean up subscriptions on unmount
   * @default true
   */
  autoCleanup?: boolean;
  
  /**
   * Whether to enable the hook (useful for conditional subscriptions)
   * @default true
   */
  enabled?: boolean;
}

export interface NavigationEventSubscription {
  id: string;
  eventType: NavigationEventType;
  unsubscribe: () => void;
}

/**
 * React hook for subscribing to navigation events
 */
export const useNavigationEvents = (options: UseNavigationEventsOptions = {}) => {
  const { autoCleanup = true, enabled = true } = options;
  const subscriptionManagerRef = useRef<EventSubscriptionManager | null>(null);

  // Initialize subscription manager
  useEffect(() => {
    if (enabled && !subscriptionManagerRef.current) {
      subscriptionManagerRef.current = new EventSubscriptionManager(navigationEventBus);
    }

    return () => {
      if (autoCleanup && subscriptionManagerRef.current) {
        subscriptionManagerRef.current.dispose();
        subscriptionManagerRef.current = null;
      }
    };
  }, [enabled, autoCleanup]);

  /**
   * Subscribe to a navigation event
   */
  const subscribe = useCallback((
    eventType: NavigationEventType,
    callback: EventCallback,
    options?: { once?: boolean; priority?: number }
  ): NavigationEventSubscription | null => {
    if (!enabled || !subscriptionManagerRef.current) {
      return null;
    }

    const subscriptionId = subscriptionManagerRef.current.subscribe(eventType, callback, options);
    
    return {
      id: subscriptionId,
      eventType,
      unsubscribe: () => {
        if (subscriptionManagerRef.current) {
          subscriptionManagerRef.current.unsubscribe(subscriptionId);
        }
      }
    };
  }, [enabled]);

  /**
   * Unsubscribe from a specific event
   */
  const unsubscribe = useCallback((subscriptionId: string): boolean => {
    if (!subscriptionManagerRef.current) {
      return false;
    }
    return subscriptionManagerRef.current.unsubscribe(subscriptionId);
  }, []);

  /**
   * Unsubscribe from all events
   */
  const unsubscribeAll = useCallback((): void => {
    if (subscriptionManagerRef.current) {
      subscriptionManagerRef.current.unsubscribeAll();
    }
  }, []);

  /**
   * Emit a navigation event
   */
  const emit = useCallback(async (
    eventType: NavigationEventType,
    payload: any,
    source: string,
    target?: string,
    metadata?: any
  ): Promise<void> => {
    if (!enabled) {
      return;
    }
    await navigationEventBus.emit(eventType, payload, source, target, metadata);
  }, [enabled]);

  /**
   * Get event history
   */
  const getEventHistory = useCallback((
    eventType?: NavigationEventType,
    limit?: number
  ): NavigationEvent[] => {
    return navigationEventBus.getEventHistory(eventType, limit);
  }, []);

  /**
   * Get active subscription count
   */
  const getActiveSubscriptionCount = useCallback((): number => {
    return subscriptionManagerRef.current?.getActiveSubscriptionCount() || 0;
  }, []);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    emit,
    getEventHistory,
    getActiveSubscriptionCount,
    helpers: navigationEventHelpers,
    eventBus: navigationEventBus
  };
};

/**
 * Hook for subscribing to a specific navigation event type
 */
export const useNavigationEvent = (
  eventType: NavigationEventType,
  callback: EventCallback,
  options: UseNavigationEventsOptions & { 
    once?: boolean; 
    priority?: number;
    deps?: React.DependencyList;
  } = {}
) => {
  const { once, priority, deps = [], ...hookOptions } = options;
  const { subscribe } = useNavigationEvents(hookOptions);
  const subscriptionRef = useRef<NavigationEventSubscription | null>(null);

  useEffect(() => {
    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create new subscription
    subscriptionRef.current = subscribe(eventType, callback, { once, priority });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [eventType, subscribe, once, priority, ...deps]);
};

/**
 * Hook for subscribing to multiple navigation events
 */
export const useNavigationEventMultiple = (
  subscriptions: Array<{
    eventType: NavigationEventType;
    callback: EventCallback;
    once?: boolean;
    priority?: number;
  }>,
  options: UseNavigationEventsOptions = {}
) => {
  const { subscribe } = useNavigationEvents(options);
  const subscriptionsRef = useRef<NavigationEventSubscription[]>([]);

  useEffect(() => {
    // Clean up previous subscriptions
    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];

    // Create new subscriptions
    subscriptions.forEach(({ eventType, callback, once, priority }) => {
      const subscription = subscribe(eventType, callback, { once, priority });
      if (subscription) {
        subscriptionsRef.current.push(subscription);
      }
    });

    return () => {
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [subscribe, subscriptions]);
};

/**
 * Hook for emitting navigation events with helper methods
 */
export const useNavigationEventEmitter = (source: string, options: UseNavigationEventsOptions = {}) => {
  const { emit, helpers } = useNavigationEvents(options);

  const emitLocationChanged = useCallback(async (location: any, previousLocation?: any) => {
    await helpers.emitLocationChanged(location, source, previousLocation);
  }, [helpers, source]);

  const emitSymbolSelected = useCallback(async (symbol: any, context?: any) => {
    await helpers.emitSymbolSelected(symbol, source, context);
  }, [helpers, source]);

  const emitFileOpened = useCallback(async (filePath: string, metadata?: any) => {
    await helpers.emitFileOpened(filePath, source, metadata);
  }, [helpers, source]);

  const emitBookmarkCreated = useCallback(async (location: any, bookmarkId?: string) => {
    await helpers.emitBookmarkCreated(location, source, bookmarkId);
  }, [helpers, source]);

  const emitBookmarkDeleted = useCallback(async (bookmarkId: string, location?: any) => {
    await helpers.emitBookmarkDeleted(bookmarkId, source, location);
  }, [helpers, source]);

  const emitSessionSaved = useCallback(async (session: any) => {
    await helpers.emitSessionSaved(session, source);
  }, [helpers, source]);

  const emitSessionLoaded = useCallback(async (session: any) => {
    await helpers.emitSessionLoaded(session, source);
  }, [helpers, source]);

  const emitSearchPerformed = useCallback(async (query: string, results: any[], searchTime?: number) => {
    await helpers.emitSearchPerformed(query, results, source, searchTime);
  }, [helpers, source]);

  const emitRelationshipExpanded = useCallback(async (symbol: any, relationships: any[]) => {
    await helpers.emitRelationshipExpanded(symbol, relationships, source);
  }, [helpers, source]);

  const emitMinimapClicked = useCallback(async (location: any, clickPosition?: { x: number; y: number }) => {
    await helpers.emitMinimapClicked(location, source, clickPosition);
  }, [helpers, source]);

  const emitBreadcrumbClicked = useCallback(async (breadcrumbId: string, location: any) => {
    await helpers.emitBreadcrumbClicked(breadcrumbId, location, source);
  }, [helpers, source]);

  const emitActionExecuted = useCallback(async (actionId: string, result: any, executionTime?: number) => {
    await helpers.emitActionExecuted(actionId, result, source, executionTime);
  }, [helpers, source]);

  const emitPerformanceWarning = useCallback(async (metric: string, value: number, threshold: number) => {
    await helpers.emitPerformanceWarning(metric, value, threshold, source);
  }, [helpers, source]);

  return {
    emit,
    emitLocationChanged,
    emitSymbolSelected,
    emitFileOpened,
    emitBookmarkCreated,
    emitBookmarkDeleted,
    emitSessionSaved,
    emitSessionLoaded,
    emitSearchPerformed,
    emitRelationshipExpanded,
    emitMinimapClicked,
    emitBreadcrumbClicked,
    emitActionExecuted,
    emitPerformanceWarning
  };
};