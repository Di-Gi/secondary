// File Tree Interactions Tests
// Purpose: Unit tests for file tree interaction features
// Architecture: Tests search, filtering, context menus, and recent modification highlighting

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedFileTree } from '../EnhancedFileTree';
import { FileTreeSettings } from '../../../types/navigation';
import { api } from '../../../api';

// Mock the API
vi.mock('../../../api', () => ({
  api: {
    getEnhancedFileTree: vi.fn()
  }
}));

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }: any) => {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(
        <div key={i}>
          {children({ index: i, style: {} })}
        </div>
      );
    }
    return <div data-testid="virtual-list">{items}</div>;
  }
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ChevronRight: () => <div data-testid="chevron-right" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  File: () => <div data-testid="file-icon" />,
  Folder: () => <div data-testid="folder-icon" />,
  FolderOpen: () => <div data-testid="folder-open-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  FileCode: () => <div data-testid="file-code-icon" />,
  FileImage: () => <div data-testid="file-image-icon" />,
  FileVideo: () => <div data-testid="file-video-icon" />,
  FileAudio: () => <div data-testid="file-audio-icon" />,
  Database: () => <div data-testid="database-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  GitBranch: () => <div data-testid="git-branch-icon" />,
  Circle: () => <div data-testid="circle-icon" />,
  Dot: () => <div data-testid="dot-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Search: () => <div data-testid="search-icon" />,
  X: () => <div data-testid="x-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  FolderPlus: () => <div data-testid="folder-plus-icon" />,
  FilePlus: () => <div data-testid="file-plus-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />
}));

describe('File Tree Interactions', () => {
  const mockApiResponse = {
    nodes: [
      {
        id: 'src',
        name: 'src',
        path: '/project/src',
        type: 'directory',
        children: [
          {
            id: 'src/components',
            name: 'components',
            path: '/project/src/components',
            type: 'directory',
            children: [],
            metadata: {
              size: 0,
              lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
              gitStatus: 'clean',
              symbolCount: 0,
              fileType: 'directory',
              isHidden: false,
              permissions: 'rwx'
            }
          },
          {
            id: 'src/main.ts',
            name: 'main.ts',
            path: '/project/src/main.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 1024,
              lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago (recent)
              gitStatus: 'modified',
              symbolCount: 5,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          },
          {
            id: 'src/utils.ts',
            name: 'utils.ts',
            path: '/project/src/utils.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 512,
              lastModified: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
              gitStatus: 'clean',
              symbolCount: 3,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          }
        ],
        metadata: {
          size: 0,
          lastModified: new Date().toISOString(),
          gitStatus: 'clean',
          symbolCount: 0,
          fileType: 'directory',
          isHidden: false,
          permissions: 'rwx'
        }
      },
      {
        id: '.hidden-file',
        name: '.hidden-file',
        path: '/project/.hidden-file',
        type: 'file',
        children: [],
        metadata: {
          size: 100,
          lastModified: new Date().toISOString(),
          gitStatus: 'clean',
          symbolCount: 0,
          fileType: 'text',
          isHidden: true,
          permissions: 'rw-'
        }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getEnhancedFileTree as any).mockResolvedValue(mockApiResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Search Functionality', () => {
    it('should render search bar', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search files and folders...')).toBeInTheDocument();
      });
    });

    it('should filter files based on search query', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('src')).toBeInTheDocument();
      });

      // Expand src directory
      fireEvent.click(screen.getByText('src'));

      await waitFor(() => {
        expect(screen.getByText('main.ts')).toBeInTheDocument();
        expect(screen.getByText('utils.ts')).toBeInTheDocument();
      });

      // Search for 'main'
      const searchInput = screen.getByPlaceholderText('Search files and folders...');
      fireEvent.change(searchInput, { target: { value: 'main' } });

      await waitFor(() => {
        expect(screen.getByText('1 result for "main"')).toBeInTheDocument();
      });
    });

    it('should highlight search matches', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search files and folders...');
        fireEvent.change(searchInput, { target: { value: 'main' } });
      });

      await waitFor(() => {
        const highlightedText = document.querySelector('mark');
        expect(highlightedText).toBeInTheDocument();
        expect(highlightedText?.textContent).toBe('main');
      });
    });

    it('should show search results count', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search files and folders...');
        fireEvent.change(searchInput, { target: { value: 'ts' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/3 results for "ts"/)).toBeInTheDocument();
      });
    });

    it('should clear search when X button is clicked', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search files and folders...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search files and folders...');
      fireEvent.change(searchInput, { target: { value: 'main' } });

      await waitFor(() => {
        expect(searchInput).toHaveValue('main');
      });

      const clearButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(clearButton!);

      expect(searchInput).toHaveValue('');
    });

    it('should call onSearchChange when provided', async () => {
      const onSearchChange = vi.fn();
      render(<EnhancedFileTree rootPath="/project" onSearchChange={onSearchChange} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search files and folders...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search files and folders...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(onSearchChange).toHaveBeenCalledWith('test');
    });

    it('should use external search query when provided', async () => {
      render(<EnhancedFileTree rootPath="/project" searchQuery="main" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('main')).toBeInTheDocument();
      });
    });
  });

  describe('Context Menu', () => {
    it('should show context menu on right click for files', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const fileElement = screen.getByText('main.ts');
        fireEvent.contextMenu(fileElement);
      });

      await waitFor(() => {
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Copy Path')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });

    it('should show context menu on right click for directories', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        const dirElement = screen.getByText('src');
        fireEvent.contextMenu(dirElement);
      });

      await waitFor(() => {
        expect(screen.getByText('Expand')).toBeInTheDocument();
        expect(screen.getByText('New File')).toBeInTheDocument();
        expect(screen.getByText('New Folder')).toBeInTheDocument();
        expect(screen.getByText('Copy Path')).toBeInTheDocument();
        expect(screen.getByText('Refresh')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });

    it('should call onNodeAction when context menu item is clicked', async () => {
      const onNodeAction = vi.fn();
      render(<EnhancedFileTree rootPath="/project" onNodeAction={onNodeAction} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const fileElement = screen.getByText('main.ts');
        fireEvent.contextMenu(fileElement);
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Open'));
      });

      expect(onNodeAction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'main.ts',
          type: 'file'
        }),
        'open'
      );
    });

    it('should close context menu when clicking outside', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const fileElement = screen.getByText('main.ts');
        fireEvent.contextMenu(fileElement);
      });

      await waitFor(() => {
        expect(screen.getByText('Open')).toBeInTheDocument();
      });

      // Click on backdrop
      const backdrop = document.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(screen.queryByText('Open')).not.toBeInTheDocument();
      });
    });

    it('should show different actions for expanded vs collapsed directories', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      // Test collapsed directory
      await waitFor(() => {
        const dirElement = screen.getByText('src');
        fireEvent.contextMenu(dirElement);
      });

      await waitFor(() => {
        expect(screen.getByText('Expand')).toBeInTheDocument();
      });

      // Close menu
      const backdrop = document.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop!);

      // Expand directory
      fireEvent.click(screen.getByText('src'));

      // Test expanded directory
      await waitFor(() => {
        const dirElement = screen.getByText('src');
        fireEvent.contextMenu(dirElement);
      });

      await waitFor(() => {
        expect(screen.getByText('Collapse')).toBeInTheDocument();
      });
    });
  });

  describe('Recent Modification Highlighting', () => {
    it('should highlight recently modified files', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const mainTsElement = screen.getByText('main.ts').closest('div');
        expect(mainTsElement).toHaveClass('bg-green-50', 'border-l-2', 'border-green-400');
      });
    });

    it('should not highlight old files', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const utilsTsElement = screen.getByText('utils.ts').closest('div');
        expect(utilsTsElement).not.toHaveClass('bg-green-50');
      });
    });

    it('should show recent modification indicator', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const indicator = document.querySelector('.bg-green-400.rounded-full');
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveAttribute('title', 'Recently modified');
      });
    });

    it('should make recently modified files bold', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const mainTsElement = screen.getByText('main.ts');
        expect(mainTsElement).toHaveClass('font-medium');
      });
    });
  });

  describe('Hidden Files Filtering', () => {
    it('should hide hidden files by default', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.queryByText('.hidden-file')).not.toBeInTheDocument();
      });
    });

    it('should show hidden files when setting is enabled', async () => {
      const settings: Partial<FileTreeSettings> = {
        showHiddenFiles: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        expect(screen.getByText('.hidden-file')).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should combine search with hidden file filtering', async () => {
      const settings: Partial<FileTreeSettings> = {
        showHiddenFiles: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      // Search for hidden file
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search files and folders...');
        fireEvent.change(searchInput, { target: { value: 'hidden' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/\..*hidden.*-file/)).toBeInTheDocument();
        expect(screen.getByText(/1 result for "hidden"/)).toBeInTheDocument();
      });
    });

    it('should maintain search state when expanding directories', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search files and folders...')).toBeInTheDocument();
      });

      // Set search query
      const searchInput = screen.getByPlaceholderText('Search files and folders...');
      fireEvent.change(searchInput, { target: { value: 'ts' } });

      // Expand directory
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      // Search should still be active
      await waitFor(() => {
        expect(screen.getByText(/3 results for "ts"/)).toBeInTheDocument();
      });
    });

    it('should handle context menu actions with search active', async () => {
      const onNodeAction = vi.fn();
      render(<EnhancedFileTree rootPath="/project" onNodeAction={onNodeAction} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search files and folders...')).toBeInTheDocument();
      });

      // Set search query
      const searchInput = screen.getByPlaceholderText('Search files and folders...');
      fireEvent.change(searchInput, { target: { value: 'main' } });

      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      // Right click on filtered result
      await waitFor(() => {
        const fileElement = screen.getByText(/main\.ts/);
        fireEvent.contextMenu(fileElement);
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Edit'));
      });

      expect(onNodeAction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'main.ts'
        }),
        'edit'
      );
    });
  });
});