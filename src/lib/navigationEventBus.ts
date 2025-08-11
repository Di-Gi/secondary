// Enhanced Navigation Interface - Event System
// Purpose: Custom event bus for navigation actions and updates
// Architecture: Centralized event management for navigation components communication

import { 
  NavigationEvent, 
  NavigationEventType, 
  EventSubscription, 
  EventCallback,
  NavigationLocation,
  Symbol,
  NavigationSession
} from '../types/navigation';

export class NavigationEventBus {
  private subscriptions: Map<NavigationEventType, EventSubscription[]> = new Map();
  private eventHistory: NavigationEvent[] = [];
  private maxHistorySize: number = 100;
  private isEnabled: boolean = true;

  constructor() {
    this.initializeEventTypes();
  }

  private initializeEventTypes(): void {
    const eventTypes: NavigationEventType[] = [
      'location-changed',
      'symbol-selected',
      'file-opened',
      'bookmark-created',
      'bookmark-deleted',
      'session-saved',
      'session-loaded',
      'search-performed',
      'relationship-expanded',
      'minimap-clicked',
      'breadcrumb-clicked',
      'action-executed',
      'error-occurred',
      'performance-warning'
    ];

    eventTypes.forEach(type => {
      this.subscriptions.set(type, []);
    });
  }

  /**
   * Subscribe to navigation events
   */
  subscribe(
    eventType: NavigationEventType,
    callback: EventCallback,
    options: { once?: boolean; priority?: number } = {}
  ): string {
    const subscription: EventSubscription = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      callback,
      once: options.once || false,
      priority: options.priority || 0
    };

    const subscriptions = this.subscriptions.get(eventType) || [];
    subscriptions.push(subscription);
    
    // Sort by priority (higher priority first)
    subscriptions.sort((a, b) => b.priority - a.priority);
    
    this.subscriptions.set(eventType, subscriptions);

    return subscription.id;
  }

  /**
   * Unsubscribe from navigation events
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        this.subscriptions.set(eventType, subscriptions);
        return true;
      }
    }
    return false;
  }

  /**
   * Unsubscribe all callbacks for a specific event type
   */
  unsubscribeAll(eventType: NavigationEventType): void {
    this.subscriptions.set(eventType, []);
  }

  /**
   * Emit a navigation event
   */
  async emit(
    eventType: NavigationEventType,
    payload: any,
    source: string,
    target?: string,
    metadata?: any
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const event: NavigationEvent = {
      type: eventType,
      payload,
      timestamp: new Date(),
      source,
      target,
      metadata
    };

    // Add to event history
    this.addToHistory(event);

    // Get subscriptions for this event type
    const subscriptions = this.subscriptions.get(eventType) || [];
    
    // Execute callbacks
    const callbackPromises = subscriptions.map(async (subscription) => {
      try {
        await subscription.callback(event);
        
        // Remove one-time subscriptions
        if (subscription.once) {
          this.unsubscribe(subscription.id);
        }
      } catch (error) {
        console.error(`Error in navigation event callback for ${eventType}:`, error);
        
        // Emit error event if this isn't already an error event
        if (eventType !== 'error-occurred') {
          this.emit('error-occurred', {
            originalEvent: event,
            error: error instanceof Error ? error.message : String(error),
            callbackId: subscription.id
          }, 'NavigationEventBus');
        }
      }
    });

    // Wait for all callbacks to complete
    await Promise.all(callbackPromises);
  }

  /**
   * Add event to history
   */
  private addToHistory(event: NavigationEvent): void {
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   */
  getEventHistory(eventType?: NavigationEventType, limit?: number): NavigationEvent[] {
    let history = eventType 
      ? this.eventHistory.filter(event => event.type === eventType)
      : this.eventHistory;

    if (limit) {
      history = history.slice(-limit);
    }

    return [...history]; // Return copy to prevent mutation
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get subscription count for an event type
   */
  getSubscriptionCount(eventType: NavigationEventType): number {
    return this.subscriptions.get(eventType)?.length || 0;
  }

  /**
   * Get all active subscriptions
   */
  getAllSubscriptions(): Map<NavigationEventType, EventSubscription[]> {
    return new Map(this.subscriptions);
  }

  /**
   * Enable or disable the event bus
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if event bus is enabled
   */
  isEventBusEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Dispose of the event bus and clean up resources
   */
  dispose(): void {
    this.subscriptions.clear();
    this.eventHistory = [];
    this.isEnabled = false;
  }
}

// Convenience methods for common navigation events
export class NavigationEventHelpers {
  constructor(private eventBus: NavigationEventBus) {}

  /**
   * Emit location changed event
   */
  async emitLocationChanged(
    location: NavigationLocation,
    source: string,
    previousLocation?: NavigationLocation
  ): Promise<void> {
    await this.eventBus.emit('location-changed', {
      location,
      previousLocation
    }, source);
  }

  /**
   * Emit symbol selected event
   */
  async emitSymbolSelected(
    symbol: Symbol,
    source: string,
    context?: any
  ): Promise<void> {
    await this.eventBus.emit('symbol-selected', {
      symbol,
      context
    }, source);
  }

  /**
   * Emit file opened event
   */
  async emitFileOpened(
    filePath: string,
    source: string,
    metadata?: any
  ): Promise<void> {
    await this.eventBus.emit('file-opened', {
      filePath,
      metadata
    }, source);
  }

  /**
   * Emit bookmark created event
   */
  async emitBookmarkCreated(
    location: NavigationLocation,
    source: string,
    bookmarkId?: string
  ): Promise<void> {
    await this.eventBus.emit('bookmark-created', {
      location,
      bookmarkId
    }, source);
  }

  /**
   * Emit bookmark deleted event
   */
  async emitBookmarkDeleted(
    bookmarkId: string,
    source: string,
    location?: NavigationLocation
  ): Promise<void> {
    await this.eventBus.emit('bookmark-deleted', {
      bookmarkId,
      location
    }, source);
  }

  /**
   * Emit session saved event
   */
  async emitSessionSaved(
    session: NavigationSession,
    source: string
  ): Promise<void> {
    await this.eventBus.emit('session-saved', {
      session
    }, source);
  }

  /**
   * Emit session loaded event
   */
  async emitSessionLoaded(
    session: NavigationSession,
    source: string
  ): Promise<void> {
    await this.eventBus.emit('session-loaded', {
      session
    }, source);
  }

  /**
   * Emit search performed event
   */
  async emitSearchPerformed(
    query: string,
    results: any[],
    source: string,
    searchTime?: number
  ): Promise<void> {
    await this.eventBus.emit('search-performed', {
      query,
      results,
      searchTime
    }, source);
  }

  /**
   * Emit relationship expanded event
   */
  async emitRelationshipExpanded(
    symbol: Symbol,
    relationships: any[],
    source: string
  ): Promise<void> {
    await this.eventBus.emit('relationship-expanded', {
      symbol,
      relationships
    }, source);
  }

  /**
   * Emit minimap clicked event
   */
  async emitMinimapClicked(
    location: NavigationLocation,
    source: string,
    clickPosition?: { x: number; y: number }
  ): Promise<void> {
    await this.eventBus.emit('minimap-clicked', {
      location,
      clickPosition
    }, source);
  }

  /**
   * Emit breadcrumb clicked event
   */
  async emitBreadcrumbClicked(
    breadcrumbId: string,
    location: NavigationLocation,
    source: string
  ): Promise<void> {
    await this.eventBus.emit('breadcrumb-clicked', {
      breadcrumbId,
      location
    }, source);
  }

  /**
   * Emit action executed event
   */
  async emitActionExecuted(
    actionId: string,
    result: any,
    source: string,
    executionTime?: number
  ): Promise<void> {
    await this.eventBus.emit('action-executed', {
      actionId,
      result,
      executionTime
    }, source);
  }

  /**
   * Emit performance warning event
   */
  async emitPerformanceWarning(
    metric: string,
    value: number,
    threshold: number,
    source: string
  ): Promise<void> {
    await this.eventBus.emit('performance-warning', {
      metric,
      value,
      threshold
    }, source);
  }
}

// Global event bus instance
export const navigationEventBus = new NavigationEventBus();
export const navigationEventHelpers = new NavigationEventHelpers(navigationEventBus);

// Hook for React components to use the event bus
export const useNavigationEvents = () => {
  return {
    eventBus: navigationEventBus,
    helpers: navigationEventHelpers,
    subscribe: navigationEventBus.subscribe.bind(navigationEventBus),
    unsubscribe: navigationEventBus.unsubscribe.bind(navigationEventBus),
    emit: navigationEventBus.emit.bind(navigationEventBus)
  };
};

// Event subscription management utilities
export class EventSubscriptionManager {
  private subscriptions: string[] = [];

  constructor(private eventBus: NavigationEventBus) {}

  /**
   * Subscribe to an event and track the subscription
   */
  subscribe(
    eventType: NavigationEventType,
    callback: EventCallback,
    options?: { once?: boolean; priority?: number }
  ): string {
    const subscriptionId = this.eventBus.subscribe(eventType, callback, options);
    this.subscriptions.push(subscriptionId);
    return subscriptionId;
  }

  /**
   * Unsubscribe from a specific event
   */
  unsubscribe(subscriptionId: string): boolean {
    const success = this.eventBus.unsubscribe(subscriptionId);
    if (success) {
      this.subscriptions = this.subscriptions.filter(id => id !== subscriptionId);
    }
    return success;
  }

  /**
   * Unsubscribe from all tracked subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach(id => {
      this.eventBus.unsubscribe(id);
    });
    this.subscriptions = [];
  }

  /**
   * Get count of active subscriptions
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.length;
  }

  /**
   * Dispose and clean up all subscriptions
   */
  dispose(): void {
    this.unsubscribeAll();
  }
}