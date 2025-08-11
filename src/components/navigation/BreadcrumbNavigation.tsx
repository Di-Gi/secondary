// Enhanced Breadcrumb Navigation Component
// Purpose: Shows hierarchical context from project to current symbol with intelligent truncation
// Architecture: Implements enhanced hierarchy display (Project → Directory → File → Symbol)

import React, { useMemo, useState } from 'react';
import { 
  BreadcrumbSegment, 
  BreadcrumbSettings, 
  NavigationLocation,
  BreadcrumbType,
  ContextualAction 
} from '../../types/navigation';
import { Symbol } from '../../api';
import {
  ChevronRight,
  Home,
  Folder,
  FileText,
  Code,
  Package,
  Zap,
  Variable,
  Settings,
  Copy,
  Eye,
  FolderOpen,
  Bookmark
} from 'lucide-react';

export interface BreadcrumbNavigationProps {
  currentLocation?: NavigationLocation;
  segments?: BreadcrumbSegment[];
  onSegmentClick?: (segment: BreadcrumbSegment) => void;
  onContextAction?: (action: ContextualAction, segment: BreadcrumbSegment) => void;
  settings?: Partial<BreadcrumbSettings>;
  className?: string;
}

// Default breadcrumb settings
const DEFAULT_SETTINGS: BreadcrumbSettings = {
  maxSegments: 8,
  showFileExtensions: true,
  showSymbolTypes: true,
  truncationStrategy: 'intelligent',
  showTooltips: true
};

// Icon mapping for different breadcrumb types
const BREADCRUMB_ICONS: Record<BreadcrumbType, React.ComponentType<any>> = {
  project: Home,
  directory: Folder,
  file: FileText,
  namespace: Package,
  class: Code,
  method: Zap,
  function: Zap,
  property: Variable,
  variable: Variable
};

export function BreadcrumbNavigation({
  currentLocation,
  segments: providedSegments,
  onSegmentClick,
  onContextAction,
  settings: userSettings,
  className = ''
}: BreadcrumbNavigationProps) {
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    segment: BreadcrumbSegment;
    x: number;
    y: number;
  } | null>(null);

  // Merge user settings with defaults
  const settings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...userSettings
  }), [userSettings]);

  // Generate breadcrumb segments from current location if not provided
  const segments = useMemo(() => {
    if (providedSegments) {
      return providedSegments;
    }

    if (!currentLocation) {
      return [];
    }

    return generateBreadcrumbSegments(currentLocation, settings);
  }, [currentLocation, providedSegments, settings]);

  // Apply intelligent truncation to segments
  const displaySegments = useMemo(() => {
    return applyIntelligentTruncation(segments, settings);
  }, [segments, settings]);

  // Handle segment click
  const handleSegmentClick = (segment: BreadcrumbSegment) => {
    if (segment.isClickable && onSegmentClick) {
      onSegmentClick(segment);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, segment: BreadcrumbSegment) => {
    e.preventDefault();
    setContextMenu({
      segment,
      x: e.clientX,
      y: e.clientY
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Handle context action
  const handleContextAction = (action: ContextualAction) => {
    if (contextMenu && onContextAction) {
      onContextAction(action, contextMenu.segment);
    }
    closeContextMenu();
  };

  // Generate contextual actions for a segment
  const getContextualActions = (segment: BreadcrumbSegment): ContextualAction[] => {
    const actions: ContextualAction[] = [];

    // Copy path action
    actions.push({
      id: 'copy-path',
      label: 'Copy Path',
      description: 'Copy the full path to clipboard',
      icon: 'Copy',
      category: 'navigation',
      condition: { customCondition: () => true },
      execute: async () => ({ success: true }),
      metadata: {
        priority: 1,
        isAsync: false,
        canBatch: false,
        estimatedDuration: 50,
        requiresConfirmation: false,
        undoable: false
      }
    });

    // Reveal in explorer (for files and directories)
    if (segment.type === 'file' || segment.type === 'directory') {
      actions.push({
        id: 'reveal-in-explorer',
        label: 'Reveal in Explorer',
        description: 'Show in file explorer',
        icon: 'FolderOpen',
        category: 'navigation',
        condition: { customCondition: () => true },
        execute: async () => ({ success: true }),
        metadata: {
          priority: 2,
          isAsync: false,
          canBatch: false,
          estimatedDuration: 100,
          requiresConfirmation: false,
          undoable: false
        }
      });
    }

    // Peek definition (for symbols)
    if (['class', 'function', 'method', 'property', 'variable'].includes(segment.type)) {
      actions.push({
        id: 'peek-definition',
        label: 'Peek Definition',
        description: 'Show definition in popup',
        icon: 'Eye',
        category: 'navigation',
        condition: { customCondition: () => true },
        execute: async () => ({ success: true }),
        metadata: {
          priority: 1,
          isAsync: false,
          canBatch: false,
          estimatedDuration: 150,
          requiresConfirmation: false,
          undoable: false
        }
      });
    }

    // Bookmark location
    actions.push({
      id: 'bookmark-location',
      label: 'Bookmark Location',
      description: 'Add to bookmarks',
      icon: 'Bookmark',
      category: 'bookmark',
      condition: { customCondition: () => true },
      execute: async () => ({ success: true }),
      metadata: {
        priority: 3,
        isAsync: false,
        canBatch: false,
        estimatedDuration: 100,
        requiresConfirmation: false,
        undoable: true
      }
    });

    return actions;
  };

  // Get icon for breadcrumb type
  const getIcon = (type: BreadcrumbType) => {
    const IconComponent = BREADCRUMB_ICONS[type] || FileText;
    return IconComponent;
  };

  // Get segment display name
  const getSegmentDisplayName = (segment: BreadcrumbSegment) => {
    let name = segment.name;
    
    // Handle file extensions
    if (segment.type === 'file' && !settings.showFileExtensions) {
      const lastDotIndex = name.lastIndexOf('.');
      if (lastDotIndex > 0) {
        name = name.substring(0, lastDotIndex);
      }
    }

    // Add symbol type prefix if enabled
    if (settings.showSymbolTypes && 
        ['class', 'method', 'function', 'property', 'variable'].includes(segment.type)) {
      const typePrefix = getSymbolTypePrefix(segment.type);
      if (typePrefix) {
        name = `${typePrefix} ${name}`;
      }
    }

    return name;
  };

  // Get symbol type prefix
  const getSymbolTypePrefix = (type: BreadcrumbType): string => {
    switch (type) {
      case 'class': return '📦';
      case 'method': return '⚡';
      case 'function': return '🔧';
      case 'property': return '🔗';
      case 'variable': return '📝';
      default: return '';
    }
  };

  // Get icon component for action
  const getActionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Copy': return Copy;
      case 'FolderOpen': return FolderOpen;
      case 'Eye': return Eye;
      case 'Bookmark': return Bookmark;
      default: return Code;
    }
  };

  if (displaySegments.length === 0) {
    return null;
  }

  return (
    <nav 
      className={`breadcrumb-navigation flex items-center gap-1 text-sm ${className}`}
      aria-label="Breadcrumb navigation"
    >
      {displaySegments.map((segment, index) => {
        const Icon = getIcon(segment.type);
        const isLast = index === displaySegments.length - 1;
        const displayName = getSegmentDisplayName(segment);

        return (
          <React.Fragment key={segment.id}>
            {/* Separator */}
            {index > 0 && (
              <ChevronRight 
                className="h-3 w-3 text-gray-400 flex-shrink-0" 
                aria-hidden="true"
              />
            )}

            {/* Breadcrumb Segment */}
            <div
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                transition-colors duration-150
                ${segment.isActive 
                  ? 'bg-blue-100 text-blue-800' 
                  : segment.isClickable 
                    ? 'text-gray-600 hover:bg-gray-100 cursor-pointer hover:text-gray-800' 
                    : 'text-gray-500'
                }
                ${isLast ? 'font-semibold' : ''}
              `}
              onClick={() => handleSegmentClick(segment)}
              onContextMenu={(e) => handleContextMenu(e, segment)}
              title={settings.showTooltips ? segment.metadata.tooltip : undefined}
              role={segment.isClickable ? 'button' : undefined}
              tabIndex={segment.isClickable ? 0 : -1}
              onKeyDown={(e) => {
                if (segment.isClickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleSegmentClick(segment);
                }
              }}
            >
              {/* Icon */}
              <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              
              {/* Segment Name */}
              <span className="truncate max-w-32">
                {displayName}
              </span>

              {/* Active indicator */}
              {segment.isActive && (
                <div className="w-1 h-1 bg-blue-600 rounded-full flex-shrink-0" />
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* Truncation indicator */}
      {segments.length > displaySegments.length && (
        <div className="flex items-center gap-1 text-gray-400">
          <ChevronRight className="h-3 w-3" />
          <Settings className="h-3 w-3" />
          <span className="text-xs">+{segments.length - displaySegments.length}</span>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          
          {/* Context Menu */}
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-48"
            style={{
              left: contextMenu.x,
              top: contextMenu.y
            }}
          >
            {getContextualActions(contextMenu.segment).map((action) => {
              const IconComponent = getActionIcon(action.icon);
              return (
                <button
                  key={action.id}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => handleContextAction(action)}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </nav>
  );
}

// Generate breadcrumb segments from navigation location
function generateBreadcrumbSegments(
  location: NavigationLocation, 
  settings: BreadcrumbSettings
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];
  const pathParts = location.filePath.split('/').filter(part => part.length > 0);

  // Add project root
  if (location.context.projectPath) {
    const projectName = location.context.projectPath.split('/').pop() || 'Project';
    segments.push({
      id: `breadcrumb-project-${Date.now()}`,
      name: projectName,
      path: location.context.projectPath,
      type: 'project',
      isActive: false,
      isClickable: true,
      metadata: {
        fullPath: location.context.projectPath,
        tooltip: `Project: ${location.context.projectPath}`
      },
      actions: []
    });
  }

  // Add directory hierarchy
  for (let i = 0; i < pathParts.length - 1; i++) {
    const dirPath = pathParts.slice(0, i + 1).join('/');
    segments.push({
      id: `breadcrumb-dir-${i}-${Date.now()}`,
      name: pathParts[i],
      path: dirPath,
      type: 'directory',
      isActive: false,
      isClickable: true,
      metadata: {
        fullPath: dirPath,
        tooltip: `Directory: ${pathParts[i]}`
      },
      actions: []
    });
  }

  // Add file
  if (pathParts.length > 0) {
    const fileName = pathParts[pathParts.length - 1];
    segments.push({
      id: `breadcrumb-file-${Date.now()}`,
      name: fileName,
      path: location.filePath,
      type: 'file',
      isActive: !location.symbol,
      isClickable: true,
      metadata: {
        fullPath: location.filePath,
        tooltip: `File: ${fileName}`,
        fileSize: undefined,
        lastModified: undefined,
        symbolCount: undefined,
        gitStatus: location.context.gitStatus
      },
      actions: []
    });
  }

  // Add symbol hierarchy if available
  if (location.symbol) {
    segments.push(...generateSymbolHierarchy(location.symbol, location));
  }

  return segments;
}

// Generate symbol hierarchy breadcrumbs with nested structure support
function generateSymbolHierarchy(
  symbol: Symbol, 
  location: NavigationLocation
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];

  // Parse symbol identifier for nested structure (e.g., "MyClass::myMethod", "namespace.Class.method")
  const hierarchyParts = parseSymbolHierarchy(symbol.identifier);
  
  // If we have a nested structure, create breadcrumbs for each level
  if (hierarchyParts.length > 1) {
    let currentPath = '';
    
    hierarchyParts.forEach((part, index) => {
      const isLast = index === hierarchyParts.length - 1;
      const partType = inferSymbolTypeFromContext(part, index, hierarchyParts, symbol.kind);
      
      // Build cumulative path for navigation
      currentPath = currentPath ? `${currentPath}.${part.name}` : part.name;
      
      segments.push({
        id: `breadcrumb-symbol-${index}-${Date.now()}`,
        name: part.name,
        path: location.filePath,
        type: partType,
        isActive: isLast,
        isClickable: true,
        metadata: {
          fullPath: `${location.filePath}:${symbol.location.line}:${symbol.location.column}`,
          tooltip: `${partType}: ${part.name}${isLast ? ` at line ${symbol.location.line}` : ''}`,
          symbolCount: part.memberCount
        },
        actions: []
      });
    });
  } else {
    // Single symbol, no nesting
    const symbolType = mapSymbolKindToBreadcrumbType(symbol.kind);
    
    segments.push({
      id: `breadcrumb-symbol-${Date.now()}`,
      name: symbol.identifier,
      path: location.filePath,
      type: symbolType,
      isActive: true,
      isClickable: true,
      metadata: {
        fullPath: `${location.filePath}:${symbol.location.line}:${symbol.location.column}`,
        tooltip: `${symbol.kind}: ${symbol.identifier} at line ${symbol.location.line}`
      },
      actions: []
    });
  }

  return segments;
}

// Interface for parsed symbol hierarchy parts
interface SymbolHierarchyPart {
  name: string;
  memberCount?: number;
  context?: string;
}

// Parse symbol identifier into hierarchy parts
function parseSymbolHierarchy(identifier: string): SymbolHierarchyPart[] {
  // Handle different separator patterns
  const separators = ['::', '.', '#', '->'];
  let parts: string[] = [identifier];
  
  // Try each separator to find the best match
  for (const separator of separators) {
    if (identifier.includes(separator)) {
      parts = identifier.split(separator);
      break;
    }
  }
  
  // Handle special cases like generics or templates
  return parts.map(part => {
    // Clean up generic/template syntax
    const cleanName = part.replace(/<.*?>|\[.*?\]/g, '').trim();
    
    return {
      name: cleanName || part,
      context: part !== cleanName ? part : undefined
    };
  }).filter(part => part.name.length > 0);
}

// Infer symbol type from context within hierarchy
function inferSymbolTypeFromContext(
  part: SymbolHierarchyPart, 
  index: number, 
  allParts: SymbolHierarchyPart[], 
  originalKind: string
): BreadcrumbType {
  const isLast = index === allParts.length - 1;
  
  // If it's the last part, use the original symbol kind
  if (isLast) {
    return mapSymbolKindToBreadcrumbType(originalKind);
  }
  
  // Infer type based on position and naming patterns
  const name = part.name.toLowerCase();
  
  // First part is often a namespace or module
  if (index === 0) {
    if (name.includes('namespace') || name.includes('module') || name.includes('pkg')) {
      return 'namespace';
    }
  }
  
  // Middle parts are often classes or interfaces
  if (index < allParts.length - 1) {
    // Check naming conventions
    if (name[0] === name[0].toUpperCase()) { // PascalCase suggests class/interface
      return 'class';
    }
    
    if (name.includes('class') || name.includes('interface') || name.includes('struct')) {
      return 'class';
    }
    
    if (name.includes('trait') || name.includes('protocol')) {
      return 'class';
    }
  }
  
  // Default to namespace for intermediate levels
  return 'namespace';
}

// Map symbol kind to breadcrumb type
function mapSymbolKindToBreadcrumbType(kind: string): BreadcrumbType {
  switch (kind.toLowerCase()) {
    case 'tsfunction':
    case 'function':
      return 'function';
    case 'tsclass':
    case 'struct':
      return 'class';
    case 'tsinterface':
    case 'trait':
      return 'class';
    case 'module':
    case 'namespace':
      return 'namespace';
    case 'enum':
      return 'class';
    case 'impl':
      return 'class';
    case 'macro':
      return 'function';
    default:
      return 'variable';
  }
}

// Apply intelligent truncation to breadcrumb segments
function applyIntelligentTruncation(
  segments: BreadcrumbSegment[], 
  settings: BreadcrumbSettings
): BreadcrumbSegment[] {
  if (segments.length <= settings.maxSegments) {
    return segments;
  }

  switch (settings.truncationStrategy) {
    case 'start':
      return segments.slice(-settings.maxSegments);
    
    case 'end':
      return segments.slice(0, settings.maxSegments);
    
    case 'middle':
      const start = Math.floor(settings.maxSegments / 2);
      const end = segments.length - Math.ceil(settings.maxSegments / 2);
      return [
        ...segments.slice(0, start),
        ...segments.slice(end)
      ];
    
    case 'intelligent':
    default:
      return applyIntelligentTruncationStrategy(segments, settings.maxSegments);
  }
}

// Intelligent truncation strategy that preserves important segments
function applyIntelligentTruncationStrategy(
  segments: BreadcrumbSegment[], 
  maxSegments: number
): BreadcrumbSegment[] {
  if (segments.length <= maxSegments) {
    return segments;
  }

  // Priority order: active segment, file, project, then directories
  const priorities: Record<BreadcrumbType, number> = {
    project: 5,
    file: 4,
    class: 3,
    function: 3,
    method: 3,
    namespace: 2,
    directory: 1,
    property: 1,
    variable: 1
  };

  // Always keep the active segment and the last segment
  const activeSegment = segments.find(s => s.isActive);
  const lastSegment = segments[segments.length - 1];
  const firstSegment = segments[0]; // Usually project

  const mustKeep = new Set([
    activeSegment?.id,
    lastSegment?.id,
    firstSegment?.id
  ].filter(Boolean));

  // Sort remaining segments by priority
  const remainingSegments = segments.filter(s => !mustKeep.has(s.id));
  remainingSegments.sort((a, b) => (priorities[b.type] || 0) - (priorities[a.type] || 0));

  // Build final segment list
  const result: BreadcrumbSegment[] = [];
  const toInclude = new Set(mustKeep);

  // Add highest priority segments until we reach the limit
  for (const segment of remainingSegments) {
    if (result.length + mustKeep.size < maxSegments) {
      toInclude.add(segment.id);
    } else {
      break;
    }
  }

  // Return segments in original order, filtered by what to include
  return segments.filter(s => toInclude.has(s.id));
}

export default BreadcrumbNavigation;