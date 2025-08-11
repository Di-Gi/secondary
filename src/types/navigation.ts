// Enhanced Navigation Interface - Core Type Definitions
// Purpose: Comprehensive type definitions for the enhanced navigation system
// Architecture: Defines all interfaces, types, and models used across navigation components

import { Symbol } from '../api';

// ============================================================================
// Core Navigation Models
// ============================================================================

export interface Position {
  line: number;
  column: number;
}

export interface CodeLocation {
  filePath: string;
  position: Position;
  symbol?: Symbol;
}

export interface NavigationLocation {
  id: string;
  filePath: string;
  position: Position;
  symbol?: Symbol;
  context: NavigationContext;
  timestamp: Date;
  metadata: LocationMetadata;
}

export interface NavigationContext {
  projectPath: string;
  workspaceId?: string;
  sessionId?: string;
  breadcrumbs: BreadcrumbSegment[];
  relatedSymbols: Symbol[];
  fileContent?: string;
  gitBranch?: string;
  gitStatus?: string;
}

export interface LocationMetadata {
  title: string;
  description?: string;
  tags: string[];
  timeSpent?: number;
  visitCount: number;
  lastAccessed: Date;
  isBookmarked: boolean;
  isFavorite: boolean;
}

// ============================================================================
// Navigation Session Management
// ============================================================================

export interface NavigationSession {
  id: string;
  name: string;
  description?: string;
  locations: NavigationLocation[];
  layout: LayoutConfiguration;
  createdAt: Date;
  lastAccessed: Date;
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  projectPath: string;
  totalTimeSpent: number;
  locationCount: number;
  tags: string[];
  isShared: boolean;
  sharedWith?: string[];
  version: number;
}

export interface LayoutConfiguration {
  panelSizes: Map<string, number>;
  visiblePanels: string[];
  minimapSettings: MinimapSettings;
  treeSettings: FileTreeSettings;
  graphSettings: RelationshipGraphSettings;
  breadcrumbSettings: BreadcrumbSettings;
}

// ============================================================================
// Symbol and Relationship Models
// ============================================================================

export interface EnhancedSymbol extends Symbol {
  relationships: Relationship[];
  metadata: SymbolMetadata;
  usage: SymbolUsage;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  source: Symbol;
  target: Symbol;
  strength: number;
  metadata: RelationshipMetadata;
  bidirectional: boolean;
}

export type RelationshipType = 
  | 'calls'
  | 'inherits'
  | 'implements'
  | 'imports'
  | 'exports'
  | 'references'
  | 'defines'
  | 'extends'
  | 'uses'
  | 'contains'
  | 'overrides'
  | 'instantiates';

export interface RelationshipMetadata {
  confidence: number;
  sourceLocation: CodeLocation;
  targetLocation: CodeLocation;
  contextLines: string[];
  isDirectRelation: boolean;
  relationshipDepth: number;
}

export interface SymbolMetadata {
  documentation?: string;
  parameters?: ParameterInfo[];
  returnType?: string;
  accessibility: 'public' | 'private' | 'protected' | 'internal';
  isStatic: boolean;
  isAbstract: boolean;
  isAsync: boolean;
  complexity: number;
  lineCount: number;
  lastModified: Date;
}

export interface SymbolUsage {
  referenceCount: number;
  callCount: number;
  lastUsed: Date;
  usageFrequency: number;
  hotspots: CodeLocation[];
}

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
  description?: string;
}

// ============================================================================
// Visual Components Models
// ============================================================================

export interface MinimapData {
  symbolMap: SymbolDensityMap;
  structureOutline: CodeStructure;
  visibleRegion: Region;
  zoomLevel: number;
  renderCache: Map<string, CanvasImageData>;
}

export interface SymbolDensityMap {
  regions: DensityRegion[];
  maxDensity: number;
  totalSymbols: number;
  lastUpdated: Date;
}

export interface DensityRegion {
  startLine: number;
  endLine: number;
  density: number;
  symbolTypes: Map<string, number>;
  complexity: number;
}

export interface CodeStructure {
  outline: StructureNode[];
  depth: number;
  totalNodes: number;
  lastAnalyzed: Date;
}

export interface StructureNode {
  id: string;
  name: string;
  type: string;
  startLine: number;
  endLine: number;
  children: StructureNode[];
  symbol?: Symbol;
  collapsed: boolean;
}

export interface Region {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

// ============================================================================
// Breadcrumb Navigation Models
// ============================================================================

export interface BreadcrumbSegment {
  id: string;
  name: string;
  path: string;
  type: BreadcrumbType;
  isActive: boolean;
  isClickable: boolean;
  metadata: BreadcrumbMetadata;
  actions: ContextualAction[];
}

export type BreadcrumbType = 
  | 'project'
  | 'directory'
  | 'file'
  | 'namespace'
  | 'class'
  | 'method'
  | 'function'
  | 'property'
  | 'variable';

export interface BreadcrumbMetadata {
  fullPath: string;
  fileSize?: number;
  lastModified?: Date;
  symbolCount?: number;
  gitStatus?: string;
  tooltip: string;
}

export interface BreadcrumbSettings {
  maxSegments: number;
  showFileExtensions: boolean;
  showSymbolTypes: boolean;
  truncationStrategy: 'start' | 'middle' | 'end' | 'intelligent';
  showTooltips: boolean;
}

// ============================================================================
// File Tree Models
// ============================================================================

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  isExpanded: boolean;
  isSelected: boolean;
  children: FileTreeNode[];
  metadata: FileNodeMetadata;
  preview?: FilePreview;
}

export interface FileNodeMetadata {
  size: number;
  lastModified: Date;
  gitStatus: GitFileStatus;
  symbolCount: number;
  fileType: string;
  isHidden: boolean;
  permissions: string;
}

export interface FilePreview {
  symbolCount: number;
  mainSymbols: Symbol[];
  fileSize: number;
  lastModified: Date;
  thumbnail?: string;
  contentSummary: string;
  complexity: number;
  dependencies: string[];
}

export type GitFileStatus = 
  | 'untracked'
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'unmerged'
  | 'clean';

export interface FileTreeSettings {
  showHiddenFiles: boolean;
  showGitStatus: boolean;
  showFileIcons: boolean;
  sortBy: 'name' | 'type' | 'modified' | 'size';
  sortOrder: 'asc' | 'desc';
  virtualScrolling: boolean;
  previewOnHover: boolean;
}

// ============================================================================
// Relationship Graph Models
// ============================================================================

export interface RelationshipGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: GraphLayout;
  filters: RelationshipFilter;
  viewport: GraphViewport;
}

export interface GraphNode {
  id: string;
  symbol: Symbol;
  position: { x: number; y: number };
  size: number;
  color: string;
  isExpanded: boolean;
  isSelected: boolean;
  metadata: GraphNodeMetadata;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: Relationship;
  style: EdgeStyle;
  isVisible: boolean;
}

export interface GraphNodeMetadata {
  degree: number;
  centrality: number;
  cluster: string;
  importance: number;
  lastInteraction: Date;
}

export interface EdgeStyle {
  color: string;
  width: number;
  dashPattern?: number[];
  opacity: number;
  animated: boolean;
}

export interface GraphLayout {
  algorithm: 'force-directed' | 'hierarchical' | 'circular' | 'tree';
  parameters: Map<string, any>;
  iterations: number;
  stabilized: boolean;
}

export interface RelationshipFilter {
  types: Set<RelationshipType>;
  minStrength: number;
  maxDepth: number;
  showBidirectional: boolean;
  hideWeakConnections: boolean;
}

export interface GraphViewport {
  center: { x: number; y: number };
  zoom: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface RelationshipGraphSettings {
  defaultLayout: GraphLayout['algorithm'];
  nodeSize: number;
  edgeWidth: number;
  animationSpeed: number;
  showLabels: boolean;
  clusterNodes: boolean;
  maxNodes: number;
}

// ============================================================================
// Navigation History Models
// ============================================================================

export interface NavigationHistory {
  entries: NavigationHistoryEntry[];
  currentIndex: number;
  sessions: HistorySession[];
  maxEntries: number;
  groupingStrategy: HistoryGroupingStrategy;
}

export interface NavigationHistoryEntry {
  id: string;
  location: NavigationLocation;
  action: NavigationAction;
  duration: number;
  sessionId: string;
  groupId?: string;
  metadata: HistoryEntryMetadata;
}

export interface HistorySession {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  entries: NavigationHistoryEntry[];
  context: NavigationContext;
  isActive: boolean;
}

export interface HistoryEntryMetadata {
  trigger: NavigationTrigger;
  userAction: boolean;
  confidence: number;
  relatedEntries: string[];
  tags: string[];
}

export type NavigationAction = 
  | 'navigate'
  | 'search'
  | 'bookmark'
  | 'reference'
  | 'definition'
  | 'implementation'
  | 'back'
  | 'forward'
  | 'jump';

export type NavigationTrigger = 
  | 'click'
  | 'keyboard'
  | 'search'
  | 'ai-suggestion'
  | 'breadcrumb'
  | 'minimap'
  | 'relationship-graph'
  | 'file-tree'
  | 'bookmark'
  | 'history';

export type HistoryGroupingStrategy = 
  | 'time-based'
  | 'semantic'
  | 'session-based'
  | 'file-based'
  | 'symbol-based';

// ============================================================================
// Quick Actions Models
// ============================================================================

export interface ContextualAction {
  id: string;
  label: string;
  description?: string;
  icon: string;
  shortcut?: KeyboardShortcut;
  category: ActionCategory;
  condition: ActionCondition;
  execute: ActionExecutor;
  metadata: ActionMetadata;
}

export interface KeyboardShortcut {
  key: string;
  modifiers: KeyModifier[];
  description: string;
}

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta';

export type ActionCategory = 
  | 'navigation'
  | 'search'
  | 'refactor'
  | 'analysis'
  | 'bookmark'
  | 'session'
  | 'git'
  | 'ai'
  | 'custom';

export interface ActionCondition {
  symbolTypes?: string[];
  fileTypes?: string[];
  contextTypes?: string[];
  requiresSelection?: boolean;
  requiresProject?: boolean;
  customCondition?: (context: NavigationContext) => boolean;
}

export interface ActionExecutor {
  (context: NavigationContext, params?: any): Promise<ActionResult>;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
  navigationTarget?: NavigationLocation;
  followUpActions?: ContextualAction[];
}

export interface ActionMetadata {
  priority: number;
  isAsync: boolean;
  canBatch: boolean;
  estimatedDuration: number;
  requiresConfirmation: boolean;
  undoable: boolean;
}

// ============================================================================
// Search Models
// ============================================================================

export interface NavigationSearchQuery {
  text: string;
  filters: SearchFilter[];
  scope: SearchScope;
  options: SearchOptions;
}

export interface SearchFilter {
  type: SearchFilterType;
  value: any;
  operator: FilterOperator;
  enabled: boolean;
}

export type SearchFilterType = 
  | 'file-type'
  | 'symbol-type'
  | 'modified-date'
  | 'file-size'
  | 'git-status'
  | 'bookmark'
  | 'session'
  | 'tag'
  | 'complexity';

export type FilterOperator = 
  | 'equals'
  | 'contains'
  | 'starts-with'
  | 'ends-with'
  | 'greater-than'
  | 'less-than'
  | 'between'
  | 'in'
  | 'not-in';

export interface SearchScope {
  type: 'global' | 'project' | 'directory' | 'file' | 'session' | 'history';
  target?: string;
  recursive: boolean;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  fuzzy: boolean;
  maxResults: number;
  sortBy: SearchSortBy;
  includeContent: boolean;
}

export type SearchSortBy = 
  | 'relevance'
  | 'name'
  | 'path'
  | 'modified'
  | 'size'
  | 'type'
  | 'usage';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  item: NavigationLocation | Symbol | FileTreeNode | NavigationSession;
  relevanceScore: number;
  matchHighlights: TextRange[];
  context: SearchResultContext;
}

export type SearchResultType = 
  | 'location'
  | 'symbol'
  | 'file'
  | 'directory'
  | 'session'
  | 'bookmark'
  | 'history';

export interface TextRange {
  start: number;
  end: number;
  text: string;
}

export interface SearchResultContext {
  snippet: string;
  lineNumber?: number;
  filePath?: string;
  symbolPath?: string;
  matchType: 'exact' | 'partial' | 'fuzzy' | 'semantic';
}

// ============================================================================
// Performance and Caching Models
// ============================================================================

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number;
  ttl?: number;
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalSize: number;
  evictionCount: number;
  averageAccessTime: number;
}

export interface PerformanceMetrics {
  navigationResponseTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  backgroundProcessingTime: number;
  renderTime: number;
  searchTime: number;
  symbolAnalysisTime: number;
}

// ============================================================================
// Event System Models
// ============================================================================

export interface NavigationEvent {
  type: NavigationEventType;
  payload: any;
  timestamp: Date;
  source: string;
  target?: string;
  metadata?: any;
}

export type NavigationEventType = 
  | 'location-changed'
  | 'symbol-selected'
  | 'file-opened'
  | 'bookmark-created'
  | 'bookmark-deleted'
  | 'session-saved'
  | 'session-loaded'
  | 'search-performed'
  | 'relationship-expanded'
  | 'minimap-clicked'
  | 'breadcrumb-clicked'
  | 'action-executed'
  | 'error-occurred'
  | 'performance-warning';

export interface EventSubscription {
  id: string;
  eventType: NavigationEventType;
  callback: EventCallback;
  once: boolean;
  priority: number;
}

export interface EventCallback {
  (event: NavigationEvent): void | Promise<void>;
}

// ============================================================================
// Configuration Models
// ============================================================================

export interface NavigationConfig {
  performance: PerformanceConfig;
  ui: UIConfig;
  accessibility: AccessibilityConfig;
  integrations: IntegrationConfig;
  features: FeatureConfig;
}

export interface PerformanceConfig {
  maxHistoryEntries: number;
  cacheSize: number;
  backgroundProcessingEnabled: boolean;
  virtualizationThreshold: number;
  debounceDelay: number;
  maxConcurrentOperations: number;
}

export interface UIConfig {
  defaultLayout: LayoutConfiguration;
  theme: ThemeConfig;
  animations: AnimationConfig;
  customActions: ContextualAction[];
  panelSizes: Map<string, number>;
}

export interface ThemeConfig {
  colorScheme: 'light' | 'dark' | 'auto';
  accentColor: string;
  fontFamily: string;
  fontSize: number;
  iconSet: string;
}

export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: string;
  reducedMotion: boolean;
}

export interface AccessibilityConfig {
  keyboardShortcuts: Map<string, KeyboardShortcut>;
  screenReaderEnabled: boolean;
  highContrastMode: boolean;
  interactionTimeout: number;
  focusIndicators: boolean;
  announceChanges: boolean;
}

export interface IntegrationConfig {
  symbolExplorer: boolean;
  aiChat: boolean;
  bookmarks: boolean;
  git: boolean;
  notes: boolean;
  sessions: boolean;
}

export interface FeatureConfig {
  minimap: boolean;
  relationshipGraph: boolean;
  smartBreadcrumbs: boolean;
  enhancedFileTree: boolean;
  navigationHistory: boolean;
  quickActions: boolean;
  search: boolean;
  sessionManagement: boolean;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface NavigationInterfaceProps {
  currentLocation?: NavigationLocation;
  onLocationChange?: (location: NavigationLocation) => void;
  onSymbolSelect?: (symbol: Symbol) => void;
  config?: Partial<NavigationConfig>;
  className?: string;
}

export interface MinimapSettings {
  zoomLevel: number;
  showSymbolTypes: boolean;
  showComplexity: boolean;
  autoUpdate: boolean;
  renderQuality: 'low' | 'medium' | 'high';
  maxFileSize: number;
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateNavigationLocation = (location: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!location) {
    errors.push('NavigationLocation is required');
    return { isValid: false, errors, warnings };
  }

  if (!location.id || typeof location.id !== 'string') {
    errors.push('NavigationLocation.id must be a non-empty string');
  }

  if (!location.filePath || typeof location.filePath !== 'string') {
    errors.push('NavigationLocation.filePath must be a non-empty string');
  }

  if (!location.position || typeof location.position !== 'object') {
    errors.push('NavigationLocation.position is required');
  } else {
    if (typeof location.position.line !== 'number' || location.position.line < 0) {
      errors.push('NavigationLocation.position.line must be a non-negative number');
    }
    if (typeof location.position.column !== 'number' || location.position.column < 0) {
      errors.push('NavigationLocation.position.column must be a non-negative number');
    }
  }

  if (!location.context || typeof location.context !== 'object') {
    errors.push('NavigationLocation.context is required');
  }

  if (!location.timestamp || !(location.timestamp instanceof Date)) {
    errors.push('NavigationLocation.timestamp must be a valid Date');
  }

  if (!location.metadata || typeof location.metadata !== 'object') {
    errors.push('NavigationLocation.metadata is required');
  }

  return { isValid: errors.length === 0, errors, warnings };
};

export const validateNavigationSession = (session: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!session) {
    errors.push('NavigationSession is required');
    return { isValid: false, errors, warnings };
  }

  if (!session.id || typeof session.id !== 'string') {
    errors.push('NavigationSession.id must be a non-empty string');
  }

  if (!session.name || typeof session.name !== 'string') {
    errors.push('NavigationSession.name must be a non-empty string');
  }

  if (!Array.isArray(session.locations)) {
    errors.push('NavigationSession.locations must be an array');
  } else {
    session.locations.forEach((location: any, index: number) => {
      const locationValidation = validateNavigationLocation(location);
      if (!locationValidation.isValid) {
        errors.push(`NavigationSession.locations[${index}]: ${locationValidation.errors.join(', ')}`);
      }
    });
  }

  if (!session.layout || typeof session.layout !== 'object') {
    errors.push('NavigationSession.layout is required');
  }

  if (!session.createdAt || !(session.createdAt instanceof Date)) {
    errors.push('NavigationSession.createdAt must be a valid Date');
  }

  if (!session.lastAccessed || !(session.lastAccessed instanceof Date)) {
    errors.push('NavigationSession.lastAccessed must be a valid Date');
  }

  if (!session.metadata || typeof session.metadata !== 'object') {
    errors.push('NavigationSession.metadata is required');
  }

  return { isValid: errors.length === 0, errors, warnings };
};

export const validateSymbol = (symbol: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!symbol) {
    errors.push('Symbol is required');
    return { isValid: false, errors, warnings };
  }

  if (!symbol.identifier || typeof symbol.identifier !== 'string') {
    errors.push('Symbol.identifier must be a non-empty string');
  }

  const validKinds = [
    'TSFunction', 'TSClass', 'TSInterface',
    'Struct', 'Enum', 'Trait', 'Function', 'Impl', 'Module', 'Macro',
    'Unknown'
  ];

  if (!symbol.kind || !validKinds.includes(symbol.kind)) {
    errors.push(`Symbol.kind must be one of: ${validKinds.join(', ')}`);
  }

  if (!symbol.location || typeof symbol.location !== 'object') {
    errors.push('Symbol.location is required');
  } else {
    if (!symbol.location.path || typeof symbol.location.path !== 'string') {
      errors.push('Symbol.location.path must be a non-empty string');
    }
    if (typeof symbol.location.line !== 'number' || symbol.location.line < 0) {
      errors.push('Symbol.location.line must be a non-negative number');
    }
    if (typeof symbol.location.column !== 'number' || symbol.location.column < 0) {
      errors.push('Symbol.location.column must be a non-negative number');
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
};

export const validateRelationship = (relationship: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!relationship) {
    errors.push('Relationship is required');
    return { isValid: false, errors, warnings };
  }

  if (!relationship.id || typeof relationship.id !== 'string') {
    errors.push('Relationship.id must be a non-empty string');
  }

  const validTypes: RelationshipType[] = [
    'calls', 'inherits', 'implements', 'imports', 'exports', 'references',
    'defines', 'extends', 'uses', 'contains', 'overrides', 'instantiates'
  ];

  if (!relationship.type || !validTypes.includes(relationship.type)) {
    errors.push(`Relationship.type must be one of: ${validTypes.join(', ')}`);
  }

  if (!relationship.source) {
    errors.push('Relationship.source is required');
  } else {
    const sourceValidation = validateSymbol(relationship.source);
    if (!sourceValidation.isValid) {
      errors.push(`Relationship.source: ${sourceValidation.errors.join(', ')}`);
    }
  }

  if (!relationship.target) {
    errors.push('Relationship.target is required');
  } else {
    const targetValidation = validateSymbol(relationship.target);
    if (!targetValidation.isValid) {
      errors.push(`Relationship.target: ${targetValidation.errors.join(', ')}`);
    }
  }

  if (typeof relationship.strength !== 'number' || relationship.strength < 0 || relationship.strength > 1) {
    errors.push('Relationship.strength must be a number between 0 and 1');
  }

  if (!relationship.metadata || typeof relationship.metadata !== 'object') {
    errors.push('Relationship.metadata is required');
  }

  if (typeof relationship.bidirectional !== 'boolean') {
    errors.push('Relationship.bidirectional must be a boolean');
  }

  return { isValid: errors.length === 0, errors, warnings };
};

// Factory functions for creating valid instances
export const createNavigationLocation = (
  filePath: string,
  position: Position,
  context: NavigationContext,
  metadata?: Partial<LocationMetadata>
): NavigationLocation => {
  return {
    id: `location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    filePath,
    position,
    context,
    timestamp: new Date(),
    metadata: {
      title: filePath.split('/').pop() || filePath,
      description: '',
      tags: [],
      timeSpent: 0,
      visitCount: 1,
      lastAccessed: new Date(),
      isBookmarked: false,
      isFavorite: false,
      ...metadata
    }
  };
};

export const createNavigationSession = (
  name: string,
  projectPath: string,
  description?: string
): NavigationSession => {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    locations: [],
    layout: {
      panelSizes: new Map([
        ['minimap', 200],
        ['fileTree', 250],
        ['relationshipGraph', 300]
      ]),
      visiblePanels: ['minimap', 'fileTree', 'breadcrumbs'],
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
    createdAt: new Date(),
    lastAccessed: new Date(),
    metadata: {
      projectPath,
      totalTimeSpent: 0,
      locationCount: 0,
      tags: [],
      isShared: false,
      version: 1
    }
  };
};

export const createRelationship = (
  type: RelationshipType,
  source: Symbol,
  target: Symbol,
  strength: number = 1.0,
  bidirectional: boolean = false
): Relationship => {
  return {
    id: `relationship-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    source,
    target,
    strength: Math.max(0, Math.min(1, strength)),
    bidirectional,
    metadata: {
      confidence: 1.0,
      sourceLocation: {
        filePath: source.location.path,
        position: {
          line: source.location.line,
          column: source.location.column
        }
      },
      targetLocation: {
        filePath: target.location.path,
        position: {
          line: target.location.line,
          column: target.location.column
        }
      },
      contextLines: [],
      isDirectRelation: true,
      relationshipDepth: 1
    }
  };
};

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================================================
// Error Types
// ============================================================================

export interface NavigationError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  source: string;
  recoverable: boolean;
}

export type NavigationErrorType = 
  | 'SYMBOL_NOT_FOUND'
  | 'FILE_NOT_ACCESSIBLE'
  | 'ANALYSIS_FAILED'
  | 'CACHE_ERROR'
  | 'PERFORMANCE_DEGRADATION'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'INVALID_CONFIGURATION'
  | 'UNKNOWN_ERROR';