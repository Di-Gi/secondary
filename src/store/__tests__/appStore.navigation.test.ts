import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../appStore';
import { 
  NavigationLocation, 
  NavigationSession, 
  NavigationContext,
  createNavigationLocation,
  createNavigationSession
} from '../../types/navigation';

// Mock the API
vi.mock('../../api', () => ({
  api: {
    saveNavigationHistory: vi.fn().mockResolvedValue(undefined),
    loadNavigationHistory: vi.fn().mockResolvedValue(null),
    saveNavigationSession: vi.fn().mockResolvedValue(undefined),
    loadNavigationSession: vi.fn().mockResolvedValue(null),
    loadAllNavigationSessions: vi.fn().mockResolvedValue([]),
    deleteNavigationSession: vi.fn().mockResolvedValue(undefined),
    getNavigationMetrics: vi.fn().mockResolvedValue({
      navigationResponseTime: 45,
      memoryUsage: 128,
      cacheHitRate: 0.85,
      backgroundProcessingTime: 120,
      renderTime: 30,
      searchTime: 15,
      symbolAnalysisTime: 200
    })
  }
}));

describe('AppStore Navigation Functionality', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      currentLocation: null,
      navigationHistory: null,
      navigationSessions: [],
      activeNavigationSession: null,
      navigationContext: null,
      navigationMetrics: null,
      currentProject: {
        symbols: [],
        project_path: '/test/project',
        project_config: {
          id: 'test-project',
          name: 'Test Project',
          path: '/test/project',
          created_at: new Date().toISOString(),
          last_accessed: new Date().toISOString(),
          symbol_count: 0,
          notes_count: 0,
          settings: {
            auto_analyze: true,
            analysis_cache_enabled: true,
            excluded_patterns: [],
            custom_tags: []
          }
        },
        analysis_time: new Date().toISOString(),
        file_count: 0,
        cache_hit_rate: 0
      }
    });
  });

  describe('Navigation Location Management', () => {
    it('should set current location and add to history', () => {
      const store = useAppStore.getState();
      const context: NavigationContext = {
        projectPath: '/test/project',
        breadcrumbs: [],
        relatedSymbols: []
      };

      const location = createNavigationLocation('/test/file.ts', { line: 10, column: 5 }, context);
      
      store.setCurrentLocation(location);
      
      const state = useAppStore.getState();
      expect(state.currentLocation).toEqual(location);
      expect(state.navigationHistory?.entries).toHaveLength(1);
      expect(state.navigationHistory?.entries[0].location).toEqual(location);
      expect(state.navigationHistory?.currentIndex).toBe(0);
    });

    it('should not add duplicate consecutive locations to history', () => {
      const store = useAppStore.getState();
      const context: NavigationContext = {
        projectPath: '/test/project',
        breadcrumbs: [],
        relatedSymbols: []
      };

      const location1 = createNavigationLocation('/test/file.ts', { line: 10, column: 5 }, context);
      const location2 = createNavigationLocation('/test/file.ts', { line: 10, column: 5 }, context);
      
      store.setCurrentLocation(location1);
      store.setCurrentLocation(location2);
      
      const state = useAppStore.getState();
      expect(state.navigationHistory?.entries).toHaveLength(1);
    });

    it('should add different locations to history', () => {
      const store = useAppStore.getState();
      const context: NavigationContext = {
        projectPath: '/test/project',
        breadcrumbs: [],
        relatedSymbols: []
      };

      const location1 = createNavigationLocation('/test/file1.ts', { line: 10, column: 5 }, context);
      const location2 = createNavigationLocation('/test/file2.ts', { line: 20, column: 10 }, context);
      
      store.setCurrentLocation(location1);
      store.setCurrentLocation(location2);
      
      const state = useAppStore.getState();
      expect(state.navigationHistory?.entries).toHaveLength(2);
      expect(state.navigationHistory?.currentIndex).toBe(1);
    });

    it('should clear navigation history', () => {
      const store = useAppStore.getState();
      const context: NavigationContext = {
        projectPath: '/test/project',
        breadcrumbs: [],
        relatedSymbols: []
      };

      const location = createNavigationLocation('/test/file.ts', { line: 10, column: 5 }, context);
      store.setCurrentLocation(location);
      
      store.clearNavigationHistory();
      
      const state = useAppStore.getState();
      expect(state.navigationHistory?.entries).toHaveLength(0);
      expect(state.navigationHistory?.currentIndex).toBe(-1);
    });
  });

  describe('Navigation History Navigation', () => {
    beforeEach(() => {
      const store = useAppStore.getState();
      const context: NavigationContext = {
        projectPath: '/test/project',
        breadcrumbs: [],
        relatedSymbols: []
      };

      // Set up history with multiple locations
      const location1 = createNavigationLocation('/test/file1.ts', { line: 10, column: 5 }, context);
      const location2 = createNavigationLocation('/test/file2.ts', { line: 20, column: 10 }, context);
      const location3 = createNavigationLocation('/test/file3.ts', { line: 30, column: 15 }, context);
      
      store.setCurrentLocation(location1);
      store.setCurrentLocation(location2);
      store.setCurrentLocation(location3);
    });

    it('should navigate back in history', () => {
      const store = useAppStore.getState();
      
      const backLocation = store.navigateBack();
      
      const state = useAppStore.getState();
      expect(backLocation).toBeTruthy();
      expect(backLocation?.filePath).toBe('/test/file2.ts');
      expect(state.navigationHistory?.currentIndex).toBe(1);
      expect(state.currentLocation).toEqual(backLocation);
    });

    it('should navigate forward in history', () => {
      const store = useAppStore.getState();
      
      // Go back first
      store.navigateBack();
      store.navigateBack();
      
      // Then go forward
      const forwardLocation = store.navigateForward();
      
      const state = useAppStore.getState();
      expect(forwardLocation).toBeTruthy();
      expect(forwardLocation?.filePath).toBe('/test/file2.ts');
      expect(state.navigationHistory?.currentIndex).toBe(1);
      expect(state.currentLocation).toEqual(forwardLocation);
    });

    it('should return null when navigating back at beginning', () => {
      const store = useAppStore.getState();
      
      // Go to beginning
      store.navigateBack();
      store.navigateBack();
      
      // Try to go back further
      const backLocation = store.navigateBack();
      
      expect(backLocation).toBeNull();
    });

    it('should return null when navigating forward at end', () => {
      const store = useAppStore.getState();
      
      const forwardLocation = store.navigateForward();
      
      expect(forwardLocation).toBeNull();
    });
  });

  describe('Navigation Session Management', () => {
    it('should create a navigation session', () => {
      const store = useAppStore.getState();
      
      const session = store.createNavigationSession('Test Session', 'Test description');
      
      const state = useAppStore.getState();
      expect(session.name).toBe('Test Session');
      expect(session.description).toBe('Test description');
      expect(session.id).toBeDefined();
      expect(state.navigationSessions).toContain(session);
    });

    it('should set active navigation session', () => {
      const store = useAppStore.getState();
      
      const session = createNavigationSession('Test Session', '/test/project');
      store.setActiveNavigationSession(session);
      
      const state = useAppStore.getState();
      expect(state.activeNavigationSession).toEqual(session);
    });

    it('should delete navigation session', async () => {
      const store = useAppStore.getState();
      
      const session = store.createNavigationSession('Test Session');
      store.setActiveNavigationSession(session);
      
      await store.deleteNavigationSession(session.id);
      
      const state = useAppStore.getState();
      expect(state.navigationSessions).not.toContain(session);
      expect(state.activeNavigationSession).toBeNull();
    });
  });

  describe('Navigation Context Management', () => {
    it('should update navigation context', () => {
      const store = useAppStore.getState();
      
      const contextUpdate = {
        breadcrumbs: [
          {
            id: 'breadcrumb-1',
            name: 'Test',
            path: '/test',
            type: 'directory' as const,
            isActive: true,
            isClickable: true,
            metadata: {
              fullPath: '/test',
              tooltip: 'Test directory'
            },
            actions: []
          }
        ]
      };
      
      store.updateNavigationContext(contextUpdate);
      
      const state = useAppStore.getState();
      expect(state.navigationContext?.breadcrumbs).toEqual(contextUpdate.breadcrumbs);
      expect(state.navigationContext?.projectPath).toBe('/test/project');
    });

    it('should create navigation context if none exists', () => {
      const store = useAppStore.getState();
      
      const contextUpdate = {
        relatedSymbols: [
          {
            identifier: 'testFunction',
            kind: 'Function' as const,
            location: { path: '/test/file.ts', line: 10, column: 5 }
          }
        ]
      };
      
      store.updateNavigationContext(contextUpdate);
      
      const state = useAppStore.getState();
      expect(state.navigationContext?.relatedSymbols).toEqual(contextUpdate.relatedSymbols);
      expect(state.navigationContext?.projectPath).toBe('/test/project');
      expect(state.navigationContext?.breadcrumbs).toEqual([]);
    });
  });

  describe('Navigation Metrics Management', () => {
    it('should update navigation metrics', () => {
      const store = useAppStore.getState();
      
      const metricsUpdate = {
        navigationResponseTime: 50,
        memoryUsage: 256
      };
      
      store.updateNavigationMetrics(metricsUpdate);
      
      const state = useAppStore.getState();
      expect(state.navigationMetrics?.navigationResponseTime).toBe(50);
      expect(state.navigationMetrics?.memoryUsage).toBe(256);
      expect(state.navigationMetrics?.cacheHitRate).toBe(0);
    });

    it('should get navigation metrics from API', async () => {
      const store = useAppStore.getState();
      
      await store.getNavigationMetrics();
      
      const state = useAppStore.getState();
      expect(state.navigationMetrics).toBeTruthy();
      expect(state.navigationMetrics?.navigationResponseTime).toBe(45);
      expect(state.navigationMetrics?.cacheHitRate).toBe(0.85);
    });
  });

  describe('History Size Management', () => {
    it('should limit history entries to maxEntries', () => {
      const store = useAppStore.getState();
      const context: NavigationContext = {
        projectPath: '/test/project',
        breadcrumbs: [],
        relatedSymbols: []
      };

      // Set a small max entries for testing
      useAppStore.setState({
        navigationHistory: {
          entries: [],
          currentIndex: -1,
          sessions: [],
          maxEntries: 3,
          groupingStrategy: 'time-based'
        }
      });

      // Add more locations than maxEntries
      for (let i = 0; i < 5; i++) {
        const location = createNavigationLocation(`/test/file${i}.ts`, { line: i * 10, column: 5 }, context);
        store.setCurrentLocation(location);
      }
      
      const state = useAppStore.getState();
      expect(state.navigationHistory?.entries).toHaveLength(3);
      expect(state.navigationHistory?.entries[0].location.filePath).toBe('/test/file2.ts');
      expect(state.navigationHistory?.entries[2].location.filePath).toBe('/test/file4.ts');
    });
  });
});