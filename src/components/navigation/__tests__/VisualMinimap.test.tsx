// Visual Minimap Component Tests
// Purpose: Unit tests for the VisualMinimap component and its utilities
// Architecture: Tests symbol density calculation and component rendering

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VisualMinimap, { calculateSymbolDensity } from '../VisualMinimap';
import { MinimapData, CodeLocation } from '../../../types/navigation';
import { Symbol } from '../../../api';

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1,
});

// Mock performance.now
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now())
  }
});

describe('VisualMinimap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockSymbols: Symbol[] = [
    {
      identifier: 'TestClass',
      kind: 'TSClass',
      location: { path: '/test.ts', line: 10, column: 1 }
    },
    {
      identifier: 'testFunction',
      kind: 'TSFunction',
      location: { path: '/test.ts', line: 20, column: 1 }
    },
    {
      identifier: 'TestInterface',
      kind: 'TSInterface',
      location: { path: '/test.ts', line: 30, column: 1 }
    }
  ];

  const mockMinimapData: MinimapData = {
    symbolMap: {
      regions: [
        {
          startLine: 0,
          endLine: 25,
          density: 0.6,
          symbolTypes: new Map([['TSClass', 1], ['TSFunction', 1]]),
          complexity: 5
        },
        {
          startLine: 25,
          endLine: 50,
          density: 0.4,
          symbolTypes: new Map([['TSInterface', 1]]),
          complexity: 2
        }
      ],
      maxDensity: 2,
      totalSymbols: 3,
      lastUpdated: new Date()
    },
    structureOutline: {
      outline: [],
      depth: 2,
      totalNodes: 50,
      lastAnalyzed: new Date()
    },
    visibleRegion: {
      startLine: 0,
      endLine: 50,
      startColumn: 0,
      endColumn: 80
    },
    zoomLevel: 1,
    renderCache: new Map()
  };

  const mockCurrentLocation: CodeLocation = {
    filePath: '/test.ts',
    position: { line: 15, column: 5 }
  };

  describe('Component Rendering', () => {
    it('should render minimap with zoom controls', () => {
      render(<VisualMinimap />);
      
      // Should render zoom controls
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
      expect(screen.getByTitle('Reset Zoom')).toBeInTheDocument();
      
      // Should show initial zoom level
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should render with minimap data', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      // Should render without errors when data is provided
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });

    it('should show symbol type legend when enabled', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          settings={{ 
            zoomLevel: 1,
            showSymbolTypes: true,
            showComplexity: false,
            autoUpdate: true,
            renderQuality: 'medium',
            maxFileSize: 1024 * 1024
          }}
        />
      );
      
      expect(screen.getByText('Symbol Types:')).toBeInTheDocument();
    });
  });

  describe('Zoom Controls', () => {
    it('should handle zoom in', () => {
      const onZoomChange = vi.fn();
      render(<VisualMinimap onZoomChange={onZoomChange} />);
      
      const zoomInButton = screen.getByTitle('Zoom In');
      fireEvent.click(zoomInButton);
      
      expect(onZoomChange).toHaveBeenCalledWith(1.2);
    });

    it('should handle zoom out', () => {
      const onZoomChange = vi.fn();
      render(<VisualMinimap onZoomChange={onZoomChange} />);
      
      const zoomOutButton = screen.getByTitle('Zoom Out');
      fireEvent.click(zoomOutButton);
      
      expect(onZoomChange).toHaveBeenCalledWith(1 / 1.2);
    });

    it('should handle zoom reset', () => {
      const onZoomChange = vi.fn();
      render(<VisualMinimap onZoomChange={onZoomChange} />);
      
      const resetButton = screen.getByTitle('Reset Zoom');
      fireEvent.click(resetButton);
      
      expect(onZoomChange).toHaveBeenCalledWith(1);
    });

    it('should clamp zoom levels to valid range', () => {
      const onZoomChange = vi.fn();
      render(<VisualMinimap onZoomChange={onZoomChange} />);
      
      const zoomOutButton = screen.getByTitle('Zoom Out');
      
      // Zoom out multiple times to test minimum clamp
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zoomOutButton);
      }
      
      // Check that the last call respects the minimum zoom
      const lastCall = onZoomChange.mock.calls[onZoomChange.mock.calls.length - 1];
      expect(lastCall[0]).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('Canvas Interactions', () => {
    it('should render canvas element', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle component without errors when no data provided', () => {
      render(<VisualMinimap />);
      
      // Should render without throwing errors
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });
  });

  describe('Settings and Configuration', () => {
    it('should render with different settings', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          settings={{ 
            zoomLevel: 1,
            showSymbolTypes: false,
            showComplexity: true,
            autoUpdate: true,
            renderQuality: 'medium',
            maxFileSize: 1024 * 1024
          }}
        />
      );
      
      // Should render without errors
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });

    it('should handle custom dimensions', () => {
      render(<VisualMinimap width={300} height={600} />);
      
      // Should render without errors
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });
  });
});

describe('Minimap Interactivity', () => {
  const mockOnLocationClick = vi.fn();
  const mockOnZoomChange = vi.fn();

  // Move mock data to this scope so it's available for all interactivity tests
  const mockMinimapData: MinimapData = {
    symbolMap: {
      regions: [
        {
          startLine: 0,
          endLine: 25,
          density: 0.6,
          symbolTypes: new Map([['TSClass', 1], ['TSFunction', 1]]),
          complexity: 5
        },
        {
          startLine: 25,
          endLine: 50,
          density: 0.4,
          symbolTypes: new Map([['TSInterface', 1]]),
          complexity: 2
        }
      ],
      maxDensity: 2,
      totalSymbols: 3,
      lastUpdated: new Date()
    },
    structureOutline: {
      outline: [],
      depth: 2,
      totalNodes: 50,
      lastAnalyzed: new Date()
    },
    visibleRegion: {
      startLine: 0,
      endLine: 50,
      startColumn: 0,
      endColumn: 80
    },
    zoomLevel: 1,
    renderCache: new Map()
  };

  const mockCurrentLocation: CodeLocation = {
    filePath: '/test.ts',
    position: { line: 15, column: 5 }
  };

  beforeEach(() => {
    mockOnLocationClick.mockClear();
    mockOnZoomChange.mockClear();
  });

  describe('Click-to-Navigate Functionality', () => {
    it('should handle canvas click and call onLocationClick', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          onLocationClick={mockOnLocationClick}
        />
      );
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // Simulate click on canvas
      fireEvent.click(canvas!, { clientY: 100 });
      
      expect(mockOnLocationClick).toHaveBeenCalled();
      const callArgs = mockOnLocationClick.mock.calls[0][0];
      expect(callArgs).toHaveProperty('filePath');
      expect(callArgs).toHaveProperty('position');
      expect(callArgs.position).toHaveProperty('line');
      expect(callArgs.position).toHaveProperty('column');
    });

    it('should calculate correct target line from click position', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          onLocationClick={mockOnLocationClick}
          height={400}
        />
      );
      
      const canvas = document.querySelector('canvas');
      
      // Click at 25% height (should be around line 12-13 for 50 total lines)
      fireEvent.click(canvas!, { clientY: 100 });
      
      expect(mockOnLocationClick).toHaveBeenCalled();
      const callArgs = mockOnLocationClick.mock.calls[0][0];
      expect(callArgs.position.line).toBeGreaterThanOrEqual(0);
      expect(callArgs.position.line).toBeLessThanOrEqual(50);
    });

    it('should provide visual feedback on click', async () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          onLocationClick={mockOnLocationClick}
        />
      );
      
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const mockGetContext = vi.fn().mockReturnValue({
        save: vi.fn(),
        restore: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn()
      });
      
      canvas.getContext = mockGetContext;
      
      fireEvent.click(canvas, { clientX: 50, clientY: 100 });
      
      expect(mockGetContext).toHaveBeenCalledWith('2d');
    });
  });

  describe('Hover Tooltips with Contextual Information', () => {
    it('should show tooltip on hover', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      const canvas = document.querySelector('canvas');
      
      // Simulate mouse move to trigger hover
      fireEvent.mouseMove(canvas!, { clientX: 100, clientY: 100 });
      
      // Should show tooltip with region information
      expect(screen.getByText(/Lines \d+-\d+/)).toBeInTheDocument();
      expect(screen.getByText(/Density: \d+%/)).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      const canvas = document.querySelector('canvas');
      
      // Show tooltip
      fireEvent.mouseMove(canvas!, { clientX: 100, clientY: 100 });
      expect(screen.getByText(/Lines \d+-\d+/)).toBeInTheDocument();
      
      // Hide tooltip
      fireEvent.mouseLeave(canvas!);
      expect(screen.queryByText(/Lines \d+-\d+/)).not.toBeInTheDocument();
    });

    it('should show symbol types in tooltip when enabled', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          settings={{
            zoomLevel: 1,
            showSymbolTypes: true,
            showComplexity: false,
            autoUpdate: true,
            renderQuality: 'medium',
            maxFileSize: 1024 * 1024
          }}
        />
      );
      
      const canvas = document.querySelector('canvas');
      fireEvent.mouseMove(canvas!, { clientX: 100, clientY: 100 });
      
      // Check for symbol types in tooltip (should have multiple instances)
      expect(screen.getAllByText('Symbol Types:')).toHaveLength(2); // One in tooltip, one in legend
      expect(screen.getAllByText('TSClass')).toHaveLength(2); // One in tooltip, one in legend
      expect(screen.getAllByText('TSFunction')).toHaveLength(2); // One in tooltip, one in legend
    });

    it('should show complexity information when enabled', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          settings={{
            zoomLevel: 1,
            showSymbolTypes: false,
            showComplexity: true,
            autoUpdate: true,
            renderQuality: 'medium',
            maxFileSize: 1024 * 1024
          }}
        />
      );
      
      const canvas = document.querySelector('canvas');
      fireEvent.mouseMove(canvas!, { clientX: 100, clientY: 100 });
      
      expect(screen.getByText(/Complexity: \d+/)).toBeInTheDocument();
    });
  });

  describe('Current Location Highlighting System', () => {
    it('should highlight current location when provided', () => {
      const mockCanvas = document.createElement('canvas');
      const mockContext = {
        clearRect: vi.fn(),
        fillStyle: '',
        fillRect: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn()
        }),
        font: '',
        textAlign: '',
        fillText: vi.fn(),
        scale: vi.fn()
      };
      
      mockCanvas.getContext = vi.fn().mockReturnValue(mockContext);
      
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      // The component should render without errors when current location is provided
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });

    it('should handle missing current location gracefully', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
        />
      );
      
      // Should render without errors even without current location
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle arrow key navigation', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          onLocationClick={mockOnLocationClick}
        />
      );
      
      const canvas = document.querySelector('canvas');
      canvas?.focus();
      
      // Test arrow down navigation
      fireEvent.keyDown(canvas!, { key: 'ArrowDown' });
      
      expect(mockOnLocationClick).toHaveBeenCalled();
      const callArgs = mockOnLocationClick.mock.calls[0][0];
      expect(callArgs.position.line).toBeGreaterThan(mockCurrentLocation.position.line);
    });

    it('should handle home and end keys', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          onLocationClick={mockOnLocationClick}
        />
      );
      
      const canvas = document.querySelector('canvas');
      canvas?.focus();
      
      // Test home key
      fireEvent.keyDown(canvas!, { key: 'Home' });
      
      expect(mockOnLocationClick).toHaveBeenCalled();
      const callArgs = mockOnLocationClick.mock.calls[0][0];
      expect(callArgs.position.line).toBe(0);
    });

    it('should handle page up and page down keys', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          onLocationClick={mockOnLocationClick}
        />
      );
      
      const canvas = document.querySelector('canvas');
      canvas?.focus();
      
      // Test page down
      fireEvent.keyDown(canvas!, { key: 'PageDown' });
      
      expect(mockOnLocationClick).toHaveBeenCalled();
      const callArgs = mockOnLocationClick.mock.calls[0][0];
      expect(callArgs.position.line).toBeGreaterThan(mockCurrentLocation.position.line);
    });
  });

  describe('Double-Click Zoom Functionality', () => {
    it('should zoom on double-click', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          onZoomChange={mockOnZoomChange}
          onLocationClick={mockOnLocationClick}
        />
      );
      
      const canvas = document.querySelector('canvas');
      
      fireEvent.doubleClick(canvas!, { clientY: 100 });
      
      expect(mockOnZoomChange).toHaveBeenCalled();
      expect(mockOnLocationClick).toHaveBeenCalled();
    });
  });

  describe('Context Menu Functionality', () => {
    it('should show context menu on right-click', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      const canvas = document.querySelector('canvas');
      
      fireEvent.contextMenu(canvas!, { clientX: 100, clientY: 100 });
      
      expect(screen.getByText('Navigate to Region')).toBeInTheDocument();
      expect(screen.getByText('Zoom to Region')).toBeInTheDocument();
      expect(screen.getByText('Bookmark Region')).toBeInTheDocument();
      expect(screen.getByText('Copy Location')).toBeInTheDocument();
    });

    it('should close context menu when clicking backdrop', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      const canvas = document.querySelector('canvas');
      
      // Show context menu
      fireEvent.contextMenu(canvas!, { clientX: 100, clientY: 100 });
      expect(screen.getByText('Navigate to Region')).toBeInTheDocument();
      
      // Click backdrop to close
      const backdrop = document.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop!);
      
      expect(screen.queryByText('Navigate to Region')).not.toBeInTheDocument();
    });

    it('should execute context menu actions', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          onLocationClick={mockOnLocationClick}
        />
      );
      
      const canvas = document.querySelector('canvas');
      
      // Show context menu
      fireEvent.contextMenu(canvas!, { clientX: 100, clientY: 100 });
      
      // Click navigate action
      const navigateButton = screen.getByText('Navigate to Region');
      fireEvent.click(navigateButton);
      
      expect(mockOnLocationClick).toHaveBeenCalled();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveAttribute('aria-label');
      expect(canvas).toHaveAttribute('role', 'application');
    });

    it('should be focusable with keyboard', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveAttribute('tabIndex', '0');
    });

    it('should show focus indicators', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
        />
      );
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });
});

describe('Real-time Minimap Updates', () => {
  const mockOnContentChange = vi.fn();
  
  // Mock data for real-time update tests
  const mockMinimapData: MinimapData = {
    symbolMap: {
      regions: [
        {
          startLine: 0,
          endLine: 25,
          density: 0.6,
          symbolTypes: new Map([['TSClass', 1], ['TSFunction', 1]]),
          complexity: 5
        },
        {
          startLine: 25,
          endLine: 50,
          density: 0.4,
          symbolTypes: new Map([['TSInterface', 1]]),
          complexity: 2
        }
      ],
      maxDensity: 2,
      totalSymbols: 3,
      lastUpdated: new Date()
    },
    structureOutline: {
      outline: [],
      depth: 2,
      totalNodes: 50,
      lastAnalyzed: new Date()
    },
    visibleRegion: {
      startLine: 0,
      endLine: 50,
      startColumn: 0,
      endColumn: 80
    },
    zoomLevel: 1,
    renderCache: new Map()
  };

  const mockCurrentLocation: CodeLocation = {
    filePath: '/test.ts',
    position: { line: 15, column: 5 }
  };
  
  beforeEach(() => {
    mockOnContentChange.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('File Content Change Detection', () => {
    it('should detect file content changes', () => {
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="initial content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Change file content
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="modified content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should detect the change
      expect(screen.getByText('1 pending')).toBeInTheDocument();
    });

    it('should not detect changes when content is the same', () => {
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="same content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Re-render with same content
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="same content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should not show pending changes
      expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
    });

    it('should handle empty or undefined content gracefully', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent=""
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should render without errors
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });
  });

  describe('Incremental Updates', () => {
    it('should process incremental updates', async () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="initial content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={100}
        />
      );

      // Change content to trigger update
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="modified content with new symbols"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={100}
        />
      );

      // Should show pending update
      expect(screen.getByText('1 pending')).toBeInTheDocument();

      // Fast-forward time to trigger debounced update
      vi.advanceTimersByTime(150);

      // Should show processing indicator
      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });

    it('should handle multiple rapid changes efficiently', () => {
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="content 1"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={100}
        />
      );

      // Make multiple rapid changes
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="content 2"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={100}
        />
      );

      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="content 3"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={100}
        />
      );

      // Should accumulate changes
      expect(screen.getByText(/pending/)).toBeInTheDocument();
    });

    it('should update symbol density regions incrementally', () => {
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="function test() { return 'initial'; }"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Add more complex content
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="class TestClass { method1() {} method2() {} function test() { return 'modified'; } }"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should detect the change and queue update
      expect(screen.getByText('1 pending')).toBeInTheDocument();
    });
  });

  describe('Debounced Update Mechanism', () => {
    it('should debounce updates with default delay', () => {
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="initial"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Make change
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="changed"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should show pending immediately
      expect(screen.getByText('1 pending')).toBeInTheDocument();

      // Fast-forward less than debounce time
      vi.advanceTimersByTime(200);

      // Should still be pending
      expect(screen.getByText('1 pending')).toBeInTheDocument();

      // Fast-forward past debounce time
      vi.advanceTimersByTime(200);

      // Should start processing
      expect(screen.queryByText('1 pending')).not.toBeInTheDocument();
    });

    it('should respect custom debounce delay', () => {
      const customDelay = 500;
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="initial"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={customDelay}
        />
      );

      // Make change
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="changed"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={customDelay}
        />
      );

      // Fast-forward less than custom delay
      vi.advanceTimersByTime(400);
      expect(screen.getByText('1 pending')).toBeInTheDocument();

      // Fast-forward past custom delay
      vi.advanceTimersByTime(200);
      expect(screen.queryByText('1 pending')).not.toBeInTheDocument();
    });

    it('should reset debounce timer on new changes', () => {
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="initial"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={300}
        />
      );

      // First change
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="change 1"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={300}
        />
      );

      // Wait almost to debounce time
      vi.advanceTimersByTime(250);

      // Second change (should reset timer)
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="change 2"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={300}
        />
      );

      // Wait original debounce time from first change
      vi.advanceTimersByTime(100);

      // Should still be pending (timer was reset)
      expect(screen.getByText(/pending/)).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should not process updates when disabled', () => {
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="initial"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={false}
        />
      );

      // Change content
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="changed"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={false}
        />
      );

      // Should not show any update indicators
      expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    });

    it('should show processing indicator during updates', async () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="initial content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={50}
        />
      );

      // Trigger update by changing content
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="modified content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={50}
        />
      );

      // Fast-forward to trigger processing
      vi.advanceTimersByTime(100);

      // Should show processing indicator
      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });

    it('should show ready indicator when no updates pending', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="stable content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should show ready indicator (green dot)
      expect(screen.getByText('●')).toBeInTheDocument();
    });

    it('should handle large content changes efficiently', () => {
      const largeContent = 'line\n'.repeat(1000); // 1000 lines
      
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="small content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Change to large content
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent={largeContent}
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should handle large content without errors
      expect(screen.getByText('1 pending')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file content gracefully', () => {
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="valid content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Change to invalid content (null)
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent={null as any}
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should render without errors
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });

    it('should handle missing current location gracefully', () => {
      const { rerender } = render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="initial"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Remove current location
      rerender(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={undefined}
          fileContent="changed"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should render without errors
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });

    it('should handle processing errors gracefully', () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <VisualMinimap 
          data={undefined} // Invalid data to trigger error
          currentLocation={mockCurrentLocation}
          fileContent="content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
        />
      );

      // Should render without throwing
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('API Integration', () => {
    it('should expose minimap API through onContentChange callback', () => {
      const mockCallback = vi.fn();
      
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="content"
          onContentChange={mockCallback}
          enableRealTimeUpdates={true}
        />
      );

      // API should be attached to callback
      expect((mockCallback as any).minimapAPI).toBeDefined();
      expect((mockCallback as any).minimapAPI.handleFileContentChange).toBeInstanceOf(Function);
      expect((mockCallback as any).minimapAPI.queueContentChange).toBeInstanceOf(Function);
      expect((mockCallback as any).minimapAPI.processQueuedUpdates).toBeInstanceOf(Function);
    });

    it('should provide update queue status through API', () => {
      const mockCallback = vi.fn();
      
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="content"
          onContentChange={mockCallback}
          enableRealTimeUpdates={true}
        />
      );

      const api = (mockCallback as any).minimapAPI;
      const queue = api.getUpdateQueue();
      
      expect(queue).toHaveProperty('changes');
      expect(queue).toHaveProperty('lastProcessed');
      expect(queue).toHaveProperty('isProcessing');
      expect(Array.isArray(queue.changes)).toBe(true);
    });
  });
});

describe('Symbol Density Calculation', () => {
  const testSymbols: Symbol[] = [
    {
      identifier: 'ClassA',
      kind: 'TSClass',
      location: { path: '/test.ts', line: 5, column: 1 }
    },
    {
      identifier: 'functionB',
      kind: 'TSFunction',
      location: { path: '/test.ts', line: 15, column: 1 }
    },
    {
      identifier: 'InterfaceC',
      kind: 'TSInterface',
      location: { path: '/test.ts', line: 25, column: 1 }
    },
    {
      identifier: 'StructD',
      kind: 'Struct',
      location: { path: '/test.ts', line: 35, column: 1 }
    }
  ];

  it('should calculate symbol density correctly', () => {
    const totalLines = 50;
    const density = calculateSymbolDensity(testSymbols, totalLines);
    
    expect(density).toMatchObject({
      totalSymbols: 4,
      maxDensity: expect.any(Number),
      lastUpdated: expect.any(Date),
      regions: expect.any(Array)
    });
    
    expect(density.regions.length).toBeGreaterThan(0);
    expect(density.regions.every(r => r.density >= 0 && r.density <= 1)).toBe(true);
  });

  it('should handle empty symbol list', () => {
    const density = calculateSymbolDensity([], 100);
    
    expect(density.totalSymbols).toBe(0);
    expect(density.maxDensity).toBe(1); // Should default to 1 to avoid division by zero
    expect(density.regions.every(r => r.density === 0)).toBe(true);
  });

  it('should track symbol types correctly', () => {
    const density = calculateSymbolDensity(testSymbols, 50);
    
    const hasSymbolTypes = density.regions.some(region => 
      region.symbolTypes.size > 0
    );
    
    expect(hasSymbolTypes).toBe(true);
  });

  it('should calculate complexity weights', () => {
    const density = calculateSymbolDensity(testSymbols, 50);
    
    const hasComplexity = density.regions.some(region => 
      region.complexity > 0
    );
    
    expect(hasComplexity).toBe(true);
  });

  it('should handle single line file', () => {
    const singleSymbol: Symbol[] = [{
      identifier: 'test',
      kind: 'TSFunction',
      location: { path: '/test.ts', line: 1, column: 1 }
    }];
    
    const density = calculateSymbolDensity(singleSymbol, 1);
    
    expect(density.totalSymbols).toBe(1);
    expect(density.regions.length).toBeGreaterThan(0);
  });

  it('should normalize density values correctly', () => {
    const manySymbols: Symbol[] = Array.from({ length: 20 }, (_, i) => ({
      identifier: `symbol${i}`,
      kind: 'TSFunction',
      location: { path: '/test.ts', line: i + 1, column: 1 }
    }));
    
    const density = calculateSymbolDensity(manySymbols, 100);
    
    // All density values should be between 0 and 1
    expect(density.regions.every(r => r.density >= 0 && r.density <= 1)).toBe(true);
    
    // At least one region should have maximum density (1.0)
    expect(density.regions.some(r => r.density === 1)).toBe(true);
  });
});