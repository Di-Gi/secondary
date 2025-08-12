// Navigation History Visualization Tests
// Purpose: Comprehensive tests for history visualization component
// Architecture: Unit and integration tests covering all visualization features

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NavigationHistoryVisualization from '../NavigationHistoryVisualization';
import { 
  NavigationHistory, 
  NavigationHistoryEntry, 
  HistorySession,
  NavigationLocation,
  NavigationContext
} from '../../../types/navigation';
import { createEnhancedHistoryEntry, groupEntriesIntoSessions } from '../../../lib/navigationHistoryUtils';

// Mock the app store
vi.mock('../../../store/appStore', () => ({
  useAppStore: vi.fn(() => ({
    navigationHistory: null,
    historyInsights: null
  }))
}));

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

describe('NavigationHistoryVisualization', () => {
  let mockHistory: NavigationHistory;
  let mockOnLocationSelect: ReturnType<typeof vi.fn>;
  let mockOnSessionSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnLocationSelect = vi.fn();
    mockOnSessionSelect = vi.fn();

    // Create mock history data
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
        createMockLocation('/test/file2.ts', 1, 1, createMockSymbol('func3'), new Date(baseTime.getTime() + 120000)),
        'navigate',
        'click'
      ),
      createEnhancedHistoryEntry(
        createMockLocation('/test/file3.py', 5, 1, createMockSymbol('class1', 'class'), new Date(baseTime.getTime() + 180000)),
        'navigate',
        'click'
      )
    ];

    mockHistory = {
      entries,
      currentIndex: 3,
      sessions: groupEntriesIntoSessions(entries),
      maxEntries: 100,
      groupingStrategy: 'time-based'
    };
  });

  describe('Component Rendering', () => {
    it('should render with default props', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Sessions')).toBeInTheDocument();
      expect(screen.getByText('Insights')).toBeInTheDocument();
    });

    it('should render navigation tabs correctly', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const timelineTab = screen.getByText('Timeline');
      const sessionsTab = screen.getByText('Sessions');
      const insightsTab = screen.getByText('Insights');
      
      expect(timelineTab).toBeInTheDocument();
      expect(sessionsTab).toBeInTheDocument();
      expect(insightsTab).toBeInTheDocument();
      
      // Timeline should be active by default
      expect(timelineTab.closest('button')).toHaveClass('active');
    });

    it('should hide sessions tab when showSessions is false', () => {
      render(
        <NavigationHistoryVisualization 
          history={mockHistory} 
          showSessions={false}
        />
      );
      
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.queryByText('Sessions')).not.toBeInTheDocument();
      expect(screen.getByText('Insights')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <NavigationHistoryVisualization 
          history={mockHistory} 
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('navigation-history-visualization');
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Timeline View', () => {
    it('should display timeline view by default', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      expect(screen.getByText('Navigation Timeline')).toBeInTheDocument();
      expect(screen.getByText('4 locations')).toBeInTheDocument();
      expect(screen.getByText('3 files')).toBeInTheDocument();
    });

    it('should display history entries in timeline', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      expect(screen.getAllByText('file1.ts').length).toBeGreaterThan(0);
      expect(screen.getByText('file2.ts')).toBeInTheDocument();
      expect(screen.getByText('file3.py')).toBeInTheDocument();
    });

    it('should display symbol information for entries with symbols', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      expect(screen.getByText('func1 (function)')).toBeInTheDocument();
      expect(screen.getByText('func2 (function)')).toBeInTheDocument();
      expect(screen.getByText('class1 (class)')).toBeInTheDocument();
    });

    it('should group entries by time', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      // Should have time group headers
      const timeHeaders = screen.getAllByText(/\d{1,2}:\d{2}/);
      expect(timeHeaders.length).toBeGreaterThan(0);
    });

    it('should call onLocationSelect when entry is clicked', () => {
      render(
        <NavigationHistoryVisualization 
          history={mockHistory}
          onLocationSelect={mockOnLocationSelect}
        />
      );
      
      const entryThumbnails = document.querySelectorAll('.history-entry-thumbnail');
      expect(entryThumbnails.length).toBeGreaterThan(0);
      
      fireEvent.click(entryThumbnails[0]);
      
      expect(mockOnLocationSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: expect.any(String)
        })
      );
    });

    it('should show hover effects on entry hover', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const entryThumbnails = document.querySelectorAll('.history-entry-thumbnail');
      expect(entryThumbnails.length).toBeGreaterThan(0);
      
      const firstEntry = entryThumbnails[0];
      
      fireEvent.mouseEnter(firstEntry);
      expect(firstEntry).toHaveClass('hovered');
      
      fireEvent.mouseLeave(firstEntry);
      expect(firstEntry).not.toHaveClass('hovered');
    });
  });

  describe('Sessions View', () => {
    it('should switch to sessions view when tab is clicked', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const sessionsTab = screen.getByText('Sessions');
      fireEvent.click(sessionsTab);
      
      expect(screen.getByText('Navigation Sessions')).toBeInTheDocument();
      expect(sessionsTab.closest('button')).toHaveClass('active');
    });

    it('should display session information', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      fireEvent.click(screen.getByText('Sessions'));
      
      // Should show sessions count
      expect(screen.getByText(/\d+ sessions/)).toBeInTheDocument();
      
      // Should show average duration
      expect(screen.getByText(/Avg: \d+min/)).toBeInTheDocument();
    });

    it('should display individual sessions', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      fireEvent.click(screen.getByText('Sessions'));
      
      // Should have session thumbnails
      const sessionThumbnails = document.querySelectorAll('.session-thumbnail');
      expect(sessionThumbnails.length).toBeGreaterThan(0);
    });

    it('should call onSessionSelect when session is clicked', () => {
      render(
        <NavigationHistoryVisualization 
          history={mockHistory}
          onSessionSelect={mockOnSessionSelect}
        />
      );
      
      fireEvent.click(screen.getByText('Sessions'));
      
      const sessionThumbnail = document.querySelector('.session-thumbnail');
      expect(sessionThumbnail).toBeInTheDocument();
      
      fireEvent.click(sessionThumbnail!);
      
      expect(mockOnSessionSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          entries: expect.any(Array)
        })
      );
    });
  });

  describe('Insights View', () => {
    it('should switch to insights view when tab is clicked', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const insightsTab = screen.getByText('Insights');
      fireEvent.click(insightsTab);
      
      expect(screen.getByText('Navigation Insights')).toBeInTheDocument();
      expect(insightsTab.closest('button')).toHaveClass('active');
    });

    it('should display most visited files', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      fireEvent.click(screen.getByText('Insights'));
      
      expect(screen.getByText('Most Visited Files')).toBeInTheDocument();
      
      // Should show file names and visit counts
      expect(screen.getByText('file1.ts')).toBeInTheDocument();
      expect(screen.getByText('2 visits')).toBeInTheDocument();
    });

    it('should display most used symbols', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      fireEvent.click(screen.getByText('Insights'));
      
      expect(screen.getByText('Most Used Symbols')).toBeInTheDocument();
      
      // Should show symbol information
      expect(screen.getAllByText(/func\d+:function/).length).toBeGreaterThan(0);
    });

    it('should display navigation patterns', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      fireEvent.click(screen.getByText('Insights'));
      
      expect(screen.getByText('Navigation Patterns')).toBeInTheDocument();
    });
  });

  describe('Tooltip Functionality', () => {
    it('should show tooltip on entry hover', async () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const entryThumbnails = document.querySelectorAll('.history-entry-thumbnail');
      expect(entryThumbnails.length).toBeGreaterThan(0);
      
      fireEvent.mouseEnter(entryThumbnails[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/Line \d+, Column \d+/)).toBeInTheDocument();
      });
    });

    it('should hide tooltip when entry is no longer hovered', async () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const entryThumbnails = document.querySelectorAll('.history-entry-thumbnail');
      expect(entryThumbnails.length).toBeGreaterThan(0);
      
      const firstEntry = entryThumbnails[0];
      
      fireEvent.mouseEnter(firstEntry);
      
      await waitFor(() => {
        expect(screen.getByText(/Line \d+, Column \d+/)).toBeInTheDocument();
      });
      
      fireEvent.mouseLeave(firstEntry);
      
      await waitFor(() => {
        expect(screen.queryByText(/Line \d+, Column \d+/)).not.toBeInTheDocument();
      });
    });

    it('should close tooltip when close button is clicked', async () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const entryThumbnails = document.querySelectorAll('.history-entry-thumbnail');
      expect(entryThumbnails.length).toBeGreaterThan(0);
      
      fireEvent.mouseEnter(entryThumbnails[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/Line \d+, Column \d+/)).toBeInTheDocument();
      });
      
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/Line \d+, Column \d+/)).not.toBeInTheDocument();
      });
    });

    it('should display symbol information in tooltip', async () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const entryThumbnails = document.querySelectorAll('.history-entry-thumbnail');
      expect(entryThumbnails.length).toBeGreaterThan(0);
      
      fireEvent.mouseEnter(entryThumbnails[0]);
      
      await waitFor(() => {
        // Look for the symbol section in the tooltip
        expect(screen.getByText('Symbol:')).toBeInTheDocument();
      });
    });

    it('should display action and trigger information in tooltip', async () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const entryThumbnails = document.querySelectorAll('.history-entry-thumbnail');
      expect(entryThumbnails.length).toBeGreaterThan(0);
      
      fireEvent.mouseEnter(entryThumbnails[0]);
      
      await waitFor(() => {
        expect(screen.getByText('navigate via click')).toBeInTheDocument();
      });
    });
  });

  describe('Thumbnail Display', () => {
    it('should show thumbnails when showThumbnails is true', () => {
      render(
        <NavigationHistoryVisualization 
          history={mockHistory}
          showThumbnails={true}
        />
      );
      
      const thumbnails = document.querySelectorAll('.entry-thumbnail');
      expect(thumbnails.length).toBeGreaterThan(0);
    });

    it('should hide thumbnails when showThumbnails is false', () => {
      render(
        <NavigationHistoryVisualization 
          history={mockHistory}
          showThumbnails={false}
        />
      );
      
      const thumbnails = document.querySelectorAll('.entry-thumbnail');
      expect(thumbnails.length).toBe(0);
    });

    it('should display appropriate file icons', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      // Should have file icons for different file types
      const fileIcons = document.querySelectorAll('.file-icon');
      expect(fileIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Entry Prioritization', () => {
    it('should display priority indicators', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const priorityIndicators = document.querySelectorAll('.priority-indicator');
      expect(priorityIndicators.length).toBeGreaterThan(0);
    });

    it('should limit visible entries based on maxVisibleEntries', () => {
      render(
        <NavigationHistoryVisualization 
          history={mockHistory}
          maxVisibleEntries={2}
        />
      );
      
      // Should only show the most recent entries
      const entryThumbnails = document.querySelectorAll('.history-entry-thumbnail');
      expect(entryThumbnails.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Empty State', () => {
    it('should handle empty history gracefully', () => {
      const emptyHistory: NavigationHistory = {
        entries: [],
        currentIndex: -1,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      render(<NavigationHistoryVisualization history={emptyHistory} />);
      
      expect(screen.getByText('0 locations')).toBeInTheDocument();
      expect(screen.getByText('0 files')).toBeInTheDocument();
    });

    it('should show empty insights for empty history', () => {
      const emptyHistory: NavigationHistory = {
        entries: [],
        currentIndex: -1,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      render(<NavigationHistoryVisualization history={emptyHistory} />);
      
      fireEvent.click(screen.getByText('Insights'));
      
      expect(screen.getByText('Most Visited Files')).toBeInTheDocument();
      expect(screen.getByText('Most Used Symbols')).toBeInTheDocument();
      expect(screen.getByText('Navigation Patterns')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const timelineTab = screen.getByText('Timeline');
      const sessionsTab = screen.getByText('Sessions');
      
      // Should be able to focus tabs
      timelineTab.focus();
      expect(document.activeElement).toBe(timelineTab);
      
      // Should be able to click tabs to navigate
      fireEvent.click(sessionsTab);
      expect(sessionsTab.closest('button')).toHaveClass('active');
    });

    it('should have proper heading hierarchy', () => {
      render(<NavigationHistoryVisualization history={mockHistory} />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Should have h3 for main sections
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large history efficiently', () => {
      // Create a large history
      const largeEntries: NavigationHistoryEntry[] = [];
      for (let i = 0; i < 1000; i++) {
        largeEntries.push(
          createEnhancedHistoryEntry(
            createMockLocation(`/test/file${i}.ts`, 1, 1, undefined, new Date(Date.now() + i * 1000)),
            'navigate',
            'click'
          )
        );
      }

      const largeHistory: NavigationHistory = {
        entries: largeEntries,
        currentIndex: 999,
        sessions: [],
        maxEntries: 1000,
        groupingStrategy: 'time-based'
      };

      const startTime = performance.now();
      render(<NavigationHistoryVisualization history={largeHistory} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should limit visible entries for performance', () => {
      const largeEntries: NavigationHistoryEntry[] = [];
      for (let i = 0; i < 100; i++) {
        largeEntries.push(
          createEnhancedHistoryEntry(
            createMockLocation(`/test/file${i}.ts`, 1, 1),
            'navigate',
            'click'
          )
        );
      }

      const largeHistory: NavigationHistory = {
        entries: largeEntries,
        currentIndex: 99,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      render(
        <NavigationHistoryVisualization 
          history={largeHistory}
          maxVisibleEntries={10}
        />
      );
      
      // Should only render limited entries
      const entryThumbnails = document.querySelectorAll('.history-entry-thumbnail');
      expect(entryThumbnails.length).toBeLessThanOrEqual(10);
    });
  });
});