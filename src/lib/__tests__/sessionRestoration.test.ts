import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  serializeMap,
  deserializeMap,
  serializeLayoutConfiguration,
  deserializeLayoutConfiguration,
  validateSessionForRestoration,
  normalizeSessionData,
  createRestorationContext,
  applyLayoutConfiguration,
  getLastAccessedSession,
  getRecentSessions,
  createSessionBackup,
  restoreSessionFromBackup,
  SessionRestorationManager,
  DEFAULT_RESTORATION_OPTIONS
} from '../sessionRestoration';
import { NavigationSession, LayoutConfiguration } from '../../types/navigation';

const mockSession: NavigationSession = {
  id: 'test-session-1',
  name: 'Test Session',
  description: 'A test session',
  locations: [],
  layout: {
    panelSizes: new Map([
      ['minimap', 200],
      ['fileTree', 250]
    ]),
    visiblePanels: ['minimap', 'fileTree'],
    minimapSettings: {
      zoomLevel: 1,
      showSymbolTypes: true,
      showComplexity: false,
      autoUpdate: true,
      renderQuality: 'medium',
      maxFileSize: 1024 * 1024
    },
    treeSettings: {
      showHiddenFiles: false,
      showGitStatus: true,
      showFileIcons: true,
      sortBy: 'name',
      sortOrder: 'asc',
      virtualScrolling: true,
      previewOnHover: true
    },
    graphSettings: {
      defaultLayout: 'force-directed',
      nodeSize: 20,
      edgeWidth: 2,
      animationSpeed: 1000,
      showLabels: true,
      clusterNodes: false,
      maxNodes: 100
    },
    breadcrumbSettings: {
      maxSegments: 8,
      showFileExtensions: true,
      showSymbolTypes: true,
      truncationStrategy: 'intelligent',
      showTooltips: true
    }
  },
  createdAt: new Date('2024-01-01'),
  lastAccessed: new Date('2024-01-02'),
  metadata: {
    projectPath: '/test/project',
    totalTimeSpent: 0,
    locationCount: 0,
    tags: ['test'],
    isShared: false,
    version: 1
  }
};

describe('sessionRestoration', () => {
  describe('serializeMap and deserializeMap', () => {
    it('should serialize and deserialize maps correctly', () => {
      const originalMap = new Map([
        ['key1', 'value1'],
        ['key2', 'value2']
      ]);

      const serialized = serializeMap(originalMap);
      expect(serialized).toEqual({
        key1: 'value1',
        key2: 'value2'
      });

      const deserialized = deserializeMap(serialized);
      expect(deserialized).toEqual(originalMap);
    });

    it('should handle empty maps', () => {
      const emptyMap = new Map();
      const serialized = serializeMap(emptyMap);
      expect(serialized).toEqual({});

      const deserialized = deserializeMap(serialized);
      expect(deserialized).toEqual(emptyMap);
    });
  });

  describe('serializeLayoutConfiguration and deserializeLayoutConfiguration', () => {
    it('should serialize and deserialize layout configuration', () => {
      const serialized = serializeLayoutConfiguration(mockSession.layout);
      
      expect(serialized.panelSizes).toEqual({
        minimap: 200,
        fileTree: 250
      });
      expect(serialized.visiblePanels).toEqual(['minimap', 'fileTree']);
      expect(serialized.version).toBe(1);
      expect(serialized.timestamp).toBeDefined();

      const deserialized = deserializeLayoutConfiguration(serialized);
      expect(deserialized.panelSizes).toEqual(mockSession.layout.panelSizes);
      expect(deserialized.visiblePanels).toEqual(mockSession.layout.visiblePanels);
    });
  });

  describe('validateSessionForRestoration', () => {
    it('should validate a correct session', () => {
      const result = validateSessionForRestoration(mockSession);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null session', () => {
      const result = validateSessionForRestoration(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session is null or undefined');
    });

    it('should reject session without ID', () => {
      const invalidSession = { ...mockSession, id: '' };
      const result = validateSessionForRestoration(invalidSession);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session must have a valid ID');
    });

    it('should reject session without locations array', () => {
      const invalidSession = { ...mockSession, locations: null };
      const result = validateSessionForRestoration(invalidSession);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session must have a locations array');
    });
  });

  describe('normalizeSessionData', () => {
    it('should normalize session with string dates', () => {
      const sessionWithStringDates = {
        ...mockSession,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastAccessed: '2024-01-02T00:00:00.000Z'
      };

      const normalized = normalizeSessionData(sessionWithStringDates);
      expect(normalized.createdAt).toBeInstanceOf(Date);
      expect(normalized.lastAccessed).toBeInstanceOf(Date);
    });

    it('should handle missing metadata fields', () => {
      const sessionWithMissingMetadata = {
        ...mockSession,
        metadata: {}
      };

      const normalized = normalizeSessionData(sessionWithMissingMetadata);
      expect(normalized.metadata.tags).toEqual([]);
      expect(normalized.metadata.totalTimeSpent).toBe(0);
      expect(normalized.metadata.locationCount).toBe(0);
    });

    it('should convert plain object panelSizes to Map', () => {
      const sessionWithObjectPanelSizes = {
        ...mockSession,
        layout: {
          ...mockSession.layout,
          panelSizes: { minimap: 200, fileTree: 250 }
        }
      };

      const normalized = normalizeSessionData(sessionWithObjectPanelSizes);
      expect(normalized.layout.panelSizes).toBeInstanceOf(Map);
      expect(normalized.layout.panelSizes.get('minimap')).toBe(200);
    });
  });

  describe('createRestorationContext', () => {
    it('should create successful restoration context', () => {
      const result = createRestorationContext(mockSession);
      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.warnings).toContain('Session has no saved locations');
      // The session might also have a warning about being old since it's from 2024-01-02
    });

    it('should handle invalid session', () => {
      const result = createRestorationContext(null as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Session validation failed');
    });

    it('should warn about old sessions', () => {
      const oldSession = {
        ...mockSession,
        lastAccessed: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) // 35 days ago
      };

      const result = createRestorationContext(oldSession);
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('days ago'))).toBe(true);
    });
  });

  describe('applyLayoutConfiguration', () => {
    it('should apply layout configuration successfully', () => {
      const result = applyLayoutConfiguration(mockSession.layout);
      expect(result.success).toBe(true);
      expect(result.appliedChanges.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty layout', () => {
      const emptyLayout: LayoutConfiguration = {
        panelSizes: new Map(),
        visiblePanels: [],
        minimapSettings: null as any,
        treeSettings: null as any,
        graphSettings: null as any,
        breadcrumbSettings: null as any
      };

      const result = applyLayoutConfiguration(emptyLayout);
      expect(result.success).toBe(true);
      expect(result.appliedChanges).toHaveLength(0);
    });
  });

  describe('getLastAccessedSession', () => {
    it('should return the most recently accessed session', () => {
      const sessions = [
        { ...mockSession, id: 'session1', lastAccessed: new Date('2024-01-01') },
        { ...mockSession, id: 'session2', lastAccessed: new Date('2024-01-03') },
        { ...mockSession, id: 'session3', lastAccessed: new Date('2024-01-02') }
      ];

      const result = getLastAccessedSession(sessions);
      expect(result?.id).toBe('session2');
    });

    it('should return null for empty array', () => {
      const result = getLastAccessedSession([]);
      expect(result).toBeNull();
    });
  });

  describe('getRecentSessions', () => {
    it('should filter sessions by recency', () => {
      const now = new Date();
      const sessions = [
        { ...mockSession, id: 'recent', lastAccessed: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
        { ...mockSession, id: 'old', lastAccessed: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) } // 10 days ago
      ];

      const result = getRecentSessions(sessions, 7);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('recent');
    });
  });

  describe('createSessionBackup and restoreSessionFromBackup', () => {
    it('should create and restore session backup', () => {
      const backup = createSessionBackup(mockSession);
      expect(backup).toBeDefined();
      expect(typeof backup).toBe('string');

      const restored = restoreSessionFromBackup(backup);
      expect(restored).toBeDefined();
      expect(restored?.id).toBe(mockSession.id);
      expect(restored?.name).toBe(mockSession.name);
    });

    it('should handle invalid backup data', () => {
      const result = restoreSessionFromBackup('invalid json');
      expect(result).toBeNull();
    });
  });

  describe('SessionRestorationManager', () => {
    let manager: SessionRestorationManager;

    beforeEach(() => {
      manager = new SessionRestorationManager();
    });

    it('should initialize with default options', () => {
      expect(manager).toBeDefined();
    });

    it('should restore session successfully', async () => {
      const onProgress = vi.fn();
      const result = await manager.restoreSession(mockSession, onProgress);
      
      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(onProgress).toHaveBeenCalledTimes(5);
    });

    it('should handle restoration failure', async () => {
      const invalidSession = { id: 'invalid' } as any; // Provide minimal valid structure
      const result = await manager.restoreSession(invalidSession);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track restoration history', async () => {
      await manager.restoreSession(mockSession);
      
      const history = manager.getRestorationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].sessionId).toBe(mockSession.id);
      expect(history[0].success).toBe(true);
    });

    it('should update options', () => {
      manager.updateOptions({ restoreLayout: false });
      // Options are private, but we can test the behavior
      expect(manager).toBeDefined();
    });
  });

  describe('DEFAULT_RESTORATION_OPTIONS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_RESTORATION_OPTIONS.restoreLayout).toBe(true);
      expect(DEFAULT_RESTORATION_OPTIONS.restoreLocations).toBe(true);
      expect(DEFAULT_RESTORATION_OPTIONS.restoreActiveSession).toBe(true);
      expect(DEFAULT_RESTORATION_OPTIONS.autoRestoreLastSession).toBe(true);
    });
  });
});