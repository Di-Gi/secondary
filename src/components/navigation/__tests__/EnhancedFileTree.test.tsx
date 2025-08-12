// Enhanced File Tree Component Tests
// Purpose: Unit tests for the EnhancedFileTree component
// Architecture: Tests virtual rendering, node interactions, and git status indicators

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedFileTree } from '../EnhancedFileTree';
import { FileTreeNode, FileTreeSettings } from '../../../types/navigation';
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
  AlertCircle: () => <div data-testid="alert-circle-icon" />
}));

describe('EnhancedFileTree', () => {
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
              lastModified: new Date().toISOString(),
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
              lastModified: new Date().toISOString(),
              gitStatus: 'modified',
              symbolCount: 5,
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

  describe('Component Rendering', () => {
    it('should render loading state initially', async () => {
      (api.getEnhancedFileTree as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse), 100))
      );

      render(<EnhancedFileTree rootPath="/project" />);
      
      expect(screen.getByText('Loading file tree...')).toBeInTheDocument();
    });

    it('should render file tree after loading', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByText('src')).toBeInTheDocument();
      });
    });

    it('should render error state when API fails', async () => {
      (api.getEnhancedFileTree as any).mockRejectedValue(new Error('API Error'));

      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load file tree')).toBeInTheDocument();
      });
    });

    it('should render empty state when no nodes', async () => {
      (api.getEnhancedFileTree as any).mockResolvedValue({ nodes: [] });

      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByText('No files found')).toBeInTheDocument();
      });
    });
  });

  describe('Virtual Scrolling', () => {
    it('should use virtual scrolling by default', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      });
    });

    it('should disable virtual scrolling when setting is false', async () => {
      const settings: Partial<FileTreeSettings> = {
        virtualScrolling: false
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
      });
    });
  });

  describe('File Icons', () => {
    it('should show appropriate icons for different file types', async () => {
      const mockResponse = {
        nodes: [
          {
            id: 'test.ts',
            name: 'test.ts',
            path: '/project/test.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 500,
              lastModified: new Date().toISOString(),
              gitStatus: 'clean',
              symbolCount: 3,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          },
          {
            id: 'image.png',
            name: 'image.png',
            path: '/project/image.png',
            type: 'file',
            children: [],
            metadata: {
              size: 2048,
              lastModified: new Date().toISOString(),
              gitStatus: 'clean',
              symbolCount: 0,
              fileType: 'image',
              isHidden: false,
              permissions: 'rw-'
            }
          }
        ]
      };

      (api.getEnhancedFileTree as any).mockResolvedValue(mockResponse);

      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('file-code-icon')).toBeInTheDocument();
        expect(screen.getByTestId('file-image-icon')).toBeInTheDocument();
      });
    });

    it('should hide icons when setting is disabled', async () => {
      const settings: Partial<FileTreeSettings> = {
        showFileIcons: false
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('folder-icon')).not.toBeInTheDocument();
      });
    });
  });

  describe('Git Status Indicators', () => {
    it('should show git status indicators when enabled', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      // First expand the directory to see the file with git status
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        // Modified file should show circle icon
        expect(screen.getByTestId('circle-icon')).toBeInTheDocument();
      });
    });

    it('should hide git status indicators when disabled', async () => {
      const settings: Partial<FileTreeSettings> = {
        showGitStatus: false
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('circle-icon')).not.toBeInTheDocument();
      });
    });

    it('should show different icons for different git statuses', async () => {
      const mockResponse = {
        nodes: [
          {
            id: 'added.ts',
            name: 'added.ts',
            path: '/project/added.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 500,
              lastModified: new Date().toISOString(),
              gitStatus: 'added',
              symbolCount: 3,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          },
          {
            id: 'deleted.ts',
            name: 'deleted.ts',
            path: '/project/deleted.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 500,
              lastModified: new Date().toISOString(),
              gitStatus: 'deleted',
              symbolCount: 3,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          }
        ]
      };

      (api.getEnhancedFileTree as any).mockResolvedValue(mockResponse);

      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('plus-icon')).toBeInTheDocument(); // Added
        expect(screen.getByTestId('minus-icon')).toBeInTheDocument(); // Deleted
      });
    });
  });

  describe('Node Interactions', () => {
    it('should expand/collapse directories on click', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        const srcFolder = screen.getByText('src');
        expect(srcFolder).toBeInTheDocument();
      });

      // Initially collapsed, should show chevron right
      expect(screen.getByTestId('chevron-right')).toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText('src'));

      // Should now show chevron down and child nodes
      await waitFor(() => {
        expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
        expect(screen.getByText('components')).toBeInTheDocument();
        expect(screen.getByText('main.ts')).toBeInTheDocument();
      });
    });

    it('should call onNodeSelect when file is clicked', async () => {
      const onNodeSelect = vi.fn();
      
      render(<EnhancedFileTree rootPath="/project" onNodeSelect={onNodeSelect} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('main.ts'));
      });

      expect(onNodeSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'main.ts',
          type: 'file'
        })
      );
    });

    it('should call onNodeExpand when directory is expanded', async () => {
      const onNodeExpand = vi.fn();
      
      render(<EnhancedFileTree rootPath="/project" onNodeExpand={onNodeExpand} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      expect(onNodeExpand).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'src',
          type: 'directory'
        })
      );
    });
  });

  describe('Sorting', () => {
    it('should sort nodes by name by default', async () => {
      const mockResponse = {
        nodes: [
          {
            id: 'zebra.ts',
            name: 'zebra.ts',
            path: '/project/zebra.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 500,
              lastModified: new Date().toISOString(),
              gitStatus: 'clean',
              symbolCount: 3,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          },
          {
            id: 'alpha.ts',
            name: 'alpha.ts',
            path: '/project/alpha.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 500,
              lastModified: new Date().toISOString(),
              gitStatus: 'clean',
              symbolCount: 3,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          }
        ]
      };

      (api.getEnhancedFileTree as any).mockResolvedValue(mockResponse);

      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        const fileNames = screen.getAllByText(/\.ts$/).map(el => el.textContent);
        expect(fileNames).toEqual(['alpha.ts', 'zebra.ts']);
      });
    });

    it('should sort nodes by size when specified', async () => {
      const settings: Partial<FileTreeSettings> = {
        sortBy: 'size',
        sortOrder: 'desc'
      };

      const mockResponse = {
        nodes: [
          {
            id: 'small.ts',
            name: 'small.ts',
            path: '/project/small.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 100,
              lastModified: new Date().toISOString(),
              gitStatus: 'clean',
              symbolCount: 1,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          },
          {
            id: 'large.ts',
            name: 'large.ts',
            path: '/project/large.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 1000,
              lastModified: new Date().toISOString(),
              gitStatus: 'clean',
              symbolCount: 10,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          }
        ]
      };

      (api.getEnhancedFileTree as any).mockResolvedValue(mockResponse);

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileNames = screen.getAllByText(/\.ts$/).map(el => el.textContent);
        expect(fileNames).toEqual(['large.ts', 'small.ts']);
      });
    });
  });

  describe('Hidden Files', () => {
    it('should hide hidden files by default', async () => {
      const mockResponse = {
        nodes: [
          {
            id: '.hidden',
            name: '.hidden',
            path: '/project/.hidden',
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
          },
          {
            id: 'visible.ts',
            name: 'visible.ts',
            path: '/project/visible.ts',
            type: 'file',
            children: [],
            metadata: {
              size: 500,
              lastModified: new Date().toISOString(),
              gitStatus: 'clean',
              symbolCount: 3,
              fileType: 'typescript',
              isHidden: false,
              permissions: 'rw-'
            }
          }
        ]
      };

      (api.getEnhancedFileTree as any).mockResolvedValue(mockResponse);

      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        expect(screen.getByText('visible.ts')).toBeInTheDocument();
        expect(screen.queryByText('.hidden')).not.toBeInTheDocument();
      });
    });

    it('should show hidden files when enabled', async () => {
      const settings: Partial<FileTreeSettings> = {
        showHiddenFiles: true
      };

      const mockResponse = {
        nodes: [
          {
            id: '.hidden',
            name: '.hidden',
            path: '/project/.hidden',
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

      (api.getEnhancedFileTree as any).mockResolvedValue(mockResponse);

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        expect(screen.getByText('.hidden')).toBeInTheDocument();
      });
    });
  });

  describe('File Size Display', () => {
    it('should display file sizes for files', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        expect(screen.getByText('1 KB')).toBeInTheDocument(); // main.ts size
      });
    });
  });

  describe('Preview on Hover', () => {
    it('should show preview loading indicator on hover', async () => {
      render(<EnhancedFileTree rootPath="/project" />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const mainTsElement = screen.getByText('main.ts');
        fireEvent.mouseEnter(mainTsElement);
      });

      // Should show loading indicator briefly
      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      });
    });

    it('should call onNodePreview when preview is loaded', async () => {
      const onNodePreview = vi.fn();
      
      render(<EnhancedFileTree rootPath="/project" onNodePreview={onNodePreview} />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('src'));
      });

      await waitFor(() => {
        const mainTsElement = screen.getByText('main.ts');
        fireEvent.mouseEnter(mainTsElement);
      });

      // Wait for preview to load
      await waitFor(() => {
        expect(onNodePreview).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'main.ts'
          }),
          expect.objectContaining({
            fileSize: expect.any(Number),
            contentSummary: expect.any(String)
          })
        );
      }, { timeout: 1000 });
    });
  });
});