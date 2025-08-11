import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  NavigationEventBus, 
  NavigationEventHelpers,
  EventSubscriptionManager,
  navigationEventBus,
  navigationEventHelpers
} from '../navigationEventBus';
import { 
  NavigationEvent, 
  NavigationEventType,
  NavigationLocation,
  NavigationContext,
  Symbol,
  NavigationSession,
  createNavigationLocation,
  createNavigationSession
} from '../../types/navigation';

describe('NavigationEventBus', () => {
  let eventBus: NavigationEventBus;

  beforeEach(() => {
    eventBus = new NavigationEventBus();
  });

  afterEach(() => {
    eventBus.dispose();
  });

  describe('Basic Event Operations', () => {
    it('should subscribe to events', () => {
      const callback = vi.fn();
      const subscriptionId = eventBus.subscribe('location-changed', callback);

      expect(subscriptionId).toBeDefined();
      expect(typeof subscriptionId).toBe('string');
      expect(eventBus.getSubscriptionCount('location-changed')).toBe(1);
    });

    it('should unsubscribe from events', () => {
      const callback = vi.fn();
      const subscriptionId = eventBus.subscribe('location-changed', callback);

      const success = eventBus.unsubscribe(subscriptionId);

      expect(success).toBe(true);
      expect(eventBus.getSubscriptionCount('location-changed')).toBe(0);
    });

    it('should emit events to subscribers', async () => {
      const callback = vi.fn();
      eventBus.subscribe('location-changed', callback);

      await eventBus.emit('location-changed', { test: 'data' }, 'test-source');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'location-changed',
          payload: { test: 'data' },
          source: 'test-source',
          timestamp: expect.any(Date)
        })
      );
    });

    it('should handle multiple subscribers', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      eventBus.subscribe('symbol-selected', callback1);
      eventBus.subscribe('symbol-selected', callback2);

      await eventBus.emit('symbol-selected', { symbol: 'test' }, 'test-source');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should respect priority ordering', async () => {
      const callOrder: number[] = [];
      
      const callback1 = vi.fn(() => callOrder.push(1));
      const callback2 = vi.fn(() => callOrder.push(2));
      const callback3 = vi.fn(() => callOrder.push(3));
      
      eventBus.subscribe('file-opened', callback1, { priority: 1 });
      eventBus.subscribe('file-opened', callback3, { priority: 3 });
      eventBus.subscribe('file-opened', callback2, { priority: 2 });

      await eventBus.emit('file-opened', {}, 'test-source');

      expect(callOrder).toEqual([3, 2, 1]);
    });

    it('should handle one-time subscriptions', async () => {
      const callback = vi.fn();
      eventBus.subscribe('bookmark-created', callback, { once: true });

      await eventBus.emit('bookmark-created', {}, 'test-source');
      await eventBus.emit('bookmark-created', {}, 'test-source');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(eventBus.getSubscriptionCount('bookmark-created')).toBe(0);
    });
  });

  describe('Event History', () => {
    it('should maintain event history', async () => {
      await eventBus.emit('location-changed', { test: 1 }, 'source1');
      await eventBus.emit('symbol-selected', { test: 2 }, 'source2');

      const history = eventBus.getEventHistory();

      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('location-changed');
      expect(history[1].type).toBe('symbol-selected');
    });

    it('should filter event history by type', async () => {
      await eventBus.emit('location-changed', {}, 'source1');
      await eventBus.emit('symbol-selected', {}, 'source2');
      await eventBus.emit('location-changed', {}, 'source3');

      const locationHistory = eventBus.getEventHistory('location-changed');

      expect(locationHistory).toHaveLength(2);
      expect(locationHistory.every(event => event.type === 'location-changed')).toBe(true);
    });

    it('should limit event history size', async () => {
      // Set a small history size for testing
      eventBus['maxHistorySize'] = 3;

      for (let i = 0; i < 5; i++) {
        await eventBus.emit('location-changed', { index: i }, 'test-source');
      }

      const history = eventBus.getEventHistory();

      expect(history).toHaveLength(3);
      expect(history[0].payload.index).toBe(2);
      expect(history[2].payload.index).toBe(4);
    });

    it('should clear event history', async () => {
      await eventBus.emit('location-changed', {}, 'test-source');
      
      eventBus.clearHistory();
      
      expect(eventBus.getEventHistory()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();
      
      eventBus.subscribe('location-changed', errorCallback);
      eventBus.subscribe('location-changed', normalCallback);

      await eventBus.emit('location-changed', {}, 'test-source');

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(normalCallback).toHaveBeenCalledTimes(1);
    });

    it('should emit error events for callback failures', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const errorEventCallback = vi.fn();
      
      eventBus.subscribe('location-changed', errorCallback);
      eventBus.subscribe('error-occurred', errorEventCallback);

      await eventBus.emit('location-changed', {}, 'test-source');

      expect(errorEventCallback).toHaveBeenCalledTimes(1);
      expect(errorEventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error-occurred',
          payload: expect.objectContaining({
            error: 'Test error'
          })
        })
      );
    });
  });

  describe('Event Bus State Management', () => {
    it('should enable and disable event bus', async () => {
      const callback = vi.fn();
      eventBus.subscribe('location-changed', callback);

      eventBus.setEnabled(false);
      await eventBus.emit('location-changed', {}, 'test-source');

      expect(callback).not.toHaveBeenCalled();

      eventBus.setEnabled(true);
      await eventBus.emit('location-changed', {}, 'test-source');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe all events for a type', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      eventBus.subscribe('symbol-selected', callback1);
      eventBus.subscribe('symbol-selected', callback2);

      expect(eventBus.getSubscriptionCount('symbol-selected')).toBe(2);

      eventBus.unsubscribeAll('symbol-selected');

      expect(eventBus.getSubscriptionCount('symbol-selected')).toBe(0);
    });

    it('should get all subscriptions', () => {
      const callback = vi.fn();
      eventBus.subscribe('location-changed', callback);
      eventBus.subscribe('symbol-selected', callback);

      const allSubscriptions = eventBus.getAllSubscriptions();

      expect(allSubscriptions.size).toBeGreaterThan(0);
      expect(allSubscriptions.get('location-changed')).toHaveLength(1);
      expect(allSubscriptions.get('symbol-selected')).toHaveLength(1);
    });
  });
});

describe('NavigationEventHelpers', () => {
  let eventBus: NavigationEventBus;
  let helpers: NavigationEventHelpers;

  beforeEach(() => {
    eventBus = new NavigationEventBus();
    helpers = new NavigationEventHelpers(eventBus);
  });

  afterEach(() => {
    eventBus.dispose();
  });

  it('should emit location changed event', async () => {
    const callback = vi.fn();
    eventBus.subscribe('location-changed', callback);

    const context: NavigationContext = {
      projectPath: '/test/project',
      breadcrumbs: [],
      relatedSymbols: []
    };
    const location = createNavigationLocation('/test/file.ts', { line: 10, column: 5 }, context);

    await helpers.emitLocationChanged(location, 'test-component');

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'location-changed',
        payload: expect.objectContaining({
          location
        }),
        source: 'test-component'
      })
    );
  });

  it('should emit symbol selected event', async () => {
    const callback = vi.fn();
    eventBus.subscribe('symbol-selected', callback);

    const symbol: Symbol = {
      identifier: 'testFunction',
      kind: 'Function',
      location: { path: '/test/file.ts', line: 10, column: 5 }
    };

    await helpers.emitSymbolSelected(symbol, 'test-component', { extra: 'data' });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'symbol-selected',
        payload: expect.objectContaining({
          symbol,
          context: { extra: 'data' }
        }),
        source: 'test-component'
      })
    );
  });

  it('should emit session saved event', async () => {
    const callback = vi.fn();
    eventBus.subscribe('session-saved', callback);

    const session = createNavigationSession('Test Session', '/test/project');

    await helpers.emitSessionSaved(session, 'session-manager');

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'session-saved',
        payload: expect.objectContaining({
          session
        }),
        source: 'session-manager'
      })
    );
  });

  it('should emit search performed event', async () => {
    const callback = vi.fn();
    eventBus.subscribe('search-performed', callback);

    const results = [{ id: 1, name: 'result1' }];

    await helpers.emitSearchPerformed('test query', results, 'search-component', 150);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'search-performed',
        payload: expect.objectContaining({
          query: 'test query',
          results,
          searchTime: 150
        }),
        source: 'search-component'
      })
    );
  });

  it('should emit performance warning event', async () => {
    const callback = vi.fn();
    eventBus.subscribe('performance-warning', callback);

    await helpers.emitPerformanceWarning('memory', 512, 256, 'performance-monitor');

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'performance-warning',
        payload: expect.objectContaining({
          metric: 'memory',
          value: 512,
          threshold: 256
        }),
        source: 'performance-monitor'
      })
    );
  });
});

describe('EventSubscriptionManager', () => {
  let eventBus: NavigationEventBus;
  let manager: EventSubscriptionManager;

  beforeEach(() => {
    eventBus = new NavigationEventBus();
    manager = new EventSubscriptionManager(eventBus);
  });

  afterEach(() => {
    manager.dispose();
    eventBus.dispose();
  });

  it('should track subscriptions', () => {
    const callback = vi.fn();
    
    manager.subscribe('location-changed', callback);
    manager.subscribe('symbol-selected', callback);

    expect(manager.getActiveSubscriptionCount()).toBe(2);
  });

  it('should unsubscribe individual subscriptions', () => {
    const callback = vi.fn();
    
    const sub1 = manager.subscribe('location-changed', callback);
    const sub2 = manager.subscribe('symbol-selected', callback);

    expect(manager.getActiveSubscriptionCount()).toBe(2);

    manager.unsubscribe(sub1);

    expect(manager.getActiveSubscriptionCount()).toBe(1);
    expect(eventBus.getSubscriptionCount('location-changed')).toBe(0);
    expect(eventBus.getSubscriptionCount('symbol-selected')).toBe(1);
  });

  it('should unsubscribe all tracked subscriptions', () => {
    const callback = vi.fn();
    
    manager.subscribe('location-changed', callback);
    manager.subscribe('symbol-selected', callback);
    manager.subscribe('file-opened', callback);

    expect(manager.getActiveSubscriptionCount()).toBe(3);

    manager.unsubscribeAll();

    expect(manager.getActiveSubscriptionCount()).toBe(0);
    expect(eventBus.getSubscriptionCount('location-changed')).toBe(0);
    expect(eventBus.getSubscriptionCount('symbol-selected')).toBe(0);
    expect(eventBus.getSubscriptionCount('file-opened')).toBe(0);
  });

  it('should dispose properly', () => {
    const callback = vi.fn();
    
    manager.subscribe('location-changed', callback);
    manager.subscribe('symbol-selected', callback);

    manager.dispose();

    expect(manager.getActiveSubscriptionCount()).toBe(0);
    expect(eventBus.getSubscriptionCount('location-changed')).toBe(0);
    expect(eventBus.getSubscriptionCount('symbol-selected')).toBe(0);
  });
});

describe('Global Event Bus Instance', () => {
  it('should provide global event bus instance', () => {
    expect(navigationEventBus).toBeInstanceOf(NavigationEventBus);
    expect(navigationEventHelpers).toBeInstanceOf(NavigationEventHelpers);
  });

  it('should maintain state across imports', async () => {
    const callback = vi.fn();
    navigationEventBus.subscribe('location-changed', callback);

    await navigationEventHelpers.emitLocationChanged(
      createNavigationLocation('/test/file.ts', { line: 1, column: 1 }, {
        projectPath: '/test',
        breadcrumbs: [],
        relatedSymbols: []
      }),
      'test'
    );

    expect(callback).toHaveBeenCalledTimes(1);
  });
});