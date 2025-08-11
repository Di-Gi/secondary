// Real-time Minimap Updates - Focused Tests
// Purpose: Test the core real-time update functionality
// Architecture: Simplified tests focusing on the essential features

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VisualMinimap from '../VisualMinimap';
import { MinimapData, CodeLocation } from '../../../types/navigation';

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

describe('Real-time Minimap Updates - Core Functionality', () => {
  const mockMinimapData: MinimapData = {
    symbolMap: {
      regions: [
        {
          startLine: 0,
          endLine: 25,
          density: 0.6,
          symbolTypes: new Map([['TSClass', 1], ['TSFunction', 1]]),
          complexity: 5
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
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Real-time Update Props', () => {
    it('should accept real-time update props', () => {
      const mockOnContentChange = vi.fn();
      
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="test content"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={100}
        />
      );
      
      // Should render without errors
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });

    it('should show ready indicator when real-time updates are enabled', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="stable content"
          enableRealTimeUpdates={true}
        />
      );
      
      // Should show ready indicator (green dot)
      expect(screen.getByText('●')).toBeInTheDocument();
    });

    it('should not show update indicators when real-time updates are disabled', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="content"
          enableRealTimeUpdates={false}
        />
      );
      
      // Should not show any update indicators
      expect(screen.queryByText('●')).not.toBeInTheDocument();
      expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
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
      expect((mockCallback as any).minimapAPI.getUpdateQueue).toBeInstanceOf(Function);
      expect((mockCallback as any).minimapAPI.isProcessingUpdates).toBeInstanceOf(Function);
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
      expect(typeof queue.isProcessing).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file content gracefully', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent={null as any}
          enableRealTimeUpdates={true}
        />
      );

      // Should render without errors
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });

    it('should handle missing current location gracefully', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={undefined}
          fileContent="content"
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
          enableRealTimeUpdates={true}
        />
      );

      // Should render without throwing
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Component Integration', () => {
    it('should render with all real-time update features enabled', () => {
      const mockOnContentChange = vi.fn();
      
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="function test() { return 'hello'; }"
          onContentChange={mockOnContentChange}
          enableRealTimeUpdates={true}
          updateDebounceMs={50}
          width={300}
          height={500}
        />
      );
      
      // Should render all components
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
      expect(screen.getByTitle('Reset Zoom')).toBeInTheDocument();
      expect(screen.getByText('Symbol Types:')).toBeInTheDocument();
      
      // Should show ready indicator
      expect(screen.getByText('●')).toBeInTheDocument();
    });

    it('should handle custom debounce timing', () => {
      render(
        <VisualMinimap 
          data={mockMinimapData}
          currentLocation={mockCurrentLocation}
          fileContent="content"
          enableRealTimeUpdates={true}
          updateDebounceMs={1000} // Custom long delay
        />
      );
      
      // Should render without errors
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    });
  });
});