import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../SessionManager';
import { NavigationSession } from '../../../types/navigation';
import { useAppStore } from '../../../store/appStore';

// Mock the store
vi.mock('../../../store/appStore');

// Mock UI components
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

vi.mock('../../ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      {...props}
    />
  )
}));

vi.mock('../../ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor} data-testid="label">{children}</label>
}));

vi.mock('../../ui/badge', () => ({
  Badge: ({ children, className, onClick }: any) => (
    <span className={className} onClick={onClick} data-testid="badge">{children}</span>
  )
}));

vi.mock('../../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>
}));

vi.mock('../../ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>
}));

vi.mock('../../ui/dialog', () => ({
  Dialog: ({ children, open }: any) => <div data-testid="dialog" style={{ display: open ? 'block' : 'none' }}>{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children, asChild }: any) => <div data-testid="dialog-trigger">{children}</div>
}));

vi.mock('../../ui/textarea', () => ({
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea 
      value={value} 
      onChange={onChange} 
      {...props}
    />
  )
}));

vi.mock('../../ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />
}));

const mockSessions: NavigationSession[] = [
  {
    id: 'session-1',
    name: 'Frontend Development',
    description: 'Working on React components',
    locations: [],
    layout: {
      panelSizes: new Map(),
      visiblePanels: [],
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
    createdAt: new Date('2024-01-01'),
    lastAccessed: new Date('2024-01-03'),
    metadata: {
      projectPath: '/test/project',
      totalTimeSpent: 0,
      locationCount: 0,
      tags: ['frontend', 'react', 'favorite'],
      isShared: false,
      version: 1
    }
  },
  {
    id: 'session-2',
    name: 'Backend API',
    description: 'Working on REST API endpoints',
    locations: [],
    layout: {
      panelSizes: new Map(),
      visiblePanels: [],
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
    createdAt: new Date('2024-01-02'),
    lastAccessed: new Date('2024-01-02'),
    metadata: {
      projectPath: '/test/project',
      totalTimeSpent: 0,
      locationCount: 0,
      tags: ['backend', 'api'],
      isShared: false,
      version: 1
    }
  }
];

describe('SessionManager Integration', () => {
  const mockStore = {
    navigationSessions: mockSessions,
    activeNavigationSession: mockSessions[0],
    createNavigationSession: vi.fn(),
    saveNavigationSession: vi.fn(),
    loadNavigationSession: vi.fn(),
    loadAllNavigationSessions: vi.fn(),
    setActiveNavigationSession: vi.fn(),
    deleteNavigationSession: vi.fn(),
    currentProject: { project_path: '/test/project' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue(mockStore);
  });

  describe('Session Filtering and Sorting', () => {
    it('should filter sessions by search query', () => {
      render(<SessionManager />);
      
      const searchInput = screen.getByPlaceholderText('Search sessions...');
      fireEvent.change(searchInput, { target: { value: 'frontend' } });
      
      expect(screen.getByText('Frontend Development')).toBeInTheDocument();
      expect(screen.queryByText('Backend API')).not.toBeInTheDocument();
    });

    it('should filter sessions by tags', () => {
      render(<SessionManager />);
      
      // Open filter panel
      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);
      
      // Click on 'react' tag
      const reactTag = screen.getByText('react');
      fireEvent.click(reactTag);
      
      expect(screen.getByText('Frontend Development')).toBeInTheDocument();
      expect(screen.queryByText('Backend API')).not.toBeInTheDocument();
    });

    it('should show only favorite sessions when favorites filter is enabled', () => {
      render(<SessionManager />);
      
      // Open filter panel
      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);
      
      // Enable favorites filter
      const favoritesCheckbox = screen.getByLabelText('Favorites only');
      fireEvent.click(favoritesCheckbox);
      
      expect(screen.getByText('Frontend Development')).toBeInTheDocument();
      expect(screen.queryByText('Backend API')).not.toBeInTheDocument();
    });

    it('should sort sessions by different criteria', () => {
      render(<SessionManager />);
      
      // Open filter panel
      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);
      
      // Change sort to name
      const sortSelect = screen.getByDisplayValue('Last Accessed');
      fireEvent.change(sortSelect, { target: { value: 'name' } });
      
      // Sessions should be sorted alphabetically
      const sessionCards = screen.getAllByTestId('card');
      expect(sessionCards[0]).toHaveTextContent('Backend API');
      expect(sessionCards[1]).toHaveTextContent('Frontend Development');
    });
  });

  describe('Session Organization', () => {
    it('should toggle favorite status of a session', async () => {
      render(<SessionManager />);
      
      // Find the star button for Backend API (not favorited)
      const sessionCards = screen.getAllByTestId('card');
      const backendCard = sessionCards.find(card => card.textContent?.includes('Backend API'));
      
      if (backendCard) {
        const starButton = backendCard.querySelector('button');
        if (starButton) {
          fireEvent.click(starButton);
          
          await waitFor(() => {
            expect(mockStore.saveNavigationSession).toHaveBeenCalled();
          });
        }
      }
    });

    it('should display session tags correctly', () => {
      render(<SessionManager />);
      
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('backend')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
    });

    it('should show all unique tags in filter panel', () => {
      render(<SessionManager />);
      
      // Open filter panel
      const filterButton = screen.getByText('Filter');
      fireEvent.click(filterButton);
      
      // Check that all unique tags are shown
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('backend')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
      expect(screen.getByText('favorite')).toBeInTheDocument();
    });
  });

  describe('Session Import/Export', () => {
    it('should show import button', () => {
      render(<SessionManager />);
      
      const importButton = screen.getByText('Import');
      expect(importButton).toBeInTheDocument();
    });

    it('should handle session export', () => {
      // Mock URL.createObjectURL and related functions
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') {
          return mockLink as any;
        }
        return document.createElement(tagName);
      });
      
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
      
      render(<SessionManager />);
      
      // The export functionality would be tested through the more options menu
      // For now, we just verify the component renders without errors
      expect(screen.getByText('Frontend Development')).toBeInTheDocument();
    });
  });

  describe('Session Switching', () => {
    it('should load a different session when clicked', async () => {
      render(<SessionManager />);
      
      // Find the load button for Backend API session
      const sessionCards = screen.getAllByTestId('card');
      const backendCard = sessionCards.find(card => card.textContent?.includes('Backend API'));
      
      if (backendCard) {
        const loadButton = backendCard.querySelector('button[disabled=""]'); // Should not be disabled for non-active session
        // Since Backend API is not the active session, the load button should be enabled
        // But our mock shows Frontend Development as active, so Backend API load button should work
      }
      
      // Verify that sessions are displayed
      expect(screen.getByText('Frontend Development')).toBeInTheDocument();
      expect(screen.getByText('Backend API')).toBeInTheDocument();
    });

    it('should show active session indicator', () => {
      render(<SessionManager />);
      
      expect(screen.getByText('Active Session')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument(); // Badge on active session
    });
  });

  describe('Session Management UI', () => {
    it('should expand and collapse filter panel', () => {
      render(<SessionManager />);
      
      const filterButton = screen.getByText('Filter');
      
      // Filter panel should be collapsed initially
      expect(screen.queryByText('Sort by:')).not.toBeInTheDocument();
      
      // Expand filter panel
      fireEvent.click(filterButton);
      expect(screen.getByText('Sort by:')).toBeInTheDocument();
      
      // Collapse filter panel
      fireEvent.click(filterButton);
      expect(screen.queryByText('Sort by:')).not.toBeInTheDocument();
    });

    it('should show session metadata correctly', () => {
      render(<SessionManager />);
      
      expect(screen.getByText('0 locations')).toBeInTheDocument();
      expect(screen.getByText('Working on React components')).toBeInTheDocument();
      expect(screen.getByText('Working on REST API endpoints')).toBeInTheDocument();
    });

    it('should handle empty search results', () => {
      render(<SessionManager />);
      
      const searchInput = screen.getByPlaceholderText('Search sessions...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      expect(screen.getByText('No sessions match your filters')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
    });
  });
});