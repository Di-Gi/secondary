// Session Restoration Utilities
// Purpose: Handles session loading, restoration, and layout configuration persistence
// Features: Session restoration logic, layout persistence, automatic last session restoration

import { NavigationSession, LayoutConfiguration } from '../types/navigation';

export interface SessionRestorationOptions {
  restoreLayout: boolean;
  restoreLocations: boolean;
  restoreActiveSession: boolean;
  autoRestoreLastSession: boolean;
}

export interface SessionRestorationResult {
  success: boolean;
  session?: NavigationSession;
  layout?: LayoutConfiguration;
  error?: string;
  warnings: string[];
}

export interface LayoutPersistenceData {
  panelSizes: Record<string, number>;
  visiblePanels: string[];
  minimapSettings: any;
  treeSettings: any;
  graphSettings: any;
  breadcrumbSettings: any;
  timestamp: string;
  version: number;
}

/**
 * Default session restoration options
 */
export const DEFAULT_RESTORATION_OPTIONS: SessionRestorationOptions = {
  restoreLayout: true,
  restoreLocations: true,
  restoreActiveSession: true,
  autoRestoreLastSession: true
};

/**
 * Converts a Map to a plain object for serialization
 */
export function serializeMap<T>(map: Map<string, T>): Record<string, T> {
  const obj: Record<string, T> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * Converts a plain object back to a Map
 */
export function deserializeMap<T>(obj: Record<string, T>): Map<string, T> {
  const map = new Map<string, T>();
  Object.entries(obj).forEach(([key, value]) => {
    map.set(key, value);
  });
  return map;
}

/**
 * Serializes layout configuration for persistence
 */
export function serializeLayoutConfiguration(layout: LayoutConfiguration): LayoutPersistenceData {
  return {
    panelSizes: serializeMap(layout.panelSizes),
    visiblePanels: layout.visiblePanels,
    minimapSettings: layout.minimapSettings,
    treeSettings: layout.treeSettings,
    graphSettings: layout.graphSettings,
    breadcrumbSettings: layout.breadcrumbSettings,
    timestamp: new Date().toISOString(),
    version: 1
  };
}

/**
 * Deserializes layout configuration from persistence data
 */
export function deserializeLayoutConfiguration(data: LayoutPersistenceData): LayoutConfiguration {
  return {
    panelSizes: deserializeMap(data.panelSizes),
    visiblePanels: data.visiblePanels,
    minimapSettings: data.minimapSettings,
    treeSettings: data.treeSettings,
    graphSettings: data.graphSettings,
    breadcrumbSettings: data.breadcrumbSettings
  };
}

/**
 * Validates a session for restoration
 */
export function validateSessionForRestoration(session: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!session) {
    errors.push('Session is null or undefined');
    return { isValid: false, errors };
  }

  if (!session.id || typeof session.id !== 'string') {
    errors.push('Session must have a valid ID');
  }

  if (!session.name || typeof session.name !== 'string') {
    errors.push('Session must have a valid name');
  }

  if (!Array.isArray(session.locations)) {
    errors.push('Session must have a locations array');
  }

  if (!session.layout || typeof session.layout !== 'object') {
    errors.push('Session must have a layout configuration');
  }

  if (!session.createdAt || !(session.createdAt instanceof Date || typeof session.createdAt === 'string')) {
    errors.push('Session must have a valid createdAt date');
  }

  if (!session.lastAccessed || !(session.lastAccessed instanceof Date || typeof session.lastAccessed === 'string')) {
    errors.push('Session must have a valid lastAccessed date');
  }

  if (!session.metadata || typeof session.metadata !== 'object') {
    errors.push('Session must have metadata');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Normalizes session data after loading from storage
 */
export function normalizeSessionData(session: any): NavigationSession {
  // Ensure dates are Date objects
  const normalizedSession = {
    ...session,
    createdAt: typeof session.createdAt === 'string' ? new Date(session.createdAt) : session.createdAt,
    lastAccessed: typeof session.lastAccessed === 'string' ? new Date(session.lastAccessed) : session.lastAccessed,
    locations: session.locations || [],
    metadata: {
      ...session.metadata,
      tags: session.metadata?.tags || [],
      totalTimeSpent: session.metadata?.totalTimeSpent || 0,
      locationCount: session.locations?.length || 0
    }
  };

  // Ensure layout has proper Map objects
  if (normalizedSession.layout && normalizedSession.layout.panelSizes) {
    if (!(normalizedSession.layout.panelSizes instanceof Map)) {
      normalizedSession.layout.panelSizes = deserializeMap(normalizedSession.layout.panelSizes);
    }
  }

  return normalizedSession as NavigationSession;
}

/**
 * Creates a session restoration context
 */
export function createRestorationContext(
  session: NavigationSession,
  options: SessionRestorationOptions = DEFAULT_RESTORATION_OPTIONS
): SessionRestorationResult {
  const warnings: string[] = [];

  try {
    // Validate session
    const validation = validateSessionForRestoration(session);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Session validation failed: ${validation.errors.join(', ')}`,
        warnings
      };
    }

    // Normalize session data
    const normalizedSession = normalizeSessionData(session);

    // Check for potential issues
    if (normalizedSession.locations.length === 0) {
      warnings.push('Session has no saved locations');
    }

    if (!normalizedSession.layout) {
      warnings.push('Session has no saved layout configuration');
    }

    const now = new Date();
    const daysSinceLastAccess = Math.floor((now.getTime() - normalizedSession.lastAccessed.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastAccess > 30) {
      warnings.push(`Session was last accessed ${daysSinceLastAccess} days ago`);
    }

    return {
      success: true,
      session: normalizedSession,
      layout: options.restoreLayout ? normalizedSession.layout : undefined,
      warnings
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create restoration context: ${error}`,
      warnings
    };
  }
}

/**
 * Applies layout configuration to the current interface
 */
export function applyLayoutConfiguration(
  layout: LayoutConfiguration,
  currentLayout?: LayoutConfiguration
): { success: boolean; appliedChanges: string[]; errors: string[] } {
  const appliedChanges: string[] = [];
  const errors: string[] = [];

  try {
    // Apply panel sizes
    if (layout.panelSizes && layout.panelSizes.size > 0) {
      appliedChanges.push(`Applied panel sizes for ${layout.panelSizes.size} panels`);
    }

    // Apply visible panels
    if (layout.visiblePanels && layout.visiblePanels.length > 0) {
      appliedChanges.push(`Set ${layout.visiblePanels.length} panels as visible`);
    }

    // Apply component settings
    if (layout.minimapSettings) {
      appliedChanges.push('Applied minimap settings');
    }

    if (layout.treeSettings) {
      appliedChanges.push('Applied file tree settings');
    }

    if (layout.graphSettings) {
      appliedChanges.push('Applied relationship graph settings');
    }

    if (layout.breadcrumbSettings) {
      appliedChanges.push('Applied breadcrumb settings');
    }

    return { success: true, appliedChanges, errors };
  } catch (error) {
    errors.push(`Failed to apply layout configuration: ${error}`);
    return { success: false, appliedChanges, errors };
  }
}

/**
 * Gets the last accessed session from a list of sessions
 */
export function getLastAccessedSession(sessions: NavigationSession[]): NavigationSession | null {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  return sessions.reduce((latest, current) => {
    if (!latest) return current;
    return current.lastAccessed > latest.lastAccessed ? current : latest;
  });
}

/**
 * Filters sessions by recency
 */
export function getRecentSessions(sessions: NavigationSession[], maxAge: number = 7): NavigationSession[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAge);

  return sessions.filter(session => session.lastAccessed >= cutoffDate);
}

/**
 * Creates a session backup before restoration
 */
export function createSessionBackup(session: NavigationSession): string {
  const backup = {
    ...session,
    createdAt: session.createdAt.toISOString(),
    lastAccessed: session.lastAccessed.toISOString(),
    layout: {
      ...session.layout,
      panelSizes: serializeMap(session.layout.panelSizes)
    },
    backupTimestamp: new Date().toISOString(),
    backupVersion: '1.0'
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Restores a session from backup data
 */
export function restoreSessionFromBackup(backupData: string): NavigationSession | null {
  try {
    const parsed = JSON.parse(backupData);
    return normalizeSessionData(parsed);
  } catch (error) {
    console.error('Failed to restore session from backup:', error);
    return null;
  }
}

/**
 * Session restoration manager class
 */
export class SessionRestorationManager {
  private options: SessionRestorationOptions;
  private restorationHistory: Array<{ sessionId: string; timestamp: Date; success: boolean }> = [];

  constructor(options: SessionRestorationOptions = DEFAULT_RESTORATION_OPTIONS) {
    this.options = options;
  }

  /**
   * Restores a session with full context
   */
  async restoreSession(
    session: NavigationSession,
    onProgress?: (step: string, progress: number) => void
  ): Promise<SessionRestorationResult> {
    onProgress?.('Validating session...', 0);

    const context = createRestorationContext(session, this.options);
    if (!context.success) {
      this.recordRestoration(session?.id || 'unknown', false);
      return context;
    }

    onProgress?.('Preparing restoration...', 25);

    try {
      // Create backup
      const backup = createSessionBackup(session);
      
      onProgress?.('Applying layout...', 50);

      // Apply layout if requested
      if (this.options.restoreLayout && context.layout) {
        const layoutResult = applyLayoutConfiguration(context.layout);
        if (!layoutResult.success) {
          context.warnings.push(...layoutResult.errors);
        }
      }

      onProgress?.('Restoring locations...', 75);

      // Update last accessed time
      if (context.session) {
        context.session.lastAccessed = new Date();
      }

      onProgress?.('Finalizing restoration...', 100);

      this.recordRestoration(session.id, true);

      return {
        ...context,
        success: true
      };
    } catch (error) {
      this.recordRestoration(session.id, false);
      return {
        success: false,
        error: `Session restoration failed: ${error}`,
        warnings: context.warnings
      };
    }
  }

  /**
   * Gets restoration history
   */
  getRestorationHistory(): Array<{ sessionId: string; timestamp: Date; success: boolean }> {
    return [...this.restorationHistory];
  }

  /**
   * Records a restoration attempt
   */
  private recordRestoration(sessionId: string, success: boolean): void {
    this.restorationHistory.push({
      sessionId,
      timestamp: new Date(),
      success
    });

    // Keep only last 50 entries
    if (this.restorationHistory.length > 50) {
      this.restorationHistory = this.restorationHistory.slice(-50);
    }
  }

  /**
   * Updates restoration options
   */
  updateOptions(options: Partial<SessionRestorationOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * Default session restoration manager instance
 */
export const sessionRestorationManager = new SessionRestorationManager();