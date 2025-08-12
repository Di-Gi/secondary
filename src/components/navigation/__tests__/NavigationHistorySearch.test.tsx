// Navigation History Search Tests
// Purpose: Comprehensive tests for history search and restoration functionality
// Architecture: Unit and integration tests covering search, filtering, and restoration

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NavigationHistorySearch from '../NavigationHistorySearch';
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
    tags: ['file:ts', 'project:test'],
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

describe('NavigationHistorySearch', () => {
  let mockHistory: NavigationHistory;
  let mockOnLocationSelect: ReturnType<typeof vi.fn>;
  let mockOnSessionRestore: ReturnType<typeof vi.fn>;
  let mockOnSearchResults: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnLocationSelect = vi.fn();
    mockOnSessionRestore = vi.fn();
    mockOnSearchResults = vi.fn();

    // Create mock history data
    const baseTime = new Date('2024-01-01T10:00:00Z');
    const entries: NavigationHistoryEntry[] = [
      createEnhancedHistoryEntry(
        createMockLocation('/test/components/Button.tsx', 1, 1, createMockSymbol('Button', 'class'), baseTime),
        'navigate',
        'click'
      ),
      createEnhancedHistoryEntry(
        createMockLocation('/test/utils/helpers.ts', 10, 1, createMockSymbol('formatDate', 'function'), new Date(baseTime.getTime() + 60000)),
        'navigate',
        'click'
      ),
      createEnhancedHistoryEntry(
        createMockLocation('/test/services/api.ts', 5, 1, createMockSymbol('fetchData', 'function'), new Date(baseTime.getTime() + 120000)),
        'navigate',
        'click'
      ),
      createEnhancedHistoryEntry(
        createMockLocation('/test/components/Modal.tsx', 15, 1, createMockSymbol('Modal', 'class'), new Date(baseTime.getTime() + 180000)),
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
      render(<NavigationHistorySearch history={mockHistory} />);
      
      expect(screen.getByPlaceholderText('Search navigation history...')).toBeInTheDocument();
      expect(screen.getByTitle('Advanced filters')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <NavigationHistorySearch 
          history={mockHistory} 
          className="custom-search"
        />
      );
      
      expect(container.firstChild).toHaveClass('navigation-history-search');
      expect(container.firstChild).toHaveClass('custom-search');
    });

    it('should show recent searches when input is empty', async () => {
      const { rerender } = render(<NavigationHistorySearch history={mockHistory} />);
      
      // Perform a search first to populate history
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      
      await waitFor(() => {
        expect(screen.getByText(/results found/)).toBeInTheDocument();
      });
      
      // Clear search to show history
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should perform search when query is entered', async () => {
      render(
        <NavigationHistorySearch 
          history={mockHistory}
          onSearchResults={mockOnSearchResults}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      
      await waitFor(() => {
        expect(mockOnSearchResults).toHaveBeenCalled();
        expect(screen.getByText(/results found/)).toBeInTheDocument();
      });
    });

    it('should show loading state during search', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      
      act(() => {
        fireEvent.change(searchInput, { target: { value: 'Button' } });
      });
      
      // Should briefly show loading state
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      
      await waitFor(() => {
        expect(screen.getByTitle('Clear search')).toBeInTheDocument();
      });
      
      const clearButton = screen.getByTitle('Clear search');
      fireEvent.click(clearButton);
      
      expect(searchInput).toHaveValue('');
    });

    it('should search in file paths', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'components' } });
      
      await waitFor(() => {
        expect(screen.getByText('Button.tsx')).toBeInTheDocument();
        expect(screen.getByText('Modal.tsx')).toBeInTheDocument();
      });
    });

    it('should search in symbol names', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'formatDate' } });
      
      await waitFor(() => {
        expect(screen.getByText('helpers.ts')).toBeInTheDocument();
      });
    });

    it('should show no results message when no matches found', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument();
        expect(screen.getByText('Try:')).toBeInTheDocument();
      });
    });
  });

  describe('Advanced Filters', () => {
    it('should toggle advanced filters when button is clicked', () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const filtersButton = screen.getByTitle('Advanced filters');
      expect(screen.queryByText('Scope')).not.toBeInTheDocument();
      
      fireEvent.click(filtersButton);
      
      expect(screen.getByText('Scope')).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
      expect(screen.getByText('Sort by')).toBeInTheDocument();
      expect(filtersButton).toHaveClass('active');
    });

    it('should allow changing search scope', () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const filtersButton = screen.getByTitle('Advanced filters');
      fireEvent.click(filtersButton);
      
      const scopeSelect = screen.getByDisplayValue('All History');
      fireEvent.change(scopeSelect, { target: { value: 'project' } });
      
      expect(scopeSelect).toHaveValue('project');
    });

    it('should allow toggling search options', () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const filtersButton = screen.getByTitle('Advanced filters');
      fireEvent.click(filtersButton);
      
      const caseSensitiveCheckbox = screen.getByLabelText('Case sensitive');
      const fuzzySearchCheckbox = screen.getByLabelText('Fuzzy search');
      
      expect(caseSensitiveCheckbox).not.toBeChecked();
      expect(fuzzySearchCheckbox).toBeChecked();
      
      fireEvent.click(caseSensitiveCheckbox);
      fireEvent.click(fuzzySearchCheckbox);
      
      expect(caseSensitiveCheckbox).toBeChecked();
      expect(fuzzySearchCheckbox).not.toBeChecked();
    });

    it('should allow changing sort order', () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const filtersButton = screen.getByTitle('Advanced filters');
      fireEvent.click(filtersButton);
      
      const sortSelect = screen.getByDisplayValue('Relevance');
      fireEvent.change(sortSelect, { target: { value: 'name' } });
      
      expect(sortSelect).toHaveValue('name');
    });
  });

  describe('Search Results', () => {
    it('should display search results grouped by type', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      
      await waitFor(() => {
        expect(screen.getByText('Locations')).toBeInTheDocument();
        expect(screen.getByText('Button.tsx')).toBeInTheDocument();
      });
    });

    it('should show result metadata', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      
      await waitFor(() => {
        expect(screen.getAllByText(/\d+%/).length).toBeGreaterThan(0); // Relevance score
        expect(screen.getByText(/Line \d+, Column \d+/)).toBeInTheDocument();
      });
    });

    it('should call onLocationSelect when location result is clicked', async () => {
      render(
        <NavigationHistorySearch 
          history={mockHistory}
          onLocationSelect={mockOnLocationSelect}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      
      await waitFor(() => {
        expect(screen.getByText('Button.tsx')).toBeInTheDocument();
      });
      
      const resultItem = screen.getByText('Button.tsx').closest('.search-result-item');
      fireEvent.click(resultItem!);
      
      expect(mockOnLocationSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/test/components/Button.tsx'
        })
      );
    });

    it('should highlight selected result', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      
      await waitFor(() => {
        expect(screen.getByText('Button.tsx')).toBeInTheDocument();
      });
      
      const resultItem = screen.getByText('Button.tsx').closest('.search-result-item');
      fireEvent.click(resultItem!);
      
      expect(resultItem).toHaveClass('selected');
    });
  });

  describe('Session Results', () => {
    it('should display session results with restore button', async () => {
      // Add a session with a searchable name
      const sessionWithSearchableName: HistorySession = {
        id: 'test-session',
        name: 'Button Development Session',
        startTime: new Date(),
        entries: mockHistory.entries.slice(0, 2),
        context: mockHistory.entries[0].location.context,
        isActive: false
      };
      
      const historyWithSession = {
        ...mockHistory,
        sessions: [sessionWithSearchableName, ...mockHistory.sessions]
      };
      
      render(
        <NavigationHistorySearch 
          history={historyWithSession}
          onSessionRestore={mockOnSessionRestore}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button Development' } });
      
      await waitFor(() => {
        expect(screen.getByText('Sessions')).toBeInTheDocument();
        expect(screen.getByText('Button Development Session')).toBeInTheDocument();
        expect(screen.getByText('Restore')).toBeInTheDocument();
      });
    });

    it('should call onSessionRestore when restore button is clicked', async () => {
      const sessionWithSearchableName: HistorySession = {
        id: 'test-session',
        name: 'Button Development Session',
        startTime: new Date(),
        entries: mockHistory.entries.slice(0, 2),
        context: mockHistory.entries[0].location.context,
        isActive: false
      };
      
      const historyWithSession = {
        ...mockHistory,
        sessions: [sessionWithSearchableName, ...mockHistory.sessions]
      };
      
      render(
        <NavigationHistorySearch 
          history={historyWithSession}
          onSessionRestore={mockOnSessionRestore}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button Development' } });
      
      await waitFor(() => {
        expect(screen.getByText('Restore')).toBeInTheDocument();
      });
      
      const restoreButton = screen.getByText('Restore');
      fireEvent.click(restoreButton);
      
      expect(mockOnSessionRestore).toHaveBeenCalledWith(sessionWithSearchableName);
    });
  });

  describe('Search History', () => {
    it('should add searches to history', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      
      // Perform first search
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      await waitFor(() => {
        expect(screen.getByText(/results found/)).toBeInTheDocument();
      });
      
      // Clear search to show history
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
        expect(screen.getByText('Button')).toBeInTheDocument();
      });
    });

    it('should allow clicking on search history items', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      
      // Perform search to add to history
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      await waitFor(() => {
        expect(screen.getByText(/results found/)).toBeInTheDocument();
      });
      
      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      });
      
      // Click on history item
      const historyItem = screen.getByText('Button');
      fireEvent.click(historyItem);
      
      expect(searchInput).toHaveValue('Button');
    });
  });

  describe('Search Options', () => {
    it('should perform case-sensitive search when enabled', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      // Enable advanced filters
      const filtersButton = screen.getByTitle('Advanced filters');
      fireEvent.click(filtersButton);
      
      // Enable case-sensitive search
      const caseSensitiveCheckbox = screen.getByLabelText('Case sensitive');
      fireEvent.click(caseSensitiveCheckbox);
      
      // Search with different case
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'button' } }); // lowercase
      
      await waitFor(() => {
        // Should not find "Button" with case-sensitive search
        expect(screen.getByText('No results found for "button"')).toBeInTheDocument();
      });
    });

    it('should perform fuzzy search when enabled', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Bttn' } }); // Missing letters
      
      await waitFor(() => {
        // Fuzzy search should find "Button"
        expect(screen.getByText('Button.tsx')).toBeInTheDocument();
      });
    });

    it('should perform whole word search when enabled', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      // Enable advanced filters
      const filtersButton = screen.getByTitle('Advanced filters');
      fireEvent.click(filtersButton);
      
      // Enable whole word search
      const wholeWordCheckbox = screen.getByLabelText('Whole word');
      fireEvent.click(wholeWordCheckbox);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Butt' } }); // Partial word
      
      await waitFor(() => {
        // Should not find partial matches with whole word search
        expect(screen.getByText('No results found for "Butt"')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should handle empty history gracefully', async () => {
      const emptyHistory: NavigationHistory = {
        entries: [],
        currentIndex: -1,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      render(<NavigationHistorySearch history={emptyHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'anything' } });
      
      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          return content.includes('No results found for') && content.includes('anything');
        })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      expect(searchInput).toHaveAttribute('type', 'text');
      
      const filtersButton = screen.getByTitle('Advanced filters');
      expect(filtersButton).toHaveAttribute('title', 'Advanced filters');
    });

    it('should support keyboard navigation', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      
      await waitFor(() => {
        expect(screen.getByText('Button.tsx')).toBeInTheDocument();
      });
      
      const resultItems = document.querySelectorAll('.search-result-item');
      expect(resultItems.length).toBeGreaterThan(0);
      
      // Should be able to focus search input
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
    });

    it('should disable input during search', async () => {
      render(<NavigationHistorySearch history={mockHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      
      act(() => {
        fireEvent.change(searchInput, { target: { value: 'Button' } });
      });
      
      // Input should be briefly disabled during search
      expect(searchInput).toBeDisabled();
      
      await waitFor(() => {
        expect(searchInput).not.toBeDisabled();
      });
    });
  });

  describe('Performance', () => {
    it('should handle large search results efficiently', async () => {
      // Create a large history
      const largeEntries: NavigationHistoryEntry[] = [];
      for (let i = 0; i < 1000; i++) {
        largeEntries.push(
          createEnhancedHistoryEntry(
            createMockLocation(`/test/file${i}.ts`, 1, 1, createMockSymbol(`func${i}`)),
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
      render(<NavigationHistorySearch history={largeHistory} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'func' } });
      
      await waitFor(() => {
        expect(screen.getByText(/results found/)).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      
      // Should complete search within reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should limit search results for performance', async () => {
      // Create many matching entries
      const manyEntries: NavigationHistoryEntry[] = [];
      for (let i = 0; i < 100; i++) {
        manyEntries.push(
          createEnhancedHistoryEntry(
            createMockLocation(`/test/button${i}.ts`, 1, 1, createMockSymbol(`Button${i}`)),
            'navigate',
            'click'
          )
        );
      }

      const historyWithManyMatches: NavigationHistory = {
        entries: manyEntries,
        currentIndex: 99,
        sessions: [],
        maxEntries: 100,
        groupingStrategy: 'time-based'
      };

      render(<NavigationHistorySearch history={historyWithManyMatches} />);
      
      const searchInput = screen.getByPlaceholderText('Search navigation history...');
      fireEvent.change(searchInput, { target: { value: 'Button' } });
      
      await waitFor(() => {
        const resultsText = screen.getByText(/results found/);
        // Should limit results (default is 50)
        expect(resultsText.textContent).toMatch(/50 results found/);
      });
    });
  });
});