// Enhanced Navigation History Utils Tests
// Purpose: Comprehensive tests for history tracking, grouping, and analysis utilities
// Architecture: Unit tests covering all aspects of enhanced history management

import { describe, it, expect, beforeEach } from 'vitest';
import {
  groupEntriesIntoSessions,
  calculateSemanticSimilarity,
  groupEntriesByTime,
  createEnhancedHistoryEntry,
  analyzeNavigationHistory,
  validateHistoryEntry,
  cleanupHistory,
  optimizeHistory,
  defaultSessionGroupingOptions,
  defaultTimeBasedOptions
} from '../navigationHistoryUtils';
import {
  NavigationLocation,
  NavigationHistoryEntry,
  NavigationHistory,
  NavigationContext
} from '../../types/navigation';

// Test data factories
const createMockLocation = (
  filePath: string,
  line: number = 1,
  column: number = 1,
  symbol?: any,
  timestamp?: Date
): NavigationLocation => ({
  id: `location-${Date.now()}-${Math.random()}`,
  filePath,
  position: { line, column },
  symbol,
  context: {
    projectPath: '/test/project',
    breadcrumbs: [],
    relatedSymbols: []
  } as NavigationContext,
  timestamp: timestamp || new Date(),
  metadata: {
    title: filePath.split('/').pop() || filePath,
    description: '',
    tags: [],
    timeSpent: 0,
    visitCount: 1,
    lastAccessed: new Date(),
    isBookmarked: false,
    isFavorite: false
  }
});

const createMockSymbol = (identifier: string, kind: string = 'function') => ({
  identifier,
  kind,
  location: {
    path: '/test/file.ts',
    line: 10,
    column: 5
  }
});

describe('navigationHistoryUtils', () => {
  describe('groupEntriesIntoSessions', () => {
    it('should create a single session for closely related entries', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const entries: NavigationHistoryEntry[] = [
        createEnhancedHistoryEntry(
          createMockLocation('/test/file1.ts', 1, 1, undefined, baseTime),
          'navigate',
          'click'
        ),
        createEnhancedHistoryEntry(
          createMockLocation('/test/file1.ts', 10, 1, undefined, new Date(baseTime.getTime() + 30000)), // 30 seconds later
          'navigate',
          'click'
        ),
        createEnhancedHistoryEntry(
          createMockLocation('/test/file1.ts', 20, 1, undefined, new Date(baseTime.getTime() + 60000)), // 1 minute later
          'navigate',
          'click'
        )
      ];

      const sessions = groupEntriesIntoSessions(entries);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].entries).toHaveLength(3);
      expect(sessions[0].name).toContain('file1.ts');
    });

    it('should create separate sessions for entries with large time gaps', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const entries: NavigationHistoryEntry[] = [
        createEnhancedHistoryEntry(
          createMockLocation('/test/file1.ts', 1, 1, undefined, baseTime),
          'navigate',
          'click'
        ),
        createEnhancedHistoryEntry(
          createMockLocation('/test/file2.ts', 1, 1, undefined, new Date(baseTime.getTime() + 10 * 60 * 1000)), // 10 minutes later
          'navigate',
          'click'
        )
      ];

      const sessions = groupEntriesIntoSessions(entries);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].entries).toHaveLength(1);
      expect(sessions[1].entries).toHaveLength(1);
    });

    it('should create separate sessions for semantically different entries', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const entries: NavigationHistoryEntry[] = [
        createEnhancedHistoryEntry(
          createMockLocation('/test/frontend/component.tsx', 1, 1, undefined, baseTime),
          'navigate',
          'click'
        ),
        createEnhancedHistoryEntry(
          createMockLocation('/test/backend/server.py', 1, 1, undefined, new Date(baseTime.getTime() + 30000)), // 30 seconds later
          'navigate',
          'click'
        )
      ];

      const sessions = groupEntriesIntoSessions(entries);

      expect(sessions).toHaveLength(2);
    });

    it('should handle empty entries array', () => {
      const sessions = groupEntriesIntoSessions([]);
      expect(sessions).toHaveLength(0);
    });

    it('should generate meaningful session names', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const symbol = createMockSymbol('testFunction', 'function');
      const entries: NavigationHistoryEntry[] = [
        createEnhancedHistoryEntry(
          createMockLocation('/test/file1.ts', 1, 1, symbol, baseTime),
          'navigate',
          'click'
        )
      ];

      const sessions = groupEntriesIntoSessions(entries);

      expect(sessions[0].name).toContain('testFunction');
      expect(sessions[0].name).toContain('file1.ts');
    });
  });

  describe('calculateSemanticSimilarity', () => {
    it('should return 1.0 for identical locations', () => {
      const location1 = createMockLocation('/test/file.ts', 10, 5);
      const location2 = createMockLocation('/test/file.ts', 10, 5);

      const similarity = calculateSemanticSimilarity(location1, location2, defaultSessionGroupingOptions);

      expect(similarity).toBe(1.0);
    });

    it('should return high similarity for same file different positions', () => {
      const location1 = createMockLocation('/test/file.ts', 10, 5);
      const location2 = createMockLocation('/test/file.ts', 20, 10);

      const similarity = calculateSemanticSimilarity(location1, location2, defaultSessionGroupingOptions);

      expect(similarity).toBeGreaterThan(0.3);
    });

    it('should return lower similarity for different files', () => {
      const location1 = createMockLocation('/test/file1.ts', 10, 5);
      const location2 = createMockLocation('/test/file2.ts', 10, 5);

      const similarity = calculateSemanticSimilarity(location1, location2, defaultSessionGroupingOptions);

      expect(similarity).toBeLessThan(0.5);
    });

    it('should return higher similarity for related symbols', () => {
      const symbol1 = createMockSymbol('testFunction', 'function');
      const symbol2 = createMockSymbol('helperFunction', 'function');
      
      const location1 = createMockLocation('/test/file.ts', 10, 5, symbol1);
      const location2 = createMockLocation('/test/file.ts', 20, 5, symbol2);

      const similarity = calculateSemanticSimilarity(location1, location2, defaultSessionGroupingOptions);

      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should handle locations without symbols', () => {
      const location1 = createMockLocation('/test/file1.ts', 10, 5);
      const location2 = createMockLocation('/test/file2.ts', 10, 5);

      const similarity = calculateSemanticSimilarity(location1, location2, defaultSessionGroupingOptions);

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('groupEntriesByTime', () => {
    it('should group entries within time interval', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const entries: NavigationHistoryEntry[] = [
        createEnhancedHistoryEntry(
          createMockLocation('/test/file1.ts', 1, 1, undefined, baseTime),
          'navigate',
          'click'
        ),
        createEnhancedHistoryEntry(
          createMockLocation('/test/file2.ts', 1, 1, undefined, new Date(baseTime.getTime() + 5 * 60 * 1000)), // 5 minutes later
          'navigate',
          'click'
        ),
        createEnhancedHistoryEntry(
          createMockLocation('/test/file3.ts', 1, 1, undefined, new Date(baseTime.getTime() + 20 * 60 * 1000)), // 20 minutes later
          'navigate',
          'click'
        )
      ];

      const groups = groupEntriesByTime(entries, defaultTimeBasedOptions);

      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(2); // First two entries within 15-minute interval
      expect(groups[1]).toHaveLength(1); // Third entry starts new group
    });

    it('should respect max group size', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const entries: NavigationHistoryEntry[] = [];
      
      // Create 15 entries within the same time interval
      for (let i = 0; i < 15; i++) {
        entries.push(
          createEnhancedHistoryEntry(
            createMockLocation(`/test/file${i}.ts`, 1, 1, undefined, new Date(baseTime.getTime() + i * 30000)), // 30 seconds apart
            'navigate',
            'click'
          )
        );
      }

      const options = { ...defaultTimeBasedOptions, maxGroupSize: 5 };
      const groups = groupEntriesByTime(entries, options);

      expect(groups.length).toBeGreaterThan(1);
      groups.forEach(group => {
        expect(group.length).toBeLessThanOrEqual(5);
      });
    });

    it('should handle empty entries array', () => {
      const groups = groupEntriesByTime([]);
      expect(groups).toHaveLength(0);
    });
  });

  describe('createEnhancedHistoryEntry', () => {
    it('should create valid history entry with all required fields', () => {
      const location = createMockLocation('/test/file.ts', 10, 5);
      const entry = createEnhancedHistoryEntry(location, 'navigate', 'click', 'session-1', 1000);

      expect(entry.id).toBeDefined();
      expect(entry.location).toBe(location);
      expect(entry.action).toBe('navigate');
      expect(entry.duration).toBe(1000);
      expect(entry.sessionId).toBe('session-1');
      expect(entry.metadata.trigger).toBe('click');
      expect(entry.metadata.userAction).toBe(true);
      expect(entry.metadata.confidence).toBeGreaterThan(0);
      expect(Array.isArray(entry.metadata.tags)).toBe(true);
    });

    it('should use default values when optional parameters are not provided', () => {
      const location = createMockLocation('/test/file.ts', 10, 5);
      const entry = createEnhancedHistoryEntry(location);

      expect(entry.action).toBe('navigate');
      expect(entry.duration).toBe(0);
      expect(entry.sessionId).toBe('default');
      expect(entry.metadata.trigger).toBe('click');
    });

    it('should generate appropriate tags based on location', () => {
      const symbol = createMockSymbol('testClass', 'class');
      const location = createMockLocation('/test/file.ts', 10, 5, symbol);
      location.metadata.isBookmarked = true;
      
      const entry = createEnhancedHistoryEntry(location);

      expect(entry.metadata.tags).toContain('file:ts');
      expect(entry.metadata.tags).toContain('symbol:class');
      expect(entry.metadata.tags).toContain('bookmarked');
    });

    it('should calculate confidence based on location properties', () => {
      const symbol = createMockSymbol('testFunction', 'function');
      const location = createMockLocation('/test/file.ts', 10, 5, symbol);
      location.metadata.isBookmarked = true;
      location.metadata.visitCount = 10;
      
      const entry = createEnhancedHistoryEntry(location);

      expect(entry.metadata.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('analyzeNavigationHistory', () => {
    let mockHistory: NavigationHistory;

    beforeEach(() => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const entries: NavigationHistoryEntry[] = [
        createEnhancedHistoryEntry(
          createMockLocation('/test/file1.ts', 1, 1, createMockSymbol('func1'), baseTime),
          'navigate',
          'click'
        ),
        createEnhancedHistoryEntry(
          createMockLocation('/test/file1.ts', 10, 1, createMockSymbol('func2'), new Date(baseTime.getTime() + 60000)),
          'navigate',
          'click'
        ),
        createEnhancedHistoryEntry(
          createMockLocation('/test/file2.ts', 1, 1, createMockSymbol('func1'), new Date(baseTime.getTime() + 120000)),
          'navigate',
          'click'
        )
      ];

      mockHistory = {
        entries,
        currentIndex: 2,
        sessions: groupEntriesIntoSessions(entries),
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };
    });

    it('should calculate basic statistics correctly', () => {
      const insights = analyzeNavigationHistory(mockHistory);

      expect(insights.totalNavigations).toBe(3);
      expect(insights.uniqueFiles).toBe(2);
      expect(insights.mostVisitedFiles).toHaveLength(2);
      expect(insights.mostUsedSymbols).toHaveLength(2);
    });

    it('should identify most visited files', () => {
      const insights = analyzeNavigationHistory(mockHistory);

      expect(insights.mostVisitedFiles[0].filePath).toBe('/test/file1.ts');
      expect(insights.mostVisitedFiles[0].count).toBe(2);
      expect(insights.mostVisitedFiles[1].filePath).toBe('/test/file2.ts');
      expect(insights.mostVisitedFiles[1].count).toBe(1);
    });

    it('should identify most used symbols', () => {
      const insights = analyzeNavigationHistory(mockHistory);

      expect(insights.mostUsedSymbols[0].symbol).toBe('func1:function');
      expect(insights.mostUsedSymbols[0].count).toBe(2);
    });

    it('should analyze navigation patterns', () => {
      const insights = analyzeNavigationHistory(mockHistory);

      expect(insights.navigationPatterns).toBeDefined();
      expect(insights.navigationPatterns.length).toBeGreaterThan(0);
    });

    it('should calculate time distribution', () => {
      const insights = analyzeNavigationHistory(mockHistory);

      expect(insights.timeDistribution).toBeInstanceOf(Map);
      // The entries are at 10:00 UTC, which is hour 5 in local time (UTC-5)
      const expectedHour = new Date('2024-01-01T10:00:00Z').getHours();
      expect(insights.timeDistribution.get(expectedHour)).toBe(3);
    });

    it('should handle empty history', () => {
      const emptyHistory: NavigationHistory = {
        entries: [],
        currentIndex: -1,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      const insights = analyzeNavigationHistory(emptyHistory);

      expect(insights.totalNavigations).toBe(0);
      expect(insights.uniqueFiles).toBe(0);
      expect(insights.averageSessionDuration).toBe(0);
    });
  });

  describe('validateHistoryEntry', () => {
    it('should return true for valid entry', () => {
      const location = createMockLocation('/test/file.ts', 10, 5);
      const entry = createEnhancedHistoryEntry(location);

      expect(validateHistoryEntry(entry)).toBe(true);
    });

    it('should return false for entry missing required fields', () => {
      const invalidEntry = {
        id: 'test',
        // missing location
        action: 'navigate',
        duration: 0,
        sessionId: 'test',
        metadata: {}
      } as any;

      expect(validateHistoryEntry(invalidEntry)).toBe(false);
    });

    it('should return false for entry with invalid location', () => {
      const invalidEntry = {
        id: 'test',
        location: {
          // missing filePath
          position: { line: 1, column: 1 },
          timestamp: new Date()
        },
        action: 'navigate',
        duration: 0,
        sessionId: 'test',
        metadata: {}
      } as any;

      expect(validateHistoryEntry(invalidEntry)).toBe(false);
    });
  });

  describe('cleanupHistory', () => {
    it('should remove invalid entries', () => {
      const validLocation = createMockLocation('/test/file.ts', 10, 5);
      const validEntry = createEnhancedHistoryEntry(validLocation);
      
      const invalidEntry = {
        id: 'invalid',
        // missing required fields
      } as any;

      const history: NavigationHistory = {
        entries: [validEntry, invalidEntry],
        currentIndex: 1,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      const cleanedHistory = cleanupHistory(history);

      expect(cleanedHistory.entries).toHaveLength(1);
      expect(cleanedHistory.entries[0]).toBe(validEntry);
      expect(cleanedHistory.currentIndex).toBe(0);
    });

    it('should adjust currentIndex when invalid entries are removed', () => {
      const validLocation = createMockLocation('/test/file.ts', 10, 5);
      const validEntry = createEnhancedHistoryEntry(validLocation);
      
      const invalidEntry = {
        id: 'invalid',
      } as any;

      const history: NavigationHistory = {
        entries: [invalidEntry, validEntry],
        currentIndex: 1,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      const cleanedHistory = cleanupHistory(history);

      expect(cleanedHistory.entries).toHaveLength(1);
      expect(cleanedHistory.currentIndex).toBe(0);
    });
  });

  describe('optimizeHistory', () => {
    it('should remove consecutive duplicate entries', () => {
      const location = createMockLocation('/test/file.ts', 10, 5);
      const entry1 = createEnhancedHistoryEntry(location);
      const entry2 = createEnhancedHistoryEntry(location); // Duplicate
      const entry3 = createEnhancedHistoryEntry(createMockLocation('/test/file2.ts', 1, 1));

      const history: NavigationHistory = {
        entries: [entry1, entry2, entry3],
        currentIndex: 2,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      const optimizedHistory = optimizeHistory(history);

      expect(optimizedHistory.entries).toHaveLength(2);
      expect(optimizedHistory.entries[0]).toBe(entry1);
      expect(optimizedHistory.entries[1]).toBe(entry3);
    });

    it('should limit entries to maxEntries', () => {
      const entries: NavigationHistoryEntry[] = [];
      
      // Create 150 entries
      for (let i = 0; i < 150; i++) {
        entries.push(
          createEnhancedHistoryEntry(
            createMockLocation(`/test/file${i}.ts`, 1, 1)
          )
        );
      }

      const history: NavigationHistory = {
        entries,
        currentIndex: 149,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      const optimizedHistory = optimizeHistory(history, 100);

      expect(optimizedHistory.entries).toHaveLength(100);
      // Should keep the most recent entries
      expect(optimizedHistory.entries[99].location.filePath).toBe('/test/file149.ts');
    });

    it('should adjust currentIndex after optimization', () => {
      const entries: NavigationHistoryEntry[] = [];
      
      // Create 150 entries
      for (let i = 0; i < 150; i++) {
        entries.push(
          createEnhancedHistoryEntry(
            createMockLocation(`/test/file${i}.ts`, 1, 1)
          )
        );
      }

      const history: NavigationHistory = {
        entries,
        currentIndex: 149,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      const optimizedHistory = optimizeHistory(history, 100);

      expect(optimizedHistory.currentIndex).toBe(99);
    });
  });
});