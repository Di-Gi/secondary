// Enhanced Navigation Interface - Main Component
// Purpose: Spatial and visual navigation interface focused on code structure and relationships
// Architecture: Composite component providing minimap, symbol relationships, and contextual navigation

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  NavigationLocation,
  NavigationConfig,
  LayoutConfiguration
} from '../../types/navigation';
import { Symbol } from '../../api';
import {
  Map,
  GitBranch,
  Search,

  Code,
  FileText,
  Layers,
  Zap,
  Target,
  Network,
  Eye
} from 'lucide-react';

// Component imports - integrating implemented components
import { VisualMinimap } from './VisualMinimap';
import { SymbolRelationshipGraph } from './SymbolRelationshipGraph';
import { EnhancedFileTree } from './EnhancedFileTree';
import { QuickActionToolbar } from './QuickActionToolbar';
import { BreadcrumbNavigation } from './BreadcrumbNavigation';
import { api } from '../../api';

export interface NavigationInterfaceProps {
  currentLocation?: NavigationLocation;
  onLocationChange?: (location: NavigationLocation) => void;
  onSymbolSelect?: (symbol: Symbol) => void;
  config?: Partial<NavigationConfig>;
  className?: string;
}

export function NavigationInterface({
  currentLocation,
  onLocationChange,
  onSymbolSelect,
  config,
  className = ''
}: NavigationInterfaceProps) {
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [layout, setLayout] = useState<LayoutConfiguration | null>(null);

  // UI state for spatial navigation features
  const [minimapZoom, setMinimapZoom] = useState(1);
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null);
  const [minimapData, setMinimapData] = useState<any>(null);
  const [, setFileStructure] = useState<any>(null);

  // Initialize navigation interface with default layout
  useEffect(() => {
    const initializeNavigation = async () => {
      try {
        // Load default configuration for spatial navigation
        const defaultLayout: LayoutConfiguration = {
          panelSizes: new Map<string, number>([
            ['minimap', 300],
            ['fileTree', 250],
            ['relationshipGraph', 400]
          ]),
          visiblePanels: ['minimap', 'breadcrumbs', 'relationships'],
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
        };

        setLayout(defaultLayout);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize navigation interface:', error);
      }
    };

    initializeNavigation();
  }, [config]);

  // Handle symbol selection for relationship visualization
  const handleSymbolSelect = (symbol: Symbol) => {
    setSelectedSymbol(symbol);
    onSymbolSelect?.(symbol);
  };

  // Load minimap data when current location changes
  useEffect(() => {
    const loadMinimapData = async () => {
      if (!currentLocation?.filePath) return;

      try {
        const structure = await api.analyzeFileStructure(currentLocation.filePath);
        setFileStructure(structure);
        
        // Create minimap data from structure
        const minimapData = {
          symbolMap: structure.symbolDensity,
          structureOutline: structure.outline,
          visibleRegion: {
            startLine: Math.max(0, currentLocation.position.line - 20),
            endLine: currentLocation.position.line + 20,
            startColumn: 0,
            endColumn: 100
          },
          zoomLevel: minimapZoom,
          renderCache: new Map()
        };
        
        setMinimapData(minimapData);
      } catch (error) {
        console.error('Failed to load minimap data:', error);
      }
    };

    loadMinimapData();
  }, [currentLocation, minimapZoom]);

  // Handle minimap location clicks
  const handleMinimapLocationClick = (location: any) => {
    if (onLocationChange) {
      const navigationLocation: NavigationLocation = {
        id: `nav-${Date.now()}`,
        filePath: location.filePath,
        position: location.position,
        context: {
          projectPath: currentLocation?.context.projectPath || '',
          breadcrumbs: [],
          relatedSymbols: []
        },
        timestamp: new Date(),
        metadata: {
          title: location.symbol?.identifier || `Line ${location.position.line}`,
          description: location.symbol ? `${location.symbol.kind} in ${location.filePath}` : '',
          tags: location.symbol ? [location.symbol.kind.toLowerCase()] : [],
          visitCount: 1,
          lastAccessed: new Date(),
          isBookmarked: false,
          isFavorite: false
        }
      };
      onLocationChange(navigationLocation);
    }
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (segment: any) => {
    if (onLocationChange && segment.path) {
      const navigationLocation: NavigationLocation = {
        id: `nav-breadcrumb-${Date.now()}`,
        filePath: segment.path,
        position: segment.position || { line: 1, column: 1 },
        context: {
          projectPath: currentLocation?.context.projectPath || '',
          breadcrumbs: [],
          relatedSymbols: []
        },
        timestamp: new Date(),
        metadata: {
          title: segment.name,
          description: `Navigate to ${segment.type}: ${segment.name}`,
          tags: [segment.type],
          visitCount: 1,
          lastAccessed: new Date(),
          isBookmarked: false,
          isFavorite: false
        }
      };
      onLocationChange(navigationLocation);
    }
  };

  // Get contextual actions based on current location
  const contextualActions = useMemo(() => {
    if (!currentLocation || !selectedSymbol) return [];

    const actions: any[] = [];

    // Symbol-specific actions
    if (selectedSymbol.kind === 'TSFunction' || selectedSymbol.kind === 'Function') {
      actions.push(
        { 
          id: 'find-references', 
          label: 'Find References', 
          icon: Search,
          category: 'navigation' as const,
          condition: () => true,
          execute: () => console.log('Find references'),
          metadata: { priority: 1, isAsync: false, canBatch: false, estimatedDuration: 100, requiresConfirmation: false, undoable: false }
        },
        { 
          id: 'show-call-hierarchy', 
          label: 'Call Hierarchy', 
          icon: GitBranch,
          category: 'analysis' as const,
          condition: () => true,
          execute: () => console.log('Show call hierarchy'),
          metadata: { priority: 2, isAsync: false, canBatch: false, estimatedDuration: 200, requiresConfirmation: false, undoable: false }
        }
      );
    }

    if (selectedSymbol.kind === 'TSClass' || selectedSymbol.kind === 'Struct') {
      actions.push(
        { 
          id: 'show-inheritance', 
          label: 'Show Inheritance', 
          icon: Network,
          category: 'analysis' as const,
          condition: () => true,
          execute: () => console.log('Show inheritance'),
          metadata: { priority: 1, isAsync: false, canBatch: false, estimatedDuration: 150, requiresConfirmation: false, undoable: false }
        },
        { 
          id: 'view-members', 
          label: 'View Members', 
          icon: Layers,
          category: 'navigation' as const,
          condition: () => true,
          execute: () => console.log('View members'),
          metadata: { priority: 2, isAsync: false, canBatch: false, estimatedDuration: 100, requiresConfirmation: false, undoable: false }
        }
      );
    }

    // Universal actions
    actions.push(
      { 
        id: 'go-to-definition', 
        label: 'Go to Definition', 
        icon: Target,
        category: 'navigation' as const,
        condition: () => true,
        execute: () => console.log('Go to definition'),
        metadata: { priority: 0, isAsync: false, canBatch: false, estimatedDuration: 50, requiresConfirmation: false, undoable: false }
      },
      { 
        id: 'peek-definition', 
        label: 'Peek Definition', 
        icon: Eye,
        category: 'navigation' as const,
        condition: () => true,
        execute: () => console.log('Peek definition'),
        metadata: { priority: 1, isAsync: false, canBatch: false, estimatedDuration: 75, requiresConfirmation: false, undoable: false }
      }
    );

    return actions;
  }, [currentLocation, selectedSymbol]);

  if (!isInitialized || !layout) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-sm text-gray-500">Initializing spatial navigation interface...</div>
      </div>
    );
  }

  return (
    <div className={`enhanced-navigation-interface h-full flex flex-col ${className}`}>
      {/* Navigation Header - Enhanced Breadcrumbs */}
      <div className="navigation-header border-b bg-background p-3">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-gray-500" />
          <BreadcrumbNavigation
            currentLocation={currentLocation}
            onSegmentClick={handleBreadcrumbClick}
            settings={layout.breadcrumbSettings}
            className="flex-1"
          />
          {currentLocation && (
            <span className="text-xs text-gray-500 ml-2">
              Line {currentLocation.position.line}:{currentLocation.position.column}
            </span>
          )}
        </div>
      </div>

      {/* Navigation Body - Spatial Layout */}
      <div className="navigation-body flex-1 flex">
        {/* Left Panel - Visual Minimap */}
        {layout.visiblePanels.includes('minimap') && (
          <div
            className="minimap-panel border-r bg-background"
            style={{ width: layout.panelSizes.get('minimap') || 300 }}
          >
            <Card className="h-full border-0 rounded-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Code Structure
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMinimapZoom(Math.max(0.5, minimapZoom - 0.25))}
                      className="h-6 w-6 p-0"
                    >
                      -
                    </Button>
                    <span className="text-xs text-gray-500 w-8 text-center">
                      {Math.round(minimapZoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMinimapZoom(Math.min(2, minimapZoom + 0.25))}
                      className="h-6 w-6 p-0"
                    >
                      +
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-2">
                {minimapData ? (
                  <VisualMinimap
                    data={minimapData}
                    currentLocation={currentLocation ? {
                      filePath: currentLocation.filePath,
                      position: currentLocation.position,
                      symbol: currentLocation.symbol
                    } : undefined}
                    onLocationClick={handleMinimapLocationClick}
                    onZoomChange={setMinimapZoom}
                    settings={{
                      zoomLevel: minimapZoom,
                      showSymbolTypes: true,
                      showComplexity: false,
                      autoUpdate: true,
                      renderQuality: 'medium',
                      maxFileSize: 1024 * 1024
                    }}
                    width={280}
                    height={350}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="h-full bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div className="text-sm font-medium">Loading Minimap...</div>
                      <div className="text-xs">Analyzing file structure</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Center Panel - Symbol Relationships */}
        <div className="main-content-panel flex-1 flex flex-col">
          {layout.visiblePanels.includes('relationships') && (
            <div className="relationship-graph-container flex-1 bg-background">
              <Card className="h-full border-0 rounded-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    Symbol Relationships
                    {selectedSymbol && (
                      <span className="text-xs text-gray-500 ml-2">
                        {selectedSymbol.identifier} ({selectedSymbol.kind})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4">
                  <SymbolRelationshipGraph
                    centerSymbol={selectedSymbol || undefined}
                    onSymbolSelect={handleSymbolSelect}
                    className="h-full"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Panel - Contextual Actions & File Tree */}
        <div className="side-panel border-l bg-background" style={{ width: 280 }}>
          {/* Contextual Quick Actions */}
          <div className="quick-actions-container border-b">
            <Card className="border-0 rounded-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <QuickActionToolbar
                  availableActions={contextualActions}
                  currentContext={currentLocation?.context}
                  onActionExecute={(action) => console.log(`Execute: ${action.id}`)}
                  className="h-full"
                />
              </CardContent>
            </Card>
          </div>

          {/* Enhanced File Tree Preview */}
          <div className="file-tree-container flex-1">
            <Card className="h-full border-0 rounded-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  File Context
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-3">
                  {currentLocation ? (
                    <>
                      <div className="text-xs text-gray-600">
                        <div className="font-medium">{currentLocation.filePath.split('/').pop()}</div>
                        <div className="text-gray-500 truncate">{currentLocation.filePath}</div>
                      </div>

                      {currentLocation.symbol && (
                        <div className="p-2 bg-gray-50 rounded text-xs">
                          <div className="font-medium text-gray-800">
                            {currentLocation.symbol.identifier}
                          </div>
                          <div className="text-gray-600">
                            {currentLocation.symbol.kind}
                          </div>
                          <div className="text-gray-500 mt-1">
                            Line {currentLocation.symbol.location.line}
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-3">
                        <EnhancedFileTree
                          rootPath={currentLocation.context.projectPath}
                          className="h-32"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <div className="text-xs">No location selected</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Navigation Footer - Status */}
      <div className="navigation-footer border-t bg-background p-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Spatial Navigation Active</span>
            {selectedSymbol && (
              <span>Symbol: {selectedSymbol.identifier}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Zoom: {Math.round(minimapZoom * 100)}%</span>
            <span>•</span>
            <span>Layout: {layout.visiblePanels.join(', ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Default export for easier importing
export default NavigationInterface;