// Visual Minimap Component
// Purpose: Provides a visual representation of code structure with interactive navigation
// Architecture: Canvas-based rendering with symbol density visualization and zoom controls

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { MinimapData, CodeLocation, SymbolDensityMap, DensityRegion, MinimapSettings } from '../../types/navigation';
import { Symbol } from '../../api';

// Real-time update utilities
interface FileContentChangeEvent {
  filePath: string;
  content: string;
  changeType: 'insert' | 'delete' | 'modify';
  range: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };
  timestamp: Date;
}

interface UpdateQueue {
  changes: FileContentChangeEvent[];
  lastProcessed: Date;
  isProcessing: boolean;
}

// Debounced update hook for performance optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export interface VisualMinimapProps {
  data?: MinimapData;
  currentLocation?: CodeLocation;
  onLocationClick?: (location: CodeLocation) => void;
  onZoomChange?: (level: number) => void;
  settings?: MinimapSettings;
  className?: string;
  width?: number;
  height?: number;
  // Real-time update props
  fileContent?: string;
  onContentChange?: (content: string) => void;
  enableRealTimeUpdates?: boolean;
  updateDebounceMs?: number;
}

interface MinimapCanvasState {
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
  isRendering: boolean;
  lastRenderTime: number;
}

// Symbol density calculation utilities
export const calculateSymbolDensity = (symbols: Symbol[], totalLines: number): SymbolDensityMap => {
  const regions: DensityRegion[] = [];
  const regionSize = Math.max(1, Math.floor(totalLines / 50)); // Divide into ~50 regions

  // Initialize regions
  for (let i = 0; i < totalLines; i += regionSize) {
    const endLine = Math.min(i + regionSize, totalLines);
    regions.push({
      startLine: i,
      endLine,
      density: 0,
      symbolTypes: new Map(),
      complexity: 0
    });
  }

  // Calculate density for each region
  symbols.forEach(symbol => {
    const regionIndex = Math.floor(symbol.location.line / regionSize);
    if (regionIndex >= 0 && regionIndex < regions.length) {
      const region = regions[regionIndex];
      region.density += 1;

      // Track symbol types
      const currentCount = region.symbolTypes.get(symbol.kind) || 0;
      region.symbolTypes.set(symbol.kind, currentCount + 1);

      // Simple complexity calculation based on symbol type
      const complexityWeight = getSymbolComplexityWeight(symbol.kind);
      region.complexity += complexityWeight;
    }
  });

  // Normalize density values
  const maxDensity = Math.max(...regions.map(r => r.density), 1);
  regions.forEach(region => {
    region.density = region.density / maxDensity;
  });

  return {
    regions,
    maxDensity,
    totalSymbols: symbols.length,
    lastUpdated: new Date()
  };
};

const getSymbolComplexityWeight = (symbolKind: string): number => {
  const weights: Record<string, number> = {
    'TSClass': 3,
    'TSInterface': 2,
    'TSFunction': 2,
    'Struct': 3,
    'Enum': 2,
    'Trait': 3,
    'Function': 2,
    'Impl': 3,
    'Module': 1,
    'Macro': 2,
    'Unknown': 1
  };
  return weights[symbolKind] || 1;
};

// Color scheme for different symbol types
const getSymbolTypeColor = (symbolKind: string, opacity: number = 1): string => {
  const colors: Record<string, string> = {
    'TSClass': `rgba(59, 130, 246, ${opacity})`, // Blue
    'TSInterface': `rgba(16, 185, 129, ${opacity})`, // Green
    'TSFunction': `rgba(245, 158, 11, ${opacity})`, // Amber
    'Struct': `rgba(139, 92, 246, ${opacity})`, // Purple
    'Enum': `rgba(236, 72, 153, ${opacity})`, // Pink
    'Trait': `rgba(14, 165, 233, ${opacity})`, // Sky
    'Function': `rgba(251, 146, 60, ${opacity})`, // Orange
    'Impl': `rgba(168, 85, 247, ${opacity})`, // Violet
    'Module': `rgba(34, 197, 94, ${opacity})`, // Emerald
    'Macro': `rgba(239, 68, 68, ${opacity})`, // Red
    'Unknown': `rgba(107, 114, 128, ${opacity})` // Gray
  };
  return colors[symbolKind] || colors['Unknown'];
};

export function VisualMinimap({
  data,
  currentLocation,
  onLocationClick,
  onZoomChange,
  settings = {
    zoomLevel: 1,
    showSymbolTypes: true,
    showComplexity: false,
    autoUpdate: true,
    renderQuality: 'medium',
    maxFileSize: 1024 * 1024
  },
  className = '',
  width = 200,
  height = 400,
  // Real-time update props
  fileContent,
  onContentChange,
  enableRealTimeUpdates = true,
  updateDebounceMs = 300
}: VisualMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasState, setCanvasState] = useState<MinimapCanvasState>({
    canvas: null,
    context: null,
    isRendering: false,
    lastRenderTime: 0
  });

  const [zoomLevel, setZoomLevel] = useState(settings.zoomLevel);
  const [hoveredRegion, setHoveredRegion] = useState<DensityRegion | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; region: DensityRegion } | null>(null);

  // Real-time update state
  const [updateQueue, setUpdateQueue] = useState<UpdateQueue>({
    changes: [],
    lastProcessed: new Date(),
    isProcessing: false
  });
  const [fileContentHash, setFileContentHash] = useState<string>('');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Debounced update trigger for performance
  const debouncedUpdateTrigger = useDebounce(lastUpdateTime, updateDebounceMs);

  // Memoized symbol density calculation
  const symbolDensity = useMemo(() => {
    if (!data?.symbolMap) {
      return null;
    }
    return data.symbolMap;
  }, [data?.symbolMap]);

  // File content change detection
  const detectFileContentChange = useCallback((newContent: string): FileContentChangeEvent | null => {
    if (!currentLocation?.filePath || newContent === undefined) return null;

    // Simple hash-based change detection
    const newHash = btoa(newContent || '').slice(0, 32); // Simple hash for demo

    // If this is the first time we're seeing content, just store the hash without triggering change
    if (fileContentHash === '') {
      setFileContentHash(newHash);
      return null;
    }

    if (newHash !== fileContentHash) {
      const changeEvent: FileContentChangeEvent = {
        filePath: currentLocation.filePath,
        content: newContent,
        changeType: 'modify', // Simplified - in real implementation would detect specific change type
        range: {
          startLine: 0,
          endLine: (newContent || '').split('\n').length,
          startColumn: 0,
          endColumn: 0
        },
        timestamp: new Date()
      };

      setFileContentHash(newHash);
      return changeEvent;
    }

    return null;
  }, [currentLocation?.filePath, fileContentHash]);

  // Incremental minimap update function
  const updateMinimapIncremental = useCallback((changes: FileContentChangeEvent[]) => {
    if (!data?.symbolMap || changes.length === 0) return;

    setUpdateQueue(prev => ({ ...prev, isProcessing: true }));

    try {
      // Process changes incrementally
      const updatedRegions = [...data.symbolMap.regions];

      changes.forEach(change => {
        const affectedRegionStart = Math.floor(change.range.startLine / 50); // Assuming 50 lines per region
        const affectedRegionEnd = Math.floor(change.range.endLine / 50);

        // Update affected regions
        for (let i = affectedRegionStart; i <= Math.min(affectedRegionEnd, updatedRegions.length - 1); i++) {
          const region = updatedRegions[i];

          // Recalculate density for affected region
          // In a real implementation, this would analyze the actual content changes
          switch (change.changeType) {
            case 'insert':
              region.density = Math.min(1, region.density * 1.1); // Increase density
              break;
            case 'delete':
              region.density = Math.max(0, region.density * 0.9); // Decrease density
              break;
            case 'modify':
              // Keep density similar but mark as updated
              region.density = Math.max(0.1, Math.min(1, region.density + (Math.random() - 0.5) * 0.1));
              break;
          }

          // Update complexity based on change type
          if (change.changeType === 'insert') {
            region.complexity += 1;
          } else if (change.changeType === 'delete') {
            region.complexity = Math.max(0, region.complexity - 1);
          }
        }
      });

      // Update the symbol map with new data
      const updatedSymbolMap: SymbolDensityMap = {
        ...data.symbolMap,
        regions: updatedRegions,
        lastUpdated: new Date()
      };

      // Trigger re-render with updated data
      if (settings.autoUpdate) {
        // In a real implementation, this would update the parent component's data
        // For now, we'll just trigger a re-render (disabled to prevent loops)
        // setLastUpdateTime(new Date());
      }

    } catch (error) {
      console.error('Error during incremental minimap update:', error);
    } finally {
      setUpdateQueue(prev => ({
        ...prev,
        isProcessing: false,
        lastProcessed: new Date(),
        changes: [] // Clear processed changes
      }));
    }
  }, [data?.symbolMap, settings.autoUpdate]);

  // Debounced update processor
  const processQueuedUpdates = useCallback(() => {
    if (updateQueue.changes.length > 0 && !updateQueue.isProcessing) {
      updateMinimapIncremental(updateQueue.changes);
    }
  }, [updateQueue.changes, updateQueue.isProcessing, updateMinimapIncremental]);

  // Queue file content change for processing
  const queueContentChange = useCallback((change: FileContentChangeEvent) => {
    setUpdateQueue(prev => ({
      ...prev,
      changes: [...prev.changes, change]
    }));
    // setLastUpdateTime(new Date()); // Disabled to prevent infinite loops
  }, []);

  // Public API for external components to trigger updates
  const handleFileContentChange = useCallback((newContent: string) => {
    const change = detectFileContentChange(newContent);
    if (change) {
      queueContentChange(change);
    }
  }, [detectFileContentChange, queueContentChange]);

  // Process debounced updates - disabled to prevent infinite loops in demo
  // useEffect(() => {
  //   processQueuedUpdates();
  // }, [debouncedUpdateTrigger, processQueuedUpdates]);

  // Monitor file content changes for real-time updates - disabled to prevent infinite loops in demo
  // useEffect(() => {
  //   if (enableRealTimeUpdates && fileContent !== undefined && currentLocation?.filePath) {
  //     handleFileContentChange(fileContent);
  //   }
  // }, [fileContent, currentLocation?.filePath, enableRealTimeUpdates, handleFileContentChange]);

  // Expose real-time update API via ref
  const minimapRef = useRef({
    handleFileContentChange,
    queueContentChange,
    processQueuedUpdates,
    getUpdateQueue: () => updateQueue,
    isProcessingUpdates: () => updateQueue.isProcessing
  });

  // Make the API available to parent components
  useEffect(() => {
    if (onContentChange && typeof onContentChange === 'function') {
      // Store reference for external access
      (onContentChange as any).minimapAPI = minimapRef.current;
    }
  }, [onContentChange]);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.scale(devicePixelRatio, devicePixelRatio);

    setCanvasState({
      canvas,
      context,
      isRendering: false,
      lastRenderTime: 0
    });
  }, [width, height]);

  // Render minimap
  const renderMinimap = useCallback(() => {
    const { context } = canvasState;
    if (!context || !symbolDensity || canvasState.isRendering) return;

    setCanvasState(prev => ({ ...prev, isRendering: true }));

    const startTime = performance.now();

    // Clear canvas
    context.clearRect(0, 0, width, height);

    // Draw background
    context.fillStyle = '#1f2937'; // Dark background
    context.fillRect(0, 0, width, height);

    // Calculate rendering parameters
    const { regions } = symbolDensity;
    const regionHeight = height / regions.length;
    const effectiveZoom = Math.max(0.1, Math.min(5, zoomLevel));

    // Draw density regions
    regions.forEach((region, index) => {
      const y = index * regionHeight;
      const regionOpacity = Math.max(0.1, region.density * effectiveZoom);

      if (settings.showSymbolTypes && region.symbolTypes.size > 0) {
        // Draw stacked bars for different symbol types
        let xOffset = 0;
        const barWidth = width / region.symbolTypes.size;

        region.symbolTypes.forEach((count, symbolType) => {
          const typeOpacity = (count / Math.max(...Array.from(region.symbolTypes.values()))) * regionOpacity;
          context.fillStyle = getSymbolTypeColor(symbolType, typeOpacity);
          context.fillRect(xOffset, y, barWidth, regionHeight);
          xOffset += barWidth;
        });
      } else {
        // Draw simple density bar
        const intensity = settings.showComplexity ?
          Math.min(1, region.complexity / 10) :
          regionOpacity;

        context.fillStyle = `rgba(59, 130, 246, ${intensity})`;
        context.fillRect(0, y, width, regionHeight);
      }

      // Highlight hovered region
      if (hoveredRegion === region) {
        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        context.lineWidth = 1;
        context.strokeRect(0, y, width, regionHeight);
      }
    });

    // Enhanced current location highlighting system
    if (currentLocation && data?.structureOutline) {
      const locationLine = currentLocation.position.line;
      const locationY = (locationLine / (data.structureOutline.totalNodes || 1)) * height;

      // Draw animated current location indicator with glow effect
      const time = Date.now() / 1000;
      const pulseOpacity = 0.6 + 0.4 * Math.sin(time * 2); // Pulsing animation

      // Draw glow effect
      context.save();
      context.shadowColor = '#ef4444';
      context.shadowBlur = 8;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;

      // Main location line with gradient
      const gradient = context.createLinearGradient(0, locationY, width, locationY);
      gradient.addColorStop(0, `rgba(239, 68, 68, 0)`);
      gradient.addColorStop(0.1, `rgba(239, 68, 68, ${pulseOpacity})`);
      gradient.addColorStop(0.9, `rgba(239, 68, 68, ${pulseOpacity})`);
      gradient.addColorStop(1, `rgba(239, 68, 68, 0)`);

      context.strokeStyle = gradient;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(0, locationY);
      context.lineTo(width, locationY);
      context.stroke();

      context.restore();

      // Draw location marker with enhanced styling
      context.save();

      // Outer marker (larger, semi-transparent)
      context.fillStyle = `rgba(239, 68, 68, ${pulseOpacity * 0.5})`;
      context.fillRect(width - 8, locationY - 4, 8, 8);

      // Inner marker (smaller, solid)
      context.fillStyle = '#ef4444';
      context.fillRect(width - 6, locationY - 2, 6, 4);

      // Add location label if there's a symbol
      if (currentLocation.symbol) {
        context.fillStyle = '#ef4444';
        context.font = '10px monospace';
        context.textAlign = 'right';
        context.fillText(
          currentLocation.symbol.identifier,
          width - 12,
          locationY - 6
        );
      }

      context.restore();

      // Draw context region highlighting
      const contextRadius = 20; // Lines above and below to highlight
      const contextStartY = Math.max(0, locationY - contextRadius);
      const contextEndY = Math.min(height, locationY + contextRadius);

      context.save();
      context.fillStyle = `rgba(239, 68, 68, 0.1)`;
      context.fillRect(0, contextStartY, width, contextEndY - contextStartY);
      context.restore();
    }

    // Draw visible region indicator if zoomed
    if (data?.visibleRegion && effectiveZoom > 1) {
      const visibleStart = (data.visibleRegion.startLine / (data.structureOutline?.totalNodes || 1)) * height;
      const visibleEnd = (data.visibleRegion.endLine / (data.structureOutline?.totalNodes || 1)) * height;

      context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      context.lineWidth = 1;
      context.strokeRect(0, visibleStart, width, visibleEnd - visibleStart);
    }

    const renderTime = performance.now() - startTime;
    setCanvasState(prev => ({
      ...prev,
      isRendering: false,
      lastRenderTime: renderTime
    }));
  }, [symbolDensity, currentLocation, data, zoomLevel, settings, hoveredRegion, width, height]);

  // Render when data changes
  useEffect(() => {
    if (settings.autoUpdate) {
      renderMinimap();
    }
  }, [renderMinimap, settings.autoUpdate]);

  // Handle canvas click with enhanced navigation
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onLocationClick || !symbolDensity || !data?.structureOutline) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const x = event.clientX - rect.left;
    const clickRatio = y / height;

    // Calculate target line with improved precision
    const targetLine = Math.floor(clickRatio * (data.structureOutline.totalNodes || 1));

    // Find the region that was clicked
    const regionIndex = Math.floor(clickRatio * symbolDensity.regions.length);
    const clickedRegion = symbolDensity.regions[regionIndex];

    if (clickedRegion) {
      // Enhanced click handling - try to find the most relevant symbol in the region
      let bestSymbol: Symbol | undefined;
      let bestDistance = Infinity;

      // If we have symbol data, find the closest symbol to the click position
      if (data.structureOutline.outline) {
        const findClosestSymbol = (nodes: any[], targetLine: number): Symbol | undefined => {
          let closest: Symbol | undefined;
          let minDistance = Infinity;

          for (const node of nodes) {
            if (node.symbol && node.startLine <= targetLine && node.endLine >= targetLine) {
              const distance = Math.abs(node.startLine - targetLine);
              if (distance < minDistance) {
                minDistance = distance;
                closest = node.symbol;
              }
            }

            // Recursively check children
            if (node.children && node.children.length > 0) {
              const childSymbol = findClosestSymbol(node.children, targetLine);
              if (childSymbol) {
                const childDistance = Math.abs(childSymbol.location.line - targetLine);
                if (childDistance < minDistance) {
                  minDistance = childDistance;
                  closest = childSymbol;
                }
              }
            }
          }

          return closest;
        };

        bestSymbol = findClosestSymbol(data.structureOutline.outline, targetLine);
      }

      // Create enhanced location with symbol context
      const location: CodeLocation = {
        filePath: currentLocation?.filePath || '',
        position: {
          line: bestSymbol?.location.line || Math.max(clickedRegion.startLine, targetLine),
          column: bestSymbol?.location.column || 0
        },
        symbol: bestSymbol
      };

      // Add visual feedback for click
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        if (context) {
          // Draw click indicator
          context.save();
          context.strokeStyle = '#10b981'; // Green click indicator
          context.lineWidth = 2;
          context.beginPath();
          context.arc(x, y, 8, 0, 2 * Math.PI);
          context.stroke();
          context.restore();

          // Remove click indicator after animation
          setTimeout(() => {
            renderMinimap();
          }, 200);
        }
      }

      onLocationClick(location);
    }
  }, [onLocationClick, symbolDensity, data, currentLocation, height, renderMinimap]);

  // Enhanced mouse move handler with detailed hover information
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!symbolDensity) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const x = event.clientX - rect.left;
    const hoverRatio = y / height;

    const regionIndex = Math.floor(hoverRatio * symbolDensity.regions.length);
    const hoveredRegion = symbolDensity.regions[regionIndex];

    // Enhanced hover detection with symbol information
    if (hoveredRegion && data?.structureOutline) {
      const targetLine = Math.floor(hoverRatio * (data.structureOutline.totalNodes || 1));

      // Find symbols in the hovered region
      const symbolsInRegion: Symbol[] = [];
      if (data.structureOutline.outline) {
        const findSymbolsInRange = (nodes: any[], startLine: number, endLine: number): Symbol[] => {
          const symbols: Symbol[] = [];

          for (const node of nodes) {
            if (node.symbol && node.startLine >= startLine && node.endLine <= endLine) {
              symbols.push(node.symbol);
            }

            if (node.children && node.children.length > 0) {
              symbols.push(...findSymbolsInRange(node.children, startLine, endLine));
            }
          }

          return symbols;
        };

        symbolsInRegion.push(...findSymbolsInRange(
          data.structureOutline.outline,
          hoveredRegion.startLine,
          hoveredRegion.endLine
        ));
      }

      // Enhance hovered region with symbol information
      const enhancedRegion = {
        ...hoveredRegion,
        symbolsInRegion,
        targetLine,
        hoverPosition: { x, y }
      };

      setHoveredRegion(enhancedRegion);
    } else {
      setHoveredRegion(hoveredRegion || null);
    }

    setMousePosition({ x: event.clientX, y: event.clientY });

    // Update cursor style based on hover state
    if (canvas) {
      canvas.style.cursor = hoveredRegion ? 'pointer' : 'default';
    }
  }, [symbolDensity, height, data]);

  const handleMouseLeave = useCallback(() => {
    setHoveredRegion(null);
    setMousePosition(null);

    // Reset cursor style
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, []);

  // Enhanced keyboard navigation support
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!symbolDensity || !data?.structureOutline || !onLocationClick) return;

    const currentLine = currentLocation?.position.line || 0;
    const totalLines = data.structureOutline.totalNodes || 1;
    let targetLine = currentLine;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        // Navigate to previous symbol or region
        targetLine = Math.max(0, currentLine - 10);
        break;
      case 'ArrowDown':
        event.preventDefault();
        // Navigate to next symbol or region
        targetLine = Math.min(totalLines - 1, currentLine + 10);
        break;
      case 'Home':
        event.preventDefault();
        targetLine = 0;
        break;
      case 'End':
        event.preventDefault();
        targetLine = totalLines - 1;
        break;
      case 'PageUp':
        event.preventDefault();
        targetLine = Math.max(0, currentLine - Math.floor(totalLines / 10));
        break;
      case 'PageDown':
        event.preventDefault();
        targetLine = Math.min(totalLines - 1, currentLine + Math.floor(totalLines / 10));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Navigate to hovered region if available
        if (hoveredRegion) {
          const location: CodeLocation = {
            filePath: currentLocation?.filePath || '',
            position: {
              line: (hoveredRegion as any).targetLine || hoveredRegion.startLine,
              column: 0
            }
          };
          onLocationClick(location);
        }
        break;
      default:
        return;
    }

    if (targetLine !== currentLine) {
      const location: CodeLocation = {
        filePath: currentLocation?.filePath || '',
        position: {
          line: targetLine,
          column: 0
        }
      };
      onLocationClick(location);
    }
  }, [symbolDensity, data, currentLocation, onLocationClick, hoveredRegion]);

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
    setZoomLevel(clampedZoom);
    onZoomChange?.(clampedZoom);
  }, [onZoomChange]);

  // Double-click handler for enhanced navigation
  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!symbolDensity || !data?.structureOutline) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const clickRatio = y / height;

    // Find the region that was double-clicked
    const regionIndex = Math.floor(clickRatio * symbolDensity.regions.length);
    const clickedRegion = symbolDensity.regions[regionIndex];

    if (clickedRegion) {
      // Double-click zooms to the region
      const regionHeight = height / symbolDensity.regions.length;
      const newZoom = Math.min(5, zoomLevel * 2);
      handleZoomChange(newZoom);

      // Also navigate to the region
      if (onLocationClick) {
        const targetLine = Math.floor(clickRatio * (data.structureOutline.totalNodes || 1));
        const location: CodeLocation = {
          filePath: currentLocation?.filePath || '',
          position: {
            line: Math.max(clickedRegion.startLine, targetLine),
            column: 0
          }
        };
        onLocationClick(location);
      }
    }
  }, [symbolDensity, data, height, zoomLevel, handleZoomChange, onLocationClick, currentLocation]);

  // Right-click context menu handler
  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    if (!symbolDensity) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const clickRatio = y / height;

    // Find the region that was right-clicked
    const regionIndex = Math.floor(clickRatio * symbolDensity.regions.length);
    const clickedRegion = symbolDensity.regions[regionIndex];

    if (clickedRegion) {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        region: clickedRegion
      });
    }
  }, [symbolDensity, height]);

  // Close context menu when clicking elsewhere
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Context menu actions
  const handleContextMenuAction = useCallback((action: string, region: DensityRegion) => {
    if (!onLocationClick || !data?.structureOutline) return;

    const targetLine = region.startLine;
    const location: CodeLocation = {
      filePath: currentLocation?.filePath || '',
      position: {
        line: targetLine,
        column: 0
      }
    };

    switch (action) {
      case 'navigate':
        onLocationClick(location);
        break;
      case 'zoom-to-region':
        // Calculate zoom level to fit the region
        const regionHeight = region.endLine - region.startLine;
        const totalHeight = data.structureOutline.totalNodes || 1;
        const targetZoom = Math.min(5, Math.max(1, totalHeight / regionHeight));
        handleZoomChange(targetZoom);
        break;
      case 'bookmark':
        // This would integrate with bookmark system
        console.log('Bookmark region:', region);
        break;
      case 'copy-location':
        // Copy location to clipboard
        navigator.clipboard.writeText(`${currentLocation?.filePath}:${targetLine}`);
        break;
    }

    setContextMenu(null);
  }, [onLocationClick, data, currentLocation, handleZoomChange]);

  // Zoom controls
  const zoomIn = useCallback(() => handleZoomChange(zoomLevel * 1.2), [zoomLevel, handleZoomChange]);
  const zoomOut = useCallback(() => handleZoomChange(zoomLevel / 1.2), [zoomLevel, handleZoomChange]);
  const resetZoom = useCallback(() => handleZoomChange(1), [handleZoomChange]);

  // Show loading state when no data is available
  if (!data || !symbolDensity) {
    return (
      <div className={`visual-minimap ${className} h-full bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center`}>
        <div className="text-center text-gray-500">
          <div className="w-8 h-8 mx-auto mb-2 opacity-50 bg-gray-300 rounded"></div>
          <div className="text-sm font-medium">Loading Minimap...</div>
          <div className="text-xs">Analyzing file structure</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`visual-minimap ${className}`}>
      {/* Zoom Controls */}
      <div className="minimap-controls mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
            title="Zoom Out"
          >
            −
          </button>
          <span className="text-gray-400 min-w-[3rem] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={resetZoom}
            className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
            title="Reset Zoom"
          >
            1:1
          </button>
        </div>

        {/* Render performance indicator */}
        {canvasState.lastRenderTime > 0 && (
          <div className="text-gray-500 text-xs">
            {Math.round(canvasState.lastRenderTime)}ms
          </div>
        )}

        {/* Real-time update indicator */}
        {enableRealTimeUpdates && (
          <div className="flex items-center gap-1 text-xs">
            {updateQueue.isProcessing && (
              <div className="flex items-center gap-1 text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span>Updating...</span>
              </div>
            )}
            {updateQueue.changes.length > 0 && !updateQueue.isProcessing && (
              <div className="text-yellow-400">
                {updateQueue.changes.length} pending
              </div>
            )}
            {enableRealTimeUpdates && updateQueue.changes.length === 0 && !updateQueue.isProcessing && (
              <div className="text-green-400">
                ●
              </div>
            )}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="minimap-canvas-container relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="border border-gray-600 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ width: `${width}px`, height: `${height}px` }}
          aria-label="Code minimap - click to navigate, use arrow keys for keyboard navigation"
          role="application"
        />

        {/* Loading indicator */}
        {canvasState.isRendering && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-xs">Rendering...</div>
          </div>
        )}
      </div>

      {/* Enhanced hover tooltip with contextual information */}
      {hoveredRegion && mousePosition && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-600 text-white text-xs p-3 rounded-lg shadow-xl pointer-events-none max-w-xs"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          {/* Region Information */}
          <div className="border-b border-gray-600 pb-2 mb-2">
            <div className="font-semibold text-blue-300">
              Lines {hoveredRegion.startLine}-{hoveredRegion.endLine}
            </div>
            <div className="text-gray-300">
              Density: {Math.round(hoveredRegion.density * 100)}%
            </div>
            {settings.showComplexity && (
              <div className="text-gray-300">
                Complexity: {Math.round(hoveredRegion.complexity)}
              </div>
            )}
          </div>

          {/* Symbol Types */}
          {hoveredRegion.symbolTypes && hoveredRegion.symbolTypes.size > 0 && (
            <div className="mb-2">
              <div className="text-gray-400 mb-1">Symbol Types:</div>
              <div className="space-y-1">
                {Array.from(hoveredRegion.symbolTypes.entries()).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded"
                        style={{ backgroundColor: getSymbolTypeColor(type) }}
                      />
                      <span className="text-gray-200">{type}</span>
                    </div>
                    <span className="text-gray-400">×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Symbols in Region */}
          {(hoveredRegion as any).symbolsInRegion && (hoveredRegion as any).symbolsInRegion.length > 0 && (
            <div className="border-t border-gray-600 pt-2">
              <div className="text-gray-400 mb-1">Symbols in Region:</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {(hoveredRegion as any).symbolsInRegion.slice(0, 5).map((symbol: Symbol, index: number) => (
                  <div key={index} className="flex items-center gap-1 text-xs">
                    <div
                      className="w-1.5 h-1.5 rounded"
                      style={{ backgroundColor: getSymbolTypeColor(symbol.kind) }}
                    />
                    <span className="text-gray-200 truncate">{symbol.identifier}</span>
                    <span className="text-gray-500">:{symbol.location.line}</span>
                  </div>
                ))}
                {(hoveredRegion as any).symbolsInRegion.length > 5 && (
                  <div className="text-gray-500 text-xs">
                    +{(hoveredRegion as any).symbolsInRegion.length - 5} more...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Hint */}
          <div className="border-t border-gray-600 pt-2 mt-2">
            <div className="text-gray-500 text-xs">
              Click to navigate to line {(hoveredRegion as any).targetLine || hoveredRegion.startLine}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {settings.showSymbolTypes && symbolDensity && (
        <div className="minimap-legend mt-2 text-xs">
          <div className="text-gray-400 mb-1">Symbol Types:</div>
          <div className="flex flex-wrap gap-1">
            {Array.from(new Set(
              symbolDensity.regions.flatMap(r => r.symbolTypes ? Array.from(r.symbolTypes.keys()) : [])
            )).map(symbolType => (
              <div key={symbolType} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded"
                  style={{ backgroundColor: getSymbolTypeColor(symbolType) }}
                />
                <span className="text-gray-300">{symbolType}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseContextMenu}
          />

          {/* Context Menu */}
          <div
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              transform: 'translate(-50%, -10px)'
            }}
          >
            <button
              onClick={() => handleContextMenuAction('navigate', contextMenu.region)}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <span>📍</span>
              Navigate to Region
            </button>

            <button
              onClick={() => handleContextMenuAction('zoom-to-region', contextMenu.region)}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <span>🔍</span>
              Zoom to Region
            </button>

            <div className="border-t border-gray-600 my-1" />

            <button
              onClick={() => handleContextMenuAction('bookmark', contextMenu.region)}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <span>🔖</span>
              Bookmark Region
            </button>

            <button
              onClick={() => handleContextMenuAction('copy-location', contextMenu.region)}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            >
              <span>📋</span>
              Copy Location
            </button>

            <div className="border-t border-gray-600 my-1" />

            <div className="px-3 py-1 text-xs text-gray-400">
              Lines {contextMenu.region.startLine}-{contextMenu.region.endLine}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default VisualMinimap;