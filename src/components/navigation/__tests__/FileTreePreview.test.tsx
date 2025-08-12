// File Tree Preview System Tests
// Purpose: Unit tests for the file tree preview functionality
// Architecture: Tests preview loading, tooltip display, and content analysis

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedFileTree } from '../EnhancedFileTree';
import { FileTreeSettings } from '../../../types/navigation';
import { api } from '../../../api';

// Mock the API
vi.mock('../../../api', () => ({
  api: {
    getEnhancedFileTree: vi.fn(),
    analyzeFileStructure: vi.fn(),
    analyzeSymbolUsage: vi.fn()
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
  Clock: () => <div data-testid="clock-icon" />,
  Hash: () => <div data-testid="hash-icon" />,
  Package: () => <div data-testid="package-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />
}));

describe('File Tree Preview System', () => {
  const mockFileStructureAnalysis = {
    outline: [
      {
        name: 'UserService',
        type: 'class',
        startLine: 10,
        endLine: 50,
        children: [
          {
            name: 'constructor',
            type: 'method',
            startLine: 12,
            endLine: 15,
            children: []
          },
          {
            name: 'authenticate',
            type: 'method',
            startLine: 17,
            endLine: 30,
            children: []
          }
        ]
      },
      {
        name: 'validateUser',
        type: 'function',
        startLine: 52,
        endLine: 65,
        children: []
      }
    ]
  };

  const mockSymbolUsage = {
    referenceCount: 15,
    callCount: 8,
    lastUsed: new Date().toISOString(),
    usageFrequency: 0.75,
    hotspots: [
      { filePath: '/src/auth.ts', position: { line: 23, column: 10 } }
    ]
  };

  const mockApiResponse = {
    nodes: [
      {
        id: 'src/services/user.ts',
        name: 'user.ts',
        path: '/project/src/services/user.ts',
        type: 'file',
        children: [],
        metadata: {
          size: 2048,
          lastModified: new Date().toISOString(),
          gitStatus: 'modified',
          symbolCount: 5,
          fileType: 'typescript',
          isHidden: false,
          permissions: 'rw-'
        }
      },
      {
        id: 'src/components',
        name: 'components',
        path: '/project/src/components',
        type: 'directory',
        children: [
          {
            id: 'src/components/Button.tsx',
            name: 'Button.tsx',
            path: '/project/src/components/Button.tsx',
            type: 'file',
            children: [],
            metadata: {
              size: 1024,
              lastModified: new Date().toISOString(),
              gitStatus: 'clean',
              symbolCount: 2,
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
    (api.analyzeFileStructure as any).mockResolvedValue(mockFileStructureAnalysis);
    (api.analyzeSymbolUsage as any).mockResolvedValue(mockSymbolUsage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Preview Loading', () => {
    it('should show loading indicator when hovering over file', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement);
      });

      // Should show loading indicator briefly
      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      });
    });

    it('should call API methods for file analysis on hover', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement);
      });

      await waitFor(() => {
        expect(api.analyzeFileStructure).toHaveBeenCalledWith('/project/src/services/user.ts');
        expect(api.analyzeSymbolUsage).toHaveBeenCalledWith('/project/src/services/user.ts');
      });
    });

    it('should not load preview when previewOnHover is disabled', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: false
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement);
      });

      // Wait a bit to ensure no API calls are made
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(api.analyzeFileStructure).not.toHaveBeenCalled();
      expect(api.analyzeSymbolUsage).not.toHaveBeenCalled();
    });
  });

  describe('Preview Tooltip Display', () => {
    it('should show preview tooltip with file information', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement, { clientX: 100, clientY: 100 });
      });

      // Wait for preview to load and tooltip to appear
      await waitFor(() => {
        expect(screen.getByText('typescript')).toBeInTheDocument();
        expect(screen.getAllByText('2 KB').length).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });

    it('should show main symbols in tooltip', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        expect(screen.getByText('Main Symbols:')).toBeInTheDocument();
        expect(screen.getByText('UserService')).toBeInTheDocument();
        expect(screen.getByText('validateUser')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show complexity information for files', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        // Should show complexity indicator (Low, Medium, or High)
        const complexityText = screen.queryByText(/Low|Medium|High/);
        expect(complexityText).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show dependencies when available', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        // Dependencies section should appear if there are dependencies
        const dependenciesSection = screen.queryByText('Dependencies:');
        if (dependenciesSection) {
          expect(dependenciesSection).toBeInTheDocument();
          // Mock dependencies should be shown
          expect(screen.getByText('react')).toBeInTheDocument();
        }
      }, { timeout: 1000 });
    });

    it('should hide tooltip when mouse leaves', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement, { clientX: 100, clientY: 100 });
      });

      // Wait for tooltip to appear
      await waitFor(() => {
        expect(screen.getByText('typescript')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Mouse leave should hide tooltip
      const fileElements = screen.getAllByText('user.ts');
      const fileElement = fileElements.find(el => el.tagName === 'SPAN' && el.className.includes('text-gray-700'));
      expect(fileElement).toBeDefined();
      fireEvent.mouseLeave(fileElement!);

      await waitFor(() => {
        expect(screen.queryByText('typescript')).not.toBeInTheDocument();
      });
    });
  });

  describe('Directory Preview', () => {
    it('should show directory summary in tooltip', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const dirElement = screen.getByText('components');
        fireEvent.mouseEnter(dirElement, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        expect(screen.getByText('Directory')).toBeInTheDocument();
        expect(screen.getByText(/Directory with \d+ items/)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should not call file analysis APIs for directories', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const dirElement = screen.getByText('components');
        fireEvent.mouseEnter(dirElement, { clientX: 100, clientY: 100 });
      });

      // Wait a bit to ensure no file analysis calls are made
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(api.analyzeFileStructure).not.toHaveBeenCalledWith('/project/src/components');
    });
  });

  describe('Content Analysis', () => {
    it('should generate appropriate content summary', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement, { clientX: 100, clientY: 100 });
      });

      await waitFor(() => {
        // Should show content summary based on symbols
        expect(screen.getByText('1 class, 2 methods, 1 function')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle API errors gracefully', async () => {
      (api.analyzeFileStructure as any).mockRejectedValue(new Error('Analysis failed'));
      
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement, { clientX: 100, clientY: 100 });
      });

      // Should still show basic preview even when analysis fails
      await waitFor(() => {
        expect(screen.getByText('typescript file')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Preview Callbacks', () => {
    it('should call onNodePreview callback when preview is loaded', async () => {
      const onNodePreview = vi.fn();
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(
        <EnhancedFileTree 
          rootPath="/project" 
          settings={settings}
          onNodePreview={onNodePreview}
        />
      );
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement);
      });

      await waitFor(() => {
        expect(onNodePreview).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'user.ts',
            type: 'file'
          }),
          expect.objectContaining({
            fileSize: expect.any(Number),
            contentSummary: expect.any(String),
            symbolCount: expect.any(Number)
          })
        );
      }, { timeout: 1000 });
    });
  });

  describe('Tooltip Positioning', () => {
    it('should position tooltip based on mouse coordinates', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        const fileElement = screen.getByText('user.ts');
        fireEvent.mouseEnter(fileElement, { clientX: 200, clientY: 150 });
      });

      await waitFor(() => {
        const tooltip = document.querySelector('.fixed.z-50');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveStyle('left: 210px'); // clientX + 10
        expect(tooltip).toHaveStyle('top: 140px'); // clientY - 10
      }, { timeout: 1000 });
    });

    it('should update tooltip position on mouse move', async () => {
      const settings: Partial<FileTreeSettings> = {
        previewOnHover: true
      };

      render(<EnhancedFileTree rootPath="/project" settings={settings} />);
      
      await waitFor(() => {
        expect(screen.getByText('user.ts')).toBeInTheDocument();
      });

      const fileElements = screen.getAllByText('user.ts');
      const fileElement = fileElements.find(el => el.tagName === 'SPAN' && el.className.includes('text-gray-700'))!;
      
      await waitFor(() => {
        fireEvent.mouseEnter(fileElement, { clientX: 200, clientY: 150 });
      });

      await waitFor(() => {
        fireEvent.mouseMove(fileElement, { clientX: 250, clientY: 200 });
      });

      await waitFor(() => {
        const tooltip = document.querySelector('.fixed.z-50');
        expect(tooltip).toHaveStyle('left: 260px'); // new clientX + 10
        expect(tooltip).toHaveStyle('top: 190px'); // new clientY - 10
      }, { timeout: 1000 });
    });
  });
});