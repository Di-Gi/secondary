// Enhanced Navigation History Utilities
// Purpose: Advanced history tracking with session-based grouping and semantic similarity
// Architecture: Utility functions for intelligent history management and grouping algorithms

import { 
  NavigationLocation, 
  NavigationHistoryEntry, 
  HistorySession, 
  NavigationHistory,
  HistoryGroupingStrategy,
  NavigationAction,
  NavigationTrigger
} from '../types/navigation';

// ============================================================================
// Session-based Grouping Algorithm
// ============================================================================

export interface SessionGroupingOptions {
  maxSessionDuration: number; // milliseconds
  maxIdleTime: number; // milliseconds
  semanticSimilarityThreshold: number; // 0-1
  fileProximityWeight: number; // 0-1
  symbolProximityWeight: number; // 0-1
}

export const defaultSessionGroupingOptions: SessionGroupingOptions = {
  maxSessionDuration: 30 * 60 * 1000, // 30 minutes
  maxIdleTime: 5 * 60 * 1000, // 5 minutes
  semanticSimilarityThreshold: 0.7,
  fileProximityWeight: 0.4,
  symbolProximityWeight: 0.6
};

/**
 * Groups navigation entries into logical sessions based on time and semantic similarity
 */
export function groupEntriesIntoSessions(
  entries: NavigationHistoryEntry[],
  options: SessionGroupingOptions = defaultSessionGroupingOptions
): HistorySession[] {
  if (entries.length === 0) return [];

  const sessions: HistorySession[] = [];
  let currentSession: HistorySession | null = null;

  // Sort entries by timestamp
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.location.timestamp).getTime() - new Date(b.location.timestamp).getTime()
  );

  for (const entry of sortedEntries) {
    const entryTime = new Date(entry.location.timestamp).getTime();

    // Check if we should start a new session
    if (shouldStartNewSession(entry, currentSession, options, entryTime)) {
      // Finalize current session
      if (currentSession) {
        currentSession.endTime = new Date(currentSession.entries[currentSession.entries.length - 1].location.timestamp);
        currentSession.isActive = false;
        sessions.push(currentSession);
      }

      // Start new session
      currentSession = createNewSession(entry);
    } else if (currentSession) {
      // Add to current session
      currentSession.entries.push(entry);
      currentSession.context = mergeNavigationContexts(currentSession.context, entry.location.context);
    }
  }

  // Finalize last session
  if (currentSession) {
    currentSession.endTime = new Date(currentSession.entries[currentSession.entries.length - 1].location.timestamp);
    currentSession.isActive = false;
    sessions.push(currentSession);
  }

  return sessions;
}

function shouldStartNewSession(
  entry: NavigationHistoryEntry,
  currentSession: HistorySession | null,
  options: SessionGroupingOptions,
  entryTime: number
): boolean {
  if (!currentSession) return true;

  const lastEntry = currentSession.entries[currentSession.entries.length - 1];
  const lastEntryTime = new Date(lastEntry.location.timestamp).getTime();
  const timeDiff = entryTime - lastEntryTime;

  // Time-based checks
  if (timeDiff > options.maxIdleTime) return true;
  
  const sessionDuration = entryTime - new Date(currentSession.startTime).getTime();
  if (sessionDuration > options.maxSessionDuration) return true;

  // For closely related entries (same file, short time), keep in same session
  if (entry.location.filePath === lastEntry.location.filePath && timeDiff < 2 * 60 * 1000) {
    return false;
  }

  // Semantic similarity check
  const similarity = calculateSemanticSimilarity(entry.location, lastEntry.location, options);
  if (similarity < options.semanticSimilarityThreshold) return true;

  return false;
}

function createNewSession(entry: NavigationHistoryEntry): HistorySession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: generateSessionName(entry),
    startTime: new Date(entry.location.timestamp),
    entries: [entry],
    context: entry.location.context,
    isActive: true
  };
}

function generateSessionName(entry: NavigationHistoryEntry): string {
  const fileName = entry.location.filePath.split('/').pop() || 'Unknown';
  const timestamp = new Date(entry.location.timestamp);
  const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (entry.location.symbol) {
    return `${entry.location.symbol.identifier} in ${fileName} (${timeStr})`;
  }
  
  return `${fileName} (${timeStr})`;
}

// ============================================================================
// Semantic Similarity Calculation
// ============================================================================

/**
 * Calculates semantic similarity between two navigation locations
 */
export function calculateSemanticSimilarity(
  location1: NavigationLocation,
  location2: NavigationLocation,
  options: SessionGroupingOptions
): number {
  // Check for identical locations first
  if (location1.filePath === location2.filePath &&
      location1.position.line === location2.position.line &&
      location1.position.column === location2.position.column) {
    return 1.0;
  }

  let similarity = 0;

  // File proximity (same file = high similarity)
  const fileProximity = calculateFileProximity(location1.filePath, location2.filePath);
  similarity += fileProximity * options.fileProximityWeight;

  // Symbol proximity (related symbols = higher similarity)
  const symbolProximity = calculateSymbolProximity(location1.symbol, location2.symbol);
  similarity += symbolProximity * options.symbolProximityWeight;

  return Math.min(1, similarity);
}

function calculateFileProximity(filePath1: string, filePath2: string): number {
  if (filePath1 === filePath2) return 1.0;

  const path1Parts = filePath1.split('/');
  const path2Parts = filePath2.split('/');
  
  // Calculate common directory depth
  let commonDepth = 0;
  const minLength = Math.min(path1Parts.length, path2Parts.length);
  
  for (let i = 0; i < minLength - 1; i++) { // -1 to exclude filename
    if (path1Parts[i] === path2Parts[i]) {
      commonDepth++;
    } else {
      break;
    }
  }

  // Normalize by maximum possible depth
  const maxDepth = Math.max(path1Parts.length, path2Parts.length) - 1;
  return maxDepth > 0 ? commonDepth / maxDepth : 0;
}

function calculateSymbolProximity(symbol1?: any, symbol2?: any): number {
  if (!symbol1 || !symbol2) return 0;
  if (symbol1.identifier === symbol2.identifier) return 1.0;

  // Check if symbols are in the same class/namespace
  if (symbol1.kind === symbol2.kind) {
    // Same symbol type gets some similarity
    return 0.3;
  }

  // Check if one symbol contains the other (method in class, etc.)
  const location1 = symbol1.location;
  const location2 = symbol2.location;
  
  if (location1.path === location2.path) {
    // Same file, check line proximity
    const lineDiff = Math.abs(location1.line - location2.line);
    if (lineDiff < 10) return 0.5; // Close proximity
    if (lineDiff < 50) return 0.2; // Moderate proximity
  }

  return 0;
}

// ============================================================================
// Time-based Grouping
// ============================================================================

export interface TimeBasedGroupingOptions {
  groupingInterval: number; // milliseconds
  maxGroupSize: number;
  prioritizeRecent: boolean;
}

export const defaultTimeBasedOptions: TimeBasedGroupingOptions = {
  groupingInterval: 15 * 60 * 1000, // 15 minutes
  maxGroupSize: 10,
  prioritizeRecent: true
};

/**
 * Groups entries by time intervals
 */
export function groupEntriesByTime(
  entries: NavigationHistoryEntry[],
  options: TimeBasedGroupingOptions = defaultTimeBasedOptions
): NavigationHistoryEntry[][] {
  if (entries.length === 0) return [];

  const sortedEntries = [...entries].sort((a, b) => {
    const timeA = new Date(a.location.timestamp).getTime();
    const timeB = new Date(b.location.timestamp).getTime();
    return options.prioritizeRecent ? timeB - timeA : timeA - timeB;
  });

  const groups: NavigationHistoryEntry[][] = [];
  let currentGroup: NavigationHistoryEntry[] = [];
  let currentGroupStartTime: number | null = null;

  for (const entry of sortedEntries) {
    const entryTime = new Date(entry.location.timestamp).getTime();

    if (currentGroupStartTime === null) {
      // Start first group
      currentGroupStartTime = entryTime;
      currentGroup = [entry];
    } else {
      const timeDiff = Math.abs(entryTime - currentGroupStartTime);
      
      if (timeDiff <= options.groupingInterval && currentGroup.length < options.maxGroupSize) {
        // Add to current group
        currentGroup.push(entry);
      } else {
        // Start new group
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [entry];
        currentGroupStartTime = entryTime;
      }
    }
  }

  // Add final group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

// ============================================================================
// Enhanced History Entry Creation
// ============================================================================

export function createEnhancedHistoryEntry(
  location: NavigationLocation,
  action: NavigationAction = 'navigate',
  trigger: NavigationTrigger = 'click',
  sessionId?: string,
  duration: number = 0
): NavigationHistoryEntry {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    location, // Use the location as-is, preserving its timestamp
    action,
    duration,
    sessionId: sessionId || 'default',
    metadata: {
      trigger,
      userAction: trigger !== 'ai-suggestion',
      confidence: calculateLocationConfidence(location),
      relatedEntries: [],
      tags: generateLocationTags(location)
    }
  };
}

function calculateLocationConfidence(location: NavigationLocation): number {
  let confidence = 0.5; // Base confidence

  // Higher confidence for locations with symbols
  if (location.symbol) {
    confidence += 0.3;
  }

  // Higher confidence for bookmarked locations
  if (location.metadata.isBookmarked) {
    confidence += 0.2;
  }

  // Higher confidence for frequently visited locations
  if (location.metadata.visitCount > 5) {
    confidence += 0.1;
  }

  return Math.min(1, confidence);
}

function generateLocationTags(location: NavigationLocation): string[] {
  const tags: string[] = [];

  // File type tags
  const fileExtension = location.filePath.split('.').pop();
  if (fileExtension) {
    tags.push(`file:${fileExtension}`);
  }

  // Symbol type tags
  if (location.symbol) {
    tags.push(`symbol:${location.symbol.kind.toLowerCase()}`);
  }

  // Context tags
  if (location.context.gitBranch) {
    tags.push(`branch:${location.context.gitBranch}`);
  }

  // Metadata tags
  if (location.metadata.isBookmarked) {
    tags.push('bookmarked');
  }

  if (location.metadata.isFavorite) {
    tags.push('favorite');
  }

  return tags;
}

// ============================================================================
// History Analysis and Insights
// ============================================================================

export interface HistoryInsights {
  totalNavigations: number;
  uniqueFiles: number;
  averageSessionDuration: number;
  mostVisitedFiles: Array<{ filePath: string; count: number }>;
  mostUsedSymbols: Array<{ symbol: string; count: number }>;
  navigationPatterns: Array<{ pattern: string; frequency: number }>;
  timeDistribution: Map<number, number>; // hour -> count
}

/**
 * Analyzes navigation history to provide insights
 */
export function analyzeNavigationHistory(history: NavigationHistory): HistoryInsights {
  const entries = history.entries;
  const sessions = history.sessions;

  // Basic statistics
  const totalNavigations = entries.length;
  const uniqueFiles = new Set(entries.map(e => e.location.filePath)).size;
  
  // Session duration analysis
  const sessionDurations = sessions
    .filter(s => s.endTime)
    .map(s => new Date(s.endTime!).getTime() - new Date(s.startTime).getTime());
  const averageSessionDuration = sessionDurations.length > 0 
    ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
    : 0;

  // File visit frequency
  const fileVisits = new Map<string, number>();
  entries.forEach(entry => {
    const count = fileVisits.get(entry.location.filePath) || 0;
    fileVisits.set(entry.location.filePath, count + 1);
  });
  
  const mostVisitedFiles = Array.from(fileVisits.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([filePath, count]) => ({ filePath, count }));

  // Symbol usage frequency
  const symbolUsage = new Map<string, number>();
  entries.forEach(entry => {
    if (entry.location.symbol) {
      const symbolKey = `${entry.location.symbol.identifier}:${entry.location.symbol.kind}`;
      const count = symbolUsage.get(symbolKey) || 0;
      symbolUsage.set(symbolKey, count + 1);
    }
  });

  const mostUsedSymbols = Array.from(symbolUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symbol, count]) => ({ symbol, count }));

  // Navigation patterns (simplified)
  const patterns = analyzeNavigationPatterns(entries);

  // Time distribution
  const timeDistribution = new Map<number, number>();
  entries.forEach(entry => {
    const timestamp = entry.location.timestamp;
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const hour = date.getHours();
    const count = timeDistribution.get(hour) || 0;
    timeDistribution.set(hour, count + 1);
  });

  return {
    totalNavigations,
    uniqueFiles,
    averageSessionDuration,
    mostVisitedFiles,
    mostUsedSymbols,
    navigationPatterns: patterns,
    timeDistribution
  };
}

function analyzeNavigationPatterns(entries: NavigationHistoryEntry[]): Array<{ pattern: string; frequency: number }> {
  const patterns = new Map<string, number>();

  // Analyze sequential file transitions
  for (let i = 1; i < entries.length; i++) {
    const prevFile = entries[i - 1].location.filePath.split('/').pop() || '';
    const currFile = entries[i].location.filePath.split('/').pop() || '';
    
    if (prevFile !== currFile) {
      const pattern = `${prevFile} → ${currFile}`;
      const count = patterns.get(pattern) || 0;
      patterns.set(pattern, count + 1);
    }
  }

  return Array.from(patterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern, frequency]) => ({ pattern, frequency }));
}

// ============================================================================
// Utility Functions
// ============================================================================

function mergeNavigationContexts(context1: any, context2: any): any {
  return {
    ...context1,
    ...context2,
    breadcrumbs: [...(context1.breadcrumbs || []), ...(context2.breadcrumbs || [])],
    relatedSymbols: [...(context1.relatedSymbols || []), ...(context2.relatedSymbols || [])]
  };
}

/**
 * Validates a navigation history entry
 */
export function validateHistoryEntry(entry: NavigationHistoryEntry): boolean {
  return !!(
    entry.id &&
    entry.location &&
    entry.location.filePath &&
    entry.location.timestamp &&
    entry.action &&
    entry.sessionId &&
    entry.metadata
  );
}

/**
 * Cleans up invalid entries from history
 */
export function cleanupHistory(history: NavigationHistory): NavigationHistory {
  const validEntries = history.entries.filter(validateHistoryEntry);
  
  return {
    ...history,
    entries: validEntries,
    currentIndex: Math.min(history.currentIndex, validEntries.length - 1)
  };
}

/**
 * Optimizes history by removing redundant entries
 */
export function optimizeHistory(
  history: NavigationHistory,
  maxEntries: number = 100
): NavigationHistory {
  let entries = [...history.entries];

  // Remove consecutive duplicates
  entries = entries.filter((entry, index) => {
    if (index === 0) return true;
    const prev = entries[index - 1];
    return !(
      prev.location.filePath === entry.location.filePath &&
      prev.location.position.line === entry.location.position.line &&
      prev.location.position.column === entry.location.position.column
    );
  });

  // Keep only the most recent entries
  if (entries.length > maxEntries) {
    entries = entries.slice(-maxEntries);
  }

  return {
    ...history,
    entries,
    currentIndex: Math.min(history.currentIndex, entries.length - 1)
  };
}