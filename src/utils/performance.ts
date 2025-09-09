// Performance utilities and optimizations
import { useRef, useEffect, useCallback } from 'react';

// Efficient shallow comparison for React.memo
export function shallowEqual<T extends Record<string, any>>(
  objA: T,
  objB: T
): boolean {
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (objA[key] !== objB[key]) {
      return false;
    }
  }

  return true;
}

// Optimized array comparison for memoization
export function arrayShallowEqual<T>(arrA: T[], arrB: T[]): boolean {
  if (arrA.length !== arrB.length) {
    return false;
  }

  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i] !== arrB[i]) {
      return false;
    }
  }

  return true;
}

// Performance-optimized event handler creator
export function createOptimizedHandler<T extends (...args: any[]) => any>(
  handler: T,
  deps: any[]
): T {
  const handlerRef = useRef(handler);
  const depsRef = useRef(deps);

  // Update handler if dependencies changed
  if (!arrayShallowEqual(deps, depsRef.current)) {
    handlerRef.current = handler;
    depsRef.current = deps;
  }

  return useCallback((...args: Parameters<T>) => {
    return handlerRef.current(...args);
  }, []) as T;
}

// Batch DOM updates for better performance
export function batchDOMUpdates(callback: () => void): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout: 100 });
  } else {
    requestAnimationFrame(callback);
  }
}

// Efficient resize observer hook
export function useResizeObserver(
  elementRef: React.RefObject<Element>,
  callback: (entry: ResizeObserverEntry) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        callbackRef.current(entry);
      }
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef]);
}

// Optimized scroll position tracker
export function useScrollPosition(
  elementRef: React.RefObject<Element>,
  callback: (scrollTop: number, scrollLeft: number) => void,
  throttleMs: number = 16
) {
  const callbackRef = useRef(callback);
  const lastCallTime = useRef(0);
  
  callbackRef.current = callback;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastCallTime.current >= throttleMs) {
        callbackRef.current(element.scrollTop, element.scrollLeft);
        lastCallTime.current = now;
      }
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [elementRef, throttleMs]);
}

// Memory-efficient cache implementation
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Performance measurement utilities
export class PerformanceTracker {
  private measurements = new Map<string, number[]>();

  start(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }
      
      const measurements = this.measurements.get(label)!;
      measurements.push(duration);
      
      // Keep only last 100 measurements
      if (measurements.length > 100) {
        measurements.shift();
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      }
    };
  }

  getStats(label: string) {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) return null;

    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }

  clear(label?: string): void {
    if (label) {
      this.measurements.delete(label);
    } else {
      this.measurements.clear();
    }
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();