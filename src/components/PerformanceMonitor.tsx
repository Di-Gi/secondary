// Development-only performance monitoring component
import { useState, useEffect, memo } from 'react';
import { performanceTracker } from '../utils/performance';

interface PerformanceStats {
  component: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export const PerformanceMonitor = memo(() => {
  const [stats, setStats] = useState<PerformanceStats[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const interval = setInterval(() => {
      // Collect stats from performance tracker
      const allStats: PerformanceStats[] = [];
      
      // This would need to be implemented based on how we track components
      // For now, just show memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        allStats.push({
          component: 'Memory Usage',
          avg: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          min: 0,
          max: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
          count: 1,
        });
      }

      setStats(allStats);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-mono hover:bg-blue-700 transition-colors"
      >
        {isVisible ? 'Hide' : 'Show'} Perf
      </button>
      
      {isVisible && (
        <div className="mt-2 bg-black/90 text-white p-3 rounded-md text-xs font-mono min-w-[200px] max-h-[300px] overflow-y-auto">
          <div className="font-bold mb-2">Performance Stats</div>
          {stats.length === 0 ? (
            <div className="text-gray-400">No data available</div>
          ) : (
            stats.map((stat, index) => (
              <div key={index} className="mb-2 border-b border-gray-700 pb-1">
                <div className="text-blue-300">{stat.component}</div>
                <div className="text-xs text-gray-300">
                  Avg: {stat.avg.toFixed(1)}ms | 
                  Min: {stat.min.toFixed(1)}ms | 
                  Max: {stat.max.toFixed(1)}ms | 
                  Count: {stat.count}
                </div>
              </div>
            ))
          )}
          
          <div className="mt-2 pt-2 border-t border-gray-700">
            <button
              onClick={() => performanceTracker.clear()}
              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors"
            >
              Clear Stats
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';